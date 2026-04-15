import { create } from 'zustand';
import type { Tick, CleaningConfig, CleaningResult } from '@/types';

interface DataState {
  // Ticks data
  ticks: Tick[];
  setTicks: (ticks: Tick[]) => void;

  // Loading states
  loading: boolean;
  setLoading: (loading: boolean) => void;

  // Import state
  importing: boolean;
  setImporting: (importing: boolean) => void;

  // Cleaning state
  cleaningConfig: CleaningConfig;
  setCleaningConfig: (config: CleaningConfig) => void;
  cleaningResult: CleaningResult | null;
  setCleaningResult: (result: CleaningResult | null) => void;

  // Stats
  stats: {
    totalTicks: number;
    validTicks: number;
    anomalyTicks: number;
  };
  setStats: (stats: { totalTicks: number; validTicks: number; anomalyTicks: number }) => void;
}

export const useDataStore = create<DataState>((set) => ({
  ticks: [],
  setTicks: (ticks) => set({ ticks }),

  loading: false,
  setLoading: (loading) => set({ loading }),

  importing: false,
  setImporting: (importing) => set({ importing }),

  cleaningConfig: {
    removeDuplicates: true,
    priceAnomalyThreshold: 3,
    timeContinuityCheck: true,
    volumeFilter: false,
    spreadThreshold: 0.5,
  },
  setCleaningConfig: (cleaningConfig) => set({ cleaningConfig }),

  cleaningResult: null,
  setCleaningResult: (cleaningResult) => set({ cleaningResult }),

  stats: {
    totalTicks: 0,
    validTicks: 0,
    anomalyTicks: 0,
  },
  setStats: (stats) => set({ stats }),
}));
