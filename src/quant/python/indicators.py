import numpy as np
import pandas as pd
import talib

class TechnicalIndicators:
    """技术指标计算类"""

    @staticmethod
    def calculate_macd(data: pd.DataFrame, fastperiod=12, slowperiod=26, signalperiod=9):
        """计算MACD指标"""
        macd, macdsignal, macdhist = talib.MACD(data['close'], fastperiod=fastperiod, slowperiod=slowperiod, signalperiod=signalperiod)
        return macd, macdsignal, macdhist

    @staticmethod
    def calculate_rsi(data: pd.DataFrame, timeperiod=14):
        """计算RSI指标"""
        rsi = talib.RSI(data['close'], timeperiod=timeperiod)
        return rsi

    @staticmethod
    def calculate_bollinger_bands(data: pd.DataFrame, timeperiod=20, nbdevup=2, nbdevdn=2):
        """计算布林带"""
        upper, middle, lower = talib.BBANDS(data['close'], timeperiod=timeperiod, nbdevup=nbdevup, nbdevdn=nbdevdn)
        return upper, middle, lower

    @staticmethod
    def calculate_atr(data: pd.DataFrame, timeperiod=14):
        """计算ATR指标"""
        atr = talib.ATR(data['high'], data['low'], data['close'], timeperiod=timeperiod)
        return atr

    @staticmethod
    def calculate_golden_indicators(data: pd.DataFrame):
        """计算黄金专用指标"""
        # 黄金波动率因子
        volatility = data['close'].pct_change().rolling(window=20).std() * np.sqrt(252)

        # 跳空因子
        gaps = (data['open'] - data['close'].shift(1)).abs()
        gap_factor = gaps.rolling(window=10).mean()

        return {
            'volatility': volatility,
            'gap_factor': gap_factor
        }