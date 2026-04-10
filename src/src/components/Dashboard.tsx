import React, { useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, Alert, Tabs, Spin } from 'antd';
import {
  LineChartOutlined,
  DashboardOutlined,
  FundOutlined,
  SafetyOutlined,
  ApiOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import RealtimeChart from './RealtimeChart';
import StrategyConfigurator from './StrategyConfigurator';
import TradeSignals from './TradeSignals';
import './Dashboard.css';
import { usePerformance, useSystem, useAuth } from '../store';

const { TabPane } = Tabs;

const Dashboard: React.FC = () => {
  const { performance, fetchPerformance } = usePerformance();
  const { healthStatus, isLoading: loading, checkHealth } = useSystem();
  const { authToken } = useAuth();

  useEffect(() => {
    checkHealth();
    fetchPerformance();

    // 每5秒更新性能数据
    const performanceInterval = setInterval(fetchPerformance, 5000);
    // 每30秒检查健康状态
    const healthInterval = setInterval(checkHealth, 30000);

    return () => {
      clearInterval(performanceInterval);
      clearInterval(healthInterval);
    };
  }, [checkHealth, fetchPerformance]);

  const handleTabChange = (key: string) => {
    console.log('切换到标签页:', key);
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Spin size="large" tip="正在加载量化交易系统..." />
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* 顶部状态栏 */}
      <Row gutter={[16, 16]} className="dashboard-header">
        <Col span={24}>
          <div className="dashboard-title">
            <DashboardOutlined style={{ fontSize: '24px', marginRight: '12px' }} />
            <h1>Tick Gold 量化交易系统</h1>
            <div className="dashboard-subtitle">XAUUSD 黄金交易对量化分析平台</div>
          </div>
        </Col>
      </Row>

      {/* 健康状态提示 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
        <Col span={24}>
          <Alert
            message={
              healthStatus === 'healthy'
                ? '系统运行正常，所有服务均可连接'
                : '系统连接异常，部分功能可能受限'
            }
            type={healthStatus === 'healthy' ? 'success' : 'warning'}
            showIcon
            action={
              <Button size="small" onClick={checkHealth}>
                重新检查
              </Button>
            }
          />
        </Col>
      </Row>

      {/* 关键性能指标 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="系统吞吐量"
              value={performance?.throughputTps || 0}
              precision={0}
              suffix="ticks/sec"
              prefix={<ApiOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="处理延迟"
              value={performance?.latencyMs || 0}
              precision={1}
              suffix="ms"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: performance?.latencyMs && performance.latencyMs > 100 ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tick计数器"
              value={performance?.tickCounter || 0}
              prefix={<FundOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="系统运行时间"
              value={performance?.uptimeSeconds ? Math.floor(performance.uptimeSeconds / 3600) : 0}
              precision={1}
              suffix="小时"
              prefix={<SafetyOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 主内容区域 */}
      <Card className="dashboard-content">
        <Tabs defaultActiveKey="1" onChange={handleTabChange} size="large">
          <TabPane
            tab={
              <span>
                <LineChartOutlined />
                实时数据
              </span>
            }
            key="1"
          >
            <RealtimeChart />
          </TabPane>

          <TabPane
            tab={
              <span>
                <FundOutlined />
                策略配置
              </span>
            }
            key="2"
          >
            <StrategyConfigurator />
          </TabPane>

          <TabPane
            tab={
              <span>
                <DashboardOutlined />
                交易信号
              </span>
            }
            key="3"
          >
            <TradeSignals />
          </TabPane>

          <TabPane
            tab={
              <span>
                <SafetyOutlined />
                风险管理
              </span>
            }
            key="4"
          >
            <div className="risk-management">
              <Alert
                message="风险管理模块"
                description="实时监控仓位风险、最大回撤、止损止盈水平"
                type="info"
                showIcon
              />
              <div style={{ marginTop: '20px' }}>
                <p>最大回撤: 2.0%</p>
                <p>最大日亏损: 0.5%</p>
                <p>当前位置大小: 1.0%</p>
                <p>当前PnL: +$1,250.75</p>
              </div>
            </div>
          </TabPane>
        </Tabs>
      </Card>

      {/* 系统信息 */}
      <Row gutter={[16, 16]} style={{ marginTop: '20px' }}>
        <Col span={24}>
          <Card size="small" title="系统信息">
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <div className="system-info-item">
                  <strong>交易品种:</strong> XAUUSD
                </div>
              </Col>
              <Col span={8}>
                <div className="system-info-item">
                  <strong>支持时间周期:</strong> M1, M5, M15, M30
                </div>
              </Col>
              <Col span={8}>
                <div className="system-info-item">
                  <strong>数据源:</strong> MT5 / Dukascopy
                </div>
              </Col>
              <Col span={8}>
                <div className="system-info-item">
                  <strong>认证状态:</strong>
                  <span style={{ color: authToken ? '#52c41a' : '#fa8c16', marginLeft: '8px' }}>
                    {authToken ? '已认证' : '开发模式'}
                  </span>
                </div>
              </Col>
              <Col span={8}>
                <div className="system-info-item">
                  <strong>最后Tick时间:</strong> {performance?.lastTick ? new Date(performance.lastTick).toLocaleString() : '无数据'}
                </div>
              </Col>
              <Col span={8}>
                <div className="system-info-item">
                  <strong>系统版本:</strong> 0.1.0
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;