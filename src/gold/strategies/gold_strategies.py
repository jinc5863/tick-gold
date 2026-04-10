import pandas as pd
import numpy as np

# TA-Lib回退实现
try:
    import talib
    TALIB_AVAILABLE = True
except ImportError:
    TALIB_AVAILABLE = False
    # 简单回退实现
    print("警告: TA-Lib未安装，使用回退技术指标实现")
from typing import Dict, List, Optional

# 可选依赖导入
try:
    from ..data.gold_data import GoldDataHandler
    GOLD_DATA_AVAILABLE = True
except ImportError:
    GOLD_DATA_AVAILABLE = False
    GoldDataHandler = None

try:
    from ..compliance.risk import RiskMonitor
    RISK_MONITOR_AVAILABLE = True
except ImportError:
    RISK_MONITOR_AVAILABLE = False
    RiskMonitor = None

try:
    from ..compliance.audit import DataAuditor
    DATA_AUDITOR_AVAILABLE = True
except ImportError:
    DATA_AUDITOR_AVAILABLE = False
    DataAuditor = None

# 模拟实现类（当真实模块不可用时使用）
class MockGoldDataHandler:
    def __init__(self):
        self.data = []
        print("警告: 使用模拟GoldDataHandler")

    def get_ohlc_data(self, timeframe="M1", period=1000):
        import pandas as pd
        import numpy as np
        try:
            import pytz
        except ImportError:
            pass  # 无pytz也可工作

        dates = pd.date_range(end=pd.Timestamp.now(), periods=period, freq='1min')
        data = {
            'timestamp': dates,
            'open': np.random.uniform(2300, 2400, len(dates)),
            'high': np.random.uniform(2300, 2400, len(dates)),
            'low': np.random.uniform(2300, 2400, len(dates)),
            'close': np.random.uniform(2300, 2400, len(dates)),
            'volume': np.random.randint(100, 1000, len(dates))
        }
        return pd.DataFrame(data)

class MockRiskMonitor:
    def __init__(self):
        print("警告: 使用模拟RiskMonitor")
        pass

    def monitor_risk(self, position, market_data):
        return {'risk_score': 0.0, 'suggestion': '正常'}

