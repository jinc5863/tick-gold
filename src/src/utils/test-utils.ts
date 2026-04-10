/**
 * 测试工具函数
 * 包含测试数据生成、模拟API响应等工具
 */

import { StrategyConfig, TradeRecord, PerformanceMetrics } from '../components/types';

/**
 * 生成测试策略配置
 */
export function createTestStrategy(overrides: Partial<StrategyConfig> = {}): StrategyConfig {
  const baseStrategy: StrategyConfig = {
    id: `strategy-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: `测试策略 ${Math.floor(Math.random() * 100)}`,
    description: '这是一个用于测试的策略配置',
    type: ['scalping', 'trend_following', 'gold_specific'][Math.floor(Math.random() * 3)] as any,
    timeframe: ['M1', 'M5', 'M15', 'M30'][Math.floor(Math.random() * 4)] as any,
    status: ['running', 'paused', 'stopped'][Math.floor(Math.random() * 3)] as any,
    performance: {
      totalReturn: parseFloat((Math.random() * 30 - 10).toFixed(2)),
      winRate: parseFloat((Math.random() * 30 + 50).toFixed(1)),
      maxDrawdown: parseFloat((Math.random() * 10).toFixed(2)),
      sharpeRatio: parseFloat((Math.random() * 2).toFixed(2)),
      sortinoRatio: parseFloat((Math.random() * 2.5).toFixed(2)),
      tradesCount: Math.floor(Math.random() * 100),
      profitableTrades: Math.floor(Math.random() * 50),
      losingTrades: Math.floor(Math.random() * 30),
      avgProfit: parseFloat((Math.random() * 2).toFixed(2)),
      avgLoss: parseFloat((Math.random() * 1.5).toFixed(2)),
      profitFactor: parseFloat((Math.random() * 2 + 0.5).toFixed(2)),
      recoveryFactor: parseFloat((Math.random() * 3).toFixed(2)),
    },
    parameters: {
      rsi_period: 14,
      rsi_overbought: 70,
      rsi_oversold: 30,
      bollinger_period: 20,
      bollinger_dev: 2,
      atr_period: 14,
    },
    createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)),
    updatedAt: new Date(),
    userId: 'test-user-1',
    isPublic: Math.random() > 0.5,
    riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
    maxPositions: Math.floor(Math.random() * 5) + 1,
    stopLoss: parseFloat((Math.random() * 3 + 1).toFixed(1)),
    takeProfit: parseFloat((Math.random() * 5 + 2).toFixed(1)),
    autoStart: Math.random() > 0.5,
    notificationEnabled: true,
  };

  return { ...baseStrategy, ...overrides };
}

/**
 * 生成测试交易记录
 */
export function createTestTrade(overrides: Partial<TradeRecord> = {}): TradeRecord {
  const isProfitable = Math.random() > 0.4;
  const profit = isProfitable ?
    parseFloat((Math.random() * 500 + 100).toFixed(2)) :
    parseFloat((Math.random() * -300 - 50).toFixed(2));

  const baseTrade: TradeRecord = {
    id: `trade-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    symbol: 'XAUUSD',
    direction: ['buy', 'sell'][Math.floor(Math.random() * 2)] as any,
    entryTime: new Date(Date.now() - Math.floor(Math.random() * 86400000)),
    entryPrice: parseFloat((1800 + Math.random() * 200).toFixed(2)),
    exitTime: Math.random() > 0.2 ? new Date() : undefined,
    exitPrice: Math.random() > 0.2 ? parseFloat((1800 + Math.random() * 200).toFixed(2)) : undefined,
    quantity: parseFloat((0.01 + Math.random() * 0.49).toFixed(3)),
    commission: parseFloat((Math.random() * 5).toFixed(2)),
    swap: parseFloat((Math.random() * 2).toFixed(2)),
    profit,
    profitPct: isProfitable ?
      parseFloat((Math.random() * 3 + 0.5).toFixed(2)) :
      parseFloat((Math.random() * -2 - 0.3).toFixed(2)),
    status: ['filled', 'partially_filled', 'pending'][Math.floor(Math.random() * 3)] as any,
    strategy: `测试策略 ${Math.floor(Math.random() * 10)}`,
    timeframe: ['M1', 'M5', 'M15'][Math.floor(Math.random() * 3)] as any,
    stopLoss: parseFloat((Math.random() * 30 + 10).toFixed(2)),
    takeProfit: parseFloat((Math.random() * 60 + 20).toFixed(2)),
    riskRewardRatio: parseFloat((Math.random() * 2 + 0.5).toFixed(2)),
  };

  return { ...baseTrade, ...overrides };
}

/**
 * 生成测试性能指标
 */
