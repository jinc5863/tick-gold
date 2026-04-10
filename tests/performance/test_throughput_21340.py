"""
21,340+ ticks/sec 性能基准测试
验证Tick Gold量化交易系统满足ULTRA性能认证标准
"""

import pytest
import numpy as np
import pandas as pd
import time
from datetime import datetime, timedelta
import logging
import sys
import os

# 添加项目路径以便导入模块
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from src.gold.strategies.gold_basic_strategy import GoldBasicStrategy

logger = logging.getLogger(__name__)


def generate_tick_batch(batch_size: int, symbol: str = "XAUUSD") -> list:
    """
    生成批量tick数据用于性能测试

    参数:
        batch_size: ticks数量
        symbol: 交易品种

    返回:
        tick数据列表
    """
    ticks = []
    base_price = 2300.0
    volatility = 0.0001  # 0.01% 每个tick的波动

    for i in range(batch_size):
        # 模拟真实tick数据
        tick_time = datetime.now() - timedelta(seconds=batch_size - i)

        # 随机价格变动
        price_change = np.random.normal(0, volatility)
        current_price = base_price * (1 + price_change)

        tick = {
            "symbol": symbol,
            "bid": current_price - 0.1,
            "ask": current_price + 0.1,
            "price": current_price,  # 使用"price"而不是"last"
            "last": current_price,
            "volume": np.random.randint(1, 100),
            "timestamp": tick_time,
            "previous_price": base_price if i == 0 else ticks[-1]["price"]  # 使用"price"
        }

        ticks.append(tick)

    return ticks


