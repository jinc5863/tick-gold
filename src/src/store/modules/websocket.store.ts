/**
 * WebSocket实时连接store
 *
 * 管理黄金交易系统的实时数据连接
 * 包括实时行情、交易信号、系统状态等
 */

import { createAppStore } from '../factory';
import { createWebSocketConnection } from '../../api';
import { optimizationManager } from '../websocket-optimization';
import type { WebSocketMessageType, WebSocketMessage, GoldTickData, RealTimeSignal } from '../types/websocket';


/**
 * WebSocket连接状态
 */
export type WebSocketStatus =
  | 'connecting'    // 连接中
  | 'connected'     // 已连接
  | 'reconnecting'  // 重连中
  | 'disconnected'  // 已断开
  | 'error';        // 错误状态

/**
 * WebSocket store状态
 */
export interface WebSocketState {
  // 连接状态
  status: WebSocketStatus;
  isConnected: boolean;
  lastConnectTime: Date | null;
  lastDisconnectTime: Date | null;
  reconnectAttempts: number;

  // 连接配置
  autoReconnect: boolean;
  reconnectInterval: number; // 重连间隔(毫秒)
  maxReconnectAttempts: number;

  // 消息统计
  messageCount: {
    gold_tick: number;
    trade_signal: number;
    market_update: number;
    system_status: number;
    order_executed: number;
    error: number;
  };

  // 最后收到的消息
  lastMessages: {
    gold_tick: GoldTickData | null;
    trade_signal: RealTimeSignal | null;
    market_update: any | null;
    system_status: any | null;
  };

  // 连接错误
  connectionError: string | null;

  // WebSocket实例
  wsConnection: any | null;

  // 动作
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  sendMessage: (type: WebSocketMessageType, data: any) => void;
  subscribe: (symbol: string) => void;
  unsubscribe: (symbol: string) => void;
  updateConfig: (config: Partial<Pick<WebSocketState, 'autoReconnect' | 'reconnectInterval' | 'maxReconnectAttempts'>>) => void;
  clearCache: () => void;
  getOptimizationStats: () => { persist: { count: number; size: number } } | null;
  resetStats: () => void;
}

/**
 * 创建WebSocket store
 */
export const useWebSocketStore = createAppStore<WebSocketState>(
  (set, get) => ({
    // 初始状态
    status: 'disconnected',
    isConnected: false,
    lastConnectTime: null,
    lastDisconnectTime: null,
    reconnectAttempts: 0,

    // 连接配置
    autoReconnect: true,
    reconnectInterval: 5000, // 5秒重连
    maxReconnectAttempts: 10,

    // 消息统计
    messageCount: {
      gold_tick: 0,
      trade_signal: 0,
      market_update: 0,
      system_status: 0,
      order_executed: 0,
      error: 0,
    },

    // 最后收到的消息
    lastMessages: {
      gold_tick: null,
      trade_signal: null,
      market_update: null,
      system_status: null,
    },

    // 连接错误
    connectionError: null,

    // WebSocket实例
    wsConnection: null,

    // 连接WebSocket
    connect: async () => {
      const currentState = get();

      // 如果已经在连接中或已连接，直接返回
      if (currentState.isConnected || currentState.status === 'connecting') {
        console.log('WebSocket已经连接或正在连接中');
        return;
      }

      set({
        status: 'connecting',
        connectionError: null
      });

      try {
        // 创建WebSocket连接
        const connection = createWebSocketConnection((message: WebSocketMessage) => {
          const state = get();

          // 更新消息统计
          const updatedCounts = { ...state.messageCount };
          if (message.type in updatedCounts) {
            updatedCounts[message.type as keyof typeof updatedCounts] += 1;
          }

          // 更新最后消息
          const updatedLastMessages = { ...state.lastMessages };

          // 处理不同类型的消息
          switch (message.type) {
            case 'gold_tick':
              updatedLastMessages.gold_tick = message.data as GoldTickData;
              // 数据持久化：保存 tick 数据到 localStorage
              optimizationManager.persist.save(`tick-${(message.data as GoldTickData).symbol}`, message.data);
              break;

            case 'trade_signal':
              updatedLastMessages.trade_signal = message.data as RealTimeSignal;
              // 数据持久化：保存交易信号
              optimizationManager.persist.save(`signal-${(message.data as RealTimeSignal).id}`, message.data);
              break;

            case 'market_update':
              updatedLastMessages.market_update = message.data;
              break;

            case 'system_status':
              updatedLastMessages.system_status = message.data;
              break;

            case 'error':
              console.error('WebSocket错误消息:', message.data);
              break;
          }

          // 更新状态
          set({
            messageCount: updatedCounts,
            lastMessages: updatedLastMessages,
          });
        });

        // 保存连接实例
        set({
          wsConnection: connection,
          status: 'connected',
          isConnected: true,
          lastConnectTime: new Date(),
          reconnectAttempts: 0,
        });

        console.log('WebSocket连接成功建立');

      } catch (error) {
        console.error('WebSocket连接失败:', error);

        set({
          status: 'error',
          connectionError: error instanceof Error ? error.message : '连接失败',
          lastDisconnectTime: new Date(),
        });

        // 如果启用自动重连，开始重连
        if (get().autoReconnect && get().reconnectAttempts < get().maxReconnectAttempts) {
          setTimeout(() => {
            get().reconnect();
          }, get().reconnectInterval);
        }
      }
    },

    // 断开WebSocket连接
    disconnect: () => {
      const { wsConnection } = get();

      if (wsConnection) {
        try {
          wsConnection.close();
          console.log('WebSocket连接已断开');
        } catch (error) {
          console.error('断开WebSocket连接时出错:', error);
        }
      }

      set({
        status: 'disconnected',
        isConnected: false,
        wsConnection: null,
        lastDisconnectTime: new Date(),
      });
    },

    // 重新连接
    reconnect: async () => {
      const state = get();

      // 检查是否超过最大重连次数
      if (state.reconnectAttempts >= state.maxReconnectAttempts) {
        console.log('已达到最大重连次数，不再重连');
        set({
          status: 'error',
          connectionError: '达到最大重连次数',
        });
        return;
      }

      console.log(`尝试重连 (${state.reconnectAttempts + 1}/${state.maxReconnectAttempts})`);

      set({
        status: 'reconnecting',
        reconnectAttempts: state.reconnectAttempts + 1,
      });

      // 先断开旧连接
      if (state.wsConnection) {
        state.wsConnection.close();
      }

      // 等待一段时间后重新连接
      setTimeout(() => {
        get().connect();
      }, state.reconnectInterval);
    },

    // 发送消息
    sendMessage: (type: WebSocketMessageType, data: any) => {
      const { wsConnection, isConnected } = get();

      if (!isConnected || !wsConnection) {
        console.warn('WebSocket未连接，无法发送消息');
        return;
      }

      const message: WebSocketMessage = {
        type,
        data,
        timestamp: new Date().toISOString(),
      };

      try {
        wsConnection.send(message);
        console.log(`发送WebSocket消息: ${type}`);
      } catch (error) {
        console.error('发送WebSocket消息失败:', error);
      }
    },

    // 订阅交易品种
    subscribe: (symbol: string) => {
      get().sendMessage('subscribe', { symbol });
    },

    // 取消订阅交易品种
    unsubscribe: (symbol: string) => {
      get().sendMessage('unsubscribe', { symbol });
    },

    // 更新配置
    updateConfig: (config) => {
      set(config);
    },

    // 重置统计信息
    resetStats: () => {
      set({
        messageCount: {
          gold_tick: 0,
          trade_signal: 0,
          market_update: 0,
          system_status: 0,
          order_executed: 0,
          error: 0,
        },
        lastMessages: {
          gold_tick: null,
          trade_signal: null,
          market_update: null,
          system_status: null,
        },
        connectionError: null,
        reconnectAttempts: 0,
      });
    },

    // 获取优化统计信息
    getOptimizationStats: () => {
      try {
        return optimizationManager.getStats();
      } catch (error) {
        console.error('获取优化统计失败:', error);
        return null;
      }
    },

    // 清除缓存数据
    clearCache: () => {
      try {
        optimizationManager.persist.clear();
        console.log('缓存数据已清除');
      } catch (error) {
        console.error('清除缓存失败:', error);
      }
    },
  }),
  {
    name: 'websocket',
    persist: {
      name: 'websocket-storage',
      partialize: (state) => ({
        // 只持久化配置，不持久化连接状态
        autoReconnect: state.autoReconnect,
        reconnectInterval: state.reconnectInterval,
        maxReconnectAttempts: state.maxReconnectAttempts,
      }),
    },
  }
);

