// Tick data type
export interface Tick {
  id: number;
  symbol: string;
  time: string;
  bid: number;
  ask: number;
  volume: number;
  source?: string;
  status?: 'valid' | 'anomaly' | 'duplicate';
}

// Cleaning config
export interface CleaningConfig {
  removeDuplicates: boolean;
  priceAnomalyThreshold: number;
  timeContinuityCheck: boolean;
  volumeFilter: boolean;
  spreadThreshold: number;
}

// Cleaning result
export interface CleaningResult {
  originalCount: number;
  cleanedCount: number;
  removedCount: number;
  duration: number;
  flags: FlagStats[];
}

export interface FlagStats {
  flag: string;
  count: number;
  color: string;
}

// Factor types
export interface Factor {
  id: number;
  name: string;
  description: string;
  ic: number;
  ir: number;
  rankIC: number;
  rankIR: number;
  status: 'effective' | 'marginal' | 'weak';
  selected: boolean;
}

// Risk indicator
export interface RiskIndicator {
  key: string;
  name: string;
  currentValue: number;
  maxValue: number;
  unit: string;
  status: 'safe' | 'warning' | 'danger';
}

// Audit trade
export interface AuditTrade {
  id: number;
  tradeId: string;
  strategy: string;
  type: '买入' | '卖出';
  symbol: string;
  volume: number;
  price: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected';
  submitTime: string;
}

// Trading signal
export interface TradingSignal {
  id: number;
  time: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  volume: number;
  status: 'executed' | 'pending';
}

// Position
export interface Position {
  id: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
}

// Backtest config
export interface BacktestConfig {
  strategy_name: string;
  start_time: string;
  end_time: string;
  parameters: Array<{ name: string; value: number }>;
  initial_capital: number;
}

// Backtest result
export interface BacktestResult {
  strategy_name: string;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl: number;
  total_pnl_pct: number;
  max_drawdown: number;
  sharpe_ratio: number;
  trades: BacktestTrade[];
}

export interface BacktestTrade {
  entry_time: string;
  exit_time: string;
  entry_price: number;
  exit_price: number;
  position_size: number;
  pnl: number;
  pnl_pct: number;
}

// OHLCV data
export interface OHLCV {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Cleaning rule
export interface CleaningRule {
  type: 'deduplicate' | 'fill_missing' | 'outlier' | 'normalize' | 'session_filter';
  enabled: boolean;
  config: Record<string, unknown>;
}

// Audit result
export interface AuditResult {
  completeness: number;
  accuracy: number;
  timeliness: number;
  overall: number;
}

// Performance metrics
export interface PerformanceMetrics {
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitLossRatio: number;
  totalTrades: number;
}

// API parameter types (matching backend Pydantic schemas)
export interface DataImportParams {
  file_path: string;
  symbol?: string;
}

export interface DataCleanParams {
  start_time?: string;
  end_time?: string;
  symbol?: string;
}

export interface TickQueryParams {
  symbol?: string;
  start_time?: string;
  end_time?: string;
  limit?: number;
  offset?: number;
}

export interface FactorAnalyzeParams {
  factor_name: string;
  start_time?: string;
  end_time?: string;
  parameters?: Record<string, unknown>;
}

export interface BacktestParams {
  strategy_name: string;
  start_time: string;
  end_time: string;
  parameters: StrategyParameter[];
  initial_capital?: number;
}

export interface StrategyParameter {
  name: string;
  value: number;
  min_value?: number;
  max_value?: number;
}

export interface RiskCheckParams {
  symbol?: string;
  position_size: number;
  entry_price: number;
  current_price?: number;
  session?: string;
}

export interface RiskCheckResult {
  allowed: boolean;
  risk_score: number;
  gap_risk: number;
  overnight_risk: number;
  max_drawdown: number;
  position_size: number;
  adjusted_position_size: number;
  warnings: string[];
}

export interface FactorAnalyzeResult {
  factor_name: string;
  stats: Record<string, number>;
  values: Array<{
    factor_id: number;
    timestamp: string;
    value: number;
  }>;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
