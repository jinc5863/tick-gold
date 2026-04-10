import pytest
import pandas as pd
import numpy as np
from src.quant.python.strategies import TradingStrategies

class TestTradingStrategies:
    """交易策略测试类"""

    @pytest.fixture
    def sample_data(self):
        """生成示例数据"""
        dates = pd.date_range(start='2023-01-01', periods=100, freq='1min')
        data = {
            'timestamp': dates,
            'open': np.random.uniform(2300, 2400, 100),
            'high': np.random.uniform(2300, 2400, 100),
            'low': np.random.uniform(2300, 2400, 100),
            'close': np.random.uniform(2300, 2400, 100),
            'volume': np.random.randint(100, 1000, 100)
        }
        return pd.DataFrame(data)

    def test_scalping_strategy(self, sample_data):
        """测试剥头皮策略"""
        strategies = TradingStrategies()
        signals = strategies.scalping_strategy(sample_data)

        # 验证输出形状
        assert len(signals) == len(sample_data)

        # 验证信号值范围（-1, 0, 1）
        assert signals['signal'].isin([-1, 0, 1]).all()

        # 验证数据类型
        assert isinstance(signals, pd.DataFrame)

    def test_trend_following_strategy(self, sample_data):
        """测试趋势跟踪策略"""
        strategies = TradingStrategies()
        signals = strategies.trend_following_strategy(sample_data)

        # 验证输出形状
        assert len(signals) == len(sample_data)

        # 验证信号值范围（-1, 0, 1）
        assert signals['signal'].isin([-1, 0, 1]).all()

        # 验证数据类型
        assert isinstance(signals, pd.DataFrame)

    def test_gold_specific_strategy(self, sample_data):
        """测试黄金专用策略"""
        strategies = TradingStrategies()
        signals = strategies.gold_specific_strategy(sample_data, {
            'min_volatility': 0.01,
            'max_gap': 0.001
        })

        # 验证输出形状
        assert len(signals) == len(sample_data)

        # 验证信号值范围（-1, 0, 1）
        assert signals['signal'].isin([-1, 0, 1]).all()

        # 验证数据类型
        assert isinstance(signals, pd.DataFrame)

    def test_strategy_parameters(self, sample_data):
        """测试策略参数"""
        strategies = TradingStrategies()

        # 测试不同参数的MACD策略
        params1 = {'fastperiod': 10, 'slowperiod': 20, 'signalperiod': 9}
        params2 = {'fastperiod': 12, 'slowperiod': 26, 'signalperiod': 9}
        signals1 = strategies.scalping_strategy(sample_data, params1)
        signals2 = strategies.scalping_strategy(sample_data, params2)

        # 验证不同参数产生不同的结果
        assert not signals1.equals(signals2)

        # 测试RSI过滤参数
        params3 = {'rsi_period': 10, 'rsi_overbought': 75, 'rsi_oversold': 25}
        params4 = {'rsi_period': 14, 'rsi_overbought': 70, 'rsi_oversold': 30}
        signals3 = strategies.scalping_strategy(sample_data, params3)
        signals4 = strategies.scalping_strategy(sample_data, params4)

        assert not signals3.equals(signals4)

    def test_strategy_code_generation(self, sample_data):
        """测试策略代码生成"""
        strategies = TradingStrategies()

        # 生成剥头皮策略代码
        code = strategies.generate_strategy_code('scalping', {
            'fastperiod': 12,
            'slowperiod': 26,
            'signalperiod': 9,
            'rsi_period': 14,
            'rsi_overbought': 70,
            'rsi_oversold': 30
        })

        # 验证代码包含关键元素
        assert 'import talib' in code
        assert 'import pandas as pd' in code
        assert 'def scalping_strategy(data):' in code
        assert 'MACD' in code
        assert 'RSI' in code

        # 验证参数正确性
        assert 'fastperiod=12' in code
        assert 'slowperiod=26' in code
        assert 'signalperiod=9' in code
        assert 'rsi_period=14' in code
        assert 'rsi_overbought=70' in code
        assert 'rsi_oversold=30' in code

    def test_strategy_performance(self, sample_data):
        """测试策略性能"""
        strategies = TradingStrategies()

        # 生成信号
        signals = strategies.scalping_strategy(sample_data)

        # 模拟交易
        trades = []
        position = 0
        entry_price = 0
        entry_time = None

        for i in range(1, len(signals)):
            current_signal = signals.iloc[i]['signal']
            previous_signal = signals.iloc[i-1]['signal']
            current_price = sample_data.iloc[i]['close']

            if current_signal != previous_signal and current_signal != 0:
                if position == 0:  # 买入
                    position = 1
                    entry_price = current_price
                    entry_time = sample_data.index[i]
                else:  # 卖出
                    exit_price = current_price
                    profit = (exit_price - entry_price) / entry_price * 100
                    trades.append({
                        'entry_time': entry_time,
                        'exit_time': sample_data.index[i],
                        'entry_price': entry_price,
                        'exit_price': exit_price,
                        'profit': profit,
                        'signal': current_signal
                    })
                    position = 0

        # 验证交易结果
        assert isinstance(trades, list)
        if trades:
            assert all(isinstance(trade, dict) for trade in trades)
            assert all('profit' in trade for trade in trades)

    def test_strategy_edge_cases(self, sample_data):
        """测试策略边界情况"""
        strategies = TradingStrategies()

        # 测试空数据
        empty_data = pd.DataFrame(columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        signals = strategies.scalping_strategy(empty_data)

        # 验证输出为空
        assert signals.empty

        # 测试单条数据
        single_data = sample_data.iloc[:1]
        signals = strategies.scalping_strategy(single_data)

        # 验证输出为空（需要至少2条数据产生信号）
        assert signals.empty

        # 测试无效参数
        with pytest.raises(TypeError):
            strategies.scalping_strategy(sample_data, "invalid_params")

    def test_strategy_consistency(self, sample_data):
        """测试策略一致性"""
        strategies = TradingStrategies()

        # 多次运行同一策略，结果应该一致
        signals1 = strategies.scalping_strategy(sample_data)
        signals2 = strategies.scalping_strategy(sample_data)

        assert signals1.equals(signals2)

        # 不同策略之间应该有不同的信号模式
        signals_trend = strategies.trend_following_strategy(sample_data)
        assert not signals1.equals(signals_trend)