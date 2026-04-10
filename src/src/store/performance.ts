/**
 * 性能优化工具
 *
 * 提供优化的选择器和hooks，减少不必要的重新渲染
 */

import { StoreApi, UseBoundStore } from 'zustand';
import { shallow } from 'zustand/shallow';

/**
 * 创建优化的选择器hook
 *
 * @param store Zustand store
 * @param selector 选择器函数
 * @param equalityFn 相等性比较函数，默认使用shallow
 * @returns 优化的selector hook
 */
export function createOptimizedSelector<T, U>(
  store: UseBoundStore<StoreApi<T>>,
  selector: (state: T) => U,
  equalityFn: (a: U, b: U) => boolean = shallow
) {
  return () => store(selector, equalityFn);
}

/**
 * 创建多个优化选择器的组合
 *
 * @param store Zustand store
 * @param selectors 选择器映射对象
 * @returns 包含所有优化选择器的对象
 */
export function createOptimizedSelectors<T, Selectors extends Record<string, (state: T) => any>>(
  store: UseBoundStore<StoreApi<T>>,
  selectors: Selectors
): {
  [K in keyof Selectors]: () => ReturnType<Selectors[K]>;
} {
  const result: any = {};

  Object.entries(selectors).forEach(([key, selector]) => {
    result[key] = createOptimizedSelector(store, selector);
  });

  return result;
}

/**
 * 为对象选择器创建浅比较优化的hook
 * 适用于需要返回对象的选择器
 *
 * @param store Zustand store
 * @param selector 返回对象的选择器函数
 * @returns 优化的object selector hook
 */
export function createObjectSelector<T, U extends object>(
  store: UseBoundStore<StoreApi<T>>,
  selector: (state: T) => U
) {
  return createOptimizedSelector(store, selector, shallow);
}

/**
 * 深度相等比较函数
 * 用于需要深度比较的场景
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

/**
 * 数组浅比较函数
 * 专门用于数组比较
 */
export function arrayShallowEqual<T>(a: T[], b: T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }

  return true;
}

/**
 * 创建针对特定类型的优化比较器
 */
export const comparators = {
  /** 默认浅比较 */
  shallow,
  /** 深比较 */
  deep: deepEqual,
  /** 数组浅比较 */
  arrayShallow: arrayShallowEqual,
  /** 忽略函数变化的浅比较（适用于包含action的对象） */
  shallowIgnoreFunctions(a: any, b: any): boolean {
    if (a === b) return true;

    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    if (aKeys.length !== bKeys.length) return false;

    for (const key of aKeys) {
      const aVal = a[key];
      const bVal = b[key];

      // 如果都是函数，跳过比较（假设函数不变）
      if (typeof aVal === 'function' && typeof bVal === 'function') {
        continue;
      }

      if (aVal !== bVal) {
        return false;
      }
    }

    return true;
  },
};

/**
 * Hooks工厂函数：创建优化的store hooks
 */
export function createOptimizedHooks<T>(store: UseBoundStore<StoreApi<T>>) {
  return {
    /** 创建优化选择器 */
    createSelector: <U>(selector: (state: T) => U, equalityFn = shallow) =>
      createOptimizedSelector(store, selector, equalityFn),

    /** 创建对象选择器 */
    createObjectSelector: <U extends object>(selector: (state: T) => U) =>
      createObjectSelector(store, selector),

    /** 获取store原始hook */
    useStore: store,
  };
}

/**
 * 性能监测工具
 */
export const performanceMonitor = {
  /** 记录选择器调用次数 */
  selectorCalls: new Map<string, number>(),

  /** 记录重新渲染次数 */
  rerenderCounts: new Map<string, number>(),

  /** 创建带监控的选择器 */
  createMonitoredSelector<T, U>(
    store: UseBoundStore<StoreApi<T>>,
    selector: (state: T) => U,
    name: string,
    equalityFn = shallow
  ) {
    const originalSelector = createOptimizedSelector(store, selector, equalityFn);

    return () => {
      const currentCalls = this.selectorCalls.get(name) || 0;
      this.selectorCalls.set(name, currentCalls + 1);

      return originalSelector();
    };
  },

  /** 获取监控数据 */
  getStats() {
    return {
      selectorCalls: Object.fromEntries(this.selectorCalls),
      rerenderCounts: Object.fromEntries(this.rerenderCounts),
    };
  },

  /** 重置监控数据 */
  reset() {
    this.selectorCalls.clear();
    this.rerenderCounts.clear();
  },
};

/**
 * 用于React.memo的相等性比较器
 */
export const memoComparators = {
  /** 浅比较，忽略函数 */
  shallowIgnoreFunctions: comparators.shallowIgnoreFunctions,

  /** 只比较特定属性 */
  pick<T extends object, K extends keyof T>(keys: K[]) {
    return (a: Pick<T, K>, b: Pick<T, K>): boolean => {
      for (const key of keys) {
        if (a[key] !== b[key]) return false;
      }
      return true;
    };
  },
};