class GoldStrategies:
    """黄金专用策略类"""

    def __init__(self, data_handler: GoldDataHandler = None, risk_monitor: RiskMonitor = None):
        # 处理可选依赖
        if data_handler is None:
            if GOLD_DATA_AVAILABLE and GoldDataHandler:
                # 创建默认GoldDataHandler实例
                self.data_handler = GoldDataHandler()
            else:
                self.data_handler = MockGoldDataHandler()
        else:
            self.data_handler = data_handler

        if risk_monitor is None:
            if RISK_MONITOR_AVAILABLE and RiskMonitor:
                # 创建默认RiskMonitor实例
                self.risk_monitor = RiskMonitor()
            else:
                self.risk_monitor = MockRiskMonitor()
        else:
            self.risk_monitor = risk_monitor

        self.strategies = {
            'scalping': self._scalping_strategy,
            'trend_following': self._trend_following_strategy,
            'gold_specific': self._gold_specific_strategy
        }

    def execute_strategy(self, strategy_name: str, parameters: Dict) -> List[Dict]:
        """执行策略"""
        if strategy_name not in self.strategies:
            raise ValueError(f"Unknown strategy: {strategy_name}")

        strategy_func = self.strategies[strategy_name]
        ohlc_data = self.data_handler.get_ohlc_data(
            timeframe=parameters.get('timeframe', 'M1'),
            period=parameters.get('period', 1000)
        )

        if ohlc_data.empty:
            return []

        signals = strategy_func(ohlc_data, parameters)
        trades = self._generate_trades(signals, ohlc_data, parameters)

        return trades

    def _scalping_strategy(self, ohlc_data: pd.DataFrame, parameters: Dict) -> pd.DataFrame:
        """剥头皮策略（黄金专用）"""
        # 计算技术指标
        macd, macdsignal, _ = self._calculate_macd(ohlc_data)
        rsi = self._calculate_rsi(ohlc_data)

        # 生成信号
        signals = pd.DataFrame(index=ohlc_data.index)
        signals['signal'] = 0

        # MACD交叉信号
        signals.loc[macd > macdsignal, 'signal'] = 1  # 买入信号
        signals.loc[macd < macdsignal, 'signal'] = -1  # 卖出信号

        # RSI过滤（避免超买超卖）
        signals.loc[rsi > parameters.get('rsi_overbought', 70), 'signal'] = 0  # 超买时不交易
        signals.loc[rsi < parameters.get('rsi_oversold', 30), 'signal'] = 0  # 超卖时不交易

        return signals

    def _trend_following_strategy(self, ohlc_data: pd.DataFrame, parameters: Dict) -> pd.DataFrame:
        """趋势跟踪策略（黄金专用） - 改进突破逻辑"""
        # 计算技术指标
        upper, middle, lower = self._calculate_bollinger_bands(ohlc_data)

        # 计算ATR（黄金波动率参考）
        # 使用self._calculate_atr()函数来确保TA-Lib可用性检查
        if TALIB_AVAILABLE:
            import talib
            atr = talib.ATR(ohlc_data['high'], ohlc_data['low'], ohlc_data['close'], timeperiod=parameters.get('atr_period', 14))
        else:
            # 简单的ATR回退实现
            high = ohlc_data['high']
            low = ohlc_data['low']
            close = ohlc_data['close']
            tr = pd.DataFrame({
                'hl': high - low,
                'hc': (high - close.shift(1)).abs(),
                'lc': (low - close.shift(1)).abs()
            })
            atr = tr.max(axis=1).rolling(window=parameters.get('atr_period', 14)).mean()

        # 计算成交量平均值（用于过滤）
        volume_ma = ohlc_data['volume'].rolling(window=20).mean() if 'volume' in ohlc_data.columns else pd.Series(1, index=ohlc_data.index)

        # 计算波动率
        volatility = ohlc_data['close'].pct_change().rolling(window=20).std()

        signals = pd.DataFrame(index=ohlc_data.index)
        signals['signal'] = 0
        signals['atr_stop'] = 0.0  # ATR止损参考
        signals['breakout_confirmed'] = False  # 突破是否确认

        # 布林带突破信号（改进版）
        for i in range(1, len(ohlc_data)):
            current_close = ohlc_data.iloc[i]['close']
            current_upper = upper.iloc[i]
            current_lower = lower.iloc[i]
            current_atr = atr.iloc[i]
            current_vol_ratio = ohlc_data.iloc[i]['volume'] / volume_ma.iloc[i] if i < len(volume_ma) else 1
            current_volatility = volatility.iloc[i] if i < len(volatility) else 0

            # 条件1：价格突破布林带
            is_upper_breakout = current_close > current_upper
            is_lower_breakout = current_close < current_lower

            # 条件2：突破确认（前一K线也突破才算确认）
            prev_close = ohlc_data.iloc[i-1]['close']
            prev_upper = upper.iloc[i-1]
            prev_lower = lower.iloc[i-1]
            prev_is_upper_breakout = prev_close > prev_upper
            prev_is_lower_breakout = prev_close < prev_lower

            # 条件3：成交量过滤（成交量需要较前20日均量放大）
            min_volume_ratio = parameters.get('min_volume_ratio', 1.2)
            volume_condition = current_vol_ratio > min_volume_ratio

            # 条件4：波动率过滤（避免在极低波动率时段交易）
            min_volatility = parameters.get('min_volatility', 0.001)
            volatility_condition = current_volatility > min_volatility

            # 生成信号
            if is_upper_breakout and prev_is_upper_breakout and volume_condition and volatility_condition:
                signals.iloc[i, signals.columns.get_loc('signal')] = 1  # 确认向上突破买入
                signals.iloc[i, signals.columns.get_loc('atr_stop')] = current_close - parameters.get('atr_multiplier', 2) * current_atr  # 基于ATR设置止损
                signals.iloc[i, signals.columns.get_loc('breakout_confirmed')] = True
            elif is_lower_breakout and prev_is_lower_breakout and volume_condition and volatility_condition:
                signals.iloc[i, signals.columns.get_loc('signal')] = -1  # 确认向下突破卖出
                signals.iloc[i, signals.columns.get_loc('atr_stop')] = current_close + parameters.get('atr_multiplier', 2) * current_atr  # 基于ATR设置止损
                signals.iloc[i, signals.columns.get_loc('breakout_confirmed')] = True

        return signals

    def _gold_specific_strategy(self, ohlc_data: pd.DataFrame, parameters: Dict) -> pd.DataFrame:
        """黄金专用策略"""
        # 计算黄金专用指标
        golden_indicators = self._calculate_golden_indicators(ohlc_data)
        volatility = golden_indicators['volatility']
        gap_factor = golden_indicators['gap_factor']

        signals = pd.DataFrame(index=ohlc_data.index)
        signals['signal'] = 0

        # 波动率过滤（避免在低波动时段交易）
        signals.loc[volatility < parameters.get('min_volatility', 0.01), 'signal'] = 0

        # 跳空因子过滤
        signals.loc[gap_factor > parameters.get('max_gap', 0.001), 'signal'] = 0

        # 黄金特定时间过滤（亚盘低波动时段）
        signals.loc[ohlc_data.index.hour.between(8, 14), 'signal'] = 0  # 08:00-14:00 GMT禁止交易

        return signals

    def _calculate_macd(self, ohlc_data: pd.DataFrame) -> tuple:
        """计算MACD"""
        if TALIB_AVAILABLE:
            import talib
            return talib.MACD(ohlc_data['close'], fastperiod=12, slowperiod=26, signalperiod=9)
        else:
            # 简单的MACD回退实现
            ema12 = ohlc_data['close'].ewm(span=12, adjust=False).mean()
            ema26 = ohlc_data['close'].ewm(span=26, adjust=False).mean()
            macd_line = ema12 - ema26
            signal_line = macd_line.ewm(span=9, adjust=False).mean()
            macd_histogram = macd_line - signal_line
            return macd_line, signal_line, macd_histogram

    def _calculate_rsi(self, ohlc_data: pd.DataFrame, timeperiod: int = 14) -> pd.Series:
        """计算RSI"""
        if TALIB_AVAILABLE:
            import talib
            return talib.RSI(ohlc_data['close'], timeperiod=timeperiod)
        else:
            # 简单的RSI回退实现
            delta = ohlc_data['close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=timeperiod).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=timeperiod).mean()
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))
            return rsi

    def _calculate_bollinger_bands(self, ohlc_data: pd.DataFrame, timeperiod: int = 20, nbdevup: int = 2, nbdevdn: int = 2) -> tuple:
        """计算布林带"""
        if TALIB_AVAILABLE:
            import talib
            return talib.BBANDS(ohlc_data['close'], timeperiod=timeperiod, nbdevup=nbdevup, nbdevdn=nbdevdn)
        else:
            # 简单的布林带回退实现
            middle_band = ohlc_data['close'].rolling(window=timeperiod).mean()
            std = ohlc_data['close'].rolling(window=timeperiod).std()
            upper_band = middle_band + (std * nbdevup)
            lower_band = middle_band - (std * nbdevdn)
            return upper_band, middle_band, lower_band

    def _calculate_golden_indicators(self, ohlc_data: pd.DataFrame) -> Dict:
        """计算黄金专用指标"""
        # 黄金波动率因子
        volatility = ohlc_data['close'].pct_change().rolling(window=20).std() * np.sqrt(252)

        # 跳空因子
        gaps = (ohlc_data['open'] - ohlc_data['close'].shift(1)).abs()
        gap_factor = gaps.rolling(window=10).mean()

        return {
            'volatility': volatility,
            'gap_factor': gap_factor
        }

    def _generate_trades(self, signals: pd.DataFrame, ohlc_data: pd.DataFrame, parameters: Dict) -> List[Dict]:
        """生成交易"""
        trades = []
        position = 0
        entry_price = 0
        entry_time = None

        for i in range(1, len(signals)):
            current_signal = signals.iloc[i]['signal']
            previous_signal = signals.iloc[i-1]['signal']
            current_price = ohlc_data.iloc[i]['close']

            # 检测交易
            if current_signal != previous_signal and current_signal != 0:
                if position == 0:  # 买入
                    position = 1
                    entry_price = current_price
                    entry_time = ohlc_data.index[i]
                else:  # 卖出
                    exit_price = current_price
                    profit = (exit_price - entry_price) / entry_price * 100
                    trades.append({
                        'entry_time': entry_time,
                        'exit_time': ohlc_data.index[i],
                        'entry_price': entry_price,
                        'exit_price': exit_price,
                        'profit': profit,
                        'signal': current_signal
                    })
                    position = 0

        return trades

    def backtest_strategy(self, strategy_name: str, parameters: Dict, initial_capital: float = 100000.0) -> Dict:
        """回测策略"""
        trades = self.execute_strategy(strategy_name, parameters)

        if not trades:
            return {
                'total_return': 0.0,
                'max_drawdown': 0.0,
                'win_rate': 0.0,
                'trades': []
            }

        # 计算回测结果
        total_profit = sum(t['profit'] for t in trades)
        winning_trades = sum(1 for t in trades if t['profit'] > 0)
        win_rate = winning_trades / len(trades) if trades else 0

        # 计算最大回撤（简化版）
        equity = initial_capital
        max_equity = equity
        max_drawdown = 0.0

        for trade in trades:
            equity *= (1 + trade['profit'] / 100)
            max_equity = max(max_equity, equity)
            drawdown = (max_equity - equity) / max_equity
            max_drawdown = max(max_drawdown, drawdown)

        return {
            'total_return': total_profit,
            'max_drawdown': max_drawdown * 100,
            'win_rate': win_rate * 100,
            'trades': trades
        }

    def generate_strategy_code(self, strategy_name: str, parameters: Dict) -> str:
        """生成策略代码"""
        if strategy_name == 'scalping':
            return self._generate_scalping_code(parameters)
        elif strategy_name == 'trend_following':
            return self._generate_trend_following_code(parameters)
        elif strategy_name == 'gold_specific':
            return self._generate_gold_specific_code(parameters)
        else:
            return ""

    def _generate_scalping_code(self, parameters: Dict) -> str:
        """生成剥头皮策略代码"""
        code = f"""
import talib
import pandas as pd

def scalping_strategy(data):
    # 计算MACD
    macd, macdsignal, _ = talib.MACD(data['close'], fastperiod={parameters.get('fastperiod', 12)}, slowperiod={parameters.get('slowperiod', 26)}, signalperiod={parameters.get('signalperiod', 9)})
    rsi = talib.RSI(data['close'], timeperiod={parameters.get('rsi_period', 14)})

    # 生成信号
    signals = pd.DataFrame(index=data.index)
    signals['signal'] = 0

    # MACD交叉信号
    signals.loc[macd > macdsignal, 'signal'] = 1  # 买入信号
    signals.loc[macd < macdsignal, 'signal'] = -1  # 卖出信号

    # RSI过滤
    signals.loc[rsi > {parameters.get('rsi_overbought', 70)}, 'signal'] = 0
    signals.loc[rsi < {parameters.get('rsi_oversold', 30)}, 'signal'] = 0

    return signals
"""
        return code

    def _generate_trend_following_code(self, parameters: Dict) -> str:
        """生成趋势跟踪策略代码（改进突破逻辑）"""
        code = f"""
import talib
import pandas as pd
import numpy as np

def trend_following_strategy(data):
    # 计算布林带
    upper, middle, lower = talib.BBANDS(data['close'], timeperiod={parameters.get('bollinger_period', 20)}, nbdevup={parameters.get('bollinger_dev', 2)}, nbdevdn={parameters.get('bollinger_dev', 2)})

    # 计算ATR（黄金波动率参考）
    atr = talib.ATR(data['high'], data['low'], data['close'], timeperiod={parameters.get('atr_period', 14)})

    # 计算成交量平均值（用于过滤）
    volume_ma = data['volume'].rolling(window=20).mean() if 'volume' in data.columns else pd.Series(1, index=data.index)

    # 计算波动率
    volatility = data['close'].pct_change().rolling(window=20).std()

    signals = pd.DataFrame(index=data.index)
    signals['signal'] = 0
    signals['atr_stop'] = 0.0  # ATR止损参考
    signals['breakout_confirmed'] = False  # 突破是否确认

    # 布林带突破信号（改进版）
    for i in range(1, len(data)):
        current_close = data.iloc[i]['close']
        current_upper = upper.iloc[i]
        current_lower = lower.iloc[i]
        current_atr = atr.iloc[i]
        current_vol_ratio = data.iloc[i]['volume'] / volume_ma.iloc[i] if i < len(volume_ma) else 1
        current_volatility = volatility.iloc[i] if i < len(volatility) else 0

        # 条件1：价格突破布林带
        is_upper_breakout = current_close > current_upper
        is_lower_breakout = current_close < current_lower

        # 条件2：突破确认（前一K线也突破才算确认）
        prev_close = data.iloc[i-1]['close']
        prev_upper = upper.iloc[i-1]
        prev_lower = lower.iloc[i-1]
        prev_is_upper_breakout = prev_close > prev_upper
        prev_is_lower_breakout = prev_close < prev_lower

        # 条件3：成交量过滤（成交量需要较前20日均量放大）
        min_volume_ratio = {parameters.get('min_volume_ratio', 1.2)}
        volume_condition = current_vol_ratio > min_volume_ratio

        # 条件4：波动率过滤（避免在极低波动率时段交易）
        min_volatility = {parameters.get('min_volatility', 0.001)}
        volatility_condition = current_volatility > min_volatility

        # 生成信号
        if is_upper_breakout and prev_is_upper_breakout and volume_condition and volatility_condition:
            signals.iloc[i, signals.columns.get_loc('signal')] = 1  # 确认向上突破买入
            signals.iloc[i, signals.columns.get_loc('atr_stop')] = current_close - {parameters.get('atr_multiplier', 2)} * current_atr  # 基于ATR设置止损
            signals.iloc[i, signals.columns.get_loc('breakout_confirmed')] = True
        elif is_lower_breakout and prev_is_lower_breakout and volume_condition and volatility_condition:
            signals.iloc[i, signals.columns.get_loc('signal')] = -1  # 确认向下突破卖出
            signals.iloc[i, signals.columns.get_loc('atr_stop')] = current_close + {parameters.get('atr_multiplier', 2)} * current_atr  # 基于ATR设置止损
            signals.iloc[i, signals.columns.get_loc('breakout_confirmed')] = True

    return signals
"""
        return code

    def _generate_gold_specific_code(self, parameters: Dict) -> str:
        """生成黄金专用策略代码"""
        code = f"""
import talib
import pandas as pd

def gold_specific_strategy(data):
    # 计算技术指标
    macd, macdsignal, _ = talib.MACD(data['close'], fastperiod=12, slowperiod=26, signalperiod=9)
    rsi = talib.RSI(data['close'], timeperiod=14)

    # 计算布林带
    upper, middle, lower = talib.BBANDS(data['close'], timeperiod=20, nbdevup=2, nbdevdn=2)

    # 生成信号
    signals = pd.DataFrame(index=data.index)
    signals['signal'] = 0

    # MACD交叉信号
    signals.loc[macd > macdsignal, 'signal'] = 1
    signals.loc[macd < macdsignal, 'signal'] = -1

    # RSI过滤
    signals.loc[rsi > 70, 'signal'] = 0
    signals.loc[rsi < 30, 'signal'] = 0

    # 布林带突破信号
    signals.loc[data['close'] > upper, 'signal'] = 1
    signals.loc[data['close'] < lower, 'signal'] = -1

    # 黄金特定时间过滤（亚盘低波动时段）
    signals.loc[data.index.hour.between(8, 14), 'signal'] = 0

    return signals
"""
        return code