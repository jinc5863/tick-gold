/**
 * 统一的状态管理工厂函数
 *
 * 提供标准化的中间件组合：devtools + persist + immer
 * 简化store创建，统一配置管理
 */

import { create, StateCreator, StoreApi, UseBoundStore } from 'zustand';
import { devtools, persist, PersistOptions } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

/**
 * 应用store配置选项
 */
export interface AppStoreConfig<T> {
  /** store名称，用于persist和devtools标识 */
  name: string;
  /** 存储前缀，默认为'tick-gold' */
  storagePrefix?: string;
  /** persist中间件配置 */
  persistConfig?: Partial<PersistOptions<T>>;
  /** 是否启用devtools，默认为true */
  enableDevtools?: boolean;
  /** 是否启用persist，默认为true */
  enablePersist?: boolean;
  /** 是否启用immer，默认为true */
  enableImmer?: boolean;
  /** devtools配置 */
  devtoolsConfig?: {
    name?: string;
    [key: string]: any;
  };
}

/**
 * 默认的store配置
 */
export const DEFAULT_STORE_CONFIG: Partial<AppStoreConfig<any>> = {
  storagePrefix: 'tick-gold',
  enableDevtools: true,
  enablePersist: true,
  enableImmer: true,
  devtoolsConfig: {
    name: 'App Store',
  },
};

/**
 * 创建带有一致中间件配置的应用store
 *
 * @param storeCreator store的创建函数
 * @param config store配置
 * @returns Zustand store实例
 */
export function createAppStore<T extends object>(
  storeCreator: StateCreator<T>,
  config: AppStoreConfig<T>
): UseBoundStore<StoreApi<T>> {
  const {
    name,
    storagePrefix = 'tick-gold',
    persistConfig = {},
    enableDevtools = true,
    enablePersist = true,
    enableImmer = true,
    devtoolsConfig = {},
  } = { ...DEFAULT_STORE_CONFIG, ...config };

  // 构建store名称
  const storeName = `${storagePrefix}-${name.toLowerCase().replace(/\s+/g, '-')}-store`;

  // 应用中间件链
  let store: any = storeCreator;

  // 应用immer中间件（如果需要）
  if (enableImmer) {
    store = immer(store);
  }

  // 应用persist中间件（如果需要）
  if (enablePersist) {
    store = persist(store, {
      name: storeName,
      ...persistConfig,
    });
  }

  // 应用devtools中间件（如果需要）
  if (enableDevtools) {
    store = devtools(store, {
      name: config.devtoolsConfig?.name || name,
      ...devtoolsConfig,
    });
  }

  // 创建并返回store实例
  return create<T>()(store);
}

/**
 * 为特定模块创建标准化的store配置
 *
 * @param moduleName 模块名称
 * @returns 标准化的store配置
 */
export function createModuleConfig<T>(moduleName: string): AppStoreConfig<T> {
  return {
    name: moduleName,
    storagePrefix: 'tick-gold',
    enableDevtools: true,
    enablePersist: true,
    enableImmer: true,
    devtoolsConfig: {
      name: `${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} Store`,
    },
    persistConfig: {
      version: 1,
    },
  };
}

/**
 * 快捷函数：创建认证store
 */
// 快捷函数：创建认证store
export function createAuthStore<T extends object>(
  storeCreator: StateCreator<T>
): UseBoundStore<StoreApi<T>> {
  return createAppStore(storeCreator, createModuleConfig<T>('auth'));
}

/**
 * 快捷函数：创建配置store
 */
export function createConfigStore<T extends object>(
  storeCreator: StateCreator<T>
): UseBoundStore<StoreApi<T>> {
  return createAppStore(storeCreator, createModuleConfig<T>('config'));
}

/**
 * 快捷函数：创建交易store
 */
export function createTradeStore<T extends object>(
  storeCreator: StateCreator<T>
): UseBoundStore<StoreApi<T>> {
  return createAppStore(storeCreator, {
    ...createModuleConfig<T>('trade'),
    persistConfig: {
      version: 1,
      // 交易数据只保存最近的数据
      partialize: (state: any) => ({
        signals: state.signals || [],
        orders: state.orders || [],
        indicators: (state.indicators || []).slice(0, 100),
        strategies: state.strategies || [],
      }),
    },
  });
}

/**
 * 快捷函数：创建系统store
 */
export function createSystemStore<T extends object>(
  storeCreator: StateCreator<T>
): UseBoundStore<StoreApi<T>> {
  return createAppStore(storeCreator, {
    ...createModuleConfig<T>('system'),
    persistConfig: {
      version: 1,
      // 系统数据保存更多历史
      partialize: (state: any) => ({
        healthStatus: state.healthStatus,
        performance: state.performance,
        performanceHistory: (state.performanceHistory || []).slice(-20),
        avgResponseTime: state.avgResponseTime,
        cpuUsage: state.cpuUsage,
        memoryUsage: state.memoryUsage,
        networkLatency: state.networkLatency,
        isConnected: state.isConnected,
        webSocketConnected: state.webSocketConnected,
        apiConnected: state.apiConnected,
        uptime: state.uptime,
      }),
    },
  });
}