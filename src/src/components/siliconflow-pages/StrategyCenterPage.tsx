import React from 'react';
import { Card, Tabs, Statistic, Button, Row, Col, Tag } from 'antd';
import { motion } from 'framer-motion';
import StrategyConfigurator from '../StrategyConfigurator';

const { TabPane } = Tabs;

const StrategyCenterPage: React.FC = () => {
  return (
    <div className="siliconflow-page strategycenter-page">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Card className="strategy-container-silicon" title="🎮 EA策略中心">
          <Tabs type="card" defaultActiveKey="ea">
            <TabPane tab="EA策略生成" key="ea">
              <StrategyConfigurator />
            </TabPane>
            <TabPane tab="策略配置" key="config">
              <div style={{ padding: 16 }}>
                <h4>⚙️ 策略参数配置</h4>
                <p>多策略组合、风险权重、执行参数</p>

                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                  <Col span={12}>
                    <Card title="🎯 策略组合" size="small">
                      <Statistic title="活跃策略" value={8} />
                      <Statistic title="最大策略数" value={20} />
                      <div style={{ marginTop: 12 }}>
                        <Button type="dashed" block size="small">
                          添加策略
                        </Button>
                      </div>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="⚖️ 风险权重" size="small">
                      <Statistic title="总风险暴露" value={1.2} suffix="%" />
                      <Statistic title="最大单一策略风险" value={0.3} suffix="%" />
                    </Card>
                  </Col>
                </Row>
              </div>
            </TabPane>
            <TabPane tab="风险管理" key="risk">
              <div style={{ padding: 16 }}>
                <h4>🛡️ 风险管理面板</h4>
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Card size="small">
                      <Statistic title="最大回撤" value={2.0} suffix="%" />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small">
                      <Statistic title="止损水平" value={0.5} suffix="%" />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small">
                      <Statistic title="仓位限制" value={3} suffix="手" />
                    </Card>
                  </Col>
                </Row>

                {/* 风险指标 */}
                <div style={{ marginTop: 24 }}>
                  <h5>📊 风险指标</h5>
                  <Row gutter={[16, 16]}>
                    <Col span={6}>
                      <Card size="small" title="波动率">
                        <div style={{ fontSize: 24, fontWeight: 600, color: '#10B981' }}>
                          1.2%
                        </div>
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small" title="夏普比率">
                        <div style={{ fontSize: 24, fontWeight: 600, color: '#10B981' }}>
                          2.15
                        </div>
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small" title="索提诺比率">
                        <div style={{ fontSize: 24, fontWeight: 600, color: '#F59E0B' }}>
                          1.88
                        </div>
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small" title="卡尔玛比率">
                        <div style={{ fontSize: 24, fontWeight: 600, color: '#3B82F6' }}>
                          3.42
                        </div>
                      </Card>
                    </Col>
                  </Row>
                </div>

                {/* 风险控制设置 */}
                <div style={{ marginTop: 24 }}>
                  <h5>⚙️ 风险控制设置</h5>
                  <Card>
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <div style={{ marginBottom: 8 }}>
                          <strong>跳空风险限制：</strong> 1%
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <strong>隔夜风险限制：</strong> 0.5%
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{ marginBottom: 8 }}>
                          <strong>最大单笔损失：</strong> 0.1%
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <strong>每日最大损失：</strong> 0.5%
                        </div>
                      </Col>
                    </Row>
                    <div style={{ marginTop: 16 }}>
                      <Button type="primary">保存风险设置</Button>
                    </div>
                  </Card>
                </div>
              </div>
            </TabPane>
            <TabPane tab="策略仓库" key="warehouse">
              <div style={{ padding: 16 }}>
                <h4>📚 策略仓库</h4>
                <p>已保存的策略模板和配置</p>
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <Col span={6} key={i}>
                      <Card
                        size="small"
                        title={`策略模板 ${i}`}
                        extra={<Tag color="green">已验证</Tag>}
                      >
                        <Statistic title="年化收益" value={15 + i * 2} suffix="%" />
                        <Statistic title="最大回撤" value={2.5} suffix="%" />
                        <Button type="link" size="small" style={{ marginTop: 8 }}>
                          加载
                        </Button>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            </TabPane>
          </Tabs>
        </Card>
      </motion.div>
    </div>
  );
};

export default StrategyCenterPage;