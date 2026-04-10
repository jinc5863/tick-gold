import pandas as pd
import numpy as np
from .strategies import TradingStrategies
from .indicators import TechnicalIndicators

class BacktestEngine:
    """回测引擎类"""

    def __init__(self, data: pd.DataFrame, initial_capital: float = 100000.0):
        self.data = data.copy()
        self.initial_capital = initial_capital
        self.results = None

    def run_backtest(self, strategy_func, strategy_params: dict = None):
        """运行回测"""
        if strategy_params is None:
            strategy_params = {}

        # 生成交易信号
        signals = strategy_func(self.data, strategy_params)

        # 初始化持仓和资金
        position = 0
        cash = self.initial_capital
        equity = []

        # 执行回测
        for i in range(len(self.data)):
            current_signal = signals.iloc[i]['signal']
            current_price = self.data.iloc[i]['close']

            # 买入信号
            if current_signal == 1 and position == 0:
                position = cash / current_price
                cash = 0

            # 卖出信号
            elif current_signal == -1 and position > 0:
                cash = position * current_price
                position = 0

            # 计算当前权益
            current_equity = cash + position * current_price
            equity.append(current_equity)

        # 添加权益列
        self.data['equity'] = equity

        # 计算回测指标
        self._calculate_metrics()

        return self.results

    def _calculate_metrics(self):
        """计算回测指标"""
        if 'equity' not in self.data.columns:
            return

        equity = self.data['equity']
        returns = equity.pct_change().fillna(0)

        # 基本指标
        total_return = (equity.iloc[-1] / self.initial_capital - 1) * 100
        annual_return = total_return / (len(self.data) / 252)  # 假设252个交易日
        max_drawdown = (equity / equity.cummax() - 1).min() * 100
        sharpe_ratio = returns.mean() / returns.std() * np.sqrt(252)

        # 交易统计
        trades = self._calculate_trades()
        win_rate = trades['wins'] / (trades['wins'] + trades['losses']) if (trades['wins'] + trades['losses']) > 0 else 0
        profit_factor = trades['total_win'] / trades['total_loss'] if trades['total_loss'] > 0 else float('inf')

        self.results = {
            'total_return': total_return,
            'annual_return': annual_return,
            'max_drawdown': max_drawdown,
            'sharpe_ratio': sharpe_ratio,
            'win_rate': win_rate,
            'profit_factor': profit_factor,
            'trades': trades
        }

    def _calculate_trades(self):
        """计算交易统计"""
        signals = self.data['signal']
        prices = self.data['close']

        trades = {
            'wins': 0,
            'losses': 0,
            'total_win': 0.0,
            'total_loss': 0.0
        }

        in_position = False
        entry_price = 0
        entry_time = None

        for i in range(1, len(signals)):
            current_signal = signals.iloc[i]
            previous_signal = signals.iloc[i-1]

            # 检测交易
            if current_signal != previous_signal and current_signal != 0:
                if in_position:
                    # 卖出
                    exit_price = prices.iloc[i]
                    profit = (exit_price - entry_price) / entry_price * 100

                    if profit > 0:
                        trades['wins'] += 1
                        trades['total_win'] += profit
                    else:
                        trades['losses'] += 1
                        trades['total_loss'] += abs(profit)

                    in_position = False
                else:
                    # 买入
                    entry_price = prices.iloc[i]
                    in_position = True

        return trades

    def generate_report(self):
        """生成回测报告"""
        if self.results is None:
            return "No backtest results available"

        report = f"""
=== 回测报告 ===
初始资金: ${self.initial_capital:,.2f}
最终资金: ${self.data['equity'].iloc[-1]:,.2f}

=== 性能指标 ===
总收益率: {self.results['total_return']:.2f}%
年化收益率: {self.results['annual_return']:.2f}%
最大回撤: {self.results['max_drawdown']:.2f}%
夏普比率: {self.results['sharpe_ratio']:.2f}

=== 交易统计 ===
胜率: {self.results['win_rate']:.2%}
盈亏比: {self.results['profit_factor']:.2f}
总交易次数: {self.results['trades']['wins'] + self.results['trades']['losses']}
盈利交易: {self.results['trades']['wins']}
亏损交易: {self.results['trades']['losses']}

=== 盈亏分布 ===
总盈利: ${self.results['trades']['total_win']:.2f}
总亏损: ${self.results['trades']['total_loss']:.2f}
        """
        return report