import pytest
import pandas as pd
import numpy as np
from src.compliance.risk import RiskMonitor

class TestRiskMonitor:
    """风险监控测试类"""

    @pytest.fixture
    def sample_equity_history(self):
        """生成示例权益历史数据"""
        dates = pd.date_range(start='2023-01-01', periods=100, freq='1min')
        equity = 100000 * (1 + np.random.normal(0, 0.001, 100).cumsum())
        return pd.Series(equity, index=dates)

    @pytest.fixture
    def sample_positions(self):
        """生成示例仓位数据"""
        dates = pd.date_range(start='2023-01-01', periods=100, freq='1min')
        positions = pd.DataFrame({
            'timestamp': dates,
            'symbol': ['XAUUSD'] * 100,
            'volume': np.random.randint(1, 10, 100),
            'price': np.random.uniform(2300, 2400, 100)
        })
        positions['value'] = positions['volume'] * positions['price']
        return positions

    def test_risk_metrics_calculation(self, sample_equity_history, sample_positions):
        """测试风险指标计算"""
        risk_monitor = RiskMonitor(initial_capital=100000)

        # 计算风险指标
        risk_metrics = risk_monitor.calculate_risk_metrics(sample_equity_history, sample_positions)

        # 验证输出结构
        assert isinstance(risk_metrics, dict)
        assert 'timestamp' in risk_metrics
        assert 'drawdown' in risk_metrics
        assert 'daily_loss' in risk_metrics
        assert 'position_risk' in risk_metrics
        assert 'gap_risk' in risk_metrics
        assert 'overnight_risk' in risk_metrics

        # 验证数据类型
        assert isinstance(risk_metrics['drawdown'], float)
        assert isinstance(risk_metrics['daily_loss'], float)
        assert isinstance(risk_metrics['position_risk'], float)
        assert isinstance(risk_metrics['gap_risk'], float)
        assert isinstance(risk_metrics['overnight_risk'], float)

        # 验证数值范围
        assert -1 <= risk_metrics['drawdown'] <= 0
        assert -1 <= risk_metrics['daily_loss'] <= 1
        assert 0 <= risk_metrics['position_risk'] <= 1
        assert 0 <= risk_metrics['gap_risk'] <= 1
        assert 0 <= risk_metrics['overnight_risk'] <= 1

    def test_risk_limits_checking(self, sample_equity_history, sample_positions):
        """测试风险限制检查"""
        risk_monitor = RiskMonitor(initial_capital=100000)

        # 计算风险指标
        risk_metrics = risk_monitor.calculate_risk_metrics(sample_equity_history, sample_positions)

        # 检查风险限制
        alerts = risk_monitor.check_risk_limits(risk_metrics)

        # 验证输出结构
        assert isinstance(alerts, list)
        if alerts:
            assert all(isinstance(alert, dict) for alert in alerts)
            assert all('type' in alert for alert in alerts)
            assert all('severity' in alert for alert in alerts)
            assert all('message' in alert for alert in alerts)
            assert all('timestamp' in alert for alert in alerts)

    def test_risk_parameters_adjustment(self, sample_equity_history, sample_positions):
        """测试风险参数调整"""
        risk_monitor = RiskMonitor(initial_capital=100000)

        # 调整风险参数
        new_params = {
            'max_drawdown': 0.03,  # 增加到3%
            'max_daily_loss': 0.01,  # 增加到1%
            'position_size': 0.02   # 增加到2%
        }
        risk_monitor.adjust_risk_parameters(new_params)

        # 验证参数已更新
        assert risk_monitor.risk_parameters['max_drawdown'] == 0.03
        assert risk_monitor.risk_parameters['max_daily_loss'] == 0.01
        assert risk_monitor.risk_parameters['position_size'] == 0.02

    def test_risk_report_generation(self, sample_equity_history, sample_positions):
        """测试风险报告生成"""
        risk_monitor = RiskMonitor(initial_capital=100000)

        # 计算风险指标
        risk_metrics = risk_monitor.calculate_risk_metrics(sample_equity_history, sample_positions)

        # 生成风险报告
        report = risk_monitor.generate_risk_report()

        # 验证报告内容
        assert isinstance(report, str)
        assert '风险监控报告' in report
        assert '当前风险状态' in report
        assert '风险限制' in report
        assert '风险警报' in report

    def test_risk_monitor_initialization(self):
        """测试风险监控初始化"""
        # 测试默认参数
        risk_monitor = RiskMonitor()
        assert risk_monitor.initial_capital == 100000.0
        assert risk_monitor.risk_parameters['max_drawdown'] == 0.02

        # 测试自定义参数
        custom_params = {
            'max_drawdown': 0.05,
            'max_daily_loss': 0.01,
            'position_size': 0.03
        }
        risk_monitor = RiskMonitor(initial_capital=50000, risk_parameters=custom_params)
        assert risk_monitor.initial_capital == 50000.0
        assert risk_monitor.risk_parameters['max_drawdown'] == 0.05
        assert risk_monitor.risk_parameters['max_daily_loss'] == 0.01
        assert risk_monitor.risk_parameters['position_size'] == 0.03

    def test_risk_metrics_with_extreme_values(self, sample_equity_history, sample_positions):
        """测试极端值情况"""
        risk_monitor = RiskMonitor(initial_capital=100000)

        # 创建极端权益历史（大幅下跌）
        extreme_equity = sample_equity_history.copy()
        extreme_equity.iloc[-1] = extreme_equity.iloc[0] * 0.5  # 最后一个值下跌50%

        # 计算风险指标
        risk_metrics = risk_monitor.calculate_risk_metrics(extreme_equity, sample_positions)

        # 验证回撤计算
        assert risk_metrics['drawdown'] < -0.4  # 应该有大的负回撤

        # 检查风险限制
        alerts = risk_monitor.check_risk_limits(risk_metrics)
        assert len(alerts) > 0  # 应该有风险警报

    def test_risk_monitor_reset(self, sample_equity_history, sample_positions):
        """测试风险监控重置"""
        risk_monitor = RiskMonitor(initial_capital=100000)

        # 计算风险指标
        risk_metrics = risk_monitor.calculate_risk_metrics(sample_equity_history, sample_positions)

        # 检查风险限制
        alerts1 = risk_monitor.check_risk_limits(risk_metrics)
        risk_monitor.risk_alerts = []  # 手动清空警报

        # 再次检查（应该没有警报）
        alerts2 = risk_monitor.check_risk_limits(risk_metrics)
        assert len(alerts2) == 0

    def test_risk_monitor_consistency(self, sample_equity_history, sample_positions):
        """测试风险监控一致性"""
        risk_monitor = RiskMonitor(initial_capital=100000)

        # 多次计算风险指标，结果应该一致
        risk_metrics1 = risk_monitor.calculate_risk_metrics(sample_equity_history, sample_positions)
        risk_metrics2 = risk_monitor.calculate_risk_metrics(sample_equity_history, sample_positions)

        assert risk_metrics1 == risk_metrics2

        # 多次检查风险限制，结果应该一致
        alerts1 = risk_monitor.check_risk_limits(risk_metrics1)
        alerts2 = risk_monitor.check_risk_limits(risk_metrics2)

        assert alerts1 == alerts2