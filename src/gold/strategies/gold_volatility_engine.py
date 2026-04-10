"""
黄金波动率自适应交易引擎
专门针对XAUUSD黄金交易的波动率特性设计的量化引擎
"""

import pandas as pd
import numpy as np
from datetime import datetime, time, timedelta
from typing import Dict, List, Optional, Tuple, Any
import logging
import asyncio

# 尝试导入pytz，如果失败使用标准库
try:
    import pytz
    HAS_PYTZ = True
except ImportError:
    HAS_PYTZ = False
    from datetime import timezone
    print("警告: pytz未安装，使用标准库时区支持")

# 尝试导入talib，如果失败使用回退实现
try:
    import talib
    TA_LIB_AVAILABLE = True
except ImportError:
    TA_LIB_AVAILABLE = False
    print("警告: TA-Lib未安装，使用回退技术指标实现")

    # 简单的回退技术指标实现
    class TalibFallback:
        @staticmethod
        def MACD(close, fastperiod=12, slowperiod=26, signalperiod=9):
            """MACD回退实现"""
            exp1 = close.ewm(span=fastperiod, adjust=False).mean()
            exp2 = close.ewm(span=slowperiod, adjust=False).mean()
            macd = exp1 - exp2
            macdsignal = macd.ewm(span=signalperiod, adjust=False).mean()
            macdhist = macd - macdsignal
            return macd, macdsignal, macdhist

        @staticmethod
        def RSI(close, timeperiod=14):
            """RSI回退实现"""
            delta = close.diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=timeperiod).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=timeperiod).mean()
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))
            return rsi

        @staticmethod
        def BBANDS(close, timeperiod=20, nbdevup=2, nbdevdn=2):
            """布林带回退实现"""
            middle = close.rolling(window=timeperiod).mean()
            std = close.rolling(window=timeperiod).std()
            upper = middle + (std * nbdevup)
            lower = middle - (std * nbdevdn)
            return upper, middle, lower

        @staticmethod
        def ATR(high, low, close, timeperiod=14):
            """ATR回退实现"""
            tr1 = high - low
            tr2 = abs(high - close.shift())
            tr3 = abs(low - close.shift())
            tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
            atr = tr.rolling(window=timeperiod).mean()
            return atr

    talib = TalibFallback()

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GoldVolatilityEngine:
    """
    黄金波动率自适应交易引擎

    特性：
    1. 黄金波动率专用指标
    2. 跳空风险检测（1% gap_risk）
    3. 隔夜风险管理（0.5% overnight_risk）
    4. 亚盘时段过滤（时区调整）
    5. M1/M5/M15/M30多时间框架
    """

    def __init__(self, config_path: str = None):
        """
        初始化黄金波动率引擎

        参数:
            config_path: 配置文件路径
        """
        # 加载风险参数（从app_config.json）
        self.risk_params = {
            "gap_risk_limit": 0.01,  # 1% 跳空风险
            "overnight_risk_limit": 0.005,  # 0.5% 隔夜风险
            "max_drawdown": 0.02,  # 2% 最大回撤
            "max_daily_loss": 0.005,  # 0.5% 每日最大损失
            "position_size": 0.01,  # 1% 头寸规模
        }

        # 黄金特性参数
        self.gold_params = {
            "volatility_period": 20,  # 波动率计算周期
            "gap_window": 10,  # 跳空窗口
            "asian_session_enabled": True,  # 启用亚盘过滤
            "asian_session_risk_adjustment": 0.7,  # 亚盘时段风险调整系数
            "timezone": "UTC",  # 默认时区
            "gold_vol_preference": 1.5,  # 黄金波动率偏好系数
        }

        # 技术指标配置
        self.indicator_config = {
            "gold_vol_period": 20,  # 黄金波动率指标周期
            "adaptive_rsi_period": 14,  # 自适应RSI周期
            "dynamic_bollinger_period": 20,  # 动态布林带周期
            "atr_multiplier": 2.0,  # ATR乘数
            "trend_filter_threshold": 0.3,  # 趋势过滤阈值
        }

        # 性能参数
        self.perf_params = {
            "target_throughput": 21340,  # 21,340+ ticks/sec
            "target_latency_ms": 50,  # <50ms延迟
            "data_quality_min": 0.987,  # 98.7%+数据质量
        }

        # 内部状态
        self.data_buffer = {}
        self.current_position = None
        self.trades_history = []
        self.performance_stats = {
            "ticks_processed": 0,
            "signals_generated": 0,
            "trades_executed": 0,
            "avg_processing_time_ms": 0,
            "max_throughput_tps": 0,
        }

        # 初始化时区
        if HAS_PYTZ:
            self.timezone = pytz.UTC
        else:
            from datetime import timezone
            self.timezone = timezone.utc

        logger.info("黄金波动率引擎初始化完成")

    def calculate_gold_volatility_indicator(self, prices: pd.Series, period: int = None) -> pd.Series:
        """
        计算黄金波动率专用指标

        Args:
            prices: 价格序列
            period: 计算周期（默认20）

        Returns:
            gold_volatility: 黄金波动率指标
        """
        if period is None:
            period = self.indicator_config["gold_vol_period"]

        log_returns = np.log(prices / prices.shift(1))

        # 黄金特有的波动率调整
        # 1. 跳空修正
        gaps = prices - prices.shift(1)
        gap_factor = np.where(np.abs(gaps/prices.shift(1)) > 0.005, 1.5, 1.0)

        # 2. 时段波动率权重
        time_weights = self._calculate_session_weights(prices.index)

        # 3. 黄金偏好调整
        gold_preference = self.gold_params["gold_vol_preference"]

        # 计算黄金专用波动率
        combined_returns = log_returns * gap_factor * time_weights * gold_preference
        gold_volatility = combined_returns.rolling(window=period).std()

        # 年化处理（假设每日交易6天×24小时）
        gold_volatility = gold_volatility * np.sqrt(365 * 24)

        return gold_volatility

    def detect_gap_risk(self, current_price: float, previous_close: float) -> Tuple[bool, float, Dict[str, Any]]:
        """
        检测跳空风险是否超过1%

        Args:
            current_price: 当前价格
            previous_close: 前收盘价

        Returns:
            (risk_exceeded, gap_percent, risk_info)
        """
        gap_percent = abs(current_price - previous_close) / previous_close

        gap_exceeded = gap_percent > self.risk_params["gap_risk_limit"]

        risk_info = {
            "gap_percent": gap_percent,
            "threshold": self.risk_params["gap_risk_limit"],
            "action": None,
            "adjustments": {}
        }

        if gap_exceeded:
            risk_info["action"] = "suspending_new_trades"
            risk_info["adjustments"] = {
                "stop_loss": "adjusted_wider",
                "margin": "increased_50pct",
                "position_size": "reduced_50pct"
            }
            logger.warning(f"跳空风险超限: {gap_percent:.2%} > {self.risk_params['gap_risk_limit']:.1%}")
        else:
            risk_info["action"] = "normal_operations"

        return gap_exceeded, gap_percent, risk_info

    def calculate_overnight_risk(self,
                               position_size: float,
                               current_volatility: float,
                               time_until_close: Optional[timedelta] = None) -> Tuple[float, Dict[str, Any]]:
        """
        计算隔夜风险暴露

        Args:
            position_size: 头寸规模
            current_volatility: 当前波动率
            time_until_close: 距离收市的时间

        Returns:
            (adjusted_risk, risk_info)
        """
        base_overnight_risk = position_size * current_volatility * 0.5  # 基础隔夜风险

        # 黄金特有的时间因素
        session_factor = self._calculate_overnight_session_factor()
        event_factor = self._calculate_pending_events_factor()

        adjusted_risk = base_overnight_risk * session_factor * event_factor

        # 确保不超过0.5%限制
        max_risk = position_size * self.risk_params["overnight_risk_limit"]

        if adjusted_risk > max_risk:
            adjusted_risk = max_risk
            logger.warning(f"隔夜风险调整: {adjusted_risk:.2f} > 限制 {max_risk:.2f}")

        risk_info = {
            "base_risk": base_overnight_risk,
            "session_factor": session_factor,
            "event_factor": event_factor,
            "adjusted_risk": adjusted_risk,
            "risk_limit": max_risk,
            "risk_ratio": adjusted_risk / max_risk,
        }

        return adjusted_risk, risk_info

    def is_asian_trading_hour(self, timestamp: pd.Timestamp) -> bool:
        """
        判断是否为亚盘时段（19:00-08:00 UTC）

        Args:
            timestamp: UTC时间戳

        Returns:
            True: 亚盘时段, False: 非亚盘时段
        """
        hour = timestamp.hour
        # UTC时间19:00到次日08:00为亚盘时段
        return hour >= 19 or hour < 8

    def adjust_strategy_for_asian_session(self, strategy_params: Dict[str, Any],
                                        timestamp: pd.Timestamp) -> Dict[str, Any]:
        """
        亚盘时段策略调整

        Args:
            strategy_params: 原始策略参数
            timestamp: 当前时间

        Returns:
            adjusted_params: 调整后的策略参数
        """
        if not self.gold_params["asian_session_enabled"]:
            return strategy_params

        is_asian = self.is_asian_trading_hour(timestamp)

        adjusted_params = strategy_params.copy()

        if is_asian:
            # 亚盘时段风险调整
            adjustment_factor = self.gold_params["asian_session_risk_adjustment"]

            # 调整参数
            if "position_size" in adjusted_params:
                adjusted_params["position_size"] *= adjustment_factor

            if "stop_loss" in adjusted_params:
                adjusted_params["stop_loss"] *= (1 / adjustment_factor)  # 放宽止损

            if "take_profit" in adjusted_params:
                adjusted_params["take_profit"] *= adjustment_factor  # 降低止盈

            # 添加亚盘特定标记
            adjusted_params["asain_session_optimized"] = True
            adjusted_params["risk_multiplier"] = adjustment_factor

        return adjusted_params

    def generate_multi_timeframe_signals(self, data_dict: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
        """
        多时间框架信号生成（M1/M5/M15/M30）

        Args:
            data_dict: 包含不同时间框架数据的字典
                {"M1": df_m1, "M5": df_m5, "M15": df_m15, "M30": df_m30}

        Returns:
            combined_signals: 综合信号
        """
        signals = {}

        for timeframe, data in data_dict.items():
            if data.empty:
                continue

            timeframe_signals = self._analyze_single_timeframe(data, timeframe)
            signals[timeframe] = timeframe_signals

        # 时间框架优先级：M1 < M5 < M15 < M30（大周期权重更高）
        timeframe_weights = {"M1": 0.1, "M5": 0.2, "M15": 0.3, "M30": 0.4}

        combined_signal = self._combine_timeframe_signals(signals, timeframe_weights)

        return {
            "timeframe_signals": signals,
            "combined_signal": combined_signal,
            "confidence_score": self._calculate_signal_confidence(signals),
            "generation_time": datetime.now(self.timezone),
        }

    def calculate_gold_trend_strength(self, prices: pd.Series, period: int = 50) -> pd.Series:
        """
        计算黄金趋势强度

        Args:
            prices: 价格序列
            period: 计算周期（默认50）

        Returns:
            trend_strength: 趋势强度（0-1范围）
        """
        # 移动平均值
        ma_fast = prices.rolling(window=period//2).mean()
        ma_slow = prices.rolling(window=period).mean()

        # 价格与移动平均的偏离度
        deviation = (prices - ma_slow) / ma_slow

        # 趋势方向（+1上涨，-1下跌，0盘整）
        trend_direction = np.sign(prices.diff(period))

        # 趋势强度（0-1范围）
        trend_strength = abs(deviation) * np.abs(trend_direction)

        # 黄金特有的趋势强度调整
        gap_filter = self._calculate_gap_filter(prices)
        adjusted_strength = trend_strength * gap_filter

        # 归一化到0-1
        if adjusted_strength.max() > 0:
            adjusted_strength = adjusted_strength / adjusted_strength.max()

        return adjusted_strength

    def calculate_dynamic_position_size(self,
                                      account_size: float,
                                      current_volatility: float,
                                      signal_strength: float,
                                      risk_adjustment: float = 1.0) -> float:
        """
        计算动态头寸规模

        Args:
            account_size: 账户规模
            current_volatility: 当前波动率
            signal_strength: 信号强度（0-1）
            risk_adjustment: 风险调整系数

        Returns:
            calculated_size: 计算的头寸规模
        """
        # 基础头寸规模（1%账户规模）
        base_size = account_size * self.risk_params["position_size"]

        # 波动率调整（波动率越高，头寸越小）
        vol_adjustment = 1.0 / (1.0 + current_volatility * 100)

        # 信号强度调整
        signal_adjustment = signal_strength

        # 综合调整
        total_adjustment = risk_adjustment * vol_adjustment * signal_adjustment

        # 计算最终头寸规模
        calculated_size = base_size * total_adjustment

        # 确保不超过每日最大损失限制
        max_daily_risk = account_size * self.risk_params["max_daily_loss"]
        max_size = max_daily_risk / (current_volatility * 3)  # 3倍标准差保护

        calculated_size = min(calculated_size, max_size)

        return calculated_size

    def evaluate_performance(self) -> Dict[str, float]:
        """
        评估引擎性能

        Returns:
            performance_metrics: 性能指标
        """
        tps = self.performance_stats.get("ticks_processed", 0) / max(1, self.performance_stats.get("processing_time_seconds", 1))

        metrics = {
            "current_throughput_tps": tps,
            "target_throughput_tps": self.perf_params["target_throughput"],
            "throughput_ratio": tps / self.perf_params["target_throughput"] if self.perf_params["target_throughput"] > 0 else 0,
            "avg_latency_ms": self.performance_stats.get("avg_processing_time_ms", 0),
            "target_latency_ms": self.perf_params["target_latency_ms"],
            "latency_ratio": self.performance_stats.get("avg_processing_time_ms", 0) / self.perf_params["target_latency_ms"] if self.perf_params["target_latency_ms"] > 0 else 0,
            "signals_per_second": self.performance_stats.get("signals_generated", 0) / max(1, self.performance_stats.get("processing_time_seconds", 1)),
            "success_rate": self.performance_stats.get("successful_trades", 0) / max(1, self.performance_stats.get("trades_executed", 0)),
        }

        return metrics

    # 私有辅助方法
    def _calculate_session_weights(self, timestamps) -> np.ndarray:
        """计算交易时段权重"""
        if not isinstance(timestamps, pd.DatetimeIndex):
            timestamps = pd.DatetimeIndex(timestamps)

        # 初始化权重为1
        weights = np.ones(len(timestamps))

        # 为不同时段设置不同权重
        for i, ts in enumerate(timestamps):
            hour = ts.hour

            if 19 <= hour or hour < 8:  # 亚盘时段
                weights[i] = 0.7  # 亚盘权重较低
            elif 8 <= hour < 16:  # 欧盘时段
                weights[i] = 1.2  # 欧盘权重较高
            elif 13 <= hour < 21:  # 美盘时段
                weights[i] = 1.5  # 美盘权重最高

        return weights

    def _calculate_overnight_session_factor(self) -> float:
        """计算隔夜时段因子"""
        now = datetime.now(self.timezone)
        hour = now.hour

        # 假设市场关闭在21:00-07:00 UTC
        if 21 <= hour or hour < 7:
            return 1.5  # 隔夜风险较高
        else:
            return 1.0

    def _calculate_pending_events_factor(self) -> float:
        """计算待定事件因子"""
        # 简单实现：检查是否有重大经济数据发布日
        # 这里可以集成外部API获取经济日历
        today = datetime.now(self.timezone).date()

        # 模拟实现：周一、周三风险较高
        weekday = today.weekday()
        if weekday == 0 or weekday == 2:  # 周一、周三
            return 1.3
        else:
            return 1.0

    def _calculate_gap_filter(self, prices: pd.Series) -> pd.Series:
        """计算跳空过滤器"""
        gaps = (prices - prices.shift(1)).abs() / prices.shift(1)
        # 大幅跳空后减少对趋势强度的依赖
        gap_filter = np.where(gaps > 0.01, 0.5, 1.0)
        return gap_filter

    def _analyze_single_timeframe(self, data: pd.DataFrame, timeframe: str) -> Dict[str, Any]:
        """分析单一时间框架数据"""
        if len(data) < 2:
            return {"signal": 0, "confidence": 0, "indicators": {}}

        # 计算技术指标
        close_prices = data['close']

        # 黄金波动率指标
        gold_vol = self.calculate_gold_volatility_indicator(close_prices)

        # 黄金趋势强度
        trend_strength = self.calculate_gold_trend_strength(close_prices)

        # 跳空风险检查
        latest_price = close_prices.iloc[-1]
        prev_price = close_prices.iloc[-2]
        gap_exceeded, gap_percent, _ = self.detect_gap_risk(latest_price, prev_price)

        # 生成信号
        if gap_exceeded:
            signal = 0  # 跳空过大，不交易
            confidence = 0
        else:
            signal = self._generate_signal_from_indicators(trend_strength.iloc[-1], gold_vol.iloc[-1])
            confidence = min(trend_strength.iloc[-1], 1.0)

        return {
            "signal": signal,  # -1: 卖出, 0: 无信号, 1: 买入
            "confidence": confidence,
            "indicators": {
                "gold_volatility": float(gold_vol.iloc[-1]) if not gold_vol.iloc[-1] is None else 0,
                "trend_strength": float(trend_strength.iloc[-1]) if not trend_strength.iloc[-1] is None else 0,
                "gap_percent": gap_percent,
                "gap_risk_exceeded": gap_exceeded,
                "latest_price": float(latest_price),
                "timeframe": timeframe,
            }
        }

    def _generate_signal_from_indicators(self, trend_strength: float, gold_vol: float) -> int:
        """从指标生成交易信号"""
        if trend_strength > 0.7 and gold_vol > 0.01:
            return 1  # 强趋势，高波动，买入
        elif trend_strength < 0.3 and gold_vol > 0.01:
            return -1  # 强下跌趋势，高波动，卖出
        elif abs(trend_strength - 0.5) < 0.2 and gold_vol > 0.02:
            return 1  # 中性趋势，超高波动，考虑买入（避险买盘）
        else:
            return 0  # 其他情况，无信号

    def _combine_timeframe_signals(self, signals: Dict[str, Dict], weights: Dict[str, float]) -> Dict[str, Any]:
        """结合多时间框架信号"""
        if not signals:
            return {"signal": 0, "confidence": 0}

        weighted_signal = 0
        weighted_confidence = 0
        total_weight = 0

        for timeframe, timeframe_info in signals.items():
            weight = weights.get(timeframe, 0.1)
            signal = timeframe_info.get("signal", 0)
            confidence = timeframe_info.get("confidence", 0)

            weighted_signal += signal * weight * confidence
            weighted_confidence += confidence * weight
            total_weight += weight

        if total_weight > 0:
            combined_signal = weighted_signal / weighted_confidence if weighted_confidence > 0 else 0
            combined_confidence = weighted_confidence / total_weight
        else:
            combined_signal = 0
            combined_confidence = 0

        # 确定最终信号
        if combined_signal > 0.3 and combined_confidence > 0.5:
            final_signal = 1
        elif combined_signal < -0.3 and combined_confidence > 0.5:
            final_signal = -1
        else:
            final_signal = 0

        return {
            "signal": final_signal,
            "confidence": combined_confidence,
            "weighted_signal": float(combined_signal),
            "contributing_timeframes": list(signals.keys())
        }

    def _calculate_signal_confidence(self, signals: Dict[str, Dict]) -> float:
        """计算信号置信度"""
        if not signals:
            return 0.0

        # 检查时间框架的一致性
        directions = []
        confidences = []

        for timeframe_info in signals.values():
            signal = timeframe_info.get("signal", 0)
            confidence = timeframe_info.get("confidence", 0)

            if signal != 0 and confidence > 0.3:
                directions.append(signal)
                confidences.append(confidence)

        if not directions:
            return 0.0

        # 一致性越高，置信度越高
        avg_direction = np.mean(directions)
        avg_confidence = np.mean(confidences)

        direction_consistency = 1.0 - np.std(directions)  # 标准差越小，一致性越高
        consistency_score = direction_consistency * avg_confidence

        return consistency_score

    def update_performance_stats(self,
                               ticks_processed: int = 1,
                               processing_time_ms: float = 0,
                               signal_generated: bool = False,
                               trade_executed: bool = False) -> None:
        """更新性能统计"""
        self.performance_stats["ticks_processed"] += ticks_processed

        # 更新平均处理时间
        current_avg = self.performance_stats.get("avg_processing_time_ms", 0)
        n = self.performance_stats.get("processing_count", 0)

        if processing_time_ms > 0:
            new_avg = (current_avg * n + processing_time_ms) / (n + 1)
            self.performance_stats["avg_processing_time_ms"] = new_avg
            self.performance_stats["processing_count"] = n + 1
            self.performance_stats["total_processing_time_ms"] = self.performance_stats.get("total_processing_time_ms", 0) + processing_time_ms

        # 更新信号和交易计数
        if signal_generated:
            self.performance_stats["signals_generated"] += 1

        if trade_executed:
            self.performance_stats["trades_executed"] += 1

        # 计算吞吐量
        total_time_seconds = self.performance_stats.get("total_processing_time_ms", 0) / 1000
        if total_time_seconds > 0:
            current_tps = self.performance_stats["ticks_processed"] / total_time_seconds
            self.performance_stats["max_throughput_tps"] = max(
                self.performance_stats.get("max_throughput_tps", 0),
                current_tps
            )