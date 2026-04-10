# 状态管理架构文档

## 概述

本项目使用 **Zustand** 作为状态管理库，采用模块化、工厂化、性能优化的架构设计。

## 架构设计

### 1. 模块化设计
```
src/store/
├── factory.ts          # 统一中间件工厂
├── performance.ts      # 性能优化工具
├── index.ts           # store入口和工具函数
└── modules/           # 模块化store
    ├── auth.store.ts      # 认证状态
    ├── config.store.ts    # 配置状态
    ├── trade.store.ts     # 交易状态
    └── system.store.ts    # 系统状态
```

### 2. 中间件栈
每个store都使用标准化的中间件栈：
```
devtools → persist → immer → store
```

**功能**:
- `devtools`: Redux DevTools调试支持
- `persist`: 状态持久化（localStorage）
- `immer`: 简化不可变更新

### 3. 性能优化
- **浅比较选择器**: 使用 `shallow` 避免不必要的重新渲染
- **选择器工厂**: 预定义优化的选择器hooks
- **监控工具**: 可选性能监控

## 使用方法

### 创建新的store

```typescript
// 使用工厂函数创建store
import { createAppStore } from './store/factory';

export const useMyStore = createAppStore<MyState>(
  (set, get) => ({
    // store逻辑...
  }),
  {
    name: 'my-store',
    persistConfig: {
      version: 1,
      partialize: (state) => ({
        // 选择需要持久化的字段
      }),
    },
  }
);
```

### 使用优化选择器

```typescript
// 基本使用（带浅比较）
import { shallow } from 'zustand/shallow';

const useMyData = () => useMyStore(
  (state) => ({
    data: state.data,
    isLoading: state.isLoading,
    actions: state.actions,
  }),
  shallow // 浅比较优化
);

// 使用性能工具
import { createOptimizedSelector } from './store/performance';

const useOptimizedData = createOptimizedSelector(
  useMyStore,
  (state) => state.data
);
```

### 模块快捷函数

```typescript
import { createAuthStore } from './store/factory';    // 认证store
import { createConfigStore } from './store/factory';  // 配置store
import { createTradeStore } from './store/factory';   // 交易store
import { createSystemStore } from './store/factory';  // 系统store
```

## Store设计模式

### 1. 状态结构
```typescript
interface StoreState {
  // 数据状态
  data: DataType[];
  
  // 加载状态
  isLoading: boolean;
  isFetching: boolean;
  
  // 错误状态
  error: string | null;
  
  // 时间戳
  lastUpdate: Date | null;
  
  // 动作（action）
  fetchData: () => Promise<void>;
  updateData: (data: Partial<DataType>) => void;
  clearError: () => void;
}
```

### 2. Immer优化更新
```typescript
// 旧方式
updateData: (newData) => {
  set((state) => ({
    data: { ...state.data, ...newData },
  }));
},

// Immer方式（更简洁）
updateData: (newData) => {
  set((state) => {
    Object.assign(state.data, newData);
  });
},
```

### 3. 异步操作模式
```typescript
fetchData: async () => {
  set({ isLoading: true, error: null });
  
  try {
    const data = await api.fetchData();
    set({ 
      data,
      isLoading: false,
      lastUpdate: new Date(),
    });
  } catch (error) {
    set({ 
      error: error.message,
      isLoading: false,
    });
  }
},
```

## 性能最佳实践

### 1. 选择器优化
✅ **推荐**:
```typescript
const usePartialData = () => useStore(
  (state) => ({ data: state.data, isLoading: state.isLoading }),
  shallow // 浅比较
);
```

❌ **避免**:
```typescript
const useAllData = () => useStore((state) => state); // 订阅整个store
```

### 2. 数据分割
```typescript
// 大型数据分割为多个store
const useUserStore = createUserStore(...);
const useProductStore = createProductStore(...);
const useOrderStore = createOrderStore(...);
```

### 3. 防抖和节流
```typescript
// 高频更新的store使用防抖
const useRealTimeData = createAppStore<RealTimeState>(...);

// 在组件中使用防抖
useEffect(() => {
  const timeoutId = setTimeout(() => {
    updateData(newData);
  }, 100);
  
  return () => clearTimeout(timeoutId);
}, [newData]);
```

## 调试和监控

### 1. Redux DevTools
1. 安装Chrome/Firefox Redux DevTools扩展
2. 启动应用
3. 打开DevTools → Redux标签页
4. 查看4个store的状态树

### 2. 性能监控
```typescript
import { performanceMonitor } from './store/performance';

// 监控选择器调用
const monitoredSelector = performanceMonitor.createMonitoredSelector(
  useStore,
  (state) => state.data,
  'data-selector'
);

// 查看统计
console.log(performanceMonitor.getStats());
```

## 常见问题

### Q: 状态更新但组件不重新渲染？
A: 检查是否使用了 `shallow` 比较，确认依赖的状态字段确实发生了变化。

### Q: 持久化的数据不正确？
A: 检查 `partialize` 配置，确保正确选择了需要持久化的字段。

### Q: 异步操作状态管理混乱？
A: 使用标准的 `isLoading/error/lastUpdate` 模式，确保状态完备。

### Q: 如何添加新的中间件？
A: 在 `factory.ts` 的 `createAppStore` 函数中添加新的中间件层。

## 版本管理

每个store都有 `version` 配置，数据结构改变时需要更新版本：
```typescript
persistConfig: {
  version: 2, // 更新版本号
  migrate: (persistedState, version) => {
    // 迁移逻辑
    if (version === 1) {
      return migrateFromV1(persistedState);
    }
    return persistedState;
  },
},
```

## 扩展建议

### 1. 添加TypeScript类型生成
```typescript
// 自动生成store类型定义
generateStoreTypes();
```

### 2. 添加E2E测试
```typescript
// 使用Cypress或Playwright测试store
testStoreIntegration();
```

### 3. 添加状态快照
```typescript
// 状态历史记录和时间旅行
addStateSnapshotSupport();
```

---

**最后更新**: 2026-04-07  
**架构版本**: v2.0  
**维护者**: Claude Code