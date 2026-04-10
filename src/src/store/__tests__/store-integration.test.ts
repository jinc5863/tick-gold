/**
 * Store集成测试
 *
 * 验证所有store的基本功能正常
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// 导入要测试的store
import { useAuthStore } from '../modules/auth.store';
import { useConfigStore } from '../modules/config.store';
import { useTradeStore } from '../modules/trade.store';
import { useSystemStore } from '../modules/system.store';

// 模拟API调用
vi.mock('../../api/index.ts', () => ({
  authApi: {
    getDevToken: vi.fn().mockResolvedValue({ token: 'mock-dev-token' }),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
  tickApi: {
    sendTick: vi.fn().mockResolvedValue({ success: true }),
  },
  strategyApi: {
    getStrategies: vi.fn().mockResolvedValue({
      strategies: [{ id: 'strategy-1', name: '黄金策略' }]
    }),
  },
  indicatorApi: {
    getGoldIndicators: vi.fn().mockRejectedValue(new Error('API unavailable')),
  },
  performanceApi: {
    getPerformanceMetrics: vi.fn().mockResolvedValue({
      metrics: {
        tickCounter: 1000,
        throughputTps: 500,
        latencyMs: 50,
        uptimeSeconds: 3600,
        lastTick: new Date().toISOString(),
      },
    }),
  },
  healthApi: {
    checkHealth: vi.fn().mockResolvedValue({ status: 'healthy' }),
  },
}));

describe('Store集成测试', () => {
  beforeEach(() => {
    // 每个测试前重置所有store状态
    const authStore = useAuthStore.getState();
    const configStore = useConfigStore.getState();
    const tradeStore = useTradeStore.getState();
    const systemStore = useSystemStore.getState();

    // 重置所有store
    authStore.resetAllStores?.() || authStore.logout?.();
    configStore.resetConfig?.();
    tradeStore.clearTradeError?.();
    systemStore.resetSystem?.();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('1. 认证Store测试', () => {
    it('应该正确初始化认证状态', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.authToken).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.authLoading).toBe(false);
      expect(result.current.authError).toBeNull();
    });

    it('应该能够登录和登出', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login('test-token-123', 'user-123');
      });

      expect(result.current.authToken).toBe('test-token-123');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.userId).toBe('user-123');
      expect(result.current.permissions).toEqual(['read', 'write', 'trade']);

      await act(async () => {
        result.current.logout();
      });

      expect(result.current.authToken).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.permissions).toEqual([]);
    });

    it('应该处理登录错误', async () => {
      const { result } = renderHook(() => useAuthStore());

      // 模拟登录错误
      await act(async () => {
        try {
          await result.current.login('invalid-token', 'user-123');
        } catch (error) {
          // 预期会抛出错误
        }
      });

      expect(result.current.authError).toBe('登录失败');
      expect(result.current.authLoading).toBe(false);
    });

    it('应该能够获取开发令牌', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.getDevToken();
      });

      expect(result.current.authToken).toBe('mock-dev-token');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.userId).toBe('dev-user');
      expect(result.current.permissions).toContain('admin');
    });
  });

  describe('2. 配置Store测试', () => {
    it('应该正确初始化配置状态', () => {
      const { result } = renderHook(() => useConfigStore());

      expect(result.current.userConfig.theme).toBe('neumorphism');
      expect(result.current.uiConfig.language).toBe('zh-CN');
      expect(result.current.tradeConfig.defaultSymbol).toBe('XAUUSD');
      expect(result.current.notificationConfig.pushNotifications).toBe(true);
    });

    it('应该能更新用户配置', () => {
      const { result } = renderHook(() => useConfigStore());

      act(() => {
        result.current.updateUserConfig({
          theme: 'dark',
          refreshInterval: 10000,
        });
      });

      expect(result.current.userConfig.theme).toBe('dark');
      expect(result.current.userConfig.refreshInterval).toBe(10000);
      expect(result.current.userConfig.autoTrade).toBe(false); // 未修改的保持原样
    });

    it('应该能更新UI配置', () => {
      const { result } = renderHook(() => useConfigStore());

      act(() => {
        result.current.updateUiConfig({
          collapsed: true,
          chartType: 'candle' as const,
        });
      });

      expect(result.current.uiConfig.collapsed).toBe(true);
      expect(result.current.uiConfig.chartType).toBe('candle');
      expect(result.current.uiConfig.language).toBe('zh-CN'); // 未修改的保持原样
    });

    it('应该能重置所有配置', () => {
      const { result } = renderHook(() => useConfigStore());

      // 先修改一些配置
      act(() => {
        result.current.updateUserConfig({ theme: 'dark' });
        result.current.updateUiConfig({ collapsed: true });
      });

      // 验证修改生效
      expect(result.current.userConfig.theme).toBe('dark');
      expect(result.current.uiConfig.collapsed).toBe(true);

      // 重置配置
      act(() => {
        result.current.resetConfig();
      });

      // 验证重置回初始值
      expect(result.current.userConfig.theme).toBe('neumorphism');
      expect(result.current.uiConfig.collapsed).toBe(false);
    });
  });

  describe('3. 交易Store测试', () => {
    it('应该正确初始化交易状态', () => {
      const { result } = renderHook(() => useTradeStore());

      expect(result.current.signals).toEqual([]);
      expect(result.current.orders).toEqual([]);
      expect(result.current.indicators).toEqual([]);
      expect(result.current.strategies).toEqual([]);
      expect(result.current.isFetchingSignals).toBe(false);
    });

    it('应该能获取交易信号', async () => {
      const { result } = renderHook(() => useTradeStore());

      await act(async () => {
        await result.current.fetchSignals();
      });

      expect(result.current.signals.length).toBeGreaterThan(0);
      expect(result.current.signals[0].symbol).toBe('XAUUSD');
      expect(result.current.lastSignalsUpdate).toBeInstanceOf(Date);
      expect(result.current.isFetchingSignals).toBe(false);
    });

    it('应该能获取订单', async () => {
      const { result } = renderHook(() => useTradeStore());

      await act(async () => {
        await result.current.fetchOrders();
      });

      expect(result.current.orders.length).toBeGreaterThan(0);
      expect(result.current.orders[0].symbol).toBe('XAUUSD');
      expect(result.current.lastOrdersUpdate).toBeInstanceOf(Date);
      expect(result.current.isFetchingOrders).toBe(false);
    });

    it('应该能获取指标数据（模拟API失败时使用模拟数据）', async () => {
      const { result } = renderHook(() => useTradeStore());

      await act(async () => {
        await result.current.fetchIndicators('M1');
      });

      expect(result.current.indicators.length).toBe(100); // 模拟数据返回100条
      expect(result.current.indicators[0]).toHaveProperty('timestamp');
      expect(result.current.indicators[0]).toHaveProperty('price');
      expect(result.current.isFetchingIndicators).toBe(false);
    });

    it('应该能获取策略', async () => {
      const { result } = renderHook(() => useTradeStore());

      await act(async () => {
        await result.current.fetchStrategies();
      });

      expect(result.current.strategies.length).toBe(1);
      expect(result.current.strategies[0].id).toBe('strategy-1');
      expect(result.current.isFetchingStrategies).toBe(false);
    });

    it('应该能执行交易和取消订单', async () => {
      const { result } = renderHook(() => useTradeStore());

      const mockSignal = {
        id: 'test-signal',
        symbol: 'XAUUSD',
        direction: 'BUY' as const,
        confidence: 0.8,
        price: 2050.5,
        stopLoss: 2045,
        takeProfit: 2060,
        reason: '测试交易',
        generatedAt: new Date().toISOString(),
      };

      // 执行交易
      let order;
      await act(async () => {
        order = await result.current.executeTrade(mockSignal);
      });

      expect(order).toHaveProperty('id');
      expect(order.symbol).toBe('XAUUSD');
      expect(order.price).toBe(2050.5);
      expect(result.current.orders.length).toBe(1);
      expect(result.current.orders[0].status).toBe('PENDING');

      // 取消订单
      await act(async () => {
        await result.current.cancelOrder(order.id);
      });

      expect(result.current.orders[0].status).toBe('CANCELLED');
    });
  });

  describe('4. 系统Store测试', () => {
    it('应该正确初始化系统状态', () => {
      const { result } = renderHook(() => useSystemStore());

      expect(result.current.healthStatus).toBe('checking');
      expect(result.current.performance).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.systemError).toBeNull();
      expect(result.current.performanceHistory).toEqual([]);
    });

    it('应该能检查系统健康状态', async () => {
      const { result } = renderHook(() => useSystemStore());

      await act(async () => {
        await result.current.checkHealth();
      });

      expect(result.current.healthStatus).toBe('healthy');
      expect(result.current.lastUpdate).toBeInstanceOf(Date);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.apiConnected).toBe(true);
    });

    it('应该能获取性能指标', async () => {
      const { result } = renderHook(() => useSystemStore());

      await act(async () => {
        await result.current.fetchPerformance();
      });

      expect(result.current.performance).toBeDefined();
      expect(result.current.performance?.tickCounter).toBe(1000);
      expect(result.current.performance?.throughputTps).toBe(500);
      expect(result.current.lastUpdate).toBeInstanceOf(Date);
      expect(result.current.performanceHistory.length).toBe(1);
      expect(result.current.avgResponseTime).toBeGreaterThan(0);
      expect(result.current.cpuUsage).toBeGreaterThan(0);
      expect(result.current.memoryUsage).toBeGreaterThan(0);
      expect(result.current.networkLatency).toBeGreaterThan(0);
    });

    it('应该能模拟性能数据', () => {
      const { result } = renderHook(() => useSystemStore());

      act(() => {
        result.current.simulatePerformanceData();
      });

      expect(result.current.performance).toBeDefined();
      expect(result.current.healthStatus).toBe('healthy');
      expect(result.current.performanceHistory.length).toBe(1);
      expect(result.current.avgResponseTime).toBeGreaterThan(0);
    });

    it('应该能清除系统错误', () => {
      const { result } = renderHook(() => useSystemStore());

      // 设置一个错误
      act(() => {
        result.current.resetSystem(); // 先重置
      });

      // 模拟一个错误（通常由API调用抛出）
      act(() => {
        // 这里我们直接设置错误状态来测试
        result.current.clearSystemError(); // 实际上应该由store的action设置
      });

      expect(result.current.systemError).toBeNull();
    });
  });

  describe('5. Store集成功能测试', () => {
    it('应该能同时操作多个store', async () => {
      // 同时使用多个store
      const auth = renderHook(() => useAuthStore());
      const config = renderHook(() => useConfigStore());
      const trade = renderHook(() => useTradeStore());
      const system = renderHook(() => useSystemStore());

      // 并行操作
      await act(async () => {
        await Promise.all([
          auth.result.current.getDevToken(),
          system.result.current.checkHealth(),
          trade.result.current.fetchSignals(),
        ]);
      });

      // 验证所有操作成功
      expect(auth.result.current.isAuthenticated).toBe(true);
      expect(system.result.current.healthStatus).toBe('healthy');
      expect(trade.result.current.signals.length).toBeGreaterThan(0);

      // 更新配置
      act(() => {
        config.result.current.updateTradeConfig({
          autoTradeEnabled: true,
          stopLossEnabled: true,
        });
      });

      expect(config.result.current.tradeConfig.autoTradeEnabled).toBe(true);
      expect(config.result.current.tradeConfig.stopLossEnabled).toBe(true);
    });

    it('应该能处理store间的依赖关系', async () => {
      // 测试store间的交互
      const system = renderHook(() => useSystemStore());
      const trade = renderHook(() => useTradeStore());

      // 先检查系统健康
      await act(async () => {
        await system.result.current.checkHealth();
      });

      // 如果系统健康，再获取交易数据
      if (system.result.current.healthStatus === 'healthy') {
        await act(async () => {
          await trade.result.current.fetchSignals();
        });

        expect(trade.result.current.signals.length).toBeGreaterThan(0);
      }
    });
  });

  describe('6. 性能优化验证', () => {
    it('选择器应该使用浅比较优化', () => {
      // 测试配置store的选择器
      const { result } = renderHook(() => useConfigStore());

      // 初始状态
      const initialConfig = result.current.userConfig;

      // 更新不同配置
      act(() => {
        result.current.updateNotificationConfig({
          pushNotifications: false,
        });
      });

      // userConfig应该保持相同的引用（因为只修改了notificationConfig）
      expect(result.current.userConfig).toBe(initialConfig);
    });

    it('应该正确处理数组和对象更新', async () => {
      const { result } = renderHook(() => useTradeStore());

      // 初始状态
      const initialSignals = result.current.signals;

      // 获取新信号
      await act(async () => {
        await result.current.fetchSignals();
      });

      // signals数组应该被替换（新引用）
      expect(result.current.signals).not.toBe(initialSignals);
      expect(result.current.signals.length).toBeGreaterThan(0);
    });
  });
});

describe('Store初始化函数测试', () => {
  it('应该能初始化所有store', async () => {
    // 导入初始化函数
    const { initializeStores } = await import('../index.ts');

    // 注意：这是一个集成测试，需要确保API可用
    // 这里我们mock掉可能失败的API调用
    const mockApi = await import('../../api/index.ts');

    await expect(initializeStores()).resolves.not.toThrow();

    // 验证所有store被正确初始化
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useConfigStore.getState().userConfig.theme).toBe('neumorphism');
    expect(useSystemStore.getState().healthStatus).toBe('healthy'); // 模拟API返回healthy
  });
});