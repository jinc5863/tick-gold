import { createConfigStore } from '../factory';
import { UserConfig } from '../../types';
import { shallow } from 'zustand/shallow';

export interface ConfigState {
  // 用户配置
  userConfig: UserConfig;

  // UI配置
  uiConfig: {
    collapsed: boolean; // 侧边栏是否收起
    language: 'zh-CN' | 'en-US';
    chartType: 'line' | 'candle' | 'area';
    indicatorsVisible: boolean;
    gridlinesVisible: boolean;
  };

  // 交易配置
  tradeConfig: {
    defaultSymbol: string;
    defaultQuantity: number;
    slippage: number; // 滑点百分比
    maxDailyLoss: number; // 最大日亏损百分比
    autoTradeEnabled: boolean;
    stopLossEnabled: boolean;
    takeProfitEnabled: boolean;
  };

  // 通知配置
  notificationConfig: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    soundEnabled: boolean;
    tradingAlerts: boolean; // 交易警报
    systemAlerts: boolean; // 系统警报
    priceAlerts: boolean; // 价格警报
  };

  // 动作
  updateUserConfig: (config: Partial<UserConfig>) => void;
  updateUiConfig: (config: Partial<ConfigState['uiConfig']>) => void;
  updateTradeConfig: (config: Partial<ConfigState['tradeConfig']>) => void;
  updateNotificationConfig: (config: Partial<ConfigState['notificationConfig']>) => void;
  resetConfig: () => void;
}

const initialUserConfig: UserConfig = {
  theme: 'neumorphism',
  refreshInterval: 5000,
  autoTrade: false,
  riskLevel: 'MEDIUM',
  notifications: true,
};

const initialUiConfig: ConfigState['uiConfig'] = {
  collapsed: false,
  language: 'zh-CN',
  chartType: 'line',
  indicatorsVisible: true,
  gridlinesVisible: true,
};

const initialTradeConfig: ConfigState['tradeConfig'] = {
  defaultSymbol: 'XAUUSD',
  defaultQuantity: 0.1,
  slippage: 0.1, // 0.1%
  maxDailyLoss: 2.0, // 2%
  autoTradeEnabled: false,
  stopLossEnabled: true,
  takeProfitEnabled: true,
};

const initialNotificationConfig: ConfigState['notificationConfig'] = {
  emailNotifications: false,
  pushNotifications: true,
  soundEnabled: true,
  tradingAlerts: true,
  systemAlerts: true,
  priceAlerts: false,
};

export const useConfigStore = createConfigStore<ConfigState>(
  (set, get) => ({
    // 初始状态
    userConfig: initialUserConfig,
    uiConfig: initialUiConfig,
    tradeConfig: initialTradeConfig,
    notificationConfig: initialNotificationConfig,

    // 更新用户配置（使用immer简化）
    updateUserConfig: (config) => {
      set((state) => {
        Object.assign(state.userConfig, config);
      });
    },

    // 更新UI配置（使用immer简化）
    updateUiConfig: (config) => {
      set((state) => {
        Object.assign(state.uiConfig, config);
      });
    },

    // 更新交易配置（使用immer简化）
    updateTradeConfig: (config) => {
      set((state) => {
        Object.assign(state.tradeConfig, config);
      });
    },

    // 更新通知配置（使用immer简化）
    updateNotificationConfig: (config) => {
      set((state) => {
        Object.assign(state.notificationConfig, config);
      });
    },

    // 重置配置
    resetConfig: () => {
      set({
        userConfig: initialUserConfig,
        uiConfig: initialUiConfig,
        tradeConfig: initialTradeConfig,
        notificationConfig: initialNotificationConfig,
      });
    },
  })
);

// 自定义hooks导出
export const useUserConfig = () => useConfigStore((state) => state.userConfig);
export const useUiConfig = () => useConfigStore((state) => state.uiConfig);
export const useTradeConfig = () => useConfigStore((state) => state.tradeConfig);
export const useNotificationConfig = () => useConfigStore((state) => state.notificationConfig);

// 完整配置hooks（使用浅比较优化）
export const useConfig = () => useConfigStore((state) => ({
  userConfig: state.userConfig,
  uiConfig: state.uiConfig,
  tradeConfig: state.tradeConfig,
  notificationConfig: state.notificationConfig,
  updateUserConfig: state.updateUserConfig,
  updateUiConfig: state.updateUiConfig,
  updateTradeConfig: state.updateTradeConfig,
  updateNotificationConfig: state.updateNotificationConfig,
  resetConfig: state.resetConfig,
}), shallow);