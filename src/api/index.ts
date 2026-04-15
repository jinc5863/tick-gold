import axios from 'axios';
import type {
  DataCleanParams,
  TickQueryParams,
  FactorAnalyzeParams,
  BacktestParams,
  RiskCheckParams,
} from '../types';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000') + '/api/v1',
  timeout: 30000,
});

export default api;

// 数据API
export const dataAPI = {
  import: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/data/import', formData);
  },
  clean: (config: DataCleanParams) => api.post('/data/clean', config),
  getTicks: (params: TickQueryParams) => api.get('/data/ticks', { params }),
};

// 因子API
export const factorAPI = {
  getFactors: () => api.get('/factors'),
  analyze: (data: FactorAnalyzeParams) => api.post('/factors/analyze', data),
};

// 策略API
export const strategyAPI = {
  backtest: (config: BacktestParams) => api.post('/strategy/backtest', config),
};

// 风控API
export const riskAPI = {
  check: (params: RiskCheckParams) => api.post('/risk/check', params),
};
