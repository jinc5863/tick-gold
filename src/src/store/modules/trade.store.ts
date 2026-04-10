import { createTradeStore } from '../factory';
import { shallow } from 'zustand/shallow';
import { TradingSignal, Order, GoldIndicator, StrategyDefinition, RiskMetric } from '../../types';
import { tickApi, strategyApi, indicatorApi } from '../../api';

export interface TradeState {
  // 交易数据状态
  signals: TradingSignal[];
  orders: Order[];
  indicators: GoldIndicator[];
  strategies: StrategyDefinition[];
  riskMetrics: RiskMetric[];

  // 加载状态
  isFetchingSignals: boolean;
  isFetchingOrders: boolean;
  isFetchingIndicators: boolean;
  isFetchingStrategies: boolean;
  isExecutingTrade: boolean;

  // 错误状态
  signalsError: string | null;
  ordersError: string | null;
  indicatorsError: string | null;
  strategiesError: string | null;
  tradeError: string | null;

  // 时间戳
  lastSignalsUpdate: Date | null;
  lastOrdersUpdate: Date | null;
  lastIndicatorsUpdate: Date | null;

  // 动作
  fetchSignals: () => Promise<void>;
  fetchOrders: () => Promise<void>;
  fetchIndicators: (timeframe: string) => Promise<void>;
  fetchStrategies: () => Promise<void>;
  executeTrade: (signal: TradingSignal) => Promise<Order>;
  cancelOrder: (orderId: string) => Promise<void>;
  sendTestTick: () => Promise<void>;
  clearTradeError: () => void;

  // 实时数据更新（由WebSocket store调用）
  updateRealTimeTick: (tickData: any) => void;
  addRealTimeSignal: (signal: TradingSignal) => void;
  updateRealTimeOrder: (order: Order) => void;
  updateRealTimeIndicators: (indicators: GoldIndicator[]) => void;
}

