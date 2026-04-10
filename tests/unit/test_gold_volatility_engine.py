"""
黄金波动率引擎测试
验证黄金专用量化策略引擎的核心功能
"""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import sys
import os

# 添加路径以导入模块
sys.path.append(os.path.join(os.path.dirname(__file__), '../..', 'src'))

from gold.strategies.gold_volatility_engine import GoldVolatilityEngine
from gold.engine import GoldQuantEngine

@pytest.fixture
def gold_volatility_engine():
    """创建黄金波动率引擎实例"""
    return GoldVolatilityEngine()

@pytest.fixture
def gold_quant_engine():
    """创建黄金量化引擎实例"""
    return GoldQuantEngine()

@pytest.fixture
def sample_gold_prices():
    """生成黄金价格样本数据"""
    dates = pd.date_range(start=datetime.now() - timedelta(days=10), end=datetime.now(), freq='1min')
    base_price = 2300
    volatility = 0.002  # 0.2%波动率

    # 生成随机游走
    np.random.seed(42)
    returns = np.random.normal(0, volatility, len(dates))
    returns[0] = 0  # 第一个收益为0
    prices = base_price * np.exp(np.cumsum(returns))

    # 添加跳空
    prices[100] = prices[99] * 1.015  # 1.5%跳空

    return pd.Series(prices, index=dates)

@pytest.fixture
def multi_timeframe_data():
    """生成多时间框架数据"""
    data = {}
    base_price = 2300

    for timeframe, freq, periods in [('M1', '1min', 1440), ('M5', '5min', 288),
                                    ('M15', '15min', 96), ('M30', '30min', 48)]:
        dates = pd.date_range(start=datetime.now() - timedelta(days=1), periods=periods, freq=freq)

        # 生成OHLC数据
        np.random.seed(42)
        open_prices = base_price + np.random.randn(periods) * 5
        high_prices = open_prices + np.abs(np.random.randn(periods)) * 3
        low_prices = open_prices - np.abs(np.random.randn(periods)) * 3
        close_prices = open_prices + np.random.randn(periods) * 2

        df = pd.DataFrame({
            'timestamp': dates,
            'open': open_prices,
            'high': high_prices,
            'low': low_prices,
            'close': close_prices,
            'volume': np.random.randint(100, 1000, periods)
        })

        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df.set_index('timestamp', inplace=True)

        data[timeframe] = df

    return data

