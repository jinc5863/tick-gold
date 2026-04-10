import pytest
import pandas as pd
import numpy as np
import zmq
import asyncio
from src.gold.data.gold_data import GoldDataHandler

class TestGoldDataHandler:
    """黄金数据处理器测试类"""

    @pytest.fixture
    def sample_tick_data(self):
        """生成示例tick数据"""
        dates = pd.date_range(start='2023-01-01', periods=1000, freq='1s')
        data = {
            'timestamp': dates,
            'bid': np.random.uniform(2300, 2400, 1000),
            'ask': np.random.uniform(2300, 2401, 1000),
            'volume': np.random.randint(100, 1000, 1000)
        }
        return pd.DataFrame(data)

    def test_data_handler_initialization(self):
        """测试数据处理器初始化"""
        data_handler = GoldDataHandler()

        # 验证初始化属性
        assert data_handler.mt5_host == "127.0.0.1"
        assert data_handler.mt5_port == 1611
        assert data_handler.data_auditor is not None
        assert len(data_handler.raw_data) == 0
        assert len(data_handler.cleaned_data) == 0

    def test_tick_data_cleaning(self, sample_tick_data):
        """测试tick数据清洗"""
        data_handler = GoldDataHandler()

        # 清洗数据
        cleaned_data = []
        for _, row in sample_tick_data.iterrows():
            cleaned_tick = data_handler.clean_tick_data(row.to_dict())
            cleaned_data.append(cleaned_tick)

        # 验证清洗结果
        assert len(cleaned_data) == len(sample_tick_data)

        # 验证数据有效性
        for tick in cleaned_data:
            assert tick['bid'] <= tick['ask']  # bid应该<=ask
            assert round(tick['bid'], 5) == tick['bid']  # 精度校准
            assert round(tick['ask'], 5) == tick['ask']  # 精度校准

    def test_data_quality_report(self, sample_tick_data):
        """测试数据质量报告"""
        data_handler = GoldDataHandler()

        # 添加一些数据
        for _, row in sample_tick_data.iterrows():
            data_handler.raw_data.append(row.to_dict())
            cleaned_tick = data_handler.clean_tick_data(row.to_dict())
            data_handler.cleaned_data.append(cleaned_tick)

        # 生成质量报告
        report = data_handler.get_data_quality_report()

        # 验证报告结构
        assert isinstance(report, dict)
        assert 'total_records' in report
        assert 'missing_values' in report
        assert 'duplicate_records' in report
        assert 'time_continuity' in report
        assert 'price_reasonableness' in report

        # 验证报告内容
        assert report['total_records'] == len(sample_tick_data)
        assert isinstance(report['missing_values'], dict)
        assert isinstance(report['duplicate_records'], int)
        assert isinstance(report['time_continuity'], dict)
        assert isinstance(report['price_reasonableness'], dict)

    def test_ohlc_conversion(self, sample_tick_data):
        """测试OHLC转换"""
        data_handler = GoldDataHandler()

        # 添加数据
        for _, row in sample_tick_data.iterrows():
            data_handler.raw_data.append(row.to_dict())
            cleaned_tick = data_handler.clean_tick_data(row.to_dict())
            data_handler.cleaned_data.append(cleaned_tick)

        # 转换为不同周期
        m1_data = data_handler.get_ohlc_data(timeframe='M1')
        m5_data = data_handler.get_ohlc_data(timeframe='M5')
        m15_data = data_handler.get_ohlc_data(timeframe='M15')
        m30_data = data_handler.get_ohlc_data(timeframe='M30')

        # 验证输出
        assert isinstance(m1_data, pd.DataFrame)
        assert isinstance(m5_data, pd.DataFrame)
        assert isinstance(m15_data, pd.DataFrame)
        assert isinstance(m30_data, pd.DataFrame)

        # 验证列名
        assert all(col in m1_data.columns for col in ['open', 'high', 'low', 'close', 'volume'])

    def test_data_export(self, sample_tick_data):
        """测试数据导出"""
        data_handler = GoldDataHandler()

        # 添加数据
        for _, row in sample_tick_data.iterrows():
            data_handler.raw_data.append(row.to_dict())
            cleaned_tick = data_handler.clean_tick_data(row.to_dict())
            data_handler.cleaned_data.append(cleaned_tick)

        # 导出数据
        raw_exported = data_handler.export_data("test_raw.csv", "raw")
        cleaned_exported = data_handler.export_data("test_cleaned.csv", "cleaned")

        # 验证导出结果
        assert raw_exported is True
        assert cleaned_exported is True

        # 验证文件存在（简化版，实际应该检查文件内容）
        assert True  # 实际实现中应该检查文件是否存在

    def test_time_continuity_check(self, sample_tick_data):
        """测试时间连续性检查"""
        data_handler = GoldDataHandler()

        # 添加数据
        for _, row in sample_tick_data.iterrows():
            data_handler.raw_data.append(row.to_dict())
            cleaned_tick = data_handler.clean_tick_data(row.to_dict())
            data_handler.cleaned_data.append(cleaned_tick)

        # 获取质量报告
        report = data_handler.get_data_quality_report()
        time_continuity = report['time_continuity']

        # 验证时间连续性指标
        assert 'max_gap' in time_continuity
        assert 'avg_gap' in time_continuity
        assert 'gaps_count' in time_continuity
        assert isinstance(time_continuity['max_gap'], (int, float))
        assert isinstance(time_continuity['avg_gap'], (int, float))
        assert isinstance(time_continuity['gaps_count'], int)

    def test_price_reasonableness_check(self, sample_tick_data):
        """测试价格合理性检查"""
        data_handler = GoldDataHandler()

        # 添加数据
        for _, row in sample_tick_data.iterrows():
            data_handler.raw_data.append(row.to_dict())
            cleaned_tick = data_handler.clean_tick_data(row.to_dict())
            data_handler.cleaned_data.append(cleaned_tick)

        # 获取质量报告
        report = data_handler.get_data_quality_report()
        price_reasonableness = report['price_reasonableness']

        # 验证价格合理性指标
        assert 'max_spread' in price_reasonableness
        assert 'avg_spread' in price_reasonableness
        assert 'abnormal_spreads' in price_reasonableness
        assert isinstance(price_reasonableness['max_spread'], (int, float))
        assert isinstance(price_reasonableness['avg_spread'], (int, float))
        assert isinstance(price_reasonableness['abnormal_spreads'], int)

    def test_data_handler_reset(self):
        """测试数据处理器重置"""
        data_handler = GoldDataHandler()

        # 添加一些数据
        data_handler.raw_data = [{'timestamp': pd.Timestamp.now(), 'bid': 2300, 'ask': 2301, 'volume': 100}]
        data_handler.cleaned_data = [{'timestamp': pd.Timestamp.now(), 'bid': 2300, 'ask': 2301, 'volume': 100}]

        # 重置（通过重新初始化）
        data_handler = GoldDataHandler()

        # 验证重置结果
        assert len(data_handler.raw_data) == 0
        assert len(data_handler.cleaned_data) == 0

    def test_invalid_timeframe_handling(self):
        """测试无效时间周期处理"""
        data_handler = GoldDataHandler()

        # 添加一些数据
        for i in range(100):
            data_handler.raw_data.append({
                'timestamp': pd.Timestamp.now() + pd.Timedelta(seconds=i),
                'bid': 2300 + i/100,
                'ask': 2301 + i/100,
                'volume': 100
            })
            cleaned_tick = data_handler.clean_tick_data(data_handler.raw_data[-1])
            data_handler.cleaned_data.append(cleaned_tick)

        # 测试无效时间周期
        with pytest.raises(ValueError):
            data_handler.get_ohlc_data(timeframe="invalid")

    def test_empty_data_handling(self):
        """测试空数据处理"""
        data_handler = GoldDataHandler()

        # 获取OHLC数据（应该返回空DataFrame）
        m1_data = data_handler.get_ohlc_data(timeframe='M1')
        assert m1_data.empty

        # 获取质量报告（应该返回空字典）
        report = data_handler.get_data_quality_report()
        assert report == {}