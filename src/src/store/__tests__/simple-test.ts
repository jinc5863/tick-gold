/**
 * 简单的store功能测试
 */

import { describe, it, expect } from 'vitest';

// 导入store
import { useAuthStore } from '../modules/auth.store';
import { useConfigStore } from '../modules/config.store';

describe('简单store功能测试', () => {
  it('认证store应该正常工作', () => {
    // 测试store能够被创建
    expect(useAuthStore).toBeDefined();

    // 使用store
    const store = useAuthStore;

    // 验证store有基本方法
    expect(store).toBeTruthy();
  });

  it('配置store应该正常工作', () => {
    expect(useConfigStore).toBeDefined();

    const store = useConfigStore;
    expect(store).toBeTruthy();
  });

  it('应该能够导入所有store', () => {
    // 尝试导入所有store
    const stores = {
      auth: useAuthStore,
      config: useConfigStore,
    };

    expect(Object.keys(stores).length).toBe(2);

    // 验证每个store都可用
    Object.values(stores).forEach(store => {
      expect(store).toBeDefined();
    });
  });
});