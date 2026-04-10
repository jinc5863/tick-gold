import React from 'react';
import { Card, Row, Col, Statistic, Button, Divider } from 'antd';
import { motion } from 'framer-motion';
import TradeSignals from '../TradeSignals';

const BacktestPage: React.FC = () => {
  return (
    <div className="siliconflow-page backtest-page">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Card className="signals-container-silicon" title="📊 回测分析引擎">
          <div className="backtest-content-silicon">
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

                {/* 回测设置 */}
                <div style={{ marginTop: 16 }}>
                  <h5>⚙️ 回测设置</h5>
                  <Card size="small">
                    <Row gutter={[8, 8]}>
                      <Col span={12}>
                        <div style={{ fontSize: 12, color: '#9CA3AF' }}>起始资金</div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>$100,000</div>
                      </Col>
                      <Col span={12}>
                        <div style={{ fontSize: 12, color: '#9CA3AF' }}>交易成本</div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>0.003%</div>
                      </Col>
                      <Col span={12}>
                        <div style={{ fontSize: 12, color: '#9CA3AF' }}>滑点设置</div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>0.001%</div>
                      </Col>
                      <Col span={12}>
                        <div style={{ fontSize: 12, color: '#9CA3AF' }}>基准指数</div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>XAUUSD</div>
                      </Col>
                    </Row>
                  </Card>
                </div>
              </Col>
              <Col span={12}>
                <h4>📡 交易信号</h4>
                <TradeSignals />
              </Col>
            </Row>

            <Divider />

            {/* 回测结果统计 */}
            <div style={{ marginTop: 24 }}>
              <h4>📈 回测结果统计</h4>
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <Card size="small">
                    <Statistic title="总收益率" value={18.5} suffix="%" />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <Statistic title="年化收益" value={245} suffix="%" />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <Statistic title="交易次数" value={124} />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <Statistic title="胜率" value={78.5} suffix="%" />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <Statistic title="盈亏比" value={2.8} />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <Statistic title="最大连胜" value={15} />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <Statistic title="最大亏损" value={-1.2} suffix="%" />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <Statistic title="恢复因子" value={4.2} />
                  </Card>
                </Col>
              </Row>
            </div>

            {/* 回测报告 */}
            <div style={{ marginTop: 24 }}>
              <h4>📋 详细回测报告</h4>
              <Card>
                <div style={{ marginBottom: 12 }}>
                  <strong>策略评价：</strong> 表现优秀，适合持续运行
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong>稳定性分析：</strong> 回撤控制在2%以内，风险可控
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong>改进建议：</strong> 可以增加亚盘时段过滤，提高胜率
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong>资金曲线：</strong> 稳步增长，无明显大幅回撤
                </div>
                <div style={{ marginTop: 16 }}>
                  <Button type="primary" style={{ marginRight: 8 }}>
                    下载详细报告
                  </Button>
                  <Button>分享结果</Button>
                </div>
              </Card>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default BacktestPage;