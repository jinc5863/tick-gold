import pytest
import pandas as pd
import numpy as np
from src.quant.python.indicators import TechnicalIndicators

class TestTechnicalIndicators:
    """技术指标测试类"""

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

    def test_macd_calculation(self, sample_data):
        """测试MACD计算"""
        indicators = TechnicalIndicators()
        macd, macdsignal, macdhist = indicators.calculate_macd(sample_data)

        # 验证输出形状
        assert len(macd) == len(sample_data)
        assert len(macdsignal) == len(sample_data)
        assert len(macdhist) == len(sample_data)

        # 验证数据类型
        assert isinstance(macd, pd.Series)
        assert isinstance(macdsignal, pd.Series)
        assert isinstance(macdhist, pd.Series)

        # 验证数值范围（应该包含NaN值）
        assert macd.isna().any()
        assert macdsignal.isna().any()
        assert macdhist.isna().any()

    def test_rsi_calculation(self, sample_data):
        """测试RSI计算"""
        indicators = TechnicalIndicators()
        rsi = indicators.calculate_rsi(sample_data)

        # 验证输出形状
        assert len(rsi) == len(sample_data)

        # 验证数据类型
        assert isinstance(rsi, pd.Series)

        # 验证数值范围（0-100）
        assert rsi.min() >= 0
        assert rsi.max() <= 100

        # 验证NaN值
        assert rsi.isna().any()

    def test_bollinger_bands_calculation(self, sample_data):
        """测试布林带计算"""
        indicators = TechnicalIndicators()
        upper, middle, lower = indicators.calculate_bollinger_bands(sample_data)

        # 验证输出形状
        assert len(upper) == len(sample_data)
        assert len(middle) == len(sample_data)
        assert len(lower) == len(sample_data)

        # 验证数据类型
        assert isinstance(upper, pd.Series)
        assert isinstance(middle, pd.Series)
        assert isinstance(lower, pd.Series)

        # 验证关系（上轨 >= 中轨 >= 下轨）
        assert (upper >= middle).all()
        assert (middle >= lower).all()

        # 验证NaN值
        assert upper.isna().any()
        assert middle.isna().any()
        assert lower.isna().any()

    def test_atr_calculation(self, sample_data):
        """测试ATR计算"""
        indicators = TechnicalIndicators()
        atr = indicators.calculate_atr(sample_data)

        # 验证输出形状
        assert len(atr) == len(sample_data)

        # 验证数据类型
        assert isinstance(atr, pd.Series)

        # 验证数值范围（应该为正数）
        assert (atr >= 0).all()

        # 验证NaN值
        assert atr.isna().any()

    def test_golden_indicators_calculation(self, sample_data):
        """测试黄金专用指标计算"""
        indicators = TechnicalIndicators()
        golden_indicators = indicators.calculate_golden_indicators(sample_data)

        # 验证输出
        assert 'volatility' in golden_indicators
        assert 'gap_factor' in golden_indicators

        # 验证数据类型
        assert isinstance(golden_indicators['volatility'], pd.Series)
        assert isinstance(golden_indicators['gap_factor'], pd.Series)

        # 验证数值范围
        assert golden_indicators['volatility'].min() >= 0
        assert golden_indicators['gap_factor'].min() >= 0

        # 验证NaN值
        assert golden_indicators['volatility'].isna().any()
        assert golden_indicators['gap_factor'].isna().any()

    def test_indicator_parameters(self, sample_data):
        """测试指标参数"""
        indicators = TechnicalIndicators()

        # 测试不同的参数组合
        macd1, _, _ = indicators.calculate_macd(sample_data, fastperiod=10, slowperiod=20)
        macd2, _, _ = indicators.calculate_macd(sample_data, fastperiod=12, slowperiod=26)

        # 验证不同参数产生不同的结果
        assert not macd1.equals(macd2)

        # 测试RSI不同周期
        rsi1 = indicators.calculate_rsi(sample_data, timeperiod=10)
        rsi2 = indicators.calculate_rsi(sample_data, timeperiod=14)

        assert not rsi1.equals(rsi2)

    def test_empty_data_handling(self):
        """测试空数据处理"""
        empty_data = pd.DataFrame(columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        indicators = TechnicalIndicators()

        # 应该不抛出异常
        macd, macdsignal, macdhist = indicators.calculate_macd(empty_data)
        rsi = indicators.calculate_rsi(empty_data)
        upper, middle, lower = indicators.calculate_bollinger_bands(empty_data)
        atr = indicators.calculate_atr(empty_data)
        golden_indicators = indicators.calculate_golden_indicators(empty_data)

        # 验证输出为空
        assert macd.empty
        assert macdsignal.empty
        assert macdhist.empty
        assert rsi.empty
        assert upper.empty
        assert middle.empty
        assert lower.empty
        assert atr.empty
        assert golden_indicators['volatility'].empty
        assert golden_indicators['gap_factor'].empty

    def test_invalid_data_handling(self):
        """测试无效数据处理"""
        # 创建包含NaN的数据
        data = pd.DataFrame({
            'timestamp': pd.date_range(start='2023-01-01', periods=10, freq='1min'),
            'open': [2300] * 10,
            'high': [2300] * 10,
            'low': [2300] * 10,
            'close': [2300] * 5 + [np.nan] * 5,  # 后5个值为NaN
            'volume': [100] * 10
        })
        indicators = TechnicalIndicators()

        # 应该不抛出异常
        macd, macdsignal, macdhist = indicators.calculate_macd(data)
        rsi = indicators.calculate_rsi(data)
        upper, middle, lower = indicators.calculate_bollinger_bands(data)
        atr = indicators.calculate_atr(data)
        golden_indicators = indicators.calculate_golden_indicators(data)

        # 验证输出包含NaN
        assert macd.isna().any()
        assert macdsignal.isna().any()
        assert macdhist.isna().any()
        assert rsi.isna().any()
        assert upper.isna().any()
        assert middle.isna().any()
        assert lower.isna().any()
        assert atr.isna().any()
        assert golden_indicators['volatility'].isna().any()
        assert golden_indicators['gap_factor'].isna().any()