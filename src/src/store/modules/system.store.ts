import { createSystemStore } from '../factory';
import { shallow } from 'zustand/shallow';
import { PerformanceMetrics } from '../../types';
import { performanceApi, healthApi } from '../../api';

export interface SystemState {
  // 系统状态
  healthStatus: 'healthy' | 'unhealthy' | 'checking';
  performance: PerformanceMetrics | null;
  lastUpdate: Date | null;
  isLoading: boolean;
  systemError: string | null;

  // 性能监控
  performanceHistory: Array<PerformanceMetrics & { timestamp: Date }>;
  avgResponseTime: number | null;
  uptime: number | null; // 系统运行时间(秒)

  // 资源监控
  cpuUsage: number | null;
  memoryUsage: number | null;
  networkLatency: number | null;

  // 连接状态
  isConnected: boolean;
  webSocketConnected: boolean;
  apiConnected: boolean;

  // 动作
  checkHealth: () => Promise<void>;
  fetchPerformance: () => Promise<void>;
  updateRealTimeData: () => Promise<void>;
  clearSystemError: () => void;
  resetSystem: () => void;
  simulatePerformanceData: () => void;
}

export const useSystemStore = createSystemStore<SystemState>(
  (set, get) => ({
    // 初始状态
    healthStatus: 'checking',
    performance: null,
    lastUpdate: null,
    isLoading: false,
    systemError: null,

    performanceHistory: [],
    avgResponseTime: null,
    uptime: null,

    cpuUsage: null,
    memoryUsage: null,
    networkLatency: null,

    isConnected: true,
    webSocketConnected: false,
    apiConnected: true,

    // 检查健康状态
    checkHealth: async () => {
      set({ isLoading: true, systemError: null });
      try {
        const status = await healthApi.checkHealth();
        set({
          healthStatus: 'healthy',
          lastUpdate: new Date(),
          isLoading: false,
          apiConnected: true,
        });
      } catch (error) {
        set({
          healthStatus: 'unhealthy',
          systemError: error instanceof Error ? error.message : '健康检查失败',
          isLoading: false,
          apiConnected: false,
        });
      }
    },

    // 获取性能指标
    fetchPerformance: async () => {
      set({ isLoading: true, systemError: null });
      try {
        const response = await performanceApi.getPerformanceMetrics();
        const performance = response.metrics;

        // 更新性能历史
        const performanceHistory = get().performanceHistory;
        const newHistory = [
          ...performanceHistory.slice(-9), // 保留最近10条记录
          { ...performance, timestamp: new Date() },
        ];

        // 计算平均响应时间
        const avgResponseTime = newHistory.length > 0
          ? newHistory.reduce((sum, item) => sum + item.latencyMs, 0) / newHistory.length
          : null;

        // 模拟资源使用率
        const cpuUsage = Math.random() * 30 + 10; // 10-40%
        const memoryUsage = Math.random() * 500 + 100; // 100-600MB
        const networkLatency = Math.random() * 50 + 20; // 20-70ms

        set({
          performance,
          lastUpdate: new Date(),
          performanceHistory: newHistory,
          avgResponseTime,
          cpuUsage,
          memoryUsage,
          networkLatency,
          isLoading: false,
        });
      } catch (error) {
        console.error('获取性能数据失败，使用模拟数据:', error);
        // 使用模拟数据
        get().simulatePerformanceData();
        set({ isLoading: false });
      }
    },

    // 更新实时数据
    updateRealTimeData: async () => {
      try {
        await Promise.all([
          get().checkHealth(),
          get().fetchPerformance(),
        ]);
      } catch (error) {
        console.error('实时数据更新失败:', error);
      }
    },

    // 清除系统错误
    clearSystemError: () => {
      set({ systemError: null });
    },

    // 重置系统状态
    resetSystem: () => {
      set({
        healthStatus: 'checking',
        performance: null,
        performanceHistory: [],
        isLoading: false,
        systemError: null,
        cpuUsage: null,
        memoryUsage: null,
        networkLatency: null,
      });
    },

    // 模拟性能数据
    simulatePerformanceData: () => {
      const mockMetrics: PerformanceMetrics = {
        tickCounter: Math.floor(Math.random() * 10000) + 5000,
        throughputTps: Math.floor(Math.random() * 1000) + 500,
        latencyMs: Math.floor(Math.random() * 50) + 10,
        uptimeSeconds: Math.floor(Math.random() * 86400) + 3600,
        lastTick: new Date().toISOString(),
      };

      // 更新性能历史
      const performanceHistory = get().performanceHistory;
      const newHistory = [
        ...performanceHistory.slice(-9),
        { ...mockMetrics, timestamp: new Date() },
      ];

      const avgResponseTime = newHistory.length > 0
        ? newHistory.reduce((sum, item) => sum + item.latencyMs, 0) / newHistory.length
        : null;

      const cpuUsage = Math.random() * 30 + 10;
      const memoryUsage = Math.random() * 500 + 100;
      const networkLatency = Math.random() * 50 + 20;

      set({
        performance: mockMetrics,
        lastUpdate: new Date(),
        performanceHistory: newHistory,
        avgResponseTime,
        cpuUsage,
        memoryUsage,
        networkLatency,
        healthStatus: 'healthy',
      });
    },
  }));

// 自定义hooks导出（使用浅比较优化）
export const useSystemHealth = () => useSystemStore((state) => ({
  healthStatus: state.healthStatus,
  isLoading: state.isLoading,
  systemError: state.systemError,
  lastUpdate: state.lastUpdate,
  checkHealth: state.checkHealth,
  clearSystemError: state.clearSystemError,
}), shallow);

export const usePerformance = () => useSystemStore((state) => ({
  performance: state.performance,
  performanceHistory: state.performanceHistory,
  avgResponseTime: state.avgResponseTime,
  cpuUsage: state.cpuUsage,
  memoryUsage: state.memoryUsage,
  networkLatency: state.networkLatency,
  fetchPerformance: state.fetchPerformance,
  simulatePerformanceData: state.simulatePerformanceData,
}), shallow);

export const useConnectionStatus = () => useSystemStore((state) => ({
  isConnected: state.isConnected,
  webSocketConnected: state.webSocketConnected,
  apiConnected: state.apiConnected,
  uptime: state.uptime,
}), shallow);

// 完整系统hooks（使用浅比较优化）
export const useSystem = () => useSystemStore((state) => ({
  healthStatus: state.healthStatus,
  performance: state.performance,
  lastUpdate: state.lastUpdate,
  isLoading: state.isLoading,
  systemError: state.systemError,
  performanceHistory: state.performanceHistory,
  avgResponseTime: state.avgResponseTime,
  cpuUsage: state.cpuUsage,
  memoryUsage: state.memoryUsage,
  networkLatency: state.networkLatency,
  isConnected: state.isConnected,
  webSocketConnected: state.webSocketConnected,
  apiConnected: state.apiConnected,
  uptime: state.uptime,
  checkHealth: state.checkHealth,
  fetchPerformance: state.fetchPerformance,
  updateRealTimeData: state.updateRealTimeData,
  clearSystemError: state.clearSystemError,
  resetSystem: state.resetSystem,
  simulatePerformanceData: state.simulatePerformanceData,
}), shallow);