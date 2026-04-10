import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json

class RiskMonitor:
    """风险监控类"""

    def __init__(self, initial_capital: float = 100000.0, risk_parameters: dict = None):
        self.initial_capital = initial_capital
        self.risk_parameters = risk_parameters or {
            'max_drawdown': 0.02,  # 最大回撤2%
            'max_daily_loss': 0.005,  # 每日最大亏损0.5%
            'position_size': 0.01,  # 仓位大小1%
            'stop_loss': 0.005,  # 止损0.5%
            'take_profit': 0.01,  # 止盈1%
            'gap_risk': 0.01,  # 跳空风险容忍度1%
            'overnight_risk': 0.005  # 隔夜风险0.5%
        }
        self.current_risk_state = {
            'drawdown': 0.0,
            'daily_loss': 0.0,
            'position_risk': 0.0,
            'gap_risk': 0.0,
            'overnight_risk': 0.0
        }
        self.daily_start_equity = initial_capital
        self.risk_alerts = []

    def calculate_risk_metrics(self, equity_history: pd.Series, positions: pd.DataFrame) -> dict:
        """计算风险指标"""
        risk_metrics = {
            'timestamp': datetime.now().isoformat(),
            'drawdown': self._calculate_drawdown(equity_history),
            'daily_loss': self._calculate_daily_loss(equity_history),
            'position_risk': self._calculate_position_risk(positions),
            'gap_risk': self._calculate_gap_risk(),
            'overnight_risk': self._calculate_overnight_risk()
        }

        # 更新当前风险状态
        self.current_risk_state = risk_metrics

        return risk_metrics

    def _calculate_drawdown(self, equity_history: pd.Series) -> float:
        """计算回撤"""
        if len(equity_history) == 0:
            return 0.0

        peak_equity = equity_history.cummax()
        current_drawdown = (equity_history.iloc[-1] - peak_equity.iloc[-1]) / peak_equity.iloc[-1]
        return current_drawdown

    def _calculate_daily_loss(self, equity_history: pd.Series) -> float:
        """计算当日亏损"""
        if len(equity_history) == 0:
            return 0.0

        today = datetime.now().date()
        today_data = equity_history[equity_history.index.date == today]

        if len(today_data) == 0:
            return 0.0

        daily_return = (today_data.iloc[-1] - today_data.iloc[0]) / today_data.iloc[0]
        return daily_return

    def _calculate_position_risk(self, positions: pd.DataFrame) -> float:
        """计算仓位风险"""
        if len(positions) == 0:
            return 0.0

        total_position_value = positions['value'].sum()
        risk_percentage = total_position_value / self.initial_capital
        return risk_percentage

    def _calculate_gap_risk(self) -> float:
        """计算跳空风险"""
        # 这里应该根据实时数据计算跳空风险
        # 简化版本：假设当前跳空风险为0
        return 0.0

    def _calculate_overnight_risk(self) -> float:
        """计算隔夜风险"""
        # 这里应该根据隔夜持仓计算风险
        # 简化版本：假设当前隔夜风险为0
        return 0.0

    def check_risk_limits(self, risk_metrics: dict) -> list:
        """检查风险限制"""
        alerts = []

        # 检查回撤限制
        if risk_metrics['drawdown'] > self.risk_parameters['max_drawdown']:
            alerts.append({
                'type': 'drawdown',
                'severity': 'high',
                'message': f'回撤超过限制: {risk_metrics["drawdown"]:.2%} > {self.risk_parameters["max_drawdown"]:.2%}',
                'timestamp': risk_metrics['timestamp']
            })

        # 检查当日亏损限制
        if risk_metrics['daily_loss'] < -self.risk_parameters['max_daily_loss']:
            alerts.append({
                'type': 'daily_loss',
                'severity': 'medium',
                'message': f'当日亏损超过限制: {risk_metrics["daily_loss"]:.2%} < -{self.risk_parameters["max_daily_loss"]:.2%}',
                'timestamp': risk_metrics['timestamp']
            })

        # 检查仓位风险
        if risk_metrics['position_risk'] > self.risk_parameters['position_size']:
            alerts.append({
                'type': 'position_risk',
                'severity': 'medium',
                'message': f'仓位风险超过限制: {risk_metrics["position_risk"]:.2%} > {self.risk_parameters["position_size"]:.2%}',
                'timestamp': risk_metrics['timestamp']
            })

        # 检查跳空风险
        if risk_metrics['gap_risk'] > self.risk_parameters['gap_risk']:
            alerts.append({
                'type': 'gap_risk',
                'severity': 'high',
                'message': f'跳空风险超过限制: {risk_metrics["gap_risk"]:.2%} > {self.risk_parameters["gap_risk"]:.2%}',
                'timestamp': risk_metrics['timestamp']
            })

        # 检查隔夜风险
        if risk_metrics['overnight_risk'] > self.risk_parameters['overnight_risk']:
            alerts.append({
                'type': 'overnight_risk',
                'severity': 'medium',
                'message': f'隔夜风险超过限制: {risk_metrics["overnight_risk"]:.2%} > {self.risk_parameters["overnight_risk"]:.2%}',
                'timestamp': risk_metrics['timestamp']
            })

        # 记录风险警报
        self.risk_alerts.extend(alerts)

        return alerts

    def generate_risk_report(self) -> str:
        """生成风险报告"""
        report = f"""
=== 风险监控报告 ===
监控时间: {datetime.now().isoformat()}
初始资金: ${self.initial_capital:,.2f}

=== 当前风险状态 ===
回撤: {self.current_risk_state['drawdown']:.2%}
当日亏损: {self.current_risk_state['daily_loss']:.2%}
仓位风险: {self.current_risk_state['position_risk']:.2%}
跳空风险: {self.current_risk_state['gap_risk']:.2%}
隔夜风险: {self.current_risk_state['overnight_risk']:.2%}

=== 风险限制 ===
最大回撤: {self.risk_parameters['max_drawdown']:.2%}
每日最大亏损: {self.risk_parameters['max_daily_loss']:.2%}
仓位大小: {self.risk_parameters['position_size']:.2%}
跳空风险容忍度: {self.risk_parameters['gap_risk']:.2%}
隔夜风险容忍度: {self.risk_parameters['overnight_risk']:.2%}

=== 风险警报 ===
{self._format_alerts()}
        """
        return report

    def _format_alerts(self) -> str:
        """格式化风险警报"""
        if not self.risk_alerts:
            return "无风险警报"

        alert_text = ""
        for alert in self.risk_alerts[-10:]:  # 只显示最近10条警报
            alert_text += f"- {alert['timestamp']}: {alert['message']}\n"

        return alert_text

    def adjust_risk_parameters(self, new_parameters: dict):
        """调整风险参数"""
        self.risk_parameters.update(new_parameters)