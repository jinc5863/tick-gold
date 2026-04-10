// 全局类型定义

// 交易时间周期
export type TimeframeType = 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1' | 'W1' | 'MN';

// 交易方向
export type TradeDirection = 'buy' | 'sell' | 'hold';

// 订单类型
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';

// 订单状态
export type OrderStatus = 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected';

// 策略类型
export type StrategyType = 'scalping' | 'trend_following' | 'gold_specific' | 'custom' | 'arbitrage' | 'hedging';

// 策略状态
export type StrategyStatus = 'running' | 'paused' | 'stopped' | 'error' | 'optimizing';

// 风险级别
export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';

// 市场状态
export type MarketStatus = 'open' | 'closed' | 'pre_open' | 'post_close' | 'halted';

// 交易对
export interface TradingPair {
  symbol: string;
  base: string;
  quote: string;
  precision: number;
  minLot: number;
  maxLot: number;
  lotStep: number;
  tickSize: number;
}

// K线数据
export interface OHLCData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  spread?: number;
}

// 交易信号
export interface TradeSignal {
  id: string;
  timestamp: Date;
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  confidence: number;
  timeframe: TimeframeType;
  strategy: string;
  reason?: string;
  riskRewardRatio?: number;
}

// 交易记录
export interface TradeRecord {
  id: string;
  symbol: string;
  direction: TradeDirection;
  entryTime: Date;
  entryPrice: number;
  exitTime?: Date;
  exitPrice?: number;
  quantity: number;
  commission?: number;
  swap?: number;
  profit?: number;
  profitPct?: number;
  status: OrderStatus;
  strategy: string;
  timeframe: TimeframeType;
  stopLoss?: number;
  takeProfit?: number;
  riskRewardRatio?: number;
}

// 策略配置
export interface StrategyConfig {
  id: string;
  name: string;
  description?: string;
  type: StrategyType;
  timeframe: TimeframeType;
  status: StrategyStatus;
  performance: StrategyPerformance;
  parameters: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
  isPublic?: boolean;
  riskLevel: RiskLevel;
  maxPositions: number;
  stopLoss: number;
  takeProfit: number;
  autoStart: boolean;
  notificationEnabled: boolean;
}

// 策略性能
export interface StrategyPerformance {
  totalReturn: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio?: number;
  tradesCount: number;
  profitableTrades: number;
  losingTrades: number;
  avgProfit: number;
  avgLoss: number;
  profitFactor?: number;
  consecutiveWins?: number;
  consecutiveLosses?: number;
  recoveryFactor?: number;
}

// 账户信息
export interface AccountInfo {
  id: string;
  name: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  leverage: number;
  currency: string;
  profit: number;
  profitPct: number;
  floatingProfit: number;
  usedMargin: number;
}

// 性能指标
export interface PerformanceMetrics {
  throughputTps: number;
  latencyMs: number;
  dataQuality: number;
  uptime: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
}

// 风险指标
export interface RiskMetrics {
  var95: number;
  expectedShortfall: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  omegaRatio?: number;
  tailRisk?: number;
  stressTestResults?: any;
}

// 市场深度
export interface MarketDepth {
  bids: DepthLevel[];
  asks: DepthLevel[];
  timestamp: Date;
  symbol: string;
}

export interface DepthLevel {
  price: number;
  volume: number;
  orders?: number;
}

// 新闻事件
export interface NewsEvent {
  id: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'extreme';
  category: string;
  currency?: string;
  actual?: number;
  forecast?: number;
  previous?: number;
  timestamp: Date;
  releaseTime: Date;
}

// 价格警报
export interface PriceAlert {
  id: string;
  symbol: string;
  condition: 'above' | 'below' | 'cross';
  price: number;
  triggered: boolean;
  triggeredAt?: Date;
  createdAt: Date;
  message?: string;
  userId?: string;
}

// 通知
export interface Notification {
  id: string;
  type: 'trade' | 'alert' | 'system' | 'news' | 'risk';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  action?: string;
  data?: any;
}

// 图表数据
export interface ChartData {
  type: 'line' | 'candlestick' | 'area' | 'bar';
  data: any[];
  options: any;
  timeframe: TimeframeType;
}

// 组件Props基础类型
export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  loading?: boolean;
  error?: Error | null;
  onError?: (error: Error) => void;
}

// 带数据的组件Props
export interface DataComponentProps<T> extends BaseComponentProps {
  data: T[];
  onDataChange?: (data: T[]) => void;
  emptyMessage?: string;
}

// 带分页的组件Props
export interface PaginatedComponentProps<T> extends DataComponentProps<T> {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
}

// WebSocket事件
export interface WebSocketEvent {
  type: 'price' | 'trade' | 'depth' | 'news' | 'alert' | 'system' | 'strategy' | 'risk';
  data: any;
  timestamp: Date;
  channel?: string;
}

// API响应
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
  requestId?: string;
}

// 分页响应
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// 过滤器
export interface FilterOptions {
  timeframe?: TimeframeType;
  strategy?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  minProfit?: number;
  maxRisk?: number;
  symbols?: string[];
}

// 排序选项
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}