class PerformanceBenchmark:
    """性能基准测试类"""

    def __init__(self):
        self.strategy = GoldBasicStrategy(symbol="XAUUSD", timeframe="M1")
        self.ultra_target_tps = 21340  # ULTRA认证标准

    def benchmark_single_tick_processing(self, iterations: int = 10000) -> dict:
        """
        基准测试：单个tick处理性能

        参数:
            iterations: 迭代次数

        返回:
            性能指标
        """
        logger.info(f"🔬 开始单个tick处理性能测试 (迭代: {iterations})")

        tick_data = {
            "symbol": "XAUUSD",
            "price": 2300.0,
            "volume": 100,
            "timestamp": datetime.now(),
            "previous_price": 2299.5
        }

        processing_times = []

        # 预热（避免JIT编译影响）
        for _ in range(100):
            self.strategy.process_tick_data(tick_data)

        # 正式测试
        start_time = time.perf_counter()

        for i in range(iterations):
            tick_time = time.perf_counter()
            result = self.strategy.process_tick_data(tick_data)
            processing_time = time.perf_counter() - tick_time

            processing_times.append(processing_time)

            # 更新tick数据用于下一次迭代
            tick_data["price"] *= 1 + np.random.normal(0, 0.00005)
            tick_data["previous_price"] = tick_data["price"] - 0.5

        total_time = time.perf_counter() - start_time

        # 计算指标
        throughput = iterations / total_time
        avg_latency_ms = np.mean(processing_times) * 1000
        p95_latency_ms = np.percentile(processing_times, 95) * 1000
        p99_latency_ms = np.percentile(processing_times, 99) * 1000

        return {
            "test_type": "single_tick_processing",
            "iterations": iterations,
            "total_time_seconds": total_time,
            "throughput_tps": throughput,
            "avg_latency_ms": avg_latency_ms,
            "p95_latency_ms": p95_latency_ms,
            "p99_latency_ms": p99_latency_ms,
            "meets_21340_target": throughput >= self.ultra_target_tps
        }

    def benchmark_batch_processing(self, batch_size: int = 21340) -> dict:
        """
        基准测试：批量tick处理性能 (21,340 ticks/sec验证)

        参数:
            batch_size: 批次大小

        返回:
            性能指标
        """
        logger.info(f"🧪 开始批量tick处理性能测试 (批次大小: {batch_size:,})")

        # 生成测试数据
        ticks = generate_tick_batch(batch_size)

        # 预热
        for tick in ticks[:100]:
            self.strategy.process_tick_data(tick)

        # 正式测试
        start_time = time.perf_counter()
        processing_times = []

        for tick in ticks:
            tick_start = time.perf_counter()
            result = self.strategy.process_tick_data(tick)
            processing_time = time.perf_counter() - tick_start
            processing_times.append(processing_time)

        total_time = time.perf_counter() - start_time

        # 计算指标
        throughput = batch_size / total_time
        avg_latency_ms = np.mean(processing_times) * 1000

        # 检查是否所有tick都在50ms内处理
        all_within_50ms = all(t * 1000 < 50 for t in processing_times)

        return {
            "test_type": "batch_processing",
            "batch_size": batch_size,
            "total_time_seconds": total_time,
            "throughput_tps": throughput,
            "avg_latency_ms": avg_latency_ms,
            "max_latency_ms": max(processing_times) * 1000,
            "all_ticks_within_50ms": all_within_50ms,
            "meets_21340_target": throughput >= self.ultra_target_tps,
            "ultra_certification_ready": (
                throughput >= self.ultra_target_tps and
                avg_latency_ms < 50 and
                all_within_50ms
            )
        }

    def benchmark_strategy_execution(self, data_size: int = 1000) -> dict:
        """
        基准测试：完整策略执行性能

        参数:
            data_size: 测试数据大小

        返回:
            性能指标
        """
        logger.info(f"📊 开始策略执行性能测试 (数据量: {data_size})")

        # 生成OHLCV数据
        dates = pd.date_range(start="2026-04-01", periods=data_size, freq="1min")
        base_price = 2300.0
        volatility = 0.0005

        returns = np.random.normal(0, volatility, data_size)
        prices = base_price * np.exp(np.cumsum(returns))

        market_data = pd.DataFrame({
            'open': prices * 0.999,
            'high': prices * 1.001,
            'low': prices * 0.998,
            'close': prices,
            'volume': np.random.randint(100, 1000, data_size)
        }, index=dates)

        # 测试策略信号生成性能
        start_time = time.perf_counter()

        signals = []
        for window in range(50, len(market_data)):
            window_data = market_data.iloc[:window]
            window_signals = self.strategy.generate_trading_signals(window_data)
            signals.extend(window_signals)

        execution_time = time.perf_counter() - start_time

        # 计算每秒处理的分钟数据量
        data_per_second = data_size / execution_time

        return {
            "test_type": "strategy_execution",
            "data_size": data_size,
            "execution_time_seconds": execution_time,
            "data_per_second": data_per_second,
            "signals_generated": len(signals),
            "avg_signal_time_ms": (execution_time / len(signals)) * 1000 if signals else 0
        }

    def run_comprehensive_benchmark(self) -> dict:
        """
        运行全面的性能基准测试套件

        返回:
            综合性能报告
        """
        logger.info("🚀 启动全面的ULTRA性能基准测试")

        results = {
            "timestamp": datetime.now().isoformat(),
            "ultra_target_tps": self.ultra_target_tps,
            "latency_target_ms": 50,
            "tests": [],
            "summary": {}
        }

        # 1. 单个tick处理测试
        single_tick_result = self.benchmark_single_tick_processing(iterations=10000)
        results["tests"].append(single_tick_result)

        # 2. 批量处理测试（21,340基准）
        batch_result = self.benchmark_batch_processing(batch_size=21340)
        results["tests"].append(batch_result)

        # 3. 策略执行测试
        strategy_result = self.benchmark_strategy_execution(data_size=1000)
        results["tests"].append(strategy_result)

        # 生成总结
        throughput_scores = [t.get("throughput_tps", 0) for t in results["tests"] if "throughput_tps" in t]
        latency_scores = [t.get("avg_latency_ms", 0) for t in results["tests"] if "avg_latency_ms" in t]

        results["summary"] = {
            "avg_throughput_tps": np.mean(throughput_scores) if throughput_scores else 0,
            "max_throughput_tps": max(throughput_scores) if throughput_scores else 0,
            "avg_latency_ms": np.mean(latency_scores) if latency_scores else 0,
            "max_latency_ms": max(latency_scores) if latency_scores else 0,
            "meets_ultra_throughput": all(
                t.get("meets_21340_target", False)
                for t in results["tests"]
                if "meets_21340_target" in t
            ),
            "meets_ultra_latency": all(
                t.get("avg_latency_ms", 0) < 50
                for t in results["tests"]
                if "avg_latency_ms" in t
            ),
            "ultra_certified": batch_result.get("ultra_certification_ready", False)
        }

        return results


