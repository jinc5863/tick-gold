// 主store入口文件
// 导出所有模块化的store

// 从各模块导出状态
export * from './modules/auth.store';
export * from './modules/config.store';
export * from './modules/trade.store';
export * from './modules/system.store';
export * from './modules/websocket.store';

// 定义组合状态类型（用于需要同时访问多个store的场景）
export interface CombinedAppState {
  auth: ReturnType<typeof useAuthStore>;
  config: ReturnType<typeof useConfigStore>;
  trade: ReturnType<typeof useTradeStore>;
  system: ReturnType<typeof useSystemStore>;
  websocket: ReturnType<typeof useWebSocketStore>;
}

// 辅助函数：批量更新多个store
export const batchUpdate = (
  updates: Partial<{
    auth?: Partial<ReturnType<typeof useAuthStore>>;
    config?: Partial<ReturnType<typeof useConfigStore>>;
    trade?: Partial<ReturnType<typeof useTradeStore>>;
    system?: Partial<ReturnType<typeof useSystemStore>>;
    websocket?: Partial<ReturnType<typeof useWebSocketStore>>;
  }>
) => {
  const stores = {
    auth: useAuthStore,
    config: useConfigStore,
    trade: useTradeStore,
    system: useSystemStore,
    websocket: useWebSocketStore,
  };

  Object.entries(updates).forEach(([storeName, update]) => {
    if (storeName in stores) {
      const store = stores[storeName as keyof typeof stores];
      store.setState(update as any);
    }
  });
};

// 初始化函数（用于应用启动时）
export const initializeStores = async () => {
  console.log('初始化应用状态...');

  try {
    const systemStore = useSystemStore.getState();
    const authStore = useAuthStore.getState();
    const configStore = useConfigStore.getState();
    const tradeStore = useTradeStore.getState();

    // 检查系统健康状态
    await systemStore.checkHealth();

    // 如果是开发环境，直接设置开发令牌，不使用API
    const isDevelopment = (import.meta as any).env?.DEV || (import.meta as any).env?.MODE === 'development' || process.env.NODE_ENV === 'development';
    if (isDevelopment) {
      try {
        console.log('🔧 开发环境: 设置模拟令牌，跳过API调用');
        // 直接设置令牌，不进行API调用
        authStore.setState({
          authToken: 'dev-token-' + Date.now(),
          isAuthenticated: true,
          userId: 'dev-user-' + Math.random().toString(36).substring(2, 9),
          permissions: ['read', 'write', 'trade', 'admin'],
          lastLogin: new Date(),
          authError: null,
          authLoading: false,
        });
      } catch (error) {
        console.warn('开发令牌设置失败，将以未认证模式运行:', error);
      }
    }

    // 加载数据
    await Promise.all([
      systemStore.fetchPerformance(),
      tradeStore.fetchStrategies(),
      configStore.updateUserConfig(configStore.userConfig), // 确保配置已加载
    ]);

    console.log('应用状态初始化完成');

    // 如果用户已认证，尝试连接WebSocket（可以在之后的条件中触发）
    if (authStore.isAuthenticated) {
      console.log('用户已认证，准备建立WebSocket连接...');
      // 这里可以触发WebSocket连接，但可能更好的方式是在UI组件中根据实际需求连接
    }

  } catch (error) {
    console.error('应用状态初始化失败:', error);
    throw error;
  }
};

// 重置函数（用于测试或退出时）
export const resetAllStores = () => {
  console.log('重置所有状态...');
  useAuthStore.setState(useAuthStore.getInitialState());
  useConfigStore.setState(useConfigStore.getInitialState());
  useTradeStore.setState(useTradeStore.getInitialState());
  useSystemStore.setState(useSystemStore.getInitialState());
  useWebSocketStore.setState(useWebSocketStore.getInitialState());
  console.log('所有状态已重置');
};

// 状态监听器（用于调试或监控）
export const setupStoreListeners = () => {
  // 监听认证状态变化
  const unsubscribeAuth = useAuthStore.subscribe((state, prevState) => {
    if (state.isAuthenticated !== prevState?.isAuthenticated) {
      console.log(`认证状态变化: ${prevState?.isAuthenticated} -> ${state.isAuthenticated}`);
    }
  });

  // 监听系统健康状态
  const unsubscribeSystem = useSystemStore.subscribe((state, prevState) => {
    if (state.healthStatus !== prevState?.healthStatus) {
      console.log(`系统健康状态变化: ${prevState?.healthStatus} -> ${state.healthStatus}`);
    }
  });

  // 监听交易数据更新
  const unsubscribeTrade = useTradeStore.subscribe((state, prevState) => {
    const prevCount = prevState?.signals.length || 0;
    const currentCount = state.signals.length;
    if (currentCount !== prevCount) {
      console.log(`交易信号数量变化: ${prevCount} -> ${currentCount}`);
    }
  });

  // 返回清理函数
  return () => {
    unsubscribeAuth();
    unsubscribeSystem();
    unsubscribeTrade();
  };

  console.log('Store监听器已设置');
};

// 兼容性导出（保持向后兼容）
import { useAuthStore } from './modules/auth.store';
import { useConfigStore } from './modules/config.store';
import { useTradeStore } from './modules/trade.store';
import { useSystemStore } from './modules/system.store';
import { useWebSocketStore } from './modules/websocket.store';

// 导出store实例（如果需要直接访问）
export {
  useAuthStore,
  useConfigStore,
  useTradeStore,
  useSystemStore,
  useWebSocketStore,
};

// 默认导出（为兼容旧代码）
import { useAuth } from './modules/auth.store';
import { useConfig } from './modules/config.store';
import { useTrade } from './modules/trade.store';
import { useSystem, usePerformance } from './modules/system.store';
import { useSignals, useOrders, useIndicators, useStrategies } from './modules/trade.store';
import { useWebSocket, useWebSocketConnection, useRealTimeData, useWebSocketConfig } from './modules/websocket.store';

// 重新导出所有hooks
export {
  useAuth,
  useConfig,
  useTrade,
  useSystem,
  usePerformance,
  useSignals,
  useOrders,
  useIndicators,
  useStrategies,
  useWebSocket,
  useWebSocketConnection,
  useRealTimeData,
  useWebSocketConfig,
};

// 传统useStore兼容性导出（不建议使用）
import { create } from 'zustand';

// 警告：此实现不是真正的全局store，而是代理
const useLegacyStore = create(() => ({
  ...useAuthStore.getState(),
  ...useConfigStore.getState(),
  ...useTradeStore.getState(),
  ...useSystemStore.getState(),
}));

export { useLegacyStore as useStore };

// 类型导出
export type { UserConfig, TradingSignal, Order, GoldIndicator, StrategyDefinition, PerformanceMetrics } from '../types';