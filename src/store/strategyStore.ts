import { create } from 'zustand';
import type { TradingSignal, Position, BacktestConfig, BacktestResult } from '@/types';

interface StrategyState {
  // EA Generator state
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
  selectedStrategy: string;
  setSelectedStrategy: (strategy: string) => void;

  // Signals and positions
  signals: TradingSignal[];
  setSignals: (signals: TradingSignal[]) => void;
  addSignal: (signal: TradingSignal) => void;

  positions: Position[];
  setPositions: (positions: Position[]) => void;

  // Stats
  todayProfit: number;
  setTodayProfit: (profit: number) => void;
  totalSignals: number;
  setTotalSignals: (count: number) => void;
  winRate: number;
  setWinRate: (rate: number) => void;
  totalVolume: number;
  setTotalVolume: (volume: number) => void;

  // Backtesting
  backtestConfig: BacktestConfig;
  setBacktestConfig: (config: Partial<BacktestConfig>) => void;
  backtestResult: BacktestResult | null;
  setBacktestResult: (result: BacktestResult | null) => void;
  backtestLoading: boolean;
  setBacktestLoading: (loading: boolean) => void;
}

export const useStrategyStore = create<StrategyState>((set) => ({
  // EA Generator
  isRunning: false,
  setIsRunning: (isRunning) => set({ isRunning }),

  selectedStrategy: 'trend_v1',
  setSelectedStrategy: (selectedStrategy) => set({ selectedStrategy }),

  signals: [],
  setSignals: (signals) => set({ signals }),
  addSignal: (signal) =>
    set((state) => ({
      signals: [signal, ...state.signals.slice(0, 99)],
    })),

  positions: [],
  setPositions: (positions) => set({ positions }),

  todayProfit: 0,
  setTodayProfit: (todayProfit) => set({ todayProfit }),

  totalSignals: 0,
  setTotalSignals: (totalSignals) => set({ totalSignals }),

  winRate: 0,
  setWinRate: (winRate) => set({ winRate }),

  totalVolume: 0,
  setTotalVolume: (totalVolume) => set({ totalVolume }),

  // Backtesting
  backtestConfig: {
    strategy_name: 'momentum',
    start_time: '',
    end_time: '',
    parameters: [],
    initial_capital: 100000,
  },
  setBacktestConfig: (config) =>
    set((state) => ({
      backtestConfig: { ...state.backtestConfig, ...config },
    })),

  backtestResult: null,
  setBacktestResult: (backtestResult) => set({ backtestResult }),

  backtestLoading: false,
  setBacktestLoading: (backtestLoading) => set({ backtestLoading }),
}));
