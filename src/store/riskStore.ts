import { create } from 'zustand';
import type { RiskIndicator, AuditTrade } from '@/types';

interface RiskState {
  // Risk indicators
  indicators: RiskIndicator[];
  setIndicators: (indicators: RiskIndicator[]) => void;

  // Audit trades
  auditTrades: AuditTrade[];
  setAuditTrades: (trades: AuditTrade[]) => void;
  updateTradeStatus: (id: number, status: 'approved' | 'rejected') => void;

  // Settings
  positionRiskThreshold: number;
  setPositionRiskThreshold: (value: number) => void;
  leverageLimit: number;
  setLeverageLimit: (value: number) => void;
  overnightRiskLimit: number;
  setOvernightRiskLimit: (value: number) => void;
  gapRiskLimit: number;
  setGapRiskLimit: (value: number) => void;
  autoRiskMode: 'strict' | 'moderate' | 'relaxed';
  setAutoRiskMode: (mode: 'strict' | 'moderate' | 'relaxed') => void;

  // Overall rating
  overallRating: number;
  setOverallRating: (rating: number) => void;

  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useRiskStore = create<RiskState>((set) => ({
  indicators: [],
  setIndicators: (indicators) => set({ indicators }),

  auditTrades: [],
  setAuditTrades: (auditTrades) => set({ auditTrades }),

  updateTradeStatus: (id, status) =>
    set((state) => ({
      auditTrades: state.auditTrades.map((trade) =>
        trade.id === id ? { ...trade, status } : trade
      ),
    })),

  positionRiskThreshold: 65,
  setPositionRiskThreshold: (positionRiskThreshold) => set({ positionRiskThreshold }),

  leverageLimit: 45,
  setLeverageLimit: (leverageLimit) => set({ leverageLimit }),

  overnightRiskLimit: 50,
  setOvernightRiskLimit: (overnightRiskLimit) => set({ overnightRiskLimit }),

  gapRiskLimit: 20,
  setGapRiskLimit: (gapRiskLimit) => set({ gapRiskLimit }),

  autoRiskMode: 'strict',
  setAutoRiskMode: (autoRiskMode) => set({ autoRiskMode }),

  overallRating: 78,
  setOverallRating: (overallRating) => set({ overallRating }),

  loading: false,
  setLoading: (loading) => set({ loading }),
}));