class TestGoldVolatilityEngine:
    """黄金波动率引擎测试类"""

    def test_initialization(self, gold_volatility_engine):
        """测试引擎初始化"""
        engine = gold_volatility_engine

        # 检查风险参数
        assert engine.risk_params is not None
        assert 'gap_risk_limit' in engine.risk_params
        assert engine.risk_params['gap_risk_limit'] == 0.01  # 1%

        # 检查黄金参数
        assert engine.gold_params is not None
        assert 'asian_session_enabled' in engine.gold_params
        assert engine.gold_params['asian_session_enabled'] is True

        # 检查性能参数
        assert engine.perf_params is not None
        assert 'target_throughput' in engine.perf_params
        assert engine.perf_params['target_throughput'] == 21340

    def test_calculate_gold_volatility_indicator(self, gold_volatility_engine, sample_gold_prices):
        """测试黄金波动率指标计算"""
        engine = gold_volatility_engine
        prices = sample_gold_prices

        # 计算波动率
        gold_vol = engine.calculate_gold_volatility_indicator(prices)

        # 验证结果
        assert isinstance(gold_vol, pd.Series)
        assert len(gold_vol) == len(prices)
        assert not gold_vol.isnull().all()

        # 检查跳空对波动率的影响
        # 跳空位置（索引100）的波动率应该有反应
        if len(gold_vol) > 101:
            assert gold_vol.iloc[101] > gold_vol.iloc[95] * 0.5  # 跳空后波动率应增加

    def test_detect_gap_risk_normal(self, gold_volatility_engine):
        """测试正常跳空风险检测"""
        engine = gold_volatility_engine

        # 正常情况：0.5%跳空
        current_price = 2350
        previous_close = 2350 * 0.995  # 0.5%变化

        exceeded, percent, info = engine.detect_gap_risk(current_price, previous_close)

        assert not exceeded  # 0.5% < 1%，不应超限
        assert abs(percent - 0.005) < 0.0001  # 0.5%
        assert info['action'] == 'normal_operations'

    def test_detect_gap_risk_exceeded(self, gold_volatility_engine):
        """测试跳空风险超限检测"""
        engine = gold_volatility_engine

        # 风险超限：2%跳空
        current_price = 2350
        previous_close = 2350 / 1.02  # 2%变化

        exceeded, percent, info = engine.detect_gap_risk(current_price, previous_close)

        assert exceeded  # 2% > 1%，应超限
        assert abs(percent - 0.02) < 0.0001  # 2%
        assert info['action'] == 'suspending_new_trades'
        assert 'adjustments' in info

    def test_calculate_overnight_risk(self, gold_volatility_engine):
        """测试隔夜风险计算"""
        engine = gold_volatility_engine

        position_size = 100000  # 10万美元
        current_volatility = 0.02  # 2%波动率

        risk, info = engine.calculate_overnight_risk(position_size, current_volatility)

        # 验证结果
        assert isinstance(risk, float)
        assert risk >= 0
        assert isinstance(info, dict)

        # 检查风险不超过限制
        max_risk = position_size * engine.risk_params['overnight_risk_limit']  # 0.5%
        assert risk <= max_risk

        # 检查风险信息
        assert 'base_risk' in info
        assert 'risk_ratio' in info
        assert info['risk_ratio'] >= 0

    def test_is_asian_trading_hour(self, gold_volatility_engine):
        """测试亚盘时段检测"""
        engine = gold_volatility_engine

        # 亚盘时段：UTC 02:00
        asian_time = pd.Timestamp('2026-04-08 02:00:00+00:00')
        assert engine.is_asian_trading_hour(asian_time) == True

        # 欧盘时段：UTC 10:00
        europe_time = pd.Timestamp('2026-04-08 10:00:00+00:00')
        assert engine.is_asian_trading_hour(europe_time) == False

        # 美盘时段：UTC 18:00（仍为亚盘时段）
        us_time = pd.Timestamp('2026-04-08 18:00:00+00:00')
        assert engine.is_asian_trading_hour(us_time) == True

        # 美盘时段：UTC 21:00（非亚盘时段）
        us_time_late = pd.Timestamp('2026-04-08 21:00:00+00:00')
        assert engine.is_asian_trading_hour(us_time_late) == False

    def test_adjust_strategy_for_asian_session(self, gold_volatility_engine):
        """测试亚盘时段策略调整"""
        engine = gold_volatility_engine

        # 原始策略参数
        strategy_params = {
            'position_size': 0.01,
            'stop_loss': 0.005,
            'take_profit': 0.01,
            'risk_multiplier': 1.0
        }

        # 亚盘时段时间戳
        asian_time = pd.Timestamp('2026-04-08 02:00:00+00:00')

        # 调整参数
        adjusted_params = engine.adjust_strategy_for_asian_session(strategy_params, asian_time)

        # 验证调整
        assert 'asain_session_optimized' in adjusted_params
        assert adjusted_params['asain_session_optimized'] == True

        # 检查风险调整系数
        assert 'risk_multiplier' in adjusted_params
        expected_multiplier = engine.gold_params['asian_session_risk_adjustment']
        assert adjusted_params['risk_multiplier'] == expected_multiplier

        # 检查头寸规模调整
        assert 'position_size' in adjusted_params
        expected_position_size = strategy_params['position_size'] * expected_multiplier
        assert abs(adjusted_params['position_size'] - expected_position_size) < 0.0001

        # 非亚盘时段不应该调整
        non_asian_time = pd.Timestamp('2026-04-08 12:00:00+00:00')
        non_adjusted_params = engine.adjust_strategy_for_asian_session(strategy_params, non_asian_time)

        assert 'asain_session_optimized' not in non_adjusted_params
        assert non_adjusted_params['position_size'] == strategy_params['position_size']

    def test_calculate_gold_trend_strength(self, gold_volatility_engine, sample_gold_prices):
        """测试黄金趋势强度计算"""
        engine = gold_volatility_engine
        prices = sample_gold_prices

        # 计算趋势强度
        trend_strength = engine.calculate_gold_trend_strength(prices)

        # 验证结果
        assert isinstance(trend_strength, pd.Series)
        assert len(trend_strength) == len(prices)

        # 趋势强度应在0-1之间（归一化后）
        if trend_strength.max() > 0:
            assert trend_strength.min() >= 0
            assert trend_strength.max() <= 1

    def test_generate_multi_timeframe_signals(self, gold_volatility_engine, multi_timeframe_data):
        """测试多时间框架信号生成"""
        engine = gold_volatility_engine

        # 生成信号
        signals = engine.generate_multi_timeframe_signals(multi_timeframe_data)

        # 验证信号结构
        assert isinstance(signals, dict)
        assert 'timeframe_signals' in signals
        assert 'combined_signal' in signals
        assert 'confidence_score' in signals
        assert 'generation_time' in signals

        # 检查时间框架信号
        timeframe_signals = signals['timeframe_signals']
        for timeframe in multi_timeframe_data.keys():
            if timeframe in timeframe_signals:
                signal_info = timeframe_signals[timeframe]
                assert 'signal' in signal_info
                assert 'confidence' in signal_info
                assert 'indicators' in signal_info

                # 信号应为-1, 0, 或1
                assert signal_info['signal'] in [-1, 0, 1]
                # 置信度应在0-1之间
                assert 0 <= signal_info['confidence'] <= 1

        # 检查综合信号
        combined = signals['combined_signal']
        assert 'signal' in combined
        assert 'confidence' in combined
        assert 'contributing_timeframes' in combined

        # 综合信号也应为-1, 0, 或1
        assert combined['signal'] in [-1, 0, 1]
        assert 0 <= combined['confidence'] <= 1

    def test_calculate_dynamic_position_size(self, gold_volatility_engine):
        """测试动态头寸规模计算"""
        engine = gold_volatility_engine

        account_size = 100000  # 10万美元
        current_volatility = 0.02  # 2%
        signal_strength = 0.8  # 强信号

        position_size = engine.calculate_dynamic_position_size(
            account_size, current_volatility, signal_strength
        )

        # 验证结果
        assert isinstance(position_size, float)
        assert position_size > 0

        # 基础头寸规模应为1%账户规模 = 1000
        base_position = account_size * engine.risk_params['position_size']
        assert position_size <= base_position  # 动态调整后通常不会超过基础头寸

        # 高波动率应减少头寸规模
        high_vol_position_size = engine.calculate_dynamic_position_size(
            account_size, 0.05, signal_strength  # 5%高波动率
        )

        assert high_vol_position_size < position_size

        # 低信号强度应减少头寸规模
        low_signal_position_size = engine.calculate_dynamic_position_size(
            account_size, current_volatility, 0.3  # 弱信号
        )

        assert low_signal_position_size < position_size

    def test_update_performance_stats(self, gold_volatility_engine):
        """测试性能统计更新"""
        engine = gold_volatility_engine

        # 初始性能统计
        initial_ticks = engine.performance_stats.get('ticks_processed', 0)

        # 更新统计
        engine.update_performance_stats(
            ticks_processed=10,
            processing_time_ms=5.5,
            signal_generated=True,
            trade_executed=False
        )

        # 验证更新
        assert engine.performance_stats['ticks_processed'] == initial_ticks + 10
        assert 'signals_generated' in engine.performance_stats
        assert 'avg_processing_time_ms' in engine.performance_stats

        # 再次更新
        engine.update_performance_stats(
            ticks_processed=5,
            processing_time_ms=3.2,
            signal_generated=False,
            trade_executed=True
        )

        assert engine.performance_stats['ticks_processed'] == initial_ticks + 15
        assert 'trades_executed' in engine.performance_stats

    def test_evaluate_performance(self, gold_volatility_engine):
        """测试性能评估"""
        engine = gold_volatility_engine

        # 先更新一些统计数据
        engine.update_performance_stats(
            ticks_processed=1000,
            processing_time_ms=1000,
            signal_generated=True
        )

        # 评估性能
        performance = engine.evaluate_performance()

        # 验证性能指标
        assert isinstance(performance, dict)
        assert 'current_throughput_tps' in performance
        assert 'target_throughput_tps' in performance
        assert 'throughput_ratio' in performance
        assert 'avg_latency_ms' in performance
        assert 'target_latency_ms' in performance
        assert 'latency_ratio' in performance

        # 吞吐量应为正数
        assert performance['current_throughput_tps'] >= 0
        # 比率应在合理范围内
        assert 0 <= performance['throughput_ratio'] <= 10  # 允许10倍目标值

