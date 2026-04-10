import { createAuthStore } from '../factory';
import { authApi } from '../../api';
import { shallow } from 'zustand/shallow';

export interface AuthState {
  // 认证状态
  authToken: string | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: string | null;

  // 用户信息
  userId: string | null;
  permissions: string[];
  lastLogin: Date | null;

  // 动作
  login: (token: string, userId: string) => Promise<void>;
  logout: () => void;
  clearAuthError: () => void;
  getDevToken: () => Promise<void>;
}

export const useAuthStore = createAuthStore<AuthState>(
  (set, get) => ({
    // 初始状态
    authToken: null,
    isAuthenticated: false,
    authLoading: false,
    authError: null,
    userId: null,
    permissions: [],
    lastLogin: null,

    // 登录动作
    login: async (token: string, userId: string) => {
      set({ authLoading: true, authError: null });
      try {
        authApi.setToken(token);
        set({
          authToken: token,
          isAuthenticated: true,
          userId,
          permissions: ['read', 'write', 'trade'], // 默认权限
          lastLogin: new Date(),
          authLoading: false,
        });
      } catch (error) {
        set({
          authError: error instanceof Error ? error.message : '登录失败',
          authLoading: false,
        });
        throw error;
      }
    },

    // 登出动作
    logout: () => {
      authApi.clearToken();
      set({
        authToken: null,
        isAuthenticated: false,
        userId: null,
        permissions: [],
        lastLogin: null,
        authError: null,
      });
    },

    // 清除错误
    clearAuthError: () => {
      set({ authError: null });
    },

    // 获取开发令牌（仅开发环境）
    getDevToken: async () => {
      set({ authLoading: true, authError: null });
      try {
        const response = await authApi.getDevToken();
        set({
          authToken: response.token,
          isAuthenticated: true,
          userId: 'dev-user',
          permissions: ['read', 'write', 'trade', 'admin'],
          lastLogin: new Date(),
          authLoading: false,
        });
      } catch (error) {
        set({
          authError: error instanceof Error ? error.message : '开发令牌获取失败',
          authLoading: false,
        });
        console.warn('开发令牌获取失败，将以未认证模式运行:', error);
      }
    },
  })
);

// 自定义hooks导出
export const useAuth = () => useAuthStore((state) => ({
  authToken: state.authToken,
  isAuthenticated: state.isAuthenticated,
  authLoading: state.authLoading,
  authError: state.authError,
  userId: state.userId,
  permissions: state.permissions,
  lastLogin: state.lastLogin,
  login: state.login,
  logout: state.logout,
  clearAuthError: state.clearAuthError,
  getDevToken: state.getDevToken,
}), shallow);