import asyncio
import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from ..data.gold_data import GoldDataHandler
from ..strategies.gold_strategies import GoldStrategies
from ..compliance.risk import RiskMonitor
from ..compliance.audit import DataAuditor

class GoldExecutor:
    """黄金交易执行器"""

    def __init__(self, data_handler: GoldDataHandler, risk_monitor: RiskMonitor):
        self.data_handler = data_handler
        self.risk_monitor = risk_monitor
        self.strategies = GoldStrategies(data_handler, risk_monitor)
        self.active_trades = []
        self.trade_history = []
        self.running = False

    async def start_trading(self, strategy_name: str, parameters: Dict, mode: str = "simulated"):
        """开始交易"""
        self.running = True
        print(f"Starting {mode} trading with {strategy_name} strategy...")

        while self.running:
            try:
                # 获取最新数据
                ohlc_data = self.data_handler.get_ohlc_data(
                    timeframe=parameters.get('timeframe', 'M1'),
                    period=parameters.get('period', 1000)
                )

                if ohlc_data.empty:
                    await asyncio.sleep(1)
                    continue

                # 执行策略
                trades = self.strategies.execute_strategy(strategy_name, parameters)

                # 处理交易
                await self._process_trades(trades, ohlc_data, mode)

                # 检查风险
                risk_metrics = self.risk_monitor.calculate_risk_metrics(
                    pd.Series([100000] * len(ohlc_data)),  # 简化版权益历史
                    pd.DataFrame()  # 简化版仓位数据
                )
                risk_alerts = self.risk_monitor.check_risk_limits(risk_metrics)

                # 如果有风险警报，暂停交易
                if risk_alerts:
                    print(f"Risk alerts detected: {risk_alerts}")
                    await self._handle_risk_alerts(risk_alerts)

                await asyncio.sleep(1)  # 等待下一周期

            except Exception as e:
                print(f"Error in trading loop: {e}")
                await asyncio.sleep(5)  # 出错后等待5秒

    async def stop_trading(self):
        """停止交易"""
        self.running = False
        print("Stopping trading...")

    async def _process_trades(self, trades: List[Dict], ohlc_data: pd.DataFrame, mode: str):
        """处理交易"""
        for trade in trades:
            if trade['signal'] != 0:  # 有交易信号
                await self._execute_trade(trade, ohlc_data, mode)

    async def _execute_trade(self, trade: Dict, ohlc_data: pd.DataFrame, mode: str):
        """执行交易"""
        signal = trade['signal']
        current_price = ohlc_data.iloc[-1]['close']

        if signal == 1:  # 买入信号
            await self._buy(current_price, mode)
        elif signal == -1:  # 卖出信号
            await self._sell(current_price, mode)

    async def _buy(self, price: float, mode: str):
        """买入"""
        if mode == "simulated":
            # 模拟盘买入
            trade = {
                'type': 'buy',
                'price': price,
                'timestamp': pd.Timestamp.now(),
                'status': 'executed'
            }
            self.active_trades.append(trade)
            self.trade_history.append(trade)
            print(f"Simulated buy at {price:.5f}")

        elif mode == "real":
            # 实盘买入（需要MT5 API）
            print(f"Real buy at {price:.5f}")
            # 这里应该调用MT5 API执行买入

    async def _sell(self, price: float, mode: str):
        """卖出"""
        if mode == "simulated":
            # 模拟盘卖出
            if self.active_trades:
                trade = self.active_trades.pop()
                trade['exit_price'] = price
                trade['exit_timestamp'] = pd.Timestamp.now()
                trade['profit'] = (price - trade['price']) / trade['price'] * 100
                trade['status'] = 'closed'
                self.trade_history.append(trade)
                print(f"Simulated sell at {price:.5f}, profit: {trade['profit']:.2f}%")

        elif mode == "real":
            # 实盘卖出（需要MT5 API）
            print(f"Real sell at {price:.5f}")
            # 这里应该调用MT5 API执行卖出

    async def _handle_risk_alerts(self, risk_alerts: List[Dict]):
        """处理风险警报"""
        # 暂停交易
        await self.stop_trading()

        # 等待风险解除
        print("Trading paused due to risk alerts. Waiting for risk to subside...")
        await asyncio.sleep(60)  # 等待1分钟后重新检查

        # 重新开始交易
        if self.running:
            print("Resuming trading...")
            # 这里应该重新启动交易循环

    def get_trade_history(self) -> List[Dict]:
        """获取交易历史"""
        return self.trade_history

    def get_active_trades(self) -> List[Dict]:
        """获取活跃交易"""
        return self.active_trades

    def get_performance_metrics(self) -> Dict:
        """获取性能指标"""
        if not self.trade_history:
            return {}

        trades = self.trade_history
        winning_trades = [t for t in trades if t.get('profit', 0) > 0]
        losing_trades = [t for t in trades if t.get('profit', 0) < 0]

        return {
            'total_trades': len(trades),
            'winning_trades': len(winning_trades),
            'losing_trades': len(losing_trades),
            'win_rate': len(winning_trades) / len(trades) * 100 if trades else 0,
            'average_profit': np.mean([t.get('profit', 0) for t in trades]) if trades else 0,
            'average_loss': np.mean([t.get('profit', 0) for t in losing_trades]) if losing_trades else 0,
            'profit_factor': abs(np.mean([t.get('profit', 0) for t in winning_trades]) / np.mean([t.get('profit', 0) for t in losing_trades])) if losing_trades else float('inf')
        }

    def export_trading_data(self, filename: str) -> bool:
        """导出交易数据"""
        if not self.trade_history:
            return False

        df = pd.DataFrame(self.trade_history)
        df.to_csv(filename, index=False)
        return True

    def generate_trading_report(self) -> str:
        """生成交易报告"""
        metrics = self.get_performance_metrics()
        report = f"""
=== 交易报告 ===
总交易次数: {metrics['total_trades']}
盈利交易: {metrics['winning_trades']}
亏损交易: {metrics['losing_trades']}
胜率: {metrics['win_rate']:.2f}%
平均盈利: {metrics['average_profit']:.2f}%
平均亏损: {metrics['average_loss']:.2f}%
盈亏比: {metrics['profit_factor']:.2f}

=== 活跃交易 ===
{len(self.active_trades)} 个活跃交易

=== 最近交易 ===
{self._format_recent_trades()}
        """
        return report

    def _format_recent_trades(self) -> str:
        """格式化最近交易"""
        if not self.trade_history:
            return "无交易记录"

        recent_trades = self.trade_history[-5:]  # 最近5笔交易
        trade_text = ""
        for trade in recent_trades:
            trade_text += f"- {trade['timestamp']}: {trade['type']} at {trade['price']:.5f}\n"

        return trade_text