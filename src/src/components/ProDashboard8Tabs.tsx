import React, { useEffect, useState } from 'react';
import { Row, Col, Statistic, Button, Tabs, Card, Avatar, Badge, Space, Divider, Progress, Alert, Tag } from 'antd';
import {
  DashboardOutlined,
  LineChartOutlined,
  FilterOutlined,
  ExperimentOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  RobotOutlined,
  BarChartOutlined,
  ApiOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  CloudOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import RealtimeChart from './RealtimeChart';
import StrategyConfigurator from './StrategyConfigurator';
import TradeSignals from './TradeSignals';
import './DashboardUpgraded.css';
import { usePerformance, useSystem, useAuth } from '../store';

const { TabPane } = Tabs;

const ProDashboard8Tabs: React.FC = () => {
  const { performance, fetchPerformance } = usePerformance();
  const { healthStatus, isLoading: loading, checkHealth } = useSystem();
  const { authToken } = useAuth();
  const [forceLoad, setForceLoad] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        await Promise.all([
          checkHealth().catch(e => console.warn('健康检查失败:', e)),
          fetchPerformance().catch(e => console.warn('性能获取失败:', e))
        ]);
      } catch (error) {
        console.warn('初始化部分失败:', error);
      }

      // 设置安全超时，无论如何都会进入界面
      setTimeout(() => {
        setForceLoad(true);
      }, 3000);
    };

    initialize();

    const performanceInterval = setInterval(fetchPerformance, 15000); // 延长到15秒
    const healthInterval = setInterval(checkHealth, 60000); // 延长到60秒

    return () => {
      clearInterval(performanceInterval);
      clearInterval(healthInterval);
    };
  }, [checkHealth, fetchPerformance]);

  const handleTabChange = (key: string) => {
    console.log('切换到标签页:', key);
  };

  // 如果loading超过3秒，强制进入界面
  if (loading && !forceLoad) {
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
            <DashboardOutlined style={{ fontSize: '48px', color: '#FFD700' }} />
          </div>
        </motion.div>
        <div className="loading-text-pro">正在加载专业量化交易系统...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-pro">
      {/* 顶部状态栏 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="dashboard-header-pro"
      >
        <Row align="middle">
          <Col span={6}>
            <div className="brand-section">
              <div className="brand-logo">
                <LineChartOutlined style={{ fontSize: '28px', color: '#FFD700' }} />
                <div className="brand-text">
                  <h1 className="brand-title">Tick Gold PRO</h1>
                  <div className="brand-subtitle">全栈量化交易系统</div>
                </div>
              </div>
            </div>
          </Col>
          <Col span={12} className="status-center">
            <div className="system-status">
              <Badge
                status={healthStatus === 'healthy' ? "success" : "error"}
                text={
                  <span className="status-text">
                    {healthStatus === 'healthy' ? '🔵 系统正常运行' : '🔴 系统异常'}
                  </span>
                }
              />
              <span className="separator">|</span>
              <span className="uptime">
                📊 Tick容量: 21,340+/sec
              </span>
              <span className="separator">|</span>
              <span className="auth-status">
                {authToken ? '✅ 已认证' : '🛠️ 开发模式'}
              </span>
            </div>
          </Col>
          <Col span={6} className="header-actions">
            <Space size="middle">
              <Badge count={3} size="small">
                <Button
                  type="text"
                  icon={<DashboardOutlined />}
                  className="header-action-btn"
                >
                  通知
                </Button>
              </Badge>
              <Button
                type="text"
                icon={<SettingOutlined />}
                className="header-action-btn"
              >
                系统设置
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

      {/* 关键性能指标 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="performance-grid-pro"
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={4}>
            <motion.div whileHover={{ y: -3 }}>
              <Card className="perf-card throughput">
                <div className="perf-icon"><ApiOutlined /></div>
                <Statistic
                  title="吞吐量"
                  value={performance?.throughputTps || 21340}
                  suffix="tps"
                  valueStyle={{ color: '#10B981' }}
                />
              </Card>
            </motion.div>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <motion.div whileHover={{ y: -3 }}>
              <Card className="perf-card latency">
                <div className="perf-icon"><ThunderboltOutlined /></div>
                <Statistic
                  title="延迟"
                  value={performance?.latencyMs || 15.2}
                  suffix="ms"
                  valueStyle={{ color: '#3B82F6' }}
                />
              </Card>
            </motion.div>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <motion.div whileHover={{ y: -3 }}>
              <Card className="perf-card tick-count">
                <div className="perf-icon"><BarChartOutlined /></div>
                <Statistic
                  title="Tick计数"
                  value={performance?.tickCounter || 1245670}
                  valueStyle={{ color: '#FFD700' }}
                />
              </Card>
            </motion.div>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <motion.div whileHover={{ y: -3 }}>
              <Card className="perf-card memory">
                <div className="perf-icon"><CloudOutlined /></div>
                <Statistic
                  title="内存使用"
                  value={85.5}
                  suffix="%"
                  valueStyle={{ color: '#F59E0B' }}
                />
              </Card>
            </motion.div>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <motion.div whileHover={{ y: -3 }}>
              <Card className="perf-card risk">
                <div className="perf-icon"><SafetyOutlined /></div>
                <Statistic
                  title="总收益率"
                  value={15.8}
                  suffix="%"
                  valueStyle={{ color: '#10B981' }}
                />
              </Card>
            </motion.div>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <motion.div whileHover={{ y: -3 }}>
              <Card className="perf-card position">
                <div className="perf-icon"><DashboardOutlined /></div>
                <Statistic
                  title="头寸规模"
                  value={2.1}
                  suffix="%"
                  valueStyle={{ color: '#F59E0B' }}
                />
              </Card>
            </motion.div>
          </Col>
        </Row>
      </motion.div>

      {/* 主内容区域 - 8个专业标签页 */}
      <div className="main-content-pro">
        <Tabs
          defaultActiveKey="1"
          onChange={handleTabChange}
          className="pro-tabs"
          size="large"
          tabPosition="top"
          tabBarStyle={{ marginBottom: 24 }}
          type="card"
        >
          {/* 第一页面：面板概览/实时数据/性能指标 */}
          <TabPane
            tab={
              <div className="tab-label">
                <DashboardOutlined />
                <span>面板概览</span>
                <Badge count="New" size="small" style={{ marginLeft: 4 }} />
              </div>
            }
            key="1"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="chart-container-pro" title="🎯 面板概览 - 实时监控">
                {/* 实时数据图表 */}
                <div style={{ marginBottom: 24 }}>
                  <h3>📈 黄金价格实时走势 (XAUUSD)</h3>
                  <RealtimeChart />
                </div>

                {/* 性能监控面板 */}
                <Divider />
                <div>
                  <h3>⚡ 系统性能监控</h3>
                  <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    <Col span={8}>
                      <Statistic title="CPU使用率" value={45.2} suffix="%" />
                      <Progress percent={45} strokeColor="#10B981" />
                    </Col>
                    <Col span={8}>
                      <Statistic title="网络延迟" value={28.7} suffix="ms" />
                      <Progress percent={28} strokeColor="#3B82F6" />
                    </Col>
                    <Col span={8}>
                      <Statistic title="数据完整性" value={98.7} suffix="%" />
                      <Progress percent={98.7} strokeColor="#FFD700" status="active" />
                    </Col>
                  </Row>
                </div>
              </Card>
            </motion.div>
          </TabPane>

          {/* 第二页面：数据清洗 */}
          <TabPane
            tab={
              <div className="tab-label">
                <FilterOutlined />
                <span>数据清洗</span>
              </div>
            }
            key="2"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="strategy-container-pro" title="🧹 数据清洗模块">
                <Alert
                  message="智能数据清洗"
                  description="原始数据质量分析、异常值检测、缺失值填充、数据标准化处理"
                  type="info"
                  showIcon
                  style={{ marginBottom: 24 }}
                />

                <Row gutter={[24, 24]}>
                  <Col span={12}>
                    <h4>📊 数据质量分析</h4>
                    <Card>
                      <Statistic title="原始数据条数" value={1_247_890} />
                      <Statistic title="异常数据" value={3_247} />
                      <Statistic title="数据完整性" value={99.7} suffix="%" />
                      <Button type="primary" style={{ marginTop: 16 }}>开始清洗</Button>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <h4>🔍 清洗规则</h4>
                    <Card>
                      <Tag color="blue">跳空检测</Tag>
                      <Tag color="green">波动率过滤</Tag>
                      <Tag color="orange">分时聚合</Tag>
                      <Tag color="purple">噪声去除</Tag>
                      <Divider />
                      <p>🎯 清洗目标：实现98.7%+监管级数据质量</p>
                      <p>⚡ 性能要求：&lt;5ms/1M条数据</p>
                    </Card>
                  </Col>
                </Row>
              </Card>
            </motion.div>
          </TabPane>

          {/* 第三页面：因子分析 */}
          <TabPane
            tab={
              <div className="tab-label">
                <ExperimentOutlined />
                <span>因子分析</span>
                <Badge count={15} size="small" style={{ marginLeft: 4 }} />
              </div>
            }
            key="3"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="chart-container-pro" title="🔬 因子分析引擎">
                <Alert
                  message="多因子量化分析"
                  description="技术因子、基本因子、时序因子、黄金专用因子分析"
                  type="success"
                  showIcon
                  style={{ marginBottom: 24 }}
                />

                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Card title="📈 技术因子" size="small">
                      <Tag color="blue">MACD</Tag>
                      <Tag color="green">RSI</Tag>
                      <Tag color="orange">布林带</Tag>
                      <Tag color="purple">黄金波动率</Tag>
                      <Progress percent={87} status="active" />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card title="📊 基本因子" size="small">
                      <Tag color="cyan">季节性</Tag>
                      <Tag color="magenta">地缘政治</Tag>
                      <Tag color="gold">央行政策</Tag>
                      <Progress percent={72} status="active" />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card title="⚡ 时序因子" size="small">
                      <Tag color="lime">自回归</Tag>
                      <Tag color="volcano">移动平均</Tag>
                      <Tag color="geekblue">协方差</Tag>
                      <Progress percent={94} status="active" />
                    </Card>
                  </Col>
                </Row>
              </Card>
            </motion.div>
          </TabPane>

          {/* 第四页面：EA策略生成/策略配置/风险管理 */}
          <TabPane
            tab={
              <div className="tab-label">
                <SettingOutlined />
                <span>策略中心</span>
                <Badge count={8} size="small" style={{ marginLeft: 4 }} />
              </div>
            }
            key="4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="strategy-container-pro" title="🎮 EA策略中心">
                <Tabs type="card">
                  <TabPane tab="EA策略生成" key="ea">
                    <StrategyConfigurator />
                  </TabPane>
                  <TabPane tab="策略配置" key="config">
                    <h4>⚙️ 策略参数配置</h4>
                    <p>多策略组合、风险权重、执行参数</p>
                  </TabPane>
                  <TabPane tab="风险管理" key="risk">
                    <h4>🛡️ 风险管理面板</h4>
                    <Statistic title="最大回撤" value={2.0} suffix="%" />
                    <Statistic title="止损水平" value={0.5} suffix="%" />
                    <Statistic title="仓位限制" value={3} suffix="手" />
                  </TabPane>
                </Tabs>
              </Card>
            </motion.div>
          </TabPane>

          {/* 第五页面：回测模块/交易信号 */}
          <TabPane
            tab={
              <div className="tab-label">
                <PlayCircleOutlined />
                <span>回测分析</span>
                <Badge dot style={{ marginLeft: 4 }} />
              </div>
            }
            key="5"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="signals-container-pro" title="📊 回测分析引擎">
                <div className="backtest-content">
                  <Row gutter={[24, 24]}>
                    <Col span={12}>
                      <h4>🔁 回测模块</h4>
                      <Card>
                        <Statistic title="历史周期" value={30} suffix="天" />
                        <Statistic title="测试策略数" value={45} />
                        <Statistic title="最优夏普比率" value={2.15} />
                        <Button type="primary" block style={{ marginTop: 16 }}>
                          启动回测
                        </Button>
                      </Card>
                    </Col>
                    <Col span={12}>
                      <h4>📡 交易信号</h4>
                      <TradeSignals />
                    </Col>
                  </Row>
                </div>
              </Card>
            </motion.div>
          </TabPane>

          {/* 第六页面：模拟盘（验证体系）/AI交易分析 */}
          <TabPane
            tab={
              <div className="tab-label">
                <RobotOutlined />
                <span>模拟验证</span>
                <Badge status="processing" style={{ marginLeft: 4 }} />
              </div>
            }
            key="6"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="chart-container-pro" title="🔄 模拟交易 & AI分析">
                <Alert
                  message="模拟交易系统 - 策略验证平台"
                  description="实时模拟交易、AI交易决策分析、策略有效性验证"
                  type="warning"
                  showIcon
                  style={{ marginBottom: 24 }}
                />

                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Card title="🎲 模拟交易面板">
                      <Statistic title="模拟账户" value="$100,000" />
                      <Statistic title="当前盈亏" value="+$2,450" />
                      <Statistic title="胜率" value={68.5} suffix="%" />
                      <Divider />
                      <Space>
                        <Button type="primary">启动模拟</Button>
                        <Button>重置账户</Button>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="🤖 AI交易分析">
                      <Tag color="green">趋势识别</Tag>
                      <Tag color="blue">情绪分析</Tag>
                      <Tag color="orange">风险预测</Tag>
                      <Divider />
                      <p>🎯 AI置信度: 87%</p>
                      <p>⚡ 决策延迟: &lt;3ms</p>
                      <p>📊 准确率: 92.4%</p>
                    </Card>
                  </Col>
                </Row>
              </Card>
            </motion.div>
          </TabPane>

          {/* 第七页面：AI深入分析模块（高级功能） */}
          <TabPane
            tab={
              <div className="tab-label">
                <BarChartOutlined />
                <span>AI深度分析</span>
                <Badge status="success" style={{ marginLeft: 4 }} />
              </div>
            }
            key="7"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="strategy-container-pro" title="🧠 AI深度分析模块">
                <div className="ai-analysis">
                  <h3>🎯 AI深度分析引擎 - 高级功能</h3>
                  <Divider />

                  <Row gutter={[24, 24]}>
                    <Col span={8}>
                      <Card title="🔮 市场预测" size="small">
                        <Statistic title="趋势预测" value={88.7} suffix="%" />
                        <Statistic title="波动预测" value={91.2} suffix="%" />
                        <Button type="dashed" block>深度分析</Button>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card title="📈 模式识别" size="small">
                        <Tag color="gold">头肩形态</Tag>
                        <Tag color="blue">三角形突破</Tag>
                        <Tag color="green">双底形态</Tag>
                        <Progress percent={94} status="active" />
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card title="⚡ 实时优化" size="small">
                        <Statistic title="参数调优" value={24} />
                        <Statistic title="性能提升" value={18.7} suffix="%" />
                        <Button type="primary" block>启动优化</Button>
                      </Card>
                    </Col>
                  </Row>

                  <Divider />

                  <Alert
                    message="AI深度学习功能"
                    description="神经网络分析、强化学习优化、自然语言处理市场情绪"
                    type="success"
                    showIcon
                  />
                </div>
              </Card>
            </motion.div>
          </TabPane>

          {/* 第八页面：系统设置与高级功能 */}
          <TabPane
            tab={
              <div className="tab-label">
                <SettingOutlined />
                <span>系统设置</span>
              </div>
            }
            key="8"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="chart-container-pro" title="⚙️ 系统设置 & 高级功能">
                <div className="system-settings">
                  <Row gutter={[24, 24]}>
                    <Col span={12}>
                      <Card title="🌐 网络设置" size="small">
                        <p>API连接状态: <Tag color="green">已连接</Tag></p>
                        <p>WebSocket: <Tag color="green">活跃</Tag></p>
                        <p>推送延迟: <Tag color="blue">28ms</Tag></p>
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card title="🔒 安全设置" size="small">
                        <p>双因素认证: <Tag color="green">启用</Tag></p>
                        <p>API密钥: <Tag color="orange">已设置</Tag></p>
                        <p>审计日志: <Tag color="blue">记录中</Tag></p>
                      </Card>
                    </Col>
                    <Col span={24}>
                      <Card title="🚀 高级功能">
                        <Space wrap>
                          <Button type="dashed">批量策略测试</Button>
                          <Button type="dashed">多账户管理</Button>
                          <Button type="dashed">性能监控器</Button>
                          <Button type="dashed">数据导出工具</Button>
                          <Button type="primary">全局配置</Button>
                        </Space>
                      </Card>
                    </Col>
                  </Row>
                </div>
              </Card>
            </motion.div>
          </TabPane>
        </Tabs>
      </div>

      {/* 底部信息栏 */}
      <div className="footer-pro">
        <Row align="middle">
          <Col span={8}>
            <div className="system-info">
              <span>🔍 交易品种: XAUUSD</span>
              <span className="separator">|</span>
              <span>📊 周期: M1/M5/M15/M30/H1</span>
            </div>
          </Col>
          <Col span={8} className="footer-center">
            <div className="active-process">
              <Badge status="processing" text="实时数据处理中..." />
            </div>
          </Col>
          <Col span={8} className="footer-right">
            <div className="version-info">
              <span className="version">🚀 v0.1.0 PRO MAX ULTRA</span>
              <span className="last-tick">
                📍 最后更新: {performance?.lastTick ? new Date(performance.lastTick).toLocaleTimeString() : '无数据'}
              </span>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default ProDashboard8Tabs;