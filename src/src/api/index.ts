// API客户端配置
import axios from 'axios';
import type { TickData } from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8001';
const WS_BASE_URL = API_BASE_URL.replace('https', 'ws').replace('http', 'ws');

let authToken: string | null = null;

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// 认证API
export const authApi = {
  // 获取开发令牌（仅开发环境）
  async getDevToken() {
    const response = await apiClient.get('/api/auth/token');
    authToken = response.data.token;
    return response.data;
  },

  // 设置令牌
  setToken(token: string) {
    authToken = token;
  },

  // 清除令牌
  clearToken() {
    authToken = null;
  },
};

// Tick数据API
export const tickApi = {
  async sendTick(tickData: Omit<TickData, 'spread'>) {
    const response = await apiClient.post('/api/tick', {
      ...tickData,
      timestamp: new Date().toISOString(),
    });
    return response.data;
  },
};

// 策略API
export const strategyApi = {
  async generateStrategy(symbol: string = 'XAUUSD', timeframe: string = 'M1', parameters: any = {}) {
    const response = await apiClient.post('/api/strategy', {
      symbol,
      timeframe,
      parameters: {
        strategy_type: 'scalping',
        ...parameters,
      },
    });
    return response.data;
  },

  async getStrategies() {
    const response = await apiClient.get('/api/strategy');
    return response.data;
  },
};

// 指标API
export const indicatorApi = {
  async getGoldIndicators(timeframe: string = 'M1', limit: number = 100) {
    const response = await apiClient.get('/api/indicators/gold', {
      params: { timeframe, limit },
    });
    return response.data;
  },
};

// 性能API
export const performanceApi = {
  async getPerformanceMetrics() {
    const response = await apiClient.get('/api/performance/metrics');
    return response.data;
  },
};

// 配置API
export const configApi = {
  async getConfig() {
    const response = await apiClient.get('/api/config');
    return response.data;
  },
};

// 健康检查
export const healthApi = {
  async checkHealth() {
    const response = await apiClient.get('/api/health');
    return response.data;
  }
};

// WebSocket连接（实时数据）
export const createWebSocketConnection = (onMessage: (data: any) => void) => {
  const wsUrl = WS_BASE_URL + '/ws';
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('WebSocket连接已建立');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error('WebSocket消息解析失败:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket错误:', error);
  };

  ws.onclose = () => {
    console.log('WebSocket连接已断开');
  };

  return {
    close: () => ws.close(),
    send: (data: any) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    }
  };
};
