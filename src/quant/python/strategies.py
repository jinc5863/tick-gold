import numpy as np
import pandas as pd
from .indicators import TechnicalIndicators

class TradingStrategies:
    """交易策略类"""

    @staticmethod
    def scalping_strategy(data: pd.DataFrame, params: dict):
        """剥头皮策略（针对黄金）"""
        # 获取技术指标
        macd, macdsignal, _ = TechnicalIndicators.calculate_macd(data)
        rsi = TechnicalIndicators.calculate_rsi(data)

        # 策略逻辑
        signals = pd.DataFrame(index=data.index)
        signals['signal'] = 0

        # MACD交叉信号
        signals.loc[macd > macdsignal, 'signal'] = 1  # 买入信号
        signals.loc[macd < macdsignal, 'signal'] = -1  # 卖出信号

        # RSI过滤（避免超买超卖）
        signals.loc[rsi > 70, 'signal'] = 0  # 超买时不交易
        signals.loc[rsi < 30, 'signal'] = 0  # 超卖时不交易

        return signals

    @staticmethod
    def trend_following_strategy(data: pd.DataFrame, params: dict):
        """趋势跟踪策略 - 改进突破逻辑"""
        # 获取技术指标
        upper, middle, lower = TechnicalIndicators.calculate_bollinger_bands(data)
        atr = TechnicalIndicators.calculate_atr(data)

        # 计算成交量平均值（用于过滤）
        volume_ma = data['volume'].rolling(window=20).mean() if 'volume' in data.columns else pd.Series(1, index=data.index)

        # 计算波动率
        volatility = data['close'].pct_change().rolling(window=20).std()

        signals = pd.DataFrame(index=data.index)
        signals['signal'] = 0
        signals['atr_stop'] = 0.0  # ATR止损参考
        signals['breakout_confirmed'] = False  # 突破是否确认

        # 布林带突破信号（改进版）
        for i in range(1, len(data)):
            current_close = data.iloc[i]['close']
            current_upper = upper.iloc[i]
            current_lower = lower.iloc[i]
            current_atr = atr.iloc[i]
            current_vol_ratio = data.iloc[i]['volume'] / volume_ma.iloc[i] if i < len(volume_ma) else 1
            current_volatility = volatility.iloc[i] if i < len(volatility) else 0

            # 条件1：价格突破布林带
            is_upper_breakout = current_close > current_upper
            is_lower_breakout = current_close < current_lower

            # 条件2：突破确认（前一K线也突破才算确认）
            prev_close = data.iloc[i-1]['close']
            prev_upper = upper.iloc[i-1]
            prev_lower = lower.iloc[i-1]
            prev_is_upper_breakout = prev_close > prev_upper
            prev_is_lower_breakout = prev_close < prev_lower

            # 条件3：成交量过滤（成交量需要较前20日均量放大）
            volume_condition = current_vol_ratio > params.get('min_volume_ratio', 1.2)

            # 条件4：波动率过滤（避免在极低波动率时段交易）
            volatility_condition = current_volatility > params.get('min_volatility', 0.001)

            # 生成信号
            if is_upper_breakout and prev_is_upper_breakout and volume_condition and volatility_condition:
                signals.iloc[i, signals.columns.get_loc('signal')] = 1  # 确认向上突破买入
                signals.iloc[i, signals.columns.get_loc('atr_stop')] = current_close - 2 * current_atr  # 基于ATR设置止损
                signals.iloc[i, signals.columns.get_loc('breakout_confirmed')] = True
            elif is_lower_breakout and prev_is_lower_breakout and volume_condition and volatility_condition:
                signals.iloc[i, signals.columns.get_loc('signal')] = -1  # 确认向下突破卖出
                signals.iloc[i, signals.columns.get_loc('atr_stop')] = current_close + 2 * current_atr  # 基于ATR设置止损
                signals.iloc[i, signals.columns.get_loc('breakout_confirmed')] = True

        return signals

    @staticmethod
    def gold_specific_strategy(data: pd.DataFrame, params: dict):
        """黄金专用策略"""
        # 获取黄金专用指标
        golden_indicators = TechnicalIndicators.calculate_golden_indicators(data)
        volatility = golden_indicators['volatility']
        gap_factor = golden_indicators['gap_factor']

        signals = pd.DataFrame(index=data.index)
        signals['signal'] = 0

        # 波动率过滤（避免在低波动时段交易）
        signals.loc[volatility < params.get('min_volatility', 0.01), 'signal'] = 0

        # 跳空因子过滤
        signals.loc[gap_factor > params.get('max_gap', 0.001), 'signal'] = 0

        return signals

    @staticmethod
    def generate_strategy_code(strategy_type: str, params: dict) -> str:
        """生成策略代码（Python或MQL5）"""
        if strategy_type == 'scalping':
            return TradingStrategies._generate_scalping_code(params)
        elif strategy_type == 'trend':
            return TradingStrategies._generate_trend_code(params)
        else:
            return ""

    @staticmethod
    def _generate_scalping_code(params: dict) -> str:
        """生成剥头皮策略代码"""
        code = f"""
import talib
import pandas as pd

def scalping_strategy(data):
    # 计算MACD
    macd, macdsignal, _ = talib.MACD(data['close'], fastperiod={params.get('fastperiod', 12)}, slowperiod={params.get('slowperiod', 26)}, signalperiod={params.get('signalperiod', 9)})
    rsi = talib.RSI(data['close'], timeperiod={params.get('rsi_period', 14)})

    # 生成信号
    signals = pd.DataFrame(index=data.index)
    signals['signal'] = 0

    # MACD交叉信号
    signals.loc[macd > macdsignal, 'signal'] = 1  # 买入信号
    signals.loc[macd < macdsignal, 'signal'] = -1  # 卖出信号

    # RSI过滤
    signals.loc[rsi > {params.get('rsi_overbought', 70)}, 'signal'] = 0
    signals.loc[rsi < {params.get('rsi_oversold', 30)}, 'signal'] = 0

    return signals
"""
        return code

    @staticmethod
    def _generate_trend_code(params: dict) -> str:
        """生成趋势跟踪策略代码（改进突破逻辑）"""
        code = f"""
import talib
import pandas as pd
import numpy as np

def trend_following_strategy(data):
    # 计算布林带
    upper, middle, lower = talib.BBANDS(data['close'], timeperiod={params.get('bollinger_period', 20)}, nbdevup={params.get('bollinger_dev', 2)}, nbdevdn={params.get('bollinger_dev', 2)})

    # 计算ATR
    atr = talib.ATR(data['high'], data['low'], data['close'], timeperiod={params.get('atr_period', 14)})

    # 计算成交量平均值（用于过滤）
    volume_ma = data['volume'].rolling(window=20).mean() if 'volume' in data.columns else pd.Series(1, index=data.index)

    # 计算波动率
    volatility = data['close'].pct_change().rolling(window=20).std()

    signals = pd.DataFrame(index=data.index)
    signals['signal'] = 0
    signals['atr_stop'] = 0.0  # ATR止损参考
    signals['breakout_confirmed'] = False  # 突破是否确认

    # 布林带突破信号（改进版）
    for i in range(1, len(data)):
        current_close = data.iloc[i]['close']
        current_upper = upper.iloc[i]
        current_lower = lower.iloc[i]
        current_atr = atr.iloc[i]
        current_vol_ratio = data.iloc[i]['volume'] / volume_ma.iloc[i] if i < len(volume_ma) else 1
        current_volatility = volatility.iloc[i] if i < len(volatility) else 0

        # 条件1：价格突破布林带
        is_upper_breakout = current_close > current_upper
        is_lower_breakout = current_close < current_lower

        # 条件2：突破确认（前一K线也突破才算确认）
        prev_close = data.iloc[i-1]['close']
        prev_upper = upper.iloc[i-1]
        prev_lower = lower.iloc[i-1]
        prev_is_upper_breakout = prev_close > prev_upper
        prev_is_lower_breakout = prev_close < prev_lower

        # 条件3：成交量过滤（成交量需要较前20日均量放大）
        volume_condition = current_vol_ratio > {params.get('min_volume_ratio', 1.2)}

        # 条件4：波动率过滤（避免在极低波动率时段交易）
        volatility_condition = current_volatility > {params.get('min_volatility', 0.001)}

        # 生成信号
        if is_upper_breakout and prev_is_upper_breakout and volume_condition and volatility_condition:
            signals.iloc[i, signals.columns.get_loc('signal')] = 1  # 确认向上突破买入
            signals.iloc[i, signals.columns.get_loc('atr_stop')] = current_close - {params.get('atr_multiplier', 2)} * current_atr  # 基于ATR设置止损
            signals.iloc[i, signals.columns.get_loc('breakout_confirmed')] = True
        elif is_lower_breakout and prev_is_lower_breakout and volume_condition and volatility_condition:
            signals.iloc[i, signals.columns.get_loc('signal')] = -1  # 确认向下突破卖出
            signals.iloc[i, signals.columns.get_loc('atr_stop')] = current_close + {params.get('atr_multiplier', 2)} * current_atr  # 基于ATR设置止损
            signals.iloc[i, signals.columns.get_loc('breakout_confirmed')] = True

    return signals
"""
        return code