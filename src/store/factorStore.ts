import { create } from 'zustand';
import type { Factor } from '@/types';

interface FactorState {
  factors: Factor[];
  setFactors: (factors: Factor[]) => void;
  selectedFactors: string[];
  setSelectedFactors: (factors: string[]) => void;
  toggleFactor: (name: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useFactorStore = create<FactorState>((set) => ({
  factors: [],
  setFactors: (factors) => set({ factors }),

  selectedFactors: [],
  setSelectedFactors: (selectedFactors) => set({ selectedFactors }),

  toggleFactor: (name) =>
    set((state) => {
      const isSelected = state.selectedFactors.includes(name);
      return {
        selectedFactors: isSelected
          ? state.selectedFactors.filter((f) => f !== name)
          : [...state.selectedFactors, name],
      };
    }),

  loading: false,
  setLoading: (loading) => set({ loading }),
}));
