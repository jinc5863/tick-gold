#!/usr/bin/env python3
"""
黄金专用量化策略引擎演示脚本

展示如何使用黄金专用量化策略引擎的各个功能：
1. 黄金波动率自适应指标计算
2. 跳空风险检测（1% gap_risk）
3. 隔夜风险管理（0.5% overnight_risk）
4. 亚盘时段过滤（时区调整）
5. M1/M5/M15/M30多时间框架策略
"""

import asyncio
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import sys
import os

# 添加路径以导入模块
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from gold.strategies.gold_volatility_engine import GoldVolatilityEngine
from gold.engine import GoldQuantEngine
from config_manager import ConfigManager

def print_header(title):
    """打印标题"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)

async def demo_gold_volatility_engine():
    """演示黄金波动率引擎"""
    print_header("黄金波动率自适应引擎演示")

    # 1. 初始化引擎
    print("1. 初始化黄金波动率引擎...")
    engine = GoldVolatilityEngine()
    print(f"   ✓ 引擎初始化完成")
    print(f"   - 跳空风险限制: {engine.risk_params['gap_risk_limit']:.1%}")
    print(f"   - 隔夜风险限制: {engine.risk_params['overnight_risk_limit']:.1%}")
    print(f"   - 目标吞吐量: {engine.perf_params['target_throughput']:,} ticks/sec")

    # 2. 生成黄金价格数据
    print("\n2. 生成黄金价格样本数据...")
    dates = pd.date_range(start=datetime.now() - timedelta(days=5), periods=1000, freq='1min')
    base_price = 2350

    np.random.seed(42)
    # 创建趋势性波动
    trend = np.linspace(0, 50, len(dates))  # 上升趋势
    volatility = 0.002  # 0.2%波动率
    noise = np.random.normal(0, volatility, len(dates))

    prices = base_price + trend + noise.cumsum() * base_price
    price_series = pd.Series(prices, index=dates)

    print(f"   ✓ 生成了 {len(prices)} 个价格数据点")
    print(f"   - 价格范围: ${prices.min():.2f} - ${prices.max():.2f}")
    print(f"   - 最终价格: ${prices[-1]:.2f}")

    # 3. 计算黄金波动率指标
    print("\n3. 计算黄金专用波动率指标...")
    gold_vol = engine.calculate_gold_volatility_indicator(price_series)

    if len(gold_vol) > 0:
        latest_vol = gold_vol.iloc[-1] if not pd.isna(gold_vol.iloc[-1]) else 0
        print(f"   ✓ 波动率计算完成")
        print(f"   - 最新波动率: {latest_vol:.4%}")

        if len(gold_vol) > 20:
            avg_vol = gold_vol.iloc[-20:].mean()
            print(f"   - 最近20期平均波动率: {avg_vol:.4%}")

    # 4. 跳空风险检测演示
    print("\n4. 跳空风险检测演示...")

    # 正常情况
    current_price = 2350.50
    prev_close = 2350.25  # 0.01%变化
    gap_exceeded, gap_percent, gap_info = engine.detect_gap_risk(current_price, prev_close)
    print(f"   a) 正常跳空: {gap_percent:.4%} (限值: {engine.risk_params['gap_risk_limit']:.1%})")
    print(f"      风险状态: {'超限' if gap_exceeded else '正常'}")

    # 风险超限情况
    risk_price = 2373.50  # 1%跳空
    gap_exceeded, gap_percent, gap_info = engine.detect_gap_risk(risk_price, 2350)
    print(f"   b) 风险跳空: {gap_percent:.4%} (限值: {engine.risk_params['gap_risk_limit']:.1%})")
    print(f"      风险状态: {'超限' if gap_exceeded else '正常'}")
    if gap_exceeded:
        print(f"      执行动作: {gap_info.get('action', '未知')}")

    # 5. 隔夜风险管理演示
    print("\n5. 隔夜风险管理演示...")
    position_size = 100000  # 10万美元头寸
    current_volatility = 0.02  # 2%波动率

    overnight_risk, risk_info = engine.calculate_overnight_risk(position_size, current_volatility)
    risk_limit = position_size * engine.risk_params['overnight_risk_limit']
    risk_ratio = overnight_risk / risk_limit if risk_limit > 0 else 0

    print(f"   ✓ 隔夜风险计算完成")
    print(f"   - 头寸规模: ${position_size:,.2f}")
    print(f"   - 当前波动率: {current_volatility:.2%}")
    print(f"   - 计算风险: ${overnight_risk:.2f}")
    print(f"   - 风险限制: ${risk_limit:.2f}")
    print(f"   - 风险比率: {risk_ratio:.2%}")

    # 6. 亚盘时段过滤演示
    print("\n6. 亚盘时段过滤演示...")

    test_times = [
        pd.Timestamp('2026-04-08 02:00:00+00:00'),  # 亚盘
        pd.Timestamp('2026-04-08 10:00:00+00:00'),  # 欧盘
        pd.Timestamp('2026-04-08 20:00:00+00:00'),  # 亚盘
        pd.Timestamp('2026-04-08 14:00:00+00:00'),  # 美盘
    ]

    for test_time in test_times:
        is_asian = engine.is_asian_trading_hour(test_time)
        print(f"   {test_time.hour:02d}:00 UTC -> {'亚盘时段' if is_asian else '非亚盘时段'}")

    # 策略参数调整演示
    strategy_params = {
        'position_size': 0.01,
        'stop_loss': 0.005,
        'take_profit': 0.01,
        'risk_multiplier': 1.0
    }

    asian_time = pd.Timestamp('2026-04-08 02:00:00+00:00')
    adjusted_params = engine.adjust_strategy_for_asian_session(strategy_params, asian_time)

    print(f"\n   ✓ 亚盘时段策略调整:")
    print(f"      - 原始头寸规模: {strategy_params['position_size']:.2%}")
    print(f"      - 调整后头寸规模: {adjusted_params['position_size']:.2%}")
    print(f"      - 风险乘数: {adjusted_params.get('risk_multiplier', 1.0):.1%}")

    # 7. 趋势强度计算演示
    print("\n7. 黄金趋势强度计算演示...")
    trend_strength = engine.calculate_gold_trend_strength(price_series, period=50)

    if len(trend_strength) > 0:
        latest_strength = trend_strength.iloc[-1] if not pd.isna(trend_strength.iloc[-1]) else 0
        print(f"   ✓ 趋势强度计算完成")
        print(f"   - 最新趋势强度: {latest_strength:.2f} (0表示无趋势, 1表示强趋势)")

        if len(trend_strength) > 10:
            avg_strength = trend_strength.iloc[-10:].mean()
            print(f"   - 最近10期平均强度: {avg_strength:.2f}")

    # 8. 性能评估演示
    print("\n8. 引擎性能评估演示...")

    # 模拟一些性能数据
    engine.update_performance_stats(
        ticks_processed=10000,
        processing_time_ms=450,  # 0.45秒
        signal_generated=True,
        trade_executed=True
    )

    performance = engine.evaluate_performance()

    print(f"   ✓ 性能评估结果:")
    print(f"      - 当前吞吐量: {performance['current_throughput_tps']:,.0f} ticks/sec")
    print(f"      - 目标吞吐量: {performance['target_throughput_tps']:,.0f} ticks/sec")
    print(f"      - 吞吐量比率: {performance['throughput_ratio']:.2%}")
    print(f"      - 平均延迟: {performance['avg_latency_ms']:.2f} ms")
    print(f"      - 目标延迟: {performance['target_latency_ms']} ms")
    print(f"      - 延迟比率: {performance['latency_ratio']:.2%}")

    print_header("黄金波动率引擎演示完成")

async def demo_gold_quant_engine():
    """演示黄金量化引擎"""
    print_header("黄金量化引擎综合演示")

    try:
        # 1. 初始化黄金量化引擎
        print("1. 初始化黄金量化引擎...")
        engine = GoldQuantEngine()
        print(f"   ✓ 引擎初始化完成")

        # 2. 显示引擎状态
        print("\n2. 显示引擎初始状态...")
        status = engine.get_engine_status()

        print(f"   - 引擎状态: {'活跃' if status['engine_active'] else '停止'}")
        print(f"   - 当前策略: {status['current_strategy'] or '无'}")
        print(f"   - 时间框架: {status['current_timeframe'] or '无'}")
        print(f"   - 风险管理: {'启用' if status['risk_parameters'] else '禁用'}")

        # 3. 设置策略
        print("\n3. 设置黄金专用策略...")
        strategy_result = engine.set_strategy(
            strategy_name='gold_specific',
            timeframe='M1',
            parameters={
                'min_volatility': 0.001,
                'max_gap': 0.0005,
                'asian_session_adjustment': 0.7
            }
        )

        if strategy_result['status'] == 'success':
            print(f"   ✓ 策略设置成功")
            print(f"   - 策略: {strategy_result['strategy']}")
            print(f"   - 时间框架: {strategy_result['timeframe']}")
        else:
            print(f"   ✗ 策略设置失败: {strategy_result['error']}")

        # 4. 处理模拟tick数据
        print("\n4. 处理模拟黄金tick数据...")

        # 创建模拟ticks
        for i in range(10):
            tick_data = {
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'bid': 2350 + np.random.uniform(-1, 1),
                'ask': 2350.05 + np.random.uniform(-1, 1),
                'volume': np.random.randint(50, 200)
            }

            result = await engine.process_tick(tick_data)

            if result['status'] == 'success':
                print(f"   Tick {i+1}: 处理成功, 延迟={result['processing_time_ms']:.1f}ms", end='')

                # 显示信号和风险信息
                signals = result.get('signals', {})
                if signals:
                    combined_signal = signals.get('combined_signal', {})
                    if combined_signal.get('signal', 0) != 0:
                        print(f", 信号={'买入' if combined_signal['signal'] > 0 else '卖出'}")
                    else:
                        print(f", 信号: 无")
                else:
                    print()
            else:
                print(f"   Tick {i+1}: 处理失败 - {result.get('error', '未知错误')}")

        # 5. 显示统计数据
        print("\n5. 显示引擎统计数据...")
        data_stats = engine._get_data_statistics()

        for timeframe, stats in data_stats.items():
            if stats.get('bars_count', 0) > 0:
                print(f"   {timeframe}: {stats['bars_count']} K线, "
                      f"价格范围: ${stats['price_range']['min']:.2f}-${stats['price_range']['max']:.2f}")

        # 6. 性能报告
        print("\n6. 生成性能报告...")
        performance = engine.get_strategy_performance()

        print(f"   ✓ 性能报告已生成")
        performance_data = performance['performance']

        print(f"   - 总回报率: {performance_data['total_return_percent']:.2f}%")
        print(f"   - 夏普比率: {performance_data['sharpe_ratio']:.2f}")
        print(f"   - 最大回撤: {performance_data['max_drawdown_percent']:.2f}%")
        print(f"   - 胜率: {performance_data['win_rate_percent']:.1f}%")

        # 7. 风险合规检查
        print("\n7. 风险合规检查...")
        risk_params = engine.volatility_engine.risk_params

        print(f"   ✓ 检查风险参数:")
        print(f"      - 跳空风险: {risk_params['gap_risk_limit']:.2%} (目标: 1%)")
        print(f"      - 隔夜风险: {risk_params['overnight_risk_limit']:.2%} (目标: 0.5%)")
        print(f"      - 最大回撤: {risk_params['max_drawdown']:.2%} (目标: 2%)")
        print(f"      - 每日最大损失: {risk_params['max_daily_loss']:.2%} (目标: 0.5%)")

        # 计算合规状态
        gap_compliant = risk_params['gap_risk_limit'] <= 0.01
        overnight_compliant = risk_params['overnight_risk_limit'] <= 0.005
        drawdown_compliant = risk_params['max_drawdown'] <= 0.02
        daily_loss_compliant = risk_params['max_daily_loss'] <= 0.005

        print(f"   ✓ 合规状态: {sum([gap_compliant, overnight_compliant, drawdown_compliant, daily_loss_compliant])}/4 项通过")

    except Exception as e:
        print(f"   ✗ 演示过程中出错: {e}")

    print_header("黄金量化引擎演示完成")

async def demo_config_manager():
    """演示配置管理器"""
    print_header("配置管理器演示")

    try:
        # 1. 初始化配置管理器
        print("1. 初始化配置管理器...")
        config_manager = ConfigManager()
        config = config_manager.load_config()

        print(f"   ✓ 配置加载完成")
        print(f"   - 应用名称: {config.get('app', {}).get('name', '未知')}")
        print(f"   - 版本号: {config.get('app', {}).get('version', '未知')}")

        # 2. 显示风险参数
        print("\n2. 显示黄金专用风险参数...")
        risk_params = config_manager.get_risk_params()

        if risk_params:
            print(f"   ✓ 风险参数:")
            print(f"      - 跳空风险: {risk_params.get('gap_risk', 0.01):.1%}")
            print(f"      - 隔夜风险: {risk_params.get('overnight_risk', 0.005):.1%}")
            print(f"      - 最大回撤: {risk_params.get('max_drawdown', 0.02):.1%}")
            print(f"      - 每日最大损失: {risk_params.get('max_daily_loss', 0.005):.1%}")
            print(f"      - 头寸规模: {risk_params.get('position_size', 0.01):.1%}")
        else:
            print(f"   ✗ 风险参数未找到")

        # 3. 显示性能参数
        print("\n3. 显示性能参数...")
        perf_params = config_manager.get_performance_params()

        if perf_params:
            print(f"   ✓ 性能参数:")
            print(f"      - 目标吞吐量: {perf_params.get('target_throughput', 0):,} ticks/sec")
            print(f"      - 目标延迟: {perf_params.get('target_latency', 0)} ms")
            print(f"      - 压缩比率: {perf_params.get('compression_ratio', 0)}:1")
        else:
            print(f"   ✗ 性能参数未找到")

        # 4. 显示黄金参数
        print("\n4. 显示黄金专用参数...")
        gold_params = config_manager.get_gold_params()

        if gold_params:
            print(f"   ✓ 黄金专用参数:")
            for key, value in gold_params.items():
                if isinstance(value, float):
                    print(f"      - {key}: {value:.3%}")
                else:
                    print(f"      - {key}: {value}")

        # 5. 更新配置演示
        print("\n5. 配置更新演示...")
        try:
            # 获取当前配置值
            current_gap_risk = config_manager.get_config_value('risk.gap_risk', 0.01)
            print(f"   - 当前跳空风险: {current_gap_risk:.1%}")

            # 模拟更新（在实际应用中需要谨慎）
            new_gap_risk = 0.008  # 0.8%
            print(f"   - 建议更新为: {new_gap_risk:.1%}")
            print(f"   * 注意: 演示中未实际更新文件")

        except Exception as e:
            print(f"   ✗ 配置更新演示失败: {e}")

    except Exception as e:
        print(f"   ✗ 配置管理器演示失败: {e}")

    print_header("配置管理器演示完成")

def main():
    """主函数"""
    print("="*80)
    print("      Tick Gold - XAUUSD黄金专用量化策略引擎演示")
    print("="*80)
    print("功能特性:")
    print(" 1. 黄金波动率自适应指标")
    print(" 2. 跳空风险检测（1% gap_risk）")
    print(" 3. 隔夜风险管理（0.5% overnight_risk）")
    print(" 4. 亚盘时段过滤（时区调整）")
    print(" 5. M1/M5/M15/M30多时间框架策略")
    print(" 6. 21,340+ ticks/sec性能目标")
    print("="*80)

    # 运行演示
    asyncio.run(demo_gold_volatility_engine())

    input("\n按回车键继续查看量化引擎演示...")

    asyncio.run(demo_gold_quant_engine())

    input("\n按回车键继续查看配置管理器演示...")

    asyncio.run(demo_config_manager())

    print("\n" + "="*80)
    print("     演示完成")
    print("="*80)
    print("\n下一步:")
    print(" 1. 运行测试: pytest tests/unit/test_gold_volatility_engine.py")
    print(" 2. 启动API服务: python src/backend/python/gold_api.py")
    print(" 3. 集成到交易系统: 参考examples目录的代码")
    print("="*80)

if __name__ == "__main__":
    main()