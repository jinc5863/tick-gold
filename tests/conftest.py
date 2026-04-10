import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

# pytest配置
@pytest.fixture
def sample_tick_data():
    """生成示例tick数据"""
    dates = pd.date_range(start=datetime.now() - timedelta(days=1), end=datetime.now(), freq='1s')
    data = {
        'timestamp': dates,
        'bid': np.random.uniform(2300, 2400, len(dates)),
        'ask': np.random.uniform(2300, 2401, len(dates)),
        'volume': np.random.randint(100, 1000, len(dates))
    }
    return pd.DataFrame(data)

@pytest.fixture
def sample_ohlc_data():
    """生成示例OHLC数据"""
    dates = pd.date_range(start=datetime.now() - timedelta(days=1), end=datetime.now(), freq='1min')
    data = {
        'timestamp': dates,
        'open': np.random.uniform(2300, 2400, len(dates)),
        'high': np.random.uniform(2300, 2400, len(dates)),
        'low': np.random.uniform(2300, 2400, len(dates)),
        'close': np.random.uniform(2300, 2400, len(dates)),
        'volume': np.random.randint(100, 1000, len(dates))
    }
    return pd.DataFrame(data)

@pytest.fixture
def sample_strategy_parameters():
    """生成示例策略参数"""
    return {
        'timeframe': 'M1',
        'fastperiod': 12,
        'slowperiod': 26,
        'signalperiod': 9,
        'rsi_period': 14,
        'rsi_overbought': 70,
        'rsi_oversold': 30,
        'bollinger_period': 20,
        'bollinger_dev': 2,
        'min_volatility': 0.01,
        'max_gap': 0.001
    }

@pytest.fixture
def mock_mt5_api():
    """模拟MT5 API"""
    class MockMT5API:
        def __init__(self):
            self.connected = False
            self.positions = []

        def connect(self, host, port, login, password):
            self.connected = True
            return True

        def disconnect(self):
            self.connected = False

        def get_tick_data(self, symbol, timeframe):
            # 生成模拟tick数据
            dates = pd.date_range(start=datetime.now() - timedelta(minutes=10), end=datetime.now(), freq='1s')
            data = {
                'timestamp': dates,
                'bid': np.random.uniform(2300, 2400, len(dates)),
                'ask': np.random.uniform(2300, 2401, len(dates)),
                'volume': np.random.randint(100, 1000, len(dates))
            }
            return pd.DataFrame(data)

        def place_order(self, symbol, order_type, price, volume):
            order = {
                'symbol': symbol,
                'type': order_type,
                'price': price,
                'volume': volume,
                'timestamp': datetime.now()
            }
            self.positions.append(order)
            return order

        def close_position(self, position_id):
            # 模拟关闭仓位
            return True

    return MockMT5API()

@pytest.fixture
def test_config():
    """测试配置"""
    return {
        'trading': {
            'symbol': 'XAUUSD',
            'timeframes': ['M1', 'M5', 'M15', 'M30'],
            'default_timeframe': 'M1'
        },
        'risk': {
            'max_drawdown': 0.02,
            'max_daily_loss': 0.005,
            'position_size': 0.01
        }
    }

# 添加pytest命令行选项
def pytest_addoption(parser):
    parser.addoption("--slow", action="store_true", help="run slow tests")
    parser.addoption("--integration", action="store_true", help="run integration tests")

def pytest_configure(config):
    config.addinivalue_line("markers", "slow: mark test as slow to run")
    config.addinivalue_line("markers", "integration: mark test as integration test")