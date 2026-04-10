import React from 'react';
import { Card, Row, Col, Statistic, Button, Tag, Alert, Space, Divider } from 'antd';
import { motion } from 'framer-motion';

const SimulationPage: React.FC = () => {
  return (
    <div className="siliconflow-page simulation-page">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Card className="chart-container-silicon" title="🔄 模拟交易 & AI分析">
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
                  <Button type="dashed">导出记录</Button>
                </Space>
              </Card>

              {/* 实时模拟状态 */}
              <div style={{ marginTop: 16 }}>
                <h5>⚡ 实时模拟状态</h5>
                <Card size="small">
                  <Row gutter={[8, 8]}>
                    <Col span={12}>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>运行时间</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>48h 15m</div>
                    </Col>
                    <Col span={12}>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>交易次数</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>124</div>
                    </Col>
                    <Col span={12}>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>平均持仓</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>3.2h</div>
                    </Col>
                    <Col span={12}>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>活跃仓位</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>3</div>
                    </Col>
                  </Row>
                </Card>
              </div>
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
                <Divider />
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button block type="primary">
                    启动AI分析
                  </Button>
                  <Button block type="dashed">
                    查看分析报告
                  </Button>
                </Space>
              </Card>

              {/* AI分析指标 */}
              <div style={{ marginTop: 16 }}>
                <h5>📊 AI分析指标</h5>
                <Card size="small">
                  <Row gutter={[8, 8]}>
                    <Col span={12}>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>买点精准度</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#10B981' }}>89.2%</div>
                    </Col>
                    <Col span={12}>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>卖点精准度</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#10B981' }}>85.7%</div>
                    </Col>
                    <Col span={12}>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>风险预测</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#F59E0B' }}>94.3%</div>
                    </Col>
                    <Col span={12}>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>趋势判断</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#3B82F6' }}>91.8%</div>
                    </Col>
                  </Row>
                </Card>
              </div>
            </Col>
          </Row>

          {/* 模拟交易记录 */}
          <div style={{ marginTop: 24 }}>
            <h4>📋 最近模拟交易记录</h4>
            <Card>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 215, 0, 0.1)' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>时间</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>方向</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>价格</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>盈亏</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { time: '10:23:15', direction: '买入', price: '2,158.42', pnl: '+125.50', status: '盈利' },
                    { time: '10:15:08', direction: '卖出', price: '2,157.88', pnl: '-42.20', status: '亏损' },
                    { time: '09:58:34', direction: '买入', price: '2,156.12', pnl: '+98.70', status: '盈利' },
                    { time: '09:32:11', direction: '卖出', price: '2,154.87', pnl: '+215.40', status: '盈利' },
                    { time: '09:14:56', direction: '买入', price: '2,153.25', pnl: '+185.20', status: '盈利' },
                  ].map((trade, index) => (
                    <tr
                      key={index}
                      style={{
                        borderBottom: '1px solid rgba(255, 215, 0, 0.05)',
                        color: trade.status === '盈利' ? '#10B981' : '#EF4444'
                      }}
                    >
                      <td style={{ padding: '8px' }}>{trade.time}</td>
                      <td style={{ padding: '8px' }}>{trade.direction}</td>
                      <td style={{ padding: '8px' }}>{trade.price}</td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{trade.pnl}</td>
                      <td style={{ padding: '8px' }}>
                        <Tag color={trade.status === '盈利' ? 'green' : 'red'}>
                          {trade.status}
                        </Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Button type="link">查看更多记录</Button>
              </div>
            </Card>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default SimulationPage;