export const useTradeStore = createTradeStore<TradeState>(
  (set, get) => ({
    // 初始状态
    signals: [],
    orders: [],
    indicators: [],
    strategies: [],
    riskMetrics: [],

    isFetchingSignals: false,
    isFetchingOrders: false,
    isFetchingIndicators: false,
    isFetchingStrategies: false,
    isExecutingTrade: false,

    signalsError: null,
    ordersError: null,
    indicatorsError: null,
    strategiesError: null,
    tradeError: null,

    lastSignalsUpdate: null,
    lastOrdersUpdate: null,
    lastIndicatorsUpdate: null,

    // 获取交易信号
    fetchSignals: async () => {
      set({ isFetchingSignals: true, signalsError: null });
      try {
        // 模拟数据 - 实际应该调用API
        const mockSignals: TradingSignal[] = [
          {
            id: `signal_${Date.now()}`,
            symbol: 'XAUUSD',
            direction: Math.random() > 0.5 ? 'BUY' : 'SELL' as 'BUY' | 'SELL' | 'HOLD',
            confidence: 0.6 + Math.random() * 0.3,
            price: 2050 + (Math.random() - 0.5) * 10,
            stopLoss: 2045,
            takeProfit: 2060,
            reason: '黄金策略生成交易信号',
            generatedAt: new Date().toISOString(),
          },
        ];

        set({
          signals: mockSignals,
          lastSignalsUpdate: new Date(),
          isFetchingSignals: false,
        });
      } catch (error) {
        set({
          signalsError: error instanceof Error ? error.message : '获取信号失败',
          isFetchingSignals: false,
        });
      }
    },

    // 获取订单
    fetchOrders: async () => {
      set({ isFetchingOrders: true, ordersError: null });
      try {
        // 模拟数据
        const mockOrders: Order[] = [
          {
            id: `ORD_${Date.now()}`,
            symbol: 'XAUUSD',
            side: 'BUY',
            price: 2050.5,
            quantity: 0.1,
            status: Math.random() > 0.5 ? 'FILLED' : 'PENDING',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

        set({
          orders: mockOrders,
          lastOrdersUpdate: new Date(),
          isFetchingOrders: false,
        });
      } catch (error) {
        set({
          ordersError: error instanceof Error ? error.message : '获取订单失败',
          isFetchingOrders: false,
        });
      }
    },

    // 获取指标数据
    fetchIndicators: async (timeframe = 'M1') => {
      set({ isFetchingIndicators: true, indicatorsError: null });
      try {
        const response = await indicatorApi.getGoldIndicators(timeframe);
        const indicators = response.indicators.timestamps.map(
          (timestamp: string, index: number) => ({
            timestamp,
            price: response.indicators.prices[index] || 0,
            macd: response.indicators.macd[index] || 0,
            macdSignal: response.indicators.macd_signal?.[index] || 0,
            rsi: response.indicators.rsi[index] || 0,
            bollingerUpper: response.indicators.bollinger_upper[index] || 0,
            bollingerMiddle: response.indicators.bollinger_middle[index] || 0,
            bollingerLower: response.indicators.bollinger_lower[index] || 0,
            volatility: response.indicators.gold_indicators?.volatility[index] || 0,
            gapFactor: response.indicators.gold_indicators?.gap_factor[index] || 0,
          })
        );

        set({
          indicators,
          lastIndicatorsUpdate: new Date(),
          isFetchingIndicators: false,
        });
      } catch (error) {
        console.error('获取指标失败，使用模拟数据:', error);
        // 使用模拟数据
        const mockData: GoldIndicator[] = [];
        const basePrice = 2050.0;
        const now = new Date();

        for (let i = 99; i >= 0; i--) {
          const time = new Date(now.getTime() - i * 60000);
          mockData.push({
            timestamp: time.toISOString(),
            price: basePrice + (Math.random() - 0.5) * (i / 10),
            macd: (Math.random() - 0.5) * 2,
            macdSignal: (Math.random() - 0.5) * 1,
            rsi: 50 + (Math.random() - 0.5) * 20,
            bollingerUpper: basePrice * 1.01,
            bollingerMiddle: basePrice,
            bollingerLower: basePrice * 0.99,
            volatility: Math.random() * 0.02,
            gapFactor: Math.random() * 0.001,
          });
        }

        set({
          indicators: mockData,
          lastIndicatorsUpdate: new Date(),
          isFetchingIndicators: false,
        });
      }
    },

    // 获取策略
    fetchStrategies: async () => {
      set({ isFetchingStrategies: true, strategiesError: null });
      try {
        const response = await strategyApi.getStrategies();
        set({
          strategies: response.strategies,
          isFetchingStrategies: false,
        });
      } catch (error) {
        set({
          strategiesError: error instanceof Error ? error.message : '获取策略失败',
          isFetchingStrategies: false,
        });
      }
    },

    // 执行交易
    executeTrade: async (signal: TradingSignal): Promise<Order> => {
      set({ isExecutingTrade: true, tradeError: null });
      try {
        // 创建订单
        const order: Order = {
          id: `TRADE_${Date.now()}`,
          symbol: signal.symbol,
          side: signal.direction === 'BUY' ? 'BUY' : 'SELL',
          price: signal.price,
          quantity: 0.1,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // 添加到订单列表
        const currentOrders = get().orders;
        set({
          orders: [order, ...currentOrders],
          isExecutingTrade: false,
        });

        // 发送tick数据
        await tickApi.sendTick({
          symbol: signal.symbol,
          timestamp: new Date().toISOString(),
          bid: signal.price - 0.5,
          ask: signal.price + 0.5,
          volume: Math.random() * 10,
        });

        return order;
      } catch (error) {
        set({
          tradeError: error instanceof Error ? error.message : '交易执行失败',
          isExecutingTrade: false,
        });
        throw error;
      }
    },

    // 取消订单
    cancelOrder: async (orderId: string) => {
      set({ isExecutingTrade: true, tradeError: null });
      try {
        const currentOrders = get().orders;
        set({
          orders: currentOrders.map((order) =>
            order.id === orderId
              ? { ...order, status: 'CANCELLED', updatedAt: new Date().toISOString() }
              : order
          ),
          isExecutingTrade: false,
        });
      } catch (error) {
        set({
          tradeError: error instanceof Error ? error.message : '取消订单失败',
          isExecutingTrade: false,
        });
        throw error;
      }
    },

    // 发送测试tick数据
    sendTestTick: async () => {
      try {
        const tickData = {
          symbol: 'XAUUSD',
          timestamp: new Date().toISOString(),
          bid: 2050,
          ask: 2050.5,
          volume: Math.random() * 10,
        };
        await tickApi.sendTick(tickData);
      } catch (error) {
        console.warn('测试tick发送失败:', error);
      }
    },

    // 清除交易错误
    clearTradeError: () => {
      set({
        tradeError: null,
        signalsError: null,
        ordersError: null,
        indicatorsError: null,
        strategiesError: null,
      });
    },

    // 实时数据更新方法
    updateRealTimeTick: (tickData: any) => {
      // TODO: 处理实时tick数据更新
      console.log('实时tick数据更新:', tickData);
    },

    addRealTimeSignal: (signal: TradingSignal) => {
      const { signals } = get();
      set({
        signals: [signal, ...signals.slice(0, 99)], // 保留最近100个信号
        lastSignalsUpdate: new Date(),
      });
    },

    updateRealTimeOrder: (order: Order) => {
      const { orders } = get();
      const updatedOrders = orders.map(o =>
        o.id === order.id ? { ...o, ...order, updatedAt: new Date().toISOString() } : o
      );

      // 如果订单不存在，添加到列表
      if (!orders.some(o => o.id === order.id)) {
        updatedOrders.push({ ...order, updatedAt: new Date().toISOString() });
      }

      set({
        orders: updatedOrders,
        lastOrdersUpdate: new Date(),
      });
    },

    updateRealTimeIndicators: (indicators: GoldIndicator[]) => {
      set({
        indicators: indicators.slice(-100), // 保留最近100个指标
        lastIndicatorsUpdate: new Date(),
      });
    },
  }));

// 自定义hooks导出（使用浅比较优化）
export const useSignals = () => useTradeStore((state) => ({
  signals: state.signals,
  lastSignalsUpdate: state.lastSignalsUpdate,
  isFetchingSignals: state.isFetchingSignals,
  signalsError: state.signalsError,
  fetchSignals: state.fetchSignals,
}), shallow);

export const useOrders = () => useTradeStore((state) => ({
  orders: state.orders,
  lastOrdersUpdate: state.lastOrdersUpdate,
  isFetchingOrders: state.isFetchingOrders,
  ordersError: state.ordersError,
  fetchOrders: state.fetchOrders,
  executeTrade: state.executeTrade,
  cancelOrder: state.cancelOrder,
}), shallow);

export const useIndicators = () => useTradeStore((state) => ({
  indicators: state.indicators,
  lastIndicatorsUpdate: state.lastIndicatorsUpdate,
  isFetchingIndicators: state.isFetchingIndicators,
  indicatorsError: state.indicatorsError,
  fetchIndicators: state.fetchIndicators,
}), shallow);

export const useStrategies = () => useTradeStore((state) => ({
  strategies: state.strategies,
  isFetchingStrategies: state.isFetchingStrategies,
  strategiesError: state.strategiesError,
  fetchStrategies: state.fetchStrategies,
}), shallow);

// 完整交易hooks（使用浅比较优化）
export const useTrade = () => useTradeStore((state) => ({
  signals: state.signals,
  orders: state.orders,
  indicators: state.indicators,
  strategies: state.strategies,
  isFetchingSignals: state.isFetchingSignals,
  isFetchingOrders: state.isFetchingOrders,
  isFetchingIndicators: state.isFetchingIndicators,
  isFetchingStrategies: state.isFetchingStrategies,
  signalsError: state.signalsError,
  ordersError: state.ordersError,
  indicatorsError: state.indicatorsError,
  strategiesError: state.strategiesError,
  fetchSignals: state.fetchSignals,
  fetchOrders: state.fetchOrders,
  fetchIndicators: state.fetchIndicators,
  fetchStrategies: state.fetchStrategies,
  sendTestTick: state.sendTestTick,
  clearTradeError: state.clearTradeError,
}), shallow);