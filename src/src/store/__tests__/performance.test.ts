/**
 * 性能优化测试
 *
 * 验证性能优化工具的正确性
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// 导入性能优化工具
import {
  createOptimizedSelector,
  createOptimizedSelectors,
  createObjectSelector,
  comparators,
  performanceMonitor,
} from '../performance';

// 导入测试用的store
import { useConfigStore } from '../modules/config.store';
import { useTradeStore } from '../modules/trade.store';

describe('性能优化工具测试', () => {
  beforeEach(() => {
    // 重置store状态
    useConfigStore.getState().resetConfig?.();
    useTradeStore.getState().clearTradeError?.();
    performanceMonitor.reset();
  });

  afterEach(() => {
    performanceMonitor.reset();
  });

  describe('1. 比较函数测试', () => {
    it('shallow比较应该正确工作', () => {
      const a = { x: 1, y: 2, z: { nested: 3 } };
      const b = { x: 1, y: 2, z: { nested: 3 } };
      const c = { x: 1, y: 3, z: { nested: 3 } };

      // 相同对象
      expect(comparators.shallow(a, a)).toBe(true);

      // 相同值但不同引用（浅比较应该返回false，因为z是嵌套对象）
      expect(comparators.shallow(a, b)).toBe(false);

      // 不同值
      expect(comparators.shallow(a, c)).toBe(false);
    });

    it('ignoreFunctions比较应该忽略函数变化', () => {
      const a = { data: 1, action: () => {} };
      const b = { data: 1, action: () => {} }; // 不同的函数引用
      const c = { data: 2, action: () => {} };

      // 数据相同，函数不同（应该返回true）
      expect(comparators.shallowIgnoreFunctions(a, b)).toBe(true);

      // 数据不同（应该返回false）
      expect(comparators.shallowIgnoreFunctions(a, c)).toBe(false);
    });

    it('arrayShallow比较应该正确工作', () => {
      const a = [1, 2, 3];
      const b = [1, 2, 3];
      const c = [1, 2, 4];
      const d = [1, 2, 3, 4];

      // 相同引用
      expect(comparators.arrayShallow(a, a)).toBe(true);

      // 相同值但不同引用
      expect(comparators.arrayShallow(a, b)).toBe(true);

      // 不同值
      expect(comparators.arrayShallow(a, c)).toBe(false);

      // 长度不同
      expect(comparators.arrayShallow(a, d)).toBe(false);
    });
  });

  describe('2. 优化选择器测试', () => {
    it('createOptimizedSelector应该创建优化的选择器', () => {
      const useUserConfig = createOptimizedSelector(
        useConfigStore,
        (state) => state.userConfig
      );

      const { result, rerender } = renderHook(() => useUserConfig());

      const initialValue = result.current;

      // 更新不相关的配置
      act(() => {
        useConfigStore.getState().updateUiConfig({
          collapsed: true,
        });
      });

      rerender();

      // userConfig应该保持相同的引用（使用浅比较优化）
      expect(result.current).toBe(initialValue);
    });

    it('createObjectSelector应该创建对象选择器', () => {
      const useConfigSummary = createObjectSelector(
        useConfigStore,
        (state) => ({
          theme: state.userConfig.theme,
          language: state.uiConfig.language,
        })
      );

      const { result, rerender } = renderHook(() => useConfigSummary());

      const initialValue = result.current;

      // 更新不相关的配置
      act(() => {
        useConfigStore.getState().updateTradeConfig({
          defaultQuantity: 0.2,
        });
      });

      rerender();

      // 应该保持相同的对象引用
      expect(result.current).toBe(initialValue);
    });

    it('createOptimizedSelectors应该创建多个优化选择器', () => {
      const selectors = createOptimizedSelectors(useConfigStore, {
        userConfig: (state) => state.userConfig,
        uiConfig: (state) => state.uiConfig,
        tradeConfig: (state) => state.tradeConfig,
      });

      // 测试每个选择器
      Object.entries(selectors).forEach(([key, useSelector]) => {
        const { result, rerender } = renderHook(() => useSelector());

        const initialValue = result.current;

        // 更新不相关的配置
        act(() => {
          if (key === 'userConfig') {
            useConfigStore.getState().updateNotificationConfig({
              pushNotifications: false,
            });
          } else {
            useConfigStore.getState().updateUserConfig({
              theme: 'dark',
            });
          }
        });

        rerender();

        // 应该保持相同的引用（如果选择的值没变）
        expect(result.current).toBe(initialValue);
      });
    });
  });

  describe('3. 性能监控测试', () => {
    it('应该能监控选择器调用次数', () => {
      const monitoredSelector = performanceMonitor.createMonitoredSelector(
        useConfigStore,
        (state) => state.userConfig,
        'user-config-selector'
      );

      // 调用选择器多次
      renderHook(() => monitoredSelector());
      renderHook(() => monitoredSelector());
      renderHook(() => monitoredSelector());

      const stats = performanceMonitor.getStats();
      expect(stats.selectorCalls['user-config-selector']).toBe(3);
    });

    it('应该能记录重新渲染次数', () => {
      // 手动记录重新渲染（实际使用中应该在React组件中记录）
      const componentName = 'TestComponent';
      const currentCount = performanceMonitor.rerenderCounts.get(componentName) || 0;
      performanceMonitor.rerenderCounts.set(componentName, currentCount + 1);

      const stats = performanceMonitor.getStats();
      expect(stats.rerenderCounts[componentName]).toBe(1);
    });

    it('应该能重置监控数据', () => {
      // 先记录一些数据
      performanceMonitor.selectorCalls.set('test-selector', 5);
      performanceMonitor.rerenderCounts.set('test-component', 3);

      // 重置
      performanceMonitor.reset();

      const stats = performanceMonitor.getStats();
      expect(stats.selectorCalls).toEqual({});
      expect(stats.rerenderCounts).toEqual({});
    });
  });

  describe('4. 实际性能场景测试', () => {
    it('高频更新时应该避免不必要的重新渲染', async () => {
      const useConfigActions = createOptimizedSelector(
        useConfigStore,
        (state) => ({
          updateUserConfig: state.updateUserConfig,
          updateUiConfig: state.updateUiConfig,
          resetConfig: state.resetConfig,
        })
      );

      const { result, rerender } = renderHook(() => useConfigActions());
      const initialActions = result.current;

      // 模拟高频状态更新
      for (let i = 0; i < 10; i++) {
        act(() => {
          useConfigStore.getState().updateUserConfig({
            refreshInterval: 5000 + i * 1000,
          });
        });
      }

      rerender();

      // 动作函数应该保持相同的引用（因为它们没有改变）
      expect(result.current.updateUserConfig).toBe(initialActions.updateUserConfig);
      expect(result.current.updateUiConfig).toBe(initialActions.updateUiConfig);
      expect(result.current.resetConfig).toBe(initialActions.resetConfig);
    });

    it('大型数组数据应该高效处理', async () => {
      const useSignalData = createOptimizedSelector(
        useTradeStore,
        (state) => ({
          signals: state.signals,
          isFetching: state.isFetchingSignals,
        }),
        comparators.shallowIgnoreFunctions
      );

      const { result, rerender } = renderHook(() => useSignalData());

      // 加载大量数据
      await act(async () => {
        await useTradeStore.getState().fetchSignals();
      });

      rerender();

      expect(result.current.signals.length).toBeGreaterThan(0);
      expect(result.current.isFetching).toBe(false);

      // 再次获取数据（应该是新的数组引用）
      const previousSignals = result.current.signals;

      await act(async () => {
        await useTradeStore.getState().fetchSignals();
      });

      rerender();

      // signals数组应该是新的引用
      expect(result.current.signals).not.toBe(previousSignals);
    });

    it('部分更新应该只影响相关选择器', () => {
      // 创建多个选择器
      const useUserConfig = createOptimizedSelector(
        useConfigStore,
        (state) => state.userConfig
      );

      const useUiConfig = createOptimizedSelector(
        useConfigStore,
        (state) => state.uiConfig
      );

      const useTradeConfig = createOptimizedSelector(
        useConfigStore,
        (state) => state.tradeConfig
      );

      // 初始渲染
      const userHook = renderHook(() => useUserConfig());
      const uiHook = renderHook(() => useUiConfig());
      const tradeHook = renderHook(() => useTradeConfig());

      const initialUserConfig = userHook.result.current;
      const initialUiConfig = uiHook.result.current;
      const initialTradeConfig = tradeHook.result.current;

      // 只更新uiConfig
      act(() => {
        useConfigStore.getState().updateUiConfig({
          collapsed: true,
        });
      });

      // 重新渲染所有hooks
      userHook.rerender();
      uiHook.rerender();
      tradeHook.rerender();

      // 只有uiConfig应该改变
      expect(userHook.result.current).toBe(initialUserConfig);
      expect(uiHook.result.current).not.toBe(initialUiConfig);
      expect(tradeHook.result.current).toBe(initialTradeConfig);

      // 验证uiConfig确实改变了
      expect(uiHook.result.current.collapsed).toBe(true);
    });
  });

  describe('5. 边界条件测试', () => {
    it('应该处理空状态', () => {
      const emptyStore = {
        getState: () => ({}),
      } as any;

      const selector = createOptimizedSelector(
        emptyStore,
        (state: any) => state.nonExistent
      );

      const { result } = renderHook(() => selector());
      expect(result.current).toBeUndefined();
    });

    it('应该处理null和undefined值', () => {
      const testStore = {
        getState: () => ({
          nullValue: null,
          undefinedValue: undefined,
          objectValue: { x: 1 },
        }),
      } as any;

      const selector = createOptimizedSelector(
        testStore,
        (state: any) => ({
          nullValue: state.nullValue,
          undefinedValue: state.undefinedValue,
          objectValue: state.objectValue,
        })
      );

      const { result } = renderHook(() => selector());
      expect(result.current.nullValue).toBeNull();
      expect(result.current.undefinedValue).toBeUndefined();
      expect(result.current.objectValue).toEqual({ x: 1 });
    });

    it('自定义比较函数应该正确工作', () => {
      const customComparator = (a: any, b: any) => {
        // 只比较特定字段
        return a?.data === b?.data;
      };

      const useCustomSelector = createOptimizedSelector(
        useConfigStore,
        (state) => ({
          data: state.userConfig.theme,
          timestamp: Date.now(), // 每次都会改变
        }),
        customComparator
      );

      const { result, rerender } = renderHook(() => useCustomSelector());
      const initialValue = result.current;

      // 更新不相关的配置（theme不变）
      act(() => {
        useConfigStore.getState().updateUiConfig({
          collapsed: true,
        });
      });

      rerender();

      // 由于自定义比较器只比较data字段，所以应该返回相同的引用
      expect(result.current).toBe(initialValue);
      expect(result.current.data).toBe('neumorphism');
    });
  });
});