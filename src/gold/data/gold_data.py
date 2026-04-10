import pandas as pd
import numpy as np
import asyncio
import warnings
from datetime import datetime, timedelta
from typing import List, Dict, Optional

# DataAuditor可选依赖
try:
    from ..compliance.audit import DataAuditor
    DATA_AUDITOR_AVAILABLE = True
except ImportError:
    DATA_AUDITOR_AVAILABLE = False
    # 创建模拟DataAuditor类
    class DataAuditor:
        def __init__(self, source_name: str):
            self.source_name = source_name
            print(f"警告: 使用模拟DataAuditor for {source_name}")

        def audit_tick_data(self, df):
            # 返回模拟审计结果
            return {
                'valid': True,
                'issues': [],
                'data_quality_score': 100.0
            }

# ZeroMQ可选依赖
try:
    import zmq
    ZMQ_AVAILABLE = True
except ImportError:
    ZMQ_AVAILABLE = False
    warnings.warn("ZeroMQ (zmq)未安装，使用模拟数据模式", ImportWarning)

# pytz可选依赖
try:
    import pytz
    PYTZ_AVAILABLE = True
except ImportError:
    PYTZ_AVAILABLE = False
    warnings.warn("pytz未安装，使用标准库时区支持", ImportWarning)

class GoldDataHandler:
    """黄金数据处理器"""

    def __init__(self, mt5_host: str = "127.0.0.1", mt5_port: int = 1611):
        self.mt5_host = mt5_host
        self.mt5_port = mt5_port
        self.use_real_data = ZMQ_AVAILABLE
        self.data_auditor = DataAuditor("MT5_XAUUSD")
        self.raw_data = []
        self.cleaned_data = []
        self.current_tick = None

        if ZMQ_AVAILABLE:
            # 使用真实的ZeroMQ连接
            import zmq
            self.context = zmq.Context()
            self.socket = self.context.socket(zmq.SUB)
            self.socket.connect(f"tcp://{mt5_host}:{mt5_port}")
            self.socket.setsockopt_string(zmq.SUBSCRIBE, "XAUUSD")
            print("ZeroMQ连接已建立 - 使用真实数据模式")
        else:
            # 模拟数据模式
            print("警告: ZeroMQ不可用 - 切换到模拟数据模式")
            self.context = None
            self.socket = None

    async def start_data_stream(self):
        """启动数据流"""
        print("Starting XAUUSD tick data stream...")
        while True:
            try:
                message = self.socket.recv_string()
                symbol, timestamp, bid, ask, volume = message.split(',')

                tick_data = {
                    'timestamp': datetime.fromtimestamp(float(timestamp)),
                    'bid': float(bid),
                    'ask': float(ask),
                    'volume': float(volume)
                }

                self.current_tick = tick_data
                self.raw_data.append(tick_data)

                # 实时处理数据
                await self.process_tick_data(tick_data)

            except Exception as e:
                print(f"Error receiving tick data: {e}")
                await asyncio.sleep(1)

    async def process_tick_data(self, tick_data: Dict):
        """处理tick数据"""
        # 1. 数据清洗
        cleaned_tick = self.clean_tick_data(tick_data)

        # 2. 数据审计
        audit_result = self.data_auditor.audit_tick_data(pd.DataFrame([cleaned_tick]))

        # 3. 存储清洗后的数据
        self.cleaned_data.append(cleaned_tick)

        # 4. 推送数据到UI（简化版）
        print(f"Processed tick: {cleaned_tick['timestamp']} - Bid: {cleaned_tick['bid']}, Ask: {cleaned_tick['ask']}")

    def clean_tick_data(self, tick_data: Dict) -> Dict:
        """清洗tick数据"""
        # 1. 去重（基于时间戳+价格）
        # 2. 异常数据过滤
        # 3. 时间戳校准
        # 4. 精度校准

        # 简化版：只进行基本清洗
        cleaned = tick_data.copy()

        # 确保价格有效（bid <= ask）
        if cleaned['bid'] > cleaned['ask']:
            cleaned['bid'], cleaned['ask'] = cleaned['ask'], cleaned['bid']

        # 精度校准（保留5位小数）
        cleaned['bid'] = round(cleaned['bid'], 5)
        cleaned['ask'] = round(cleaned['ask'], 5)

        return cleaned

    def get_historical_data(self, start_date: str, end_date: str, timeframe: str = "M1") -> pd.DataFrame:
        """获取历史数据"""
        # 这里应该从MT5或数据库获取历史数据
        # 简化版：返回模拟数据
        dates = pd.date_range(start=start_date, end=end_date, freq='1min')
        data = {
            'timestamp': dates,
            'open': np.random.uniform(2300, 2400, len(dates)),
            'high': np.random.uniform(2300, 2400, len(dates)),
            'low': np.random.uniform(2300, 2400, len(dates)),
            'close': np.random.uniform(2300, 2400, len(dates)),
            'volume': np.random.randint(100, 1000, len(dates))
        }
        return pd.DataFrame(data)

    def get_ohlc_data(self, timeframe: str = "M1", period: int = 1000) -> pd.DataFrame:
        """获取OHLC数据"""
        # 转换时间周期
        if timeframe == "M1":
            return self._convert_to_m1()
        elif timeframe == "M5":
            return self._convert_to_m5()
        elif timeframe == "M15":
            return self._convert_to_m15()
        elif timeframe == "M30":
            return self._convert_to_m30()
        else:
            raise ValueError(f"Unsupported timeframe: {timeframe}")

    def _convert_to_m1(self) -> pd.DataFrame:
        """转换为M1周期"""
        if not self.cleaned_data:
            return pd.DataFrame()

        df = pd.DataFrame(self.cleaned_data)
        df.set_index('timestamp', inplace=True)

        # 转换为1分钟K线
        ohlc = df['bid'].resample('1min').ohlc()
        ohlc['volume'] = df['volume'].resample('1min').sum()

        return ohlc

    def _convert_to_m5(self) -> pd.DataFrame:
        """转换为M5周期"""
        if not self.cleaned_data:
            return pd.DataFrame()

        df = pd.DataFrame(self.cleaned_data)
        df.set_index('timestamp', inplace=True)

        # 转换为5分钟K线
        ohlc = df['bid'].resample('5min').ohlc()
        ohlc['volume'] = df['volume'].resample('5min').sum()

        return ohlc

    def _convert_to_m15(self) -> pd.DataFrame:
        """转换为M15周期"""
        if not self.cleaned_data:
            return pd.DataFrame()

        df = pd.DataFrame(self.cleaned_data)
        df.set_index('timestamp', inplace=True)

        # 转换为15分钟K线
        ohlc = df['bid'].resample('15min').ohlc()
        ohlc['volume'] = df['volume'].resample('15min').sum()

        return ohlc

    def _convert_to_m30(self) -> pd.DataFrame:
        """转换为M30周期"""
        if not self.cleaned_data:
            return pd.DataFrame()

        df = pd.DataFrame(self.cleaned_data)
        df.set_index('timestamp', inplace=True)

        # 转换为30分钟K线
        ohlc = df['bid'].resample('30min').ohlc()
        ohlc['volume'] = df['volume'].resample('30min').sum()

        return ohlc

    def export_data(self, filename: str, data_type: str = "cleaned"):
        """导出数据"""
        if data_type == "cleaned" and self.cleaned_data:
            df = pd.DataFrame(self.cleaned_data)
            df.to_csv(filename, index=False)
            return True
        elif data_type == "raw" and self.raw_data:
            df = pd.DataFrame(self.raw_data)
            df.to_csv(filename, index=False)
            return True
        else:
            return False

    def get_data_quality_report(self) -> Dict:
        """获取数据质量报告"""
        if not self.cleaned_data:
            return {}

        df = pd.DataFrame(self.cleaned_data)
        report = {
            'total_records': len(df),
            'missing_values': df.isnull().sum().to_dict(),
            'duplicate_records': df.duplicated().sum(),
            'time_continuity': self._check_time_continuity(df),
            'price_reasonableness': self._check_price_reasonableness(df)
        }

        return report

    def _check_time_continuity(self, df: pd.DataFrame) -> Dict:
        """检查时间连续性"""
        time_diffs = df['timestamp'].diff().dt.total_seconds()
        return {
            'max_gap': time_diffs.max(),
            'avg_gap': time_diffs.mean(),
            'gaps_count': (time_diffs > 1).sum()
        }

    def _check_price_reasonableness(self, df: pd.DataFrame) -> Dict:
        """检查价格合理性"""
        bid_ask_spread = df['ask'] - df['bid']
        return {
            'max_spread': bid_ask_spread.max(),
            'avg_spread': bid_ask_spread.mean(),
            'abnormal_spreads': (bid_ask_spread > 0.5).sum()
        }