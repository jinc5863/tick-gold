/**
 * WebSocket 类型定义
 *
 * 独立导出以避免循环依赖
 */

/**
 * WebSocket 消息类型
 */
export type WebSocketMessageType =
  | 'gold_tick'        // 黄金实时行情
  | 'trade_signal'     // 交易信号
  | 'market_update'    // 市场更新
  | 'system_status'   // 系统状态
  | 'order_executed'  // 订单执行
  | 'error'           // 错误信息
  | 'ping'            // 心跳
  | 'pong'            // 心跳响应
  | 'subscribe'       // 订阅交易品种
  | 'unsubscribe';    // 取消订阅

/**
 * WebSocket 消息
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  data: any;
  timestamp: string;
  sequence?: number;
}

/**
 * 黄金实时行情数据
 */
export interface GoldTickData {
  symbol: string;        // 交易品种，如 XAUUSD
  bid: number;          // 买入价
  ask: number;          // 卖出价
  last: number;         // 最后成交价
  high: number;         // 当日最高
  low: number;          // 当日最低
  volume: number;       // 成交量
  timestamp: string;    // 时间戳
  spread: number;       // 点差
  change: number;       // 涨跌
  changePercent: number; // 涨跌幅
}

/**
 * 实时交易信号
 */
export interface RealTimeSignal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  stopLoss: number;
  takeProfit: number;
  reason: string;
  timestamp: string;
  expiry?: string;      // 信号有效期
}