export function createPerformanceMetrics(): PerformanceMetrics {
  return {
    throughputTps: parseFloat((Math.random() * 5000 + 18000).toFixed(0)),
    latencyMs: parseFloat((Math.random() * 30 + 20).toFixed(0)),
    dataQuality: parseFloat((Math.random() * 2 + 97.5).toFixed(1)),
    uptime: parseFloat((Math.random() * 0.5 + 99.5).toFixed(2)),
    errorRate: parseFloat((Math.random() * 0.1).toFixed(4)),
    memoryUsage: parseFloat((Math.random() * 20 + 30).toFixed(1)),
    cpuUsage: parseFloat((Math.random() * 30 + 20).toFixed(1)),
    networkLatency: parseFloat((Math.random() * 10 + 20).toFixed(1)),
  };
}

/**
 * 生成多个测试策略
 */
export function createTestStrategies(count: number = 10): StrategyConfig[] {
  return Array.from({ length: count }, (_, i) =>
    createTestStrategy({ id: `strategy-${i}`, name: `测试策略 ${i + 1}` })
  );
}

/**
 * 生成多个测试交易记录
 */
export function createTestTrades(count: number = 20): TradeRecord[] {
  return Array.from({ length: count }, (_, i) =>
    createTestTrade({ id: `trade-${i}` })
  );
}

/**
 * 模拟API延迟
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 模拟成功API响应
 */
export function mockSuccessResponse<T>(data: T, delayMs: number = 500): Promise<{ success: true; data: T }> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ success: true, data });
    }, delayMs);
  });
}

/**
 * 模拟失败API响应
 */
export function mockErrorResponse(errorMessage: string = '请求失败', delayMs: number = 500): Promise<{ success: false; error: string }> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ success: false, error: errorMessage });
    }, delayMs);
  });
}

/**
 * 模拟WebSocket消息
 */
export function mockWebSocketMessage(type: string, data: any): any {
  return {
    type,
    data,
    timestamp: new Date(),
    channel: 'gold/xauusd',
  };
}

/**
 * 模拟实时tick数据
 */
export function mockTickData(): any {
  const basePrice = 1850 + Math.random() * 50;
  return {
    symbol: 'XAUUSD',
    timestamp: new Date(),
    bid: parseFloat((basePrice).toFixed(2)),
    ask: parseFloat((basePrice + 0.05).toFixed(2)),
    volume: Math.floor(Math.random() * 1000),
    spread: parseFloat((0.05 + Math.random() * 0.1).toFixed(3)),
  };
}

/**
 * 模拟账户信息
 */
export function mockAccountInfo(): any {
  const balance = 50000 + Math.random() * 50000;
  const profit = Math.random() * 2000 - 500;

  return {
    id: 'account-001',
    name: '模拟交易账户',
    balance: parseFloat(balance.toFixed(2)),
    equity: parseFloat((balance + profit).toFixed(2)),
    margin: parseFloat((Math.random() * 10000).toFixed(2)),
    freeMargin: parseFloat((Math.random() * 30000).toFixed(2)),
    marginLevel: parseFloat((Math.random() * 300 + 100).toFixed(1)),
    leverage: 100,
    currency: 'USD',
    profit: parseFloat(profit.toFixed(2)),
    profitPct: parseFloat((profit / balance * 100).toFixed(2)),
    floatingProfit: parseFloat((Math.random() * 1000 - 200).toFixed(2)),
    usedMargin: parseFloat((Math.random() * 5000).toFixed(2)),
  };
}

/**
 * 测试工具类型检查
 */
export function validateType<T>(value: T): T {
  return value;
}

/**
 * 性能测试工具
 */
export class PerformanceTimer {
  private startTime: number;
  private name: string;

  constructor(name: string = 'Operation') {
    this.name = name;
    this.startTime = performance.now();
  }

  stop(): number {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    console.log(`⏱️ ${this.name}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  static async measure<T>(name: string, operation: () => Promise<T>): Promise<[T, number]> {
    const timer = new PerformanceTimer(name);
    const result = await operation();
    const duration = timer.stop();
    return [result, duration];
  }
}

/**
 * 测试环境检查
 */
export function checkTestEnvironment(): boolean {
  try {
    // 检查是否在开发环境
    return process.env.NODE_ENV === 'development' ||
           import.meta.env?.DEV ||
           window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/**
 * 导出所有测试工具
 */
export default {
  createTestStrategy,
  createTestTrade,
  createPerformanceMetrics,
  createTestStrategies,
  createTestTrades,
  delay,
  mockSuccessResponse,
  mockErrorResponse,
  mockWebSocketMessage,
  mockTickData,
  mockAccountInfo,
  validateType,
  PerformanceTimer,
  checkTestEnvironment,
};