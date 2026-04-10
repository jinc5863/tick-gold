import React, { useEffect } from 'react';
import { Row, Col, Statistic, Button, Tabs, Card, Avatar, Badge, Modal, Space, Divider } from 'antd';
import {
  LineChartOutlined,
  FundOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  ApiOutlined,
  SettingOutlined,
  BellOutlined,
  WalletOutlined,
  ClockCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import RealtimeChart from './RealtimeChart';
import StrategyConfigurator from './StrategyConfigurator';
import TradeSignals from './TradeSignals';
import './DashboardUpgraded.css';
import { usePerformance, useSystem, useAuth } from '../store';

const { TabPane } = Tabs;

const DashboardUpgraded: React.FC = () => {
  const { performance, fetchPerformance } = usePerformance();
  const { healthStatus, isLoading: loading, checkHealth } = useSystem();
  const { authToken } = useAuth();

  useEffect(() => {
    checkHealth();
    fetchPerformance();

    const performanceInterval = setInterval(fetchPerformance, 5000);
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
      <div className="dashboard-loading-pro">
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="loading-spinner-pro">
            <LineChartOutlined style={{ fontSize: '48px', color: '#FFD700' }} />
          </div>
        </motion.div>
        <div className="loading-text-pro">正在加载量化交易系统...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-pro">
      {/* 顶部状态栏 - 专业金融风格 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="dashboard-header-pro"
      >
        <Row align="middle">
          <Col span={8}>
            <div className="brand-section">
              <div className="brand-logo">
                <WalletOutlined style={{ fontSize: '28px', color: '#FFD700' }} />
                <div className="brand-text">
                  <h1 className="brand-title">Tick Gold</h1>
                  <div className="brand-subtitle">XAUUSD 量化交易系统</div>
                </div>
              </div>
            </div>
          </Col>
          <Col span={8} className="status-center">
            <div className="system-status">
              <Badge
                status={healthStatus === 'healthy' ? "success" : "error"}
                text={
                  <span className="status-text">
                    {healthStatus === 'healthy' ? '系统运行正常' : '系统连接异常'}
                  </span>
                }
              />
              <span className="separator">|</span>
              <span className="uptime">
                <ClockCircleOutlined /> {performance?.uptimeSeconds ? Math.floor(performance.uptimeSeconds / 3600) : 0}小时
              </span>
              <span className="separator">|</span>
              <span className="auth-status">
                {authToken ? '已认证' : '开发模式'}
              </span>
            </div>
          </Col>
          <Col span={8} className="header-actions">
            <Space size="middle">
              <Button
                type="text"
                icon={<BellOutlined />}
                className="header-action-btn"
              >
                通知
              </Button>
              <Button
                type="text"
                icon={<SettingOutlined />}
                className="header-action-btn"
              >
                设置
              </Button>
              <Avatar
                size="small"
                style={{ backgroundColor: '#FFD700', color: '#000' }}
              >
                TG
              </Avatar>
            </Space>
          </Col>
        </Row>
      </motion.div>

      {/* 性能指标卡片组 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="performance-grid-pro"
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <motion.div whileHover={{ y: -5, scale: 1.02 }}>
              <Card className="perf-card throughput">
                <div className="perf-icon">
                  <ApiOutlined />
                </div>
                <Statistic
                  title="系统吞吐量"
                  value={performance?.throughputTps || 21340}
                  precision={0}
                  suffix="ticks/sec"
                  valueStyle={{
                    color: '#10B981',
                    fontSize: '24px',
                    fontWeight: 600
                  }}
                />
                <div className="perf-trend trending-up">
                  <span>+2.5%</span>
                </div>
              </Card>
            </motion.div>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <motion.div whileHover={{ y: -5, scale: 1.02 }}>
              <Card className="perf-card latency">
                <div className="perf-icon">
                  <ThunderboltOutlined />
                </div>
                <Statistic
                  title="处理延迟"
                  value={performance?.latencyMs || 15.2}
                  precision={1}
                  suffix="ms"
                  valueStyle={{
                    color: performance?.latencyMs && performance.latencyMs > 100 ? '#EF4444' : '#10B981',
                    fontSize: '24px',
                    fontWeight: 600
                  }}
                />
                <div className="perf-trend trending-down">
                  <span>-1.2%</span>
                </div>
              </Card>
            </motion.div>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <motion.div whileHover={{ y: -5, scale: 1.02 }}>
              <Card className="perf-card tick-count">
                <div className="perf-icon">
                  <FundOutlined />
                </div>
                <Statistic
                  title="Tick计数器"
                  value={performance?.tickCounter || 1245670}
                  valueStyle={{
                    color: '#3B82F6',
                    fontSize: '24px',
                    fontWeight: 600
                  }}
                />
                <div className="perf-trend trending-up">
                  <span>+3.8%</span>
                </div>
              </Card>
            </motion.div>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <motion.div whileHover={{ y: -5, scale: 1.02 }}>
              <Card className="perf-card memory">
                <div className="perf-icon">
                  <SafetyOutlined />
                </div>
                <Statistic
                  title="内存使用率"
                  value={85.5}
                  precision={1}
                  suffix="%"
                  valueStyle={{
                    color: 85.5 > 90 ? '#EF4444' : '#F59E0B',
                    fontSize: '24px',
                    fontWeight: 600
                  }}
                />
                <div className="perf-trend trending-stable">
                  <span>稳定</span>
                </div>
              </Card>
            </motion.div>
          </Col>
        </Row>
      </motion.div>

      {/* 主内容区域 */}
      <div className="main-content-pro">
        <Tabs
          defaultActiveKey="1"
          onChange={handleTabChange}
          className="pro-tabs"
          size="large"
          tabBarExtraContent={
            <Button
              type="text"
              icon={<SyncOutlined spin />}
              onClick={fetchPerformance}
              loading={loading}
            >
              实时更新
            </Button>
          }
        >
          <TabPane
            tab={
              <div className="tab-label">
                <LineChartOutlined />
                <span>实时数据</span>
              </div>
            }
            key="1"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="chart-container-pro">
                <RealtimeChart />
              </Card>
            </motion.div>
          </TabPane>

          <TabPane
            tab={
              <div className="tab-label">
                <SettingOutlined />
                <span>策略配置</span>
                <Badge count={3} size="small" />
              </div>
            }
            key="2"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="strategy-container-pro">
                <StrategyConfigurator />
              </Card>
            </motion.div>
          </TabPane>

          <TabPane
            tab={
              <div className="tab-label">
                <FundOutlined />
                <span>交易信号</span>
                <Badge count={15} size="small" />
              </div>
            }
            key="3"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="signals-container-pro">
                <TradeSignals />
              </Card>
            </motion.div>
          </TabPane>

          <TabPane
            tab={
              <div className="tab-label">
                <SafetyOutlined />
                <span>风险管理</span>
              </div>
            }
            key="4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="risk-container-pro">
                <div className="risk-content">
                  <h3>实时风险监控</h3>
                  <Divider />
                  <div className="risk-metrics">
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <Statistic
                          title="最大回撤"
                          value={2.0}
                          suffix="%"
                          valueStyle={{ color: '#10B981' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="最大日亏损"
                          value={0.5}
                          suffix="%"
                          valueStyle={{ color: '#F59E0B' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="当前位置大小"
                          value={1.0}
                          suffix="%"
                          valueStyle={{ color: '#3B82F6' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="当前PnL"
                          value={1250.75}
                          prefix="$"
                          precision={2}
                          valueStyle={{ color: '#10B981' }}
                        />
                      </Col>
                    </Row>
                  </div>
                  <Divider />
                  <div className="risk-warnings">
                    <div className="warning-item low">
                      <span>• 跳空风险正常 (0.8%)</span>
                    </div>
                    <div className="warning-item medium">
                      <span>• 隔夜风险升高 (0.4%)</span>
                    </div>
                    <div className="warning-item low">
                      <span>• 流动性正常</span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </TabPane>
        </Tabs>
      </div>

      {/* 底部信息栏 */}
      <div className="footer-pro">
        <Row align="middle">
          <Col span={12}>
            <div className="system-info">
              <span>交易品种: XAUUSD</span>
              <span className="separator">|</span>
              <span>支持周期: M1, M5, M15, M30</span>
              <span className="separator">|</span>
              <span>数据源: MT5 / Dukascopy</span>
            </div>
          </Col>
          <Col span={12} className="footer-right">
            <div className="version-info">
              <span className="version">v0.1.0 ULTRA</span>
              <span className="last-tick">
                最后Tick: {performance?.lastTick ? new Date(performance.lastTick).toLocaleTimeString() : '无数据'}
              </span>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default DashboardUpgraded;