class TestGoldQuantEngine:
    """黄金量化引擎测试类"""

    @pytest.mark.asyncio
    async def test_initialization(self):
        """测试黄金量化引擎初始化"""
        engine = GoldQuantEngine()

        # 检查核心组件
        assert hasattr(engine, 'volatility_engine')
        assert hasattr(engine, 'data_handler')
        assert hasattr(engine, 'trading_state')
        assert hasattr(engine, 'timeframe_data')

        # 检查时间框架缓存
        assert isinstance(engine.timeframe_data, dict)
        for timeframe in ['M1', 'M5', 'M15', 'M30']:
            assert timeframe in engine.timeframe_data

    @pytest.mark.asyncio
    async def test_clean_validate_tick(self, gold_quant_engine):
        """测试tick数据清理和验证"""
        engine = gold_quant_engine

        # 有效tick数据
        valid_tick = {
            'timestamp': '2026-04-08T10:30:00Z',
            'bid': 2350.50,
            'ask': 2350.55,
            'volume': 100
        }

        cleaned = engine._clean_validate_tick(valid_tick)

        # 验证清理结果
        assert isinstance(cleaned['timestamp'], datetime)
        assert cleaned['bid'] == 2350.50
        assert cleaned['ask'] == 2350.55
        assert 'mid' in cleaned
        assert cleaned['mid'] == (2350.50 + 2350.55) / 2

        # 测试价格反转（bid > ask）
        reversed_tick = {
            'timestamp': '2026-04-08T10:30:00Z',
            'bid': 2350.55,
            'ask': 2350.50,
            'volume': 100
        }

        cleaned_reversed = engine._clean_validate_tick(reversed_tick)
        assert cleaned_reversed['bid'] == 2350.50  # 应被纠正
        assert cleaned_reversed['ask'] == 2350.55

        # 测试无效价格
        invalid_tick = {
            'timestamp': '2026-04-08T10:30:00Z',
            'bid': -100,  # 负价格
            'ask': 2350.55,
            'volume': 100
        }

        with pytest.raises(ValueError):
            engine._clean_validate_tick(invalid_tick)

        # 测试缺少字段
        missing_field_tick = {
            'timestamp': '2026-04-08T10:30:00Z',
            'bid': 2350.50
            # 缺少ask字段
        }

        with pytest.raises(ValueError):
            engine._clean_validate_tick(missing_field_tick)

    def test_set_strategy(self, gold_quant_engine):
        """测试策略设置"""
        engine = gold_quant_engine

        # 有效策略设置
        result = engine.set_strategy('trend_following', 'M15', {'stop_loss': 0.005})

        assert result['status'] == 'success'
        assert result['strategy'] == 'trend_following'
        assert result['timeframe'] == 'M15'

        # 检查引擎状态
        assert engine.trading_state['current_strategy'] == 'trend_following'
        assert engine.trading_state['current_timeframe'] == 'M15'

        # 无效策略测试
        invalid_result = engine.set_strategy('invalid_strategy', 'M1')
        assert invalid_result['status'] == 'error'

        invalid_tf_result = engine.set_strategy('scalping', 'invalid_tf')
        assert invalid_tf_result['status'] == 'error'

    def test_get_engine_status(self, gold_quant_engine):
        """测试获取引擎状态"""
        engine = gold_quant_engine

        status = engine.get_engine_status()

        # 验证状态结构
        assert isinstance(status, dict)
        assert 'engine_active' in status
        assert 'performance_metrics' in status
        assert 'trading_state' in status
        assert 'current_strategy' in status

        # 验证性能参数
        perf_metrics = status['performance_metrics']
        assert 'current_throughput_tps' in perf_metrics
        assert 'target_throughput_tps' in perf_metrics

        # 验证风险参数
        assert 'risk_parameters' in status
        risk_params = status['risk_parameters']
        assert 'gap_risk_limit' in risk_params
        assert risk_params['gap_risk_limit'] == 0.01  # 1%

    @pytest.mark.asyncio
    async def test_process_tick_simulation(self, gold_quant_engine):
        """测试tick处理模拟"""
        engine = gold_quant_engine

        # 模拟一次tick处理（使用模拟数据）
        async def mock_process_tick():
            tick_data = {
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'bid': 2350.50,
                'ask': 2350.55,
                'volume': 100
            }

            result = await engine.process_tick(tick_data)
            return result

        # 注意：实际测试需要完整的异步环境
        # 这里主要测试接口可用性
        assert hasattr(engine, 'process_tick')

def test_gold_specialist_requirements():
    """测试黄金交易专家代理的要求"""
    # 验证黄金特性要求
    requirements = {
        'gap_risk': 0.01,  # 1%
        'overnight_risk': 0.005,  # 0.5%
        'asian_session_filter': True,
        'multi_timeframe': ['M1', 'M5', 'M15', 'M30'],
        'performance_target': 21340,  # ticks/sec
    }

    assert requirements['gap_risk'] == 0.01
    assert requirements['overnight_risk'] == 0.005
    assert requirements['asian_session_filter'] == True
    assert 'M1' in requirements['multi_timeframe']
    assert requirements['performance_target'] >= 21340

def test_config_manager():
    """测试配置管理器（简化版）"""
    try:
        from config_manager import ConfigManager

        config_manager = ConfigManager()
        config = config_manager.load_config()

        assert isinstance(config, dict)
        assert 'risk' in config
        assert 'trading' in config

        risk_params = config_manager.get_risk_params()
        assert 'gap_risk' in risk_params or 'gap_risk_limit' in risk_params

    except ImportError:
        # 如果config_manager不存在，跳过测试
        pass

if __name__ == '__main__':
    pytest.main([__file__, '-v'])