/**
 * WebSocket hooks导出
 */

// 连接状态hooks
export const useWebSocketConnection = () => useWebSocketStore((state) => ({
  status: state.status,
  isConnected: state.isConnected,
  lastConnectTime: state.lastConnectTime,
  lastDisconnectTime: state.lastDisconnectTime,
  reconnectAttempts: state.reconnectAttempts,
  connectionError: state.connectionError,
  connect: state.connect,
  disconnect: state.disconnect,
  reconnect: state.reconnect,
}));

// 实时数据hooks
export const useRealTimeData = () => useWebSocketStore((state) => ({
  lastGoldTick: state.lastMessages.gold_tick,
  lastTradeSignal: state.lastMessages.trade_signal,
  lastMarketUpdate: state.lastMessages.market_update,
  lastSystemStatus: state.lastMessages.system_status,
  messageCount: state.messageCount,
}));

// 配置管理hooks
export const useWebSocketConfig = () => useWebSocketStore((state) => ({
  autoReconnect: state.autoReconnect,
  reconnectInterval: state.reconnectInterval,
  maxReconnectAttempts: state.maxReconnectAttempts,
  updateConfig: state.updateConfig,
  resetStats: state.resetStats,
  subscribe: state.subscribe,
  unsubscribe: state.unsubscribe,
}));

// 完整WebSocket hooks
export const useWebSocket = () => useWebSocketStore((state) => ({
  // 连接状态
  status: state.status,
  isConnected: state.isConnected,
  lastConnectTime: state.lastConnectTime,
  lastDisconnectTime: state.lastDisconnectTime,
  reconnectAttempts: state.reconnectAttempts,
  connectionError: state.connectionError,

  // 实时数据
  lastGoldTick: state.lastMessages.gold_tick,
  lastTradeSignal: state.lastMessages.trade_signal,
  lastMarketUpdate: state.lastMessages.market_update,
  lastSystemStatus: state.lastMessages.system_status,
  messageCount: state.messageCount,

  // 配置
  autoReconnect: state.autoReconnect,
  reconnectInterval: state.reconnectInterval,
  maxReconnectAttempts: state.maxReconnectAttempts,

  // 动作
  connect: state.connect,
  disconnect: state.disconnect,
  reconnect: state.reconnect,
  sendMessage: state.sendMessage,
  subscribe: state.subscribe,
  unsubscribe: state.unsubscribe,
  updateConfig: state.updateConfig,
  resetStats: state.resetStats,
}));