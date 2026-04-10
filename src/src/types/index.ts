// 类型定义

export interface TickData {
  symbol: string;
  timestamp: string;
  bid: number;
  ask: number;
  volume: number;
  spread: number;
}

export interface StrategyParameter {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'enum';
  defaultValue: any;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  description: string;
}

export interface StrategyDefinition {
  id: string;
  name: string;
  description: string;
  parameters: StrategyParameter[];
  timeframe: string;
  symbol: string;
}

export interface TradingSignal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  stopLoss: number;
  takeProfit: number;
  reason: string;
  generatedAt: string;
}

export interface PerformanceMetrics {
  tickCounter: number;
  throughputTps: number;
  latencyMs: number;
  uptimeSeconds: number;
  lastTick: string;
}

export interface GoldIndicator {
  timestamp: string;
  price: number;
  macd: number;
  macdSignal: number;
  rsi: number;
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  volatility: number;
  gapFactor: number;
}

export interface RiskMetric {
  symbol: string;
  positionSize: number;
  maxDrawdown: number;
  maxDailyLoss: number;
  currentPnl: number;
  dailyPnl: number;
  calculatedAt: string;
}

export interface Order {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export interface UserConfig {
  theme: 'neumorphism' | 'dark' | 'light';
  refreshInterval: number;
  autoTrade: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  notifications: boolean;
}