import { useEffect, useRef, useCallback } from 'react';
import useStore from '../store';
import { tickApi } from '../api';

interface UseRealtimeDataOptions {
  enabled?: boolean;
  interval?: number;
  onTick?: (data: any) => void;
  onError?: (error: Error) => void;
}

export const useRealtimeData = (options: UseRealtimeDataOptions = {}) => {
  const {
    enabled = true,
    interval = 2000,
    onTick,
    onError,
  } = options;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const { userConfig, updateRealTimeData } = useStore();

  const startPolling = useCallback(() => {
    if (!enabled || intervalRef.current) return;

    const poll = async () => {
      try {
        // 更新本地数据
        await updateRealTimeData();

        // 发送模拟tick数据
        const mockTick = {
          symbol: 'XAUUSD',
          timestamp: new Date().toISOString(),
          bid: 2050 + (Math.random() - 0.5) * 2,
          ask: 2050.5 + (Math.random() - 0.5) * 2,
          volume: Math.random() * 10,
        };

        try {
          await tickApi.sendTick(mockTick);
          onTick?.(mockTick);
        } catch (tickError) {
          console.warn('发送tick数据失败:', tickError);
        }
      } catch (error) {
        console.error('轮询数据失败:', error);
        onError?.(error as Error);
      }
    };

    // 立即执行一次
    poll();

    // 设置定时器
    intervalRef.current = setInterval(poll, interval);
  }, [enabled, interval, updateRealTimeData, onTick, onError]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startWebSocket = useCallback(() => {
    if (!enabled || websocketRef.current) return;

    try {
      const wsUrl = 'ws://localhost:8000/ws';
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket连接已建立');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onTick?.(data);
        } catch (error) {
          console.error('WebSocket消息解析失败:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
        onError?.(new Error('WebSocket连接错误'));
      };

      ws.onclose = () => {
        console.log('WebSocket连接已关闭');
        // 重新连接
        setTimeout(() => {
          if (enabled) {
            startWebSocket();
          }
        }, 5000);
      };

      websocketRef.current = ws;
    } catch (error) {
      console.warn('WebSocket连接失败，将使用轮询模式:', error);
      startPolling();
    }
  }, [enabled, onTick, onError, startPolling]);

  const stopWebSocket = useCallback(() => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopPolling();
      stopWebSocket();
      return;
    }

    // 根据配置选择连接方式
    if (userConfig.autoTrade) {
      // 自动交易模式使用WebSocket
      startWebSocket();
      stopPolling();
    } else {
      // 观察模式使用轮询
      startPolling();
      stopWebSocket();
    }

    return () => {
      stopPolling();
      stopWebSocket();
    };
  }, [enabled, userConfig.autoTrade, startPolling, stopPolling, startWebSocket, stopWebSocket]);

  // 响应配置变化
  useEffect(() => {
    if (!enabled) return;

    const refreshInterval = userConfig.refreshInterval;

    // 重启轮询
    if (!userConfig.autoTrade) {
      stopPolling();
      startPolling();
    }

  }, [userConfig.refreshInterval, userConfig.autoTrade, enabled, startPolling, stopPolling]);

  return {
    start: () => {
      if (userConfig.autoTrade) {
        startWebSocket();
      } else {
        startPolling();
      }
    },
    stop: () => {
      stopPolling();
      stopWebSocket();
    },
    isConnected: !!intervalRef.current || !!websocketRef.current,
  };
};

// 用于特定组件的实时数据钩子
export const useGoldRealtimeData = () => {
  const { indicators, fetchIndicators } = useStore();

  const start = useCallback(async (timeframe?: string) => {
    await fetchIndicators(timeframe || 'M1');
  }, [fetchIndicators]);

  return {
    indicators,
    start,
  };
};

export const useSignalRealtimeData = () => {
  const { signals, fetchSignals } = useStore();

  const start = useCallback(async () => {
    await fetchSignals();
  }, [fetchSignals]);

  return {
    signals,
    start,
  };
};

// 性能监控钩子
export const usePerformanceMonitoring = () => {
  const [performance, fetchPerformance] = useStore((state) => [
    state.performance,
    state.fetchPerformance,
  ]);

  const startMonitoring = useCallback(async () => {
    await fetchPerformance();
  }, [fetchPerformance]);

  const getHealthStatus = useCallback(() => {
    if (!performance) return 'unknown';

    const { latencyMs, throughputTps } = performance;

    if (latencyMs > 100 || throughputTps < 10000) {
      return 'poor';
    } else if (latencyMs > 50 || throughputTps < 15000) {
      return 'warning';
    }

    return 'good';
  }, [performance]);

  return {
    performance,
    startMonitoring,
    healthStatus: getHealthStatus(),
  };
};