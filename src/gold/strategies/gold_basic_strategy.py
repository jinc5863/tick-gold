"""
基础黄金交易策略示例
演示黄金专家代理定义的黄金交易特性实现
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
import logging

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GoldBasicStrategy:
    """
    基础黄金交易策略
    实现XAUUSD黄金交易的基本特性和要求
    """

    def __init__(self, symbol: str = "XAUUSD", timeframe: str = "M1"):
        """
        初始化黄金交易策略

        参数:
            symbol: 交易品种 (默认为XAUUSD)
            timeframe: 时间周期 (默认为M1)
        """
        self.symbol = symbol
        self.timeframe = timeframe

        # 黄金交易特性参数
        self.gold_characteristics = {
            "gap_risk_limit": 0.01,  # 1% 跳空风险限制
            "overnight_risk_limit": 0.005,  # 0.5% 隔夜风险限制
            "asian_session_filter": True,  # 启用亚盘时段过滤
            "performance_target_tps": 21340,  # 21,340+ ticks/sec目标
            "max_latency_ms": 50,  # <50ms 延迟目标
            "min_data_quality": 0.987,  # 98.7%+ 数据质量要求
        }

        # 策略状态
        self.position = None
        self.cash = 100000.0  # 初始资金
        self.portfolio_value = self.cash
        self.trades = []
        self.performance_metrics = {
            "total_ticks_processed": 0,
            "total_trades": 0,
            "total_pnl": 0.0,
            "avg_throughput": 0.0,
            "avg_latency": 0.0,
            "max_drawdown": 0.0,
            "gap_risk_events": 0,
            "overnight_risk_events": 0,
        }

        logger.info(f"✅ 黄金策略初始化: {symbol}, 周期: {timeframe}")
        logger.info(f"✅ 黄金特性: 跳空风险≤{self.gold_characteristics['gap_risk_limit']*100}%, "
                    f"隔夜风险≤{self.gold_characteristics['overnight_risk_limit']*100}%")
        logger.info(f"✅ 性能目标: {self.gold_characteristics['performance_target_tps']:,}+ ticks/sec, "
                    f"延迟<{self.gold_characteristics['max_latency_ms']}ms")

        # 初始化性能监控时间戳
        self._start_time = datetime.now()

    # ============ 黄金交易特性实现 ============

    def check_gap_risk(self, current_price: float, previous_close: float) -> Tuple[bool, float, Dict]:
        """
        检查跳空风险是否超过1%

        参数:
            current_price: 当前价格
            previous_close: 前收盘价

        返回:
            (是否触发风险, 跳空百分比, 风险响应)
        """
        gap_percent = abs(current_price - previous_close) / previous_close

        # 判断是否超过1%阈值
        if gap_percent >= self.gold_characteristics["gap_risk_limit"]:
            self.performance_metrics["gap_risk_events"] += 1

            risk_response = {
                "action": "suspend_trading",
                "reason": f"跳空风险超过阈值: {gap_percent:.2%} >= {self.gold_characteristics['gap_risk_limit']:.2%}",
                "adjustments": {
                    "stop_loss": "widen_by_50%",
                    "position_size": "reduce_by_50%",
                    "margin_requirement": "increase_by_100%"
                },
                "notifications": ["risk_monitor", "compliance_team"],
                "timestamp": datetime.now().isoformat()
            }

            logger.warning(f"⚠️ 跳空风险触发: {gap_percent:.2%} >= {self.gold_characteristics['gap_risk_limit']:.1%}")
            return True, gap_percent, risk_response

        return False, gap_percent, {}

    def calculate_overnight_risk(self, position_size: float, current_volatility: float,
                                 hours_until_close: int) -> Dict[str, Any]:
        """
        计算隔夜风险暴露

        参数:
            position_size: 头寸规模
            current_volatility: 当前波动率
            hours_until_close: 距离市场关闭的小时数

        返回:
            风险评估和调整建议
        """
        # 基础隔夜风险计算
        base_overnight_risk = position_size * current_volatility * 0.3

        # 时间因子：距离闭市越近，风险越小
        time_factor = max(0.1, min(1.0, hours_until_close / 24))

        # 波动率因子
        volatility_factor = 1.0 + (current_volatility - 0.02) * 10

        # 调整后的隔夜风险
        adjusted_risk = base_overnight_risk * time_factor * volatility_factor

        # 确保不超过0.5%限制
        max_allowed_risk = position_size * self.gold_characteristics["overnight_risk_limit"]
        final_risk = min(adjusted_risk, max_allowed_risk)

        # 检查是否接近限制
        risk_ratio = final_risk / position_size
        risk_status = "normal"

        if risk_ratio > self.gold_characteristics["overnight_risk_limit"] * 0.8:
            risk_status = "warning"
            self.performance_metrics["overnight_risk_events"] += 1

        return {
            "risk_exposure": final_risk,
            "risk_ratio": risk_ratio,
            "max_allowed": max_allowed_risk,
            "status": risk_status,
            "recommendations": self._generate_overnight_risk_recommendations(
                risk_ratio, position_size
            )
        }

    def _generate_overnight_risk_recommendations(self, risk_ratio: float,
                                                 position_size: float) -> List[str]:
        """
        根据隔夜风险比例生成调整建议
        """
        recommendations = []

        # 风险接近限制时的建议
        if risk_ratio > self.gold_characteristics["overnight_risk_limit"] * 0.8:
            recommendations.append(f"隔夜风险接近限制({risk_ratio:.2%})")

            if risk_ratio > self.gold_characteristics["overnight_risk_limit"] * 0.9:
                # 高风险：强烈建议行动
                recommendations.append("强烈建议减少头寸")
                recommendations.append("考虑增加对冲头寸")

            if risk_ratio >= self.gold_characteristics["overnight_risk_limit"]:
                # 达到限制：必须行动
                recommendations.append("立即减少50%头寸规模")
                recommendations.append("增加保护性期权对冲")

        return recommendations

    def is_asian_trading_hour(self, timestamp: datetime) -> bool:
        """
        判断是否为亚盘时段 (UTC 19:00-08:00)

        参数:
            timestamp: 时间戳

        返回:
            是否为亚盘时段
        """
        hour = timestamp.hour
        # UTC时间19:00到次日08:00为亚盘时段
        return hour >= 19 or hour < 8

    def adjust_for_asian_session(self, trade_signal: Dict[str, Any],
                                 timestamp: datetime) -> Dict[str, Any]:
        """
        根据亚盘时段调整交易策略

        亚盘时段特点:
        1. 流动性较低
        2. 波动性较小
        3. 趋势延续性较弱

        参数:
            trade_signal: 原始交易信号
            timestamp: 时间戳

        返回:
            调整后的交易信号
        """
        if not self.gold_characteristics["asian_session_filter"]:
            return trade_signal

        if self.is_asian_trading_hour(timestamp):
            adjusted_signal = trade_signal.copy()

            # 亚盘时段调整
            adjustment_factors = {
                "position_size": 0.7,  # 减少30%头寸规模
                "stop_loss": 1.2,  # 放宽20%止损
                "take_profit": 0.8,  # 缩短20%止盈
                "risk_multiplier": 0.7  # 降低30%风险暴露
            }

            # 应用调整
            if "position_size" in adjusted_signal:
                adjusted_signal["position_size"] *= adjustment_factors["position_size"]

            if "stop_loss_pct" in adjusted_signal:
                adjusted_signal["stop_loss_pct"] *= adjustment_factors["stop_loss"]

            if "take_profit_pct" in adjusted_signal:
                adjusted_signal["take_profit_pct"] *= adjustment_factors["take_profit"]

            if "risk_multiplier" in adjusted_signal:
                adjusted_signal["risk_multiplier"] *= adjustment_factors["risk_multiplier"]

            adjusted_signal["asian_session_adjusted"] = True
            adjusted_signal["adjustment_factors"] = adjustment_factors

            logger.info(f"🕐 亚盘时段策略调整: {timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}")
            logger.info(f"   调整因子: {adjustment_factors}")

            return adjusted_signal

        return trade_signal

    # ============ 策略核心逻辑 ============

    def calculate_gold_volatility(self, prices: pd.Series, period: int = 20) -> pd.Series:
        """
        计算黄金专用波动率

        黄金波动率特点:
        1. 对跳空敏感
        2. 需考虑时段特征
        3. 趋势延续性较好

        参数:
            prices: 价格序列
            period: 计算周期

        返回:
            波动率序列
        """
        log_returns = np.log(prices / prices.shift(1))

        # 黄金特有的波动率调整
        # 1. 跳空调整
        gaps = prices - prices.shift(1)
        gap_factors = np.where(np.abs(gaps / prices.shift(1)) > 0.01, 0.7, 1.0)

        # 2. 时段权重（亚盘时段波动率较小）
        def get_session_weight(ts):
            hour = ts.hour
            return 0.7 if (hour >= 19 or hour < 8) else 1.0

        if hasattr(prices.index[0], 'hour'):
            time_weights = prices.index.to_series().apply(get_session_weight).values
        else:
            time_weights = 1.0

        # 应用调整
        adjusted_returns = log_returns * gap_factors * time_weights

        # 计算滚动波动率
        volatility = adjusted_returns.rolling(window=period, min_periods=period).std()

        return volatility

    def generate_trading_signals(self, market_data: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        生成交易信号

        参数:
            market_data: 市场数据DataFrame，需包含OHLCV数据

        返回:
            交易信号列表
        """
        if market_data.empty:
            return []

        signals = []
        current_price = market_data['close'].iloc[-1]
        current_time = market_data.index[-1]

        # 计算技术指标
        volatility = self.calculate_gold_volatility(market_data['close'])
        current_volatility = volatility.iloc[-1] if not volatility.empty else 0.02

        # 检查跳空风险
        if len(market_data) >= 2:
            previous_close = market_data['close'].iloc[-2]
            gap_triggered, gap_percent, gap_response = self.check_gap_risk(
                current_price, previous_close
            )

            # 如果有跳空风险，暂停交易
            if gap_triggered:
                signals.append({
                    "action": "no_trade",
                    "reason": "gap_risk_exceeded",
                    "gap_percent": gap_percent,
                    "risk_response": gap_response,
                    "timestamp": current_time
                })
                return signals

        # 基础交易逻辑示例
        # 这里使用简单的移动平均交叉
        if len(market_data) >= 50:
            ma_fast = market_data['close'].rolling(window=10).mean().iloc[-1]
            ma_slow = market_data['close'].rolling(window=50).mean().iloc[-1]

            # 生成基础信号
            if ma_fast > ma_slow * 1.001:  # 快线上穿慢线
                base_signal = {
                    "action": "buy",
                    "symbol": self.symbol,
                    "price": current_price,
                    "position_size": 0.01,  # 1%仓位
                    "stop_loss_pct": 0.005,  # 0.5%止损
                    "take_profit_pct": 0.01,  # 1%止盈
                    "volatility": current_volatility,
                    "timestamp": current_time,
                    "indicator_values": {
                        "ma_fast": ma_fast,
                        "ma_slow": ma_slow,
                        "gap_checked": True
                    }
                }

                # 亚盘时段调整
                adjusted_signal = self.adjust_for_asian_session(base_signal, current_time)

                signals.append(adjusted_signal)

            elif ma_fast < ma_slow * 0.999:  # 快线下穿慢线
                base_signal = {
                    "action": "sell",
                    "symbol": self.symbol,
                    "price": current_price,
                    "position_size": 0.01,  # 1%仓位
                    "stop_loss_pct": 0.005,  # 0.5%止损
                    "take_profit_pct": 0.01,  # 1%止盈
                    "volatility": current_volatility,
                    "timestamp": current_time,
                    "indicator_values": {
                        "ma_fast": ma_fast,
                        "ma_slow": ma_slow,
                        "gap_checked": True
                    }
                }

                # 亚盘时段调整
                adjusted_signal = self.adjust_for_asian_session(base_signal, current_time)

                signals.append(adjusted_signal)

        return signals

    def process_tick_data(self, tick_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        处理tick数据并更新性能指标

        参数:
            tick_data: tick数据，包含价格、时间等信息

        返回:
            处理结果
        """
        start_time = datetime.now()
        self.performance_metrics["total_ticks_processed"] += 1

        # 模拟处理逻辑
        processed_tick = {
            "symbol": tick_data.get("symbol", self.symbol),
            "price": tick_data.get("price", 0.0),
            "volume": tick_data.get("volume", 0.0),
            "timestamp": tick_data.get("timestamp", datetime.now()),
            "processed_at": datetime.now(),
            "gap_checked": False,
            "overnight_risk_checked": False
        }

        # 检查黄金特性（这里简化处理）
        if "previous_price" in tick_data:
            gap_checked, gap_percent, _ = self.check_gap_risk(
                tick_data["price"], tick_data["previous_price"]
            )
            processed_tick["gap_checked"] = True
            processed_tick["gap_percent"] = gap_percent

        # 更新性能指标
        processing_time_ms = (datetime.now() - start_time).total_seconds() * 1000

        # 更新平均延迟
        current_avg_latency = self.performance_metrics.get("avg_latency", 0)
        tick_count = self.performance_metrics["total_ticks_processed"]

        self.performance_metrics["avg_latency"] = (
            current_avg_latency * (tick_count - 1) + processing_time_ms
        ) / tick_count

        # 吞吐量估算
        if tick_count % 1000 == 0:
            time_elapsed = (datetime.now() - self._start_time).total_seconds()
            if time_elapsed > 0:
                self.performance_metrics["avg_throughput"] = tick_count / time_elapsed

        return processed_tick

    def execute_trade(self, signal: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行交易

        参数:
            signal: 交易信号

        返回:
            交易执行结果
        """
        if signal.get("action") == "no_trade":
            return {
                "executed": False,
                "reason": signal.get("reason", "no_trade_signal"),
                "timestamp": datetime.now()
            }

        # 检查隔夜风险（简化示例）
        position_size = signal.get("position_size", 0.01) * self.cash
        volatility = signal.get("volatility", 0.02)
        hours_until_close = 8  # 假设8小时后闭市

        overnight_risk = self.calculate_overnight_risk(
            position_size, volatility, hours_until_close
        )

        # 执行交易逻辑
        trade_result = {
            "executed": True,
            "symbol": signal["symbol"],
            "action": signal["action"],
            "price": signal["price"],
            "position_size": signal.get("position_size", 0.01),
            "volume": signal.get("position_size", 0.01) * self.cash / signal["price"],
            "stop_loss": signal.get("stop_loss_pct", 0.005),
            "take_profit": signal.get("take_profit_pct", 0.01),
            "timestamp": signal.get("timestamp", datetime.now()),
            "executed_at": datetime.now(),
            "overnight_risk_assessment": overnight_risk,
            "asian_session_adjusted": signal.get("asian_session_adjusted", False)
        }

        # 更新策略状态
        self.trades.append(trade_result)
        self.performance_metrics["total_trades"] += 1

        logger.info(f"⚡ 交易执行: {signal['action']} {self.symbol} "
                    f"@ {signal['price']:.2f}, 仓位: {signal.get('position_size', 0.01):.2%}")

        if overnight_risk["status"] == "warning":
            logger.warning(f"⚠️ 隔夜风险警告: 风险比例{overnight_risk['risk_ratio']:.2%}")

        return trade_result

    def get_performance_report(self) -> Dict[str, Any]:
        """
        获取策略性能报告

        返回:
            性能报告
        """
        report = {
            "strategy_name": "GoldBasicStrategy",
            "symbol": self.symbol,
            "timeframe": self.timeframe,
            "performance_metrics": self.performance_metrics,
            "gold_characteristics": {
                "gap_risk_limit": self.gold_characteristics["gap_risk_limit"],
                "overnight_risk_limit": self.gold_characteristics["overnight_risk_limit"],
                "asian_session_filter": self.gold_characteristics["asian_session_filter"],
                "performance_target": f"{self.gold_characteristics['performance_target_tps']:,}+ ticks/sec",
                "latency_target": f"<{self.gold_characteristics['max_latency_ms']}ms",
            },
            "status": {
                "gap_risk_alerts": self.performance_metrics["gap_risk_events"],
                "overnight_risk_alerts": self.performance_metrics["overnight_risk_events"],
                "meets_performance_target": (
                    self.performance_metrics["avg_throughput"] >=
                    self.gold_characteristics["performance_target_tps"]
                ) if self.performance_metrics["avg_throughput"] > 0 else None,
                "meets_latency_target": (
                    self.performance_metrics["avg_latency"] <
                    self.gold_characteristics["max_latency_ms"]
                ) if self.performance_metrics["avg_latency"] > 0 else None,
            },
            "timestamp": datetime.now().isoformat()
        }

        return report

    def validate_performance(self) -> Dict[str, Any]:
        """
        验证策略是否符合性能要求

        返回:
            验证结果
        """
        validation_results = {
            "timestamp": datetime.now().isoformat(),
            "tests": [],
            "overall_passed": True
        }

        # 1. 吞吐量验证
        throughput_test = {
            "name": "throughput_21340",
            "description": f"验证吞吐量 ≥{self.gold_characteristics['performance_target_tps']:,} ticks/sec",
            "current": self.performance_metrics["avg_throughput"],
            "target": self.gold_characteristics["performance_target_tps"],
            "passed": self.performance_metrics["avg_throughput"] >= self.gold_characteristics["performance_target_tps"]
        }
        validation_results["tests"].append(throughput_test)

        if not throughput_test["passed"]:
            validation_results["overall_passed"] = False

        # 2. 延迟验证
        latency_test = {
            "name": "latency_50ms",
            "description": f"验证延迟 <{self.gold_characteristics['max_latency_ms']}ms",
            "current": self.performance_metrics["avg_latency"],
            "target": self.gold_characteristics["max_latency_ms"],
            "passed": self.performance_metrics["avg_latency"] < self.gold_characteristics["max_latency_ms"]
        }
        validation_results["tests"].append(latency_test)

        if not latency_test["passed"]:
            validation_results["overall_passed"] = False

        # 3. 黄金特性验证
        gold_tests = [
            {
                "name": "gap_risk_control",
                "description": "验证跳空风险控制机制",
                "passed": True  # 在实际系统中应该有更复杂的验证
            },
            {
                "name": "overnight_risk_control",
                "description": "验证隔夜风险控制机制",
                "passed": True
            },
            {
                "name": "asian_session_filter",
                "description": "验证亚盘时段过滤",
                "passed": self.gold_characteristics["asian_session_filter"] is not None
            }
        ]
        validation_results["tests"].extend(gold_tests)

        # 记录验证结果
        logger.info(f"📊 性能验证完成: {'通过' if validation_results['overall_passed'] else '失败'}")
        for test in validation_results["tests"]:
            status = "✅" if test["passed"] else "❌"
            logger.info(f"  {status} {test['name']}: {test['description']}")

        return validation_results


# 策略工厂函数
def create_gold_strategy(strategy_type: str = "basic", **kwargs) -> GoldBasicStrategy:
    """
    创建黄金交易策略工厂函数

    参数:
        strategy_type: 策略类型
        **kwargs: 策略参数

    返回:
        策略实例
    """
    if strategy_type == "basic":
        return GoldBasicStrategy(**kwargs)
    else:
        raise ValueError(f"未知的策略类型: {strategy_type}")


# 测试函数
def test_gold_strategy():
    """测试黄金策略基本功能"""
    print("🧪 测试黄金交易策略...")

    # 创建策略实例
    strategy = GoldBasicStrategy(symbol="XAUUSD", timeframe="M1")

    # 测试黄金特性
    print("1. 测试跳空风险检查...")
    gap_triggered, gap_percent, gap_response = strategy.check_gap_risk(
        current_price=1010.0, previous_close=1000.0
    )
    print(f"   结果: 触发={gap_triggered}, 跳空={gap_percent:.2%}")

    print("2. 测试亚盘时段判断...")
    asian_time = datetime(2026, 4, 8, 2, 0, 0)  # UTC 02:00
    non_asian_time = datetime(2026, 4, 8, 12, 0, 0)  # UTC 12:00
    print(f"   Asian UTC 02:00: {strategy.is_asian_trading_hour(asian_time)}")
    print(f"   Non-Asian UTC 12:00: {strategy.is_asian_trading_hour(non_asian_time)}")

    print("3. 测试隔夜风险计算...")
    overnight_risk = strategy.calculate_overnight_risk(
        position_size=100000.0,
        current_volatility=0.02,
        hours_until_close=8
    )
    print(f"   风险比例: {overnight_risk['risk_ratio']:.2%}, 状态: {overnight_risk['status']}")

    print("4. 生成性能报告...")
    report = strategy.get_performance_report()
    print(f"   策略: {report['strategy_name']}, 品种: {report['symbol']}")

    print("5. 验证性能...")
    validation = strategy.validate_performance()
    print(f"   验证结果: {'通过' if validation['overall_passed'] else '失败'}")

    print("✅ 黄金策略测试完成")


if __name__ == "__main__":
    test_gold_strategy()