# Pytest测试用例
@pytest.mark.performance
@pytest.mark.ultra_certification
class TestPerformance21340:
    """21,340+ ticks/sec ULTRA性能认证测试"""

    def setup_method(self):
        """测试初始化"""
        self.benchmark = PerformanceBenchmark()
        self.ultra_target = 21340
        self.latency_target = 50  # ms

    @pytest.mark.benchmark
    def test_single_tick_throughput(self):
        """测试单个tick处理吞吐量"""
        result = self.benchmark.benchmark_single_tick_processing(iterations=5000)

        logger.info(f"单个tick吞吐量: {result['throughput_tps']:,.0f} ticks/sec")
        logger.info(f"平均延迟: {result['avg_latency_ms']:.1f}ms")

        # 主要断言：吞吐量不低于21,340
        assert result["throughput_tps"] >= self.ultra_target, \
            f"吞吐量 {result['throughput_tps']:,.0f} ticks/sec < {self.ultra_target:,}"

        # 次要断言：延迟低于50ms
        assert result["avg_latency_ms"] < self.latency_target, \
            f"延迟 {result['avg_latency_ms']:.1f}ms > {self.latency_target}ms"

    @pytest.mark.benchmark
    @pytest.mark.ultra
    def test_21340_ticks_per_second_ultra(self):
        """
        ULTRA性能认证测试：验证21,340+ ticks/sec
        这是最重要的性能测试
        """
        result = self.benchmark.benchmark_batch_processing(batch_size=21340)

        logger.info(f"批量处理吞吐量: {result['throughput_tps']:,.0f} ticks/sec")
        logger.info(f"批次大小: {result['batch_size']:,} ticks")
        logger.info(f"所有ticks在50ms内: {result['all_ticks_within_50ms']}")

        # ULTRA认证主要要求
        assert result["meets_21340_target"], \
            f"ULTRA认证失败: 吞吐量 {result['throughput_tps']:,.0f} ticks/sec < {self.ultra_target:,}"

        # 延迟要求
        assert result["all_ticks_within_50ms"], \
            f"延迟超标: 有tick处理时间超过50ms"

        # 综合ULTRA认证
        assert result.get("ultra_certification_ready", False), \
            "未满足ULTRA综合性能认证标准"

    @pytest.mark.benchmark
    def test_strategy_execution_performance(self):
        """测试策略执行性能"""
        result = self.benchmark.benchmark_strategy_execution(data_size=500)

        logger.info(f"策略执行速度: {result['data_per_second']:.1f} 数据点/秒")
        logger.info(f"生成的信号数: {result['signals_generated']}")

        # 确保策略执行不会成为瓶颈
        assert result["avg_signal_time_ms"] < self.latency_target, \
            f"策略执行时间 {result['avg_signal_time_ms']:.1f}ms 过长"

    @pytest.mark.comprehensive
    def test_comprehensive_performance_report(self):
        """生成综合性能报告"""
        results = self.benchmark.run_comprehensive_benchmark()

        # 打印报告摘要
        print("\n" + "="*60)
        print("🏆 性能基准测试报告")
        print("="*60)

        for test in results["tests"]:
            test_type = test.get("test_type", "unknown")
            throughput = test.get("throughput_tps", 0)

            if throughput > 0:
                throughput_percent = (throughput / self.ultra_target) * 100
                status = "✅" if throughput >= self.ultra_target else "❌"
                print(f"{status} {test_type}: {throughput:,.0f} ticks/sec ({throughput_percent:.1f}% of target)")

        summary = results["summary"]
        print(f"\n📊 综合摘要:")
        print(f"   平均吞吐量: {summary['avg_throughput_tps']:,.0f} ticks/sec")
        print(f"   平均延迟: {summary['avg_latency_ms']:.1f}ms")
        print(f"   满足ULTRA吞吐量: {summary['meets_ultra_throughput']}")
        print(f"   满足ULTRA延迟: {summary['meets_ultra_latency']}")
        print(f"   ULTRA认证状态: {'✅ 通过' if summary['ultra_certified'] else '❌ 未通过'}")
        print("="*60)

        # 验证ULTRA认证状态
        assert summary['ultra_certified'], "系统未通过ULTRA性能认证"


# 命令行运行
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

    print("🚀 执行21,340+ ticks/sec性能基准测试")
    print("="*60)

    benchmark = PerformanceBenchmark()

    try:
        # 运行综合测试
        results = benchmark.run_comprehensive_benchmark()

        # 显示结果
        summary = results["summary"]

        print("\n🏆 测试结果:")
        print(f"  ULTRA目标: {benchmark.ultra_target_tps:,}+ ticks/sec, <50ms延迟")
        print(f"  综合吞吐量: {summary['avg_throughput_tps']:,.0f} ticks/sec")
        print(f"  综合延迟: {summary['avg_latency_ms']:.1f}ms")
        print(f"  ULTRA认证: {'✅ 通过' if summary['ultra_certified'] else '❌ 未通过'}")

        # 详细测试结果
        print("\n📊 详细测试:")
        for test in results["tests"]:
            if "throughput_tps" in test:
                throughput = test["throughput_tps"]
                target_percent = (throughput / benchmark.ultra_target_tps) * 100
                status = "✅" if test.get("meets_21340_target", False) else "❌"

                print(f"  {status} {test['test_type']}:")
                print(f"    吞吐量: {throughput:,.0f} ticks/sec ({target_percent:.1f}%)")

                if "avg_latency_ms" in test:
                    print(f"    延迟: {test['avg_latency_ms']:.1f}ms")

        if summary['ultra_certified']:
            print("\n🎉 恭喜！Tick Gold系统已通过ULTRA性能认证基准测试！")
        else:
            print("\n⚠️  ULTRA认证未通过，需要性能优化")

        print("="*60)

        exit(0 if summary['ultra_certified'] else 1)

    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        exit(1)