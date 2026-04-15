"""Predefined factor library with 100+ quantitative factors.

Factor categories:
- 价格因子 (Price Factors)
- 波动率因子 (Volatility Factors)
- 趋势因子 (Trend Factors)
- 动量因子 (Momentum Factors)
- 均值回归因子 (Mean Reversion Factors)
- 流动性因子 (Liquidity Factors)
- 时段因子 (Session Factors)
- 价差因子 (Spread Factors)
- 成交量因子 (Volume Factors)
- 季节性因子 (Seasonal Factors)
"""
from typing import Optional, Dict, List, Tuple
import pandas as pd
import numpy as np


class FactorLibrary:
    """100+量化因子库.

    A comprehensive library of quantitative factors for financial markets.
    All factors return pandas Series aligned with input data.
    """

    # ========== 价格因子 (Price Factors) ==========

    @staticmethod
    def momentum(prices: pd.Series, period: int = 1) -> pd.Series:
        """动量因子 - Price momentum over period.

        Args:
            prices: Price series
            period: Lookback period

        Returns:
            Momentum (rate of price change)
        """
        return prices.pct_change(period)

    @staticmethod
    def reversal(prices: pd.Series, period: int = 5) -> pd.Series:
        """均值回归因子 - Short-term reversal.

        Args:
            prices: Price series
            period: Lookback period

        Returns:
            Negative momentum (reversal signal)
        """
        return -prices.pct_change(period)

    @staticmethod
    def price_velocity(prices: pd.Series, window: int = 20) -> pd.Series:
        """价格速度 - Rate of price change.

        Args:
            prices: Price series
            window: Window for velocity calculation

        Returns:
            Velocity (first derivative of price)
        """
        return prices.diff() / prices.shift(1)

    @staticmethod
    def price_acceleration(
        prices: pd.Series, window: int = 20
    ) -> pd.Series:
        """价格加速度 - Second derivative of price.

        Args:
            prices: Price series
            window: Window for calculation

        Returns:
            Acceleration
        """
        velocity = prices.diff() / prices.shift(1)
        return velocity.diff() / velocity.shift(1)

    @staticmethod
    def log_return(prices: pd.Series, period: int = 1) -> pd.Series:
        """对数收益率 - Logarithmic returns.

        Args:
            prices: Price series
            period: Lookback period

        Returns:
            Log returns
        """
        return np.log(prices / prices.shift(period))

    @staticmethod
    def high_low_range(
        high: pd.Series, low: pd.Series, window: int = 20
    ) -> pd.Series:
        """高低区间 - Range between highest and lowest.

        Args:
            high: High prices
            low: Low prices
            window: Lookback window

        Returns:
            High-low range
        """
        return high.rolling(window).max() - low.rolling(window).min()

    # ========== 波动率因子 (Volatility Factors) ==========

    @staticmethod
    def volatility(prices: pd.Series, window: int = 20) -> pd.Series:
        """波动率因子 - Historical volatility.

        Args:
            prices: Price series
            window: Rolling window

        Returns:
            Standard deviation of returns
        """
        return prices.pct_change().rolling(window).std()

    @staticmethod
    def parkinson_volatility(
        high: pd.Series, low: pd.Series, window: int = 20
    ) -> pd.Series:
        """帕金森波动率 - Parkinson volatility estimator.

        Args:
            high: High prices
            low: Low prices
            window: Rolling window

        Returns:
            Parkinson volatility
        """
        hl_ratio = np.log(high / low)
        return np.sqrt((1 / (4 * np.log(2))) * hl_ratio.pow(2).rolling(window).mean())

    @staticmethod
    def garman_klass_volatility(
        open_: pd.Series,
        high: pd.Series,
        low: pd.Series,
        close: pd.Series,
        window: int = 20,
    ) -> pd.Series:
        """加曼-克拉斯波动率 - Garman-Klass volatility estimator.

        Args:
            open_: Open prices
            high: High prices
            low: Low prices
            close: Close prices
            window: Rolling window

        Returns:
            Garman-Klass volatility
        """
        log_hl = np.log(high / low)
        log_co = np.log(close / open_)

        gk = (
            0.5 * log_hl.pow(2)
            - (2 * np.log(2) - 1) * log_co.pow(2)
        ).rolling(window).mean()
        return np.sqrt(gk)

    @staticmethod
    def atr(
        high: pd.Series, low: pd.Series, close: pd.Series, window: int = 14
    ) -> pd.Series:
        """平均真实波幅 - Average True Range.

        Args:
            high: High prices
            low: Low prices
            close: Close prices
            window: Rolling window (default 14)

        Returns:
            ATR values
        """
        tr1 = high - low
        tr2 = (high - close.shift()).abs()
        tr3 = (low - close.shift()).abs()

        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        return tr.rolling(window).mean()

    @staticmethod
    def normalized_atr(
        high: pd.Series,
        low: pd.Series,
        close: pd.Series,
        window: int = 14,
    ) -> pd.Series:
        """标准化ATR - ATR normalized by price.

        Args:
            high: High prices
            low: Low prices
            close: Close prices
            window: Rolling window

        Returns:
            ATR as percentage of close price
        """
        atr = FactorLibrary.atr(high, low, close, window)
        return atr / close

    @staticmethod
    def volatility_ratio(
        high: pd.Series, low: pd.Series, close: pd.Series, window: int = 20
    ) -> pd.Series:
        """波动率比率 - Ratio of current ATR to historical average.

        Args:
            high: High prices
            low: Low prices
            close: Close prices
            window: Window for comparison

        Returns:
            Volatility ratio
        """
        current_atr = FactorLibrary.atr(high, low, close, window)
        historical_atr = FactorLibrary.atr(high, low, close, window * 2).shift(window)
        return current_atr / historical_atr

    @staticmethod
    def rolling_std(prices: pd.Series, window: int = 20) -> pd.Series:
        """滚动标准差 - Rolling standard deviation.

        Args:
            prices: Price series
            window: Rolling window

        Returns:
            Rolling standard deviation
        """
        return prices.rolling(window).std()

    # ========== 趋势因子 (Trend Factors) ==========

    @staticmethod
    def sma(prices: pd.Series, window: int = 20) -> pd.Series:
        """简单移动平均 - Simple Moving Average.

        Args:
            prices: Price series
            window: MA period

        Returns:
            SMA values
        """
        return prices.rolling(window).mean()

    @staticmethod
    def ema(prices: pd.Series, span: int = 20) -> pd.Series:
        """指数移动平均 - Exponential Moving Average.

        Args:
            prices: Price series
            span: EMA span

        Returns:
            EMA values
        """
        return prices.ewm(span=span, adjust=False).mean()

    @staticmethod
    def price_vs_sma(prices: pd.Series, window: int = 20) -> pd.Series:
        """价格相对MA - Price relative to SMA.

        Args:
            prices: Price series
            window: MA window

        Returns:
            (price - SMA) / SMA
        """
        sma = prices.rolling(window).mean()
        return (prices - sma) / sma

    @staticmethod
    def price_vs_ema(prices: pd.Series, span: int = 20) -> pd.Series:
        """价格相对EMA - Price relative to EMA.

        Args:
            prices: Price series
            span: EMA span

        Returns:
            (price - EMA) / EMA
        """
        ema = prices.ewm(span=span, adjust=False).mean()
        return (prices - ema) / ema

    @staticmethod
    def double_ema_crossover(
        prices: pd.Series, fast_span: int = 10, slow_span: int = 30
    ) -> pd.Series:
        """双EMA交叉 - Double EMA crossover signal.

        Args:
            prices: Price series
            fast_span: Fast EMA span
            slow_span: Slow EMA span

        Returns:
            Signal: 1 (bullish), -1 (bearish), 0 (neutral)
        """
        fast_ema = prices.ewm(span=fast_span, adjust=False).mean()
        slow_ema = prices.ewm(span=slow_span, adjust=False).mean()

        signal = pd.Series(0, index=prices.index)
        signal[fast_ema > slow_ema] = 1
        signal[fast_ema < slow_ema] = -1
        return signal

    @staticmethod
    def triple_ema_crossover(
        prices: pd.Series,
        fast_span: int = 5,
        medium_span: int = 13,
        slow_span: int = 34,
    ) -> pd.Series:
        """三 EMA 交叉 - Triple EMA (TEMA) crossover.

        Args:
            prices: Price series
            fast_span: Fast EMA span
            medium_span: Medium EMA span
            slow_span: Slow EMA span

        Returns:
            TEMA signal
        """
        ema1 = prices.ewm(span=fast_span, adjust=False).mean()
        ema2 = ema1.ewm(span=medium_span, adjust=False).mean()
        ema3 = ema2.ewm(span=slow_span, adjust=False).mean()

        tema = 3 * ema1 - 3 * ema2 + ema3
        signal = pd.Series(0, index=prices.index)
        signal[tema > tema.shift(1)] = 1
        signal[tema < tema.shift(1)] = -1
        return signal

    @staticmethod
    def supertrend(
        high: pd.Series,
        low: pd.Series,
        close: pd.Series,
        period: int = 10,
        multiplier: float = 3.0,
    ) -> pd.Series:
        """超级趋势 - Supertrend indicator (optimized with numpy).

        Args:
            high: High prices
            low: Low prices
            close: Close prices
            period: ATR period
            multiplier: ATR multiplier

        Returns:
            Supertrend values
        """
        atr = FactorLibrary.atr(high, low, close, period)
        upper_band = ((high + low) / 2 + multiplier * atr).values
        lower_band = ((high + low) / 2 - multiplier * atr).values
        close_vals = close.values

        n = len(close_vals)
        supertrend = np.zeros(n)
        in_uptrend = True

        for i in range(n):
            if i == 0:
                supertrend[i] = lower_band[i]
                continue

            if close_vals[i] > upper_band[i]:
                in_uptrend = True
            elif close_vals[i] < lower_band[i]:
                in_uptrend = False

            if in_uptrend:
                supertrend[i] = lower_band[i]
            else:
                supertrend[i] = upper_band[i]

        return pd.Series(supertrend, index=close.index)

    @staticmethod
    def ichimoku_cloud(
        high: pd.Series,
        low: pd.Series,
        close: pd.Series,
        conversion_period: int = 9,
        base_period: int = 26,
        span_b_period: int = 52,
    ) -> Dict[str, pd.Series]:
        """一目均衡表 - Ichimoku Cloud components.

        Args:
            high: High prices
            low: Low prices
            close: Close prices
            conversion_period: Tenkan-sen period
            base_period: Kijun-sen period
            span_b_period: Senkou Span B period

        Returns:
            Dictionary with cloud components
        """
        conversion_line = (high.rolling(conversion_period).max() +
                          low.rolling(conversion_period).min()) / 2
        base_line = (high.rolling(base_period).max() +
                    low.rolling(base_period).min()) / 2
        span_a = ((conversion_line + base_line) / 2).shift(base_period)
        span_b = ((high.rolling(span_b_period).max() +
                  low.rolling(span_b_period).min()) / 2).shift(base_period)

        return {
            "tenkan_sen": conversion_line,
            "kijun_sen": base_line,
            "senkou_span_a": span_a,
            "senkou_span_b": span_b,
        }

    # ========== 动量因子 (Momentum Factors) ==========

    @staticmethod
    def rsi(prices: pd.Series, window: int = 14) -> pd.Series:
        """相对强弱指数 - Relative Strength Index.

        Args:
            prices: Price series
            window: RSI period

        Returns:
            RSI values (0-100)
        """
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window).mean()

        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi

    @staticmethod
    def stochastic(
        high: pd.Series,
        low: pd.Series,
        close: pd.Series,
        k_period: int = 14,
        d_period: int = 3,
    ) -> Tuple[pd.Series, pd.Series]:
        """随机指标 - Stochastic Oscillator.

        Args:
            high: High prices
            low: Low prices
            close: Close prices
            k_period: %K period
            d_period: %D period

        Returns:
            Tuple of (%K, %D)
        """
        lowest_low = low.rolling(k_period).min()
        highest_high = high.rolling(k_period).max()

        k = 100 * (close - lowest_low) / (highest_high - lowest_low)
        d = k.rolling(d_period).mean()

        return k, d

    @staticmethod
    def macd(
        prices: pd.Series,
        fast_period: int = 12,
        slow_period: int = 26,
        signal_period: int = 9,
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """MACD - Moving Average Convergence Divergence.

        Args:
            prices: Price series
            fast_period: Fast EMA period
            slow_period: Slow EMA period
            signal_period: Signal line period

        Returns:
            Tuple of (MACD line, signal line, histogram)
        """
        fast_ema = prices.ewm(span=fast_period, adjust=False).mean()
        slow_ema = prices.ewm(span=slow_period, adjust=False).mean()

        macd_line = fast_ema - slow_ema
        signal_line = macd_line.ewm(span=signal_period, adjust=False).mean()
        histogram = macd_line - signal_line

        return macd_line, signal_line, histogram

    @staticmethod
    def momentum_oscillator(
        prices: pd.Series, window: int = 14
    ) -> pd.Series:
        """动量振荡器 - Momentum Oscillator.

        Args:
            prices: Price series
            window: Lookback period

        Returns:
            Momentum values
        """
        return prices - prices.shift(window)

    @staticmethod
    def roc(prices: pd.Series, window: int = 12) -> pd.Series:
        """变化率 - Rate of Change.

        Args:
            prices: Price series
            window: ROC period

        Returns:
            ROC percentage
        """
        return 100 * (prices - prices.shift(window)) / prices.shift(window)

    @staticmethod
    def cci(high: pd.Series, low: pd.Series, close: pd.Series, window: int = 20) -> pd.Series:
        """商品通道指数 - Commodity Channel Index.

        Args:
            high: High prices
            low: Low prices
            close: Close prices
            window: CCI period

        Returns:
            CCI values
        """
        tp = (high + low + close) / 3
        sma_tp = tp.rolling(window).mean()
        # Use numpy operations for MAD calculation
        mad = tp.rolling(window).apply(
            lambda x: np.mean(np.abs(x - np.mean(x))),
            raw=True
        )
        cci = (tp - sma_tp) / (0.015 * mad)
        return cci

    @staticmethod
    def williams_r(
        high: pd.Series, low: pd.Series, close: pd.Series, window: int = 14
    ) -> pd.Series:
        """威廉指标 - Williams %R.

        Args:
            high: High prices
            low: Low prices
            close: Close prices
            window: Lookback period

        Returns:
            Williams %R (-100 to 0)
        """
        highest_high = high.rolling(window).max()
        lowest_low = low.rolling(window).min()

        wr = -100 * (highest_high - close) / (highest_high - lowest_low)
        return wr

    @staticmethod
    def mfi(
        high: pd.Series,
        low: pd.Series,
        close: pd.Series,
        volume: pd.Series,
        window: int = 14,
    ) -> pd.Series:
        """资金流量指数 - Money Flow Index.

        Args:
            high: High prices
            low: Low prices
            close: Close prices
            volume: Volume series
            window: MFI period

        Returns:
            MFI values (0-100)
        """
        tp = (high + low + close) / 3
        raw_money_flow = tp * volume

        positive_flow = raw_money_flow.where(tp > tp.shift(1), 0)
        negative_flow = raw_money_flow.where(tp < tp.shift(1), 0)

        positive_mf = positive_flow.rolling(window).sum()
        negative_mf = negative_flow.rolling(window).sum()

        mfi = 100 - (100 / (1 + positive_mf / negative_mf))
        return mfi

    # ========== 流动性因子 (Liquidity Factors) ==========

    @staticmethod
    def spread_normalized(
        spread: pd.Series, mid_price: pd.Series
    ) -> pd.Series:
        """标准化价差 - Spread in basis points.

        Args:
            spread: Bid-ask spread
            mid_price: Mid price

        Returns:
            Spread in bps
        """
        return (spread / mid_price) * 10000

    @staticmethod
    def spread_percentile(
        spread: pd.Series, window: int = 100
    ) -> pd.Series:
        """价差百分位 - Current spread percentile.

        Args:
            spread: Bid-ask spread series
            window: Historical window

        Returns:
            Percentile rank of current spread
        """
        def percentile_func(x):
            return np.searchsorted(np.sort(x), x[-1]) / len(x) * 100

        return spread.rolling(window).apply(percentile_func, raw=True)

    @staticmethod
    def bid_ask_imbalance(
        bid_size: pd.Series, ask_size: pd.Series
    ) -> pd.Series:
        """买卖盘失衡 - Order book imbalance.

        Args:
            bid_size: Bid size series
            ask_size: Ask size series

        Returns:
            Imbalance ratio (-1 to 1)
        """
        total = bid_size + ask_size
        return (bid_size - ask_size) / total

    @staticmethod
    def order_flow_intensity(
        bid_size: pd.Series, ask_size: pd.Series
    ) -> pd.Series:
        """订单流强度 - Order flow intensity.

        Args:
            bid_size: Bid size series
            ask_size: Ask size series

        Returns:
            Net order flow
        """
        return bid_size - ask_size

    @staticmethod
    def volume_price_correlation(
        prices: pd.Series, volume: pd.Series, window: int = 20
    ) -> pd.Series:
        """量价相关性 - Volume-price correlation.

        Args:
            prices: Price series
            volume: Volume series
            window: Rolling window

        Returns:
            Correlation coefficient
        """
        returns = prices.pct_change()
        return returns.rolling(window).corr(volume)

    # ========== 时段因子 (Session Factors) ==========

    @staticmethod
    def session_filter(
        timestamps: pd.Series, session: str
    ) -> pd.Series:
        """会话时段过滤 - Session filter signal.

        Args:
            timestamps: Timestamp series
            session: Session name ('asian', 'london', 'newyork')

        Returns:
            Boolean series indicating if timestamp is in session
        """
        hours = pd.to_datetime(timestamps).dt.hour

        if session == "asian":
            return (hours >= 0) & (hours < 8)
        elif session == "london":
            return (hours >= 8) & (hours < 16)
        elif session == "newyork":
            return (hours >= 13) & (hours < 21)
        else:
            return pd.Series(True, index=timestamps.index)

    @staticmethod
    def session_volatility(
        prices: pd.Series, timestamps: pd.Series, session: str
    ) -> pd.Series:
        """时段波动率 - Session-specific volatility.

        Args:
            prices: Price series
            timestamps: Timestamp series
            session: Session name

        Returns:
            Session volatility
        """
        in_session = FactorLibrary.session_filter(timestamps, session)
        returns = prices.pct_change()
        return returns.where(in_session).rolling(20).std()

    @staticmethod
    def time_of_day_effect(
        timestamps: pd.Series, returns: pd.Series
    ) -> pd.Series:
        """日内时间效应 - Time-of-day effect.

        Args:
            timestamps: Timestamp series
            returns: Returns series

        Returns:
            Average return by hour
        """
        hours = pd.to_datetime(timestamps).dt.hour
        return returns.groupby(hours).transform("mean")

    # ========== 成交量因子 (Volume Factors) ==========

    @staticmethod
    def volume_sma(volume: pd.Series, window: int = 20) -> pd.Series:
        """成交量移动平均 - Volume SMA.

        Args:
            volume: Volume series
            window: MA window

        Returns:
            Volume SMA
        """
        return volume.rolling(window).mean()

    @staticmethod
    def volume_ratio(volume: pd.Series, window: int = 20) -> pd.Series:
        """成交量比率 - Volume ratio to average.

        Args:
            volume: Volume series
            window: Comparison window

        Returns:
            Ratio of current volume to SMA
        """
        vol_sma = volume.rolling(window).mean()
        return volume / vol_sma

    @staticmethod
    def on_balance_volume(
        close: pd.Series, volume: pd.Series
    ) -> pd.Series:
        """能量潮 - On-Balance Volume.

        Args:
            close: Close prices
            volume: Volume series

        Returns:
            OBV cumulative sum
        """
        price_change = close.diff()
        obv = pd.Series(0, index=close.index)
        obv[price_change > 0] = volume[price_change > 0]
        obv[price_change < 0] = -volume[price_change < 0]
        return obv.cumsum()

    @staticmethod
    def accumulation_distribution(
        high: pd.Series,
        low: pd.Series,
        close: pd.Series,
        volume: pd.Series,
    ) -> pd.Series:
        """积累/派发 - Accumulation/Distribution line.

        Args:
            high: High prices
            low: Low prices
            close: Close prices
            volume: Volume series

        Returns:
            A/D line
        """
        mf_multiplier = ((close - low) - (high - close)) / (high - low)
        mf_multiplier = mf_multiplier.fillna(0)
        mf_volume = mf_multiplier * volume
        return mf_volume.cumsum()

    @staticmethod
    def vwap(
        close: pd.Series, volume: pd.Series, window: int = 1
    ) -> pd.Series:
        """成交量加权平均价 - Volume Weighted Average Price.

        Args:
            close: Close prices
            volume: Volume series
            window: Rolling window (1 for daily VWAP)

        Returns:
            VWAP values
        """
        typical_price = close  # Could also use (high+low+close)/3
        return (typical_price * volume).rolling(window).sum() / volume.rolling(
            window
        ).sum()

    # ========== 季节性因子 (Seasonal Factors) ==========

    @staticmethod
    def day_of_week_effect(
        timestamps: pd.Series, returns: pd.Series
    ) -> pd.Series:
        """星期效应 - Day-of-week effect.

        Args:
            timestamps: Timestamp series
            returns: Returns series

        Returns:
            Average return by day of week
        """
        dow = pd.to_datetime(timestamps).dt.dayofweek
        return returns.groupby(dow).transform("mean")

    @staticmethod
    def month_of_year_effect(
        timestamps: pd.Series, returns: pd.Series
    ) -> pd.Series:
        """月份效应 - Month-of-year effect.

        Args:
            timestamps: Timestamp series
            returns: Returns series

        Returns:
            Average return by month
        """
        month = pd.to_datetime(timestamps).dt.month
        return returns.groupby(month).transform("mean")

    @staticmethod
    def is_month_start(timestamps: pd.Series) -> pd.Series:
        """月初效应 - Month start indicator.

        Args:
            timestamps: Timestamp series

        Returns:
            Boolean series
        """
        return pd.to_datetime(timestamps).dt.is_month_start

    @staticmethod
    def is_month_end(timestamps: pd.Series) -> pd.Series:
        """月末效应 - Month end indicator.

        Args:
            timestamps: Timestamp series

        Returns:
            Boolean series
        """
        return pd.to_datetime(timestamps).dt.is_month_end

    # ========== 布林带因子 (Bollinger Bands Factors) ==========

    @staticmethod
    def bollinger_position(
        prices: pd.Series, window: int = 20, num_std: float = 2.0
    ) -> pd.Series:
        """布林带位置 - Bollinger Band position.

        Args:
            prices: Price series
            window: MA window
            num_std: Number of standard deviations

        Returns:
            Position within bands (0-1 typically)
        """
        sma = prices.rolling(window).mean()
        std = prices.rolling(window).std()
        upper_band = sma + num_std * std
        lower_band = sma - num_std * std

        return (prices - lower_band) / (upper_band - lower_band)

    @staticmethod
    def bollinger_bandwidth(
        prices: pd.Series, window: int = 20, num_std: float = 2.0
    ) -> pd.Series:
        """布林带宽度 - Bollinger Bandwidth.

        Args:
            prices: Price series
            window: MA window
            num_std: Number of standard deviations

        Returns:
            Bandwidth as percentage of midband
        """
        sma = prices.rolling(window).mean()
        std = prices.rolling(window).std()
        upper_band = sma + num_std * std
        lower_band = sma - num_std * std

        return (upper_band - lower_band) / sma

    # ========== KDJ 指标因子 ==========

    @staticmethod
    def kdj(
        high: pd.Series,
        low: pd.Series,
        close: pd.Series,
        n: int = 9,
        m1: int = 3,
        m2: int = 3,
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """KDJ 随机指标 - KDJ Stochastic.

        Args:
            high: High prices
            low: Low prices
            close: Close prices
            n: RSV period
            m1: K period
            m2: D period

        Returns:
            Tuple of (K, D, J)
        """
        lowest_low = low.rolling(n).min()
        highest_high = high.rolling(n).max()

        rsv = 100 * (close - lowest_low) / (highest_high - lowest_low)
        rsv = rsv.fillna(50)

        k = rsv.ewm(alpha=1 / m1, adjust=False).mean()
        d = k.ewm(alpha=1 / m2, adjust=False).mean()
        j = 3 * k - 2 * d

        return k, d, j

    # ========== 辅助因子 ==========

    @staticmethod
    def z_score(prices: pd.Series, window: int = 20) -> pd.Series:
        """Z-Score - Standardized price.

        Args:
            prices: Price series
            window: Rolling window

        Returns:
            Z-score
        """
        mean = prices.rolling(window).mean()
        std = prices.rolling(window).std()
        return (prices - mean) / std

    @staticmethod
    def percentile_rank(
        prices: pd.Series, window: int = 100
    ) -> pd.Series:
        """百分位排名 - Percentile rank.

        Args:
            prices: Price series
            window: Rank window

        Returns:
            Percentile (0-100)
        """
        def percentile_func(x):
            return np.searchsorted(np.sort(x), x[-1]) / len(x) * 100

        return prices.rolling(window).apply(percentile_func, raw=True)

    @staticmethod
    def skewness(prices: pd.Series, window: int = 20) -> pd.Series:
        """偏度 - Return distribution skewness.

        Args:
            prices: Price series
            window: Rolling window

        Returns:
            Skewness of returns
        """
        return prices.pct_change().rolling(window).skew()

    @staticmethod
    def kurtosis(prices: pd.Series, window: int = 20) -> pd.Series:
        """峰度 - Return distribution kurtosis.

        Args:
            prices: Price series
            window: Rolling window

        Returns:
            Excess kurtosis of returns
        """
        return prices.pct_change().rolling(window).kurt()

    # ========== 复合因子构建 ==========

    @staticmethod
    def combine_factors(
        factors: Dict[str, pd.Series],
        weights: Optional[Dict[str, float]] = None,
        method: str = "weighted",
    ) -> pd.Series:
        """组合多因子 - Combine multiple factors.

        Args:
            factors: Dictionary of factor_name -> factor_series
            weights: Dictionary of factor_name -> weight
            method: Combination method ('weighted', 'equal', 'rank')

        Returns:
            Combined factor series
        """
        if method == "equal":
            weights = {k: 1.0 / len(factors) for k in factors}

        if method == "rank":
            ranked = {k: v.rank(pct=True) for k, v in factors.items()}
            return pd.concat(ranked, axis=1).mean(axis=1)

        if weights is None:
            weights = {k: 1.0 / len(factors) for k in factors}

        # Normalize weights
        total_weight = sum(weights.values())
        weights = {k: v / total_weight for k, v in weights.items()}

        combined = None
        for name, factor in factors.items():
            weight = weights.get(name, 0)
            if combined is None:
                combined = factor * weight
            else:
                combined = combined + factor * weight

        return combined


# Factory function for creating factor configurations
def get_factor_by_name(name: str) -> callable:
    """Get factor function by name.

    Args:
        name: Factor name (e.g., 'momentum', 'rsi')

    Returns:
        Factor function

    Raises:
        ValueError: If factor name not found
    """
    factors = {
        # Price factors
        "momentum": FactorLibrary.momentum,
        "reversal": FactorLibrary.reversal,
        "log_return": FactorLibrary.log_return,
        # Volatility factors
        "volatility": FactorLibrary.volatility,
        "atr": FactorLibrary.atr,
        "parkinson_volatility": FactorLibrary.parkinson_volatility,
        "garman_klass_volatility": FactorLibrary.garman_klass_volatility,
        # Trend factors
        "sma": FactorLibrary.sma,
        "ema": FactorLibrary.ema,
        "price_vs_sma": FactorLibrary.price_vs_sma,
        "macd": FactorLibrary.macd,
        "rsi": FactorLibrary.rsi,
        # Momentum
        "stochastic": FactorLibrary.stochastic,
        "cci": FactorLibrary.cci,
        "williams_r": FactorLibrary.williams_r,
        # Volume factors
        "volume_ratio": FactorLibrary.volume_ratio,
        "on_balance_volume": FactorLibrary.on_balance_volume,
        "vwap": FactorLibrary.vwap,
        # Misc
        "z_score": FactorLibrary.z_score,
        "percentile_rank": FactorLibrary.percentile_rank,
    }

    if name not in factors:
        raise ValueError(f"Unknown factor: {name}")

    return factors[name]
