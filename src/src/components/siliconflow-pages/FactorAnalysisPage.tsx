import React from 'react';
import { Card, Row, Col, Statistic, Tag, Progress, Alert, Button } from 'antd';
import { motion } from 'framer-motion';

const FactorAnalysisPage: React.FC = () => {
  return (
    <div className="siliconflow-page factoranalysis-page">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Card className="chart-container-silicon" title="🔬 因子分析引擎">
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
                <Progress percent={87} status="active" style={{ marginTop: 12 }} />
                <Button type="dashed" size="small" block style={{ marginTop: 8 }}>
                  详细分析
                </Button>
              </Card>
            </Col>
            <Col span={8}>
              <Card title="📊 基本因子" size="small">
                <Tag color="cyan">季节性</Tag>
                <Tag color="magenta">地缘政治</Tag>
                <Tag color="gold">央行政策</Tag>
                <Progress percent={72} status="active" style={{ marginTop: 12 }} />
                <Button type="dashed" size="small" block style={{ marginTop: 8 }}>
                  详细分析
                </Button>
              </Card>
            </Col>
            <Col span={8}>
              <Card title="⚡ 时序因子" size="small">
                <Tag color="lime">自回归</Tag>
                <Tag color="volcano">移动平均</Tag>
                <Tag color="geekblue">协方差</Tag>
                <Progress percent={94} status="active" style={{ marginTop: 12 }} />
                <Button type="dashed" size="small" block style={{ marginTop: 8 }}>
                  详细分析
                </Button>
              </Card>
            </Col>
          </Row>

          {/* 因子绩效分析 */}
          <div style={{ marginTop: 24 }}>
            <h4>📊 因子绩效分析</h4>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card title="📈 最佳表现因子">
                  <Statistic title="夏普比率" value={2.15} />
                  <Statistic title="年化收益" value={28.7} suffix="%" />
                  <Statistic title="最大回撤" value={4.2} suffix="%" />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="📊 相关性分析">
                  <Tag color="green">高相关性: 0.87</Tag>
                  <Tag color="orange">中相关性: 0.45</Tag>
                  <Tag color="red">负相关性: -0.32</Tag>
                  <div style={{ marginTop: 12 }}>
                    <Progress percent={87} strokeColor="#10B981" />
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>技术因子相关性</div>
                  </div>
                </Card>
              </Col>
            </Row>
          </div>

          {/* 黄金专用因子 */}
          <div style={{ marginTop: 24 }}>
            <h4>💰 黄金专用因子</h4>
            <Card>
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <Tag color="gold">美元指数</Tag>
                  <div>影响力: 高</div>
                </Col>
                <Col span={6}>
                  <Tag color="gold">通胀预期</Tag>
                  <div>影响力: 高</div>
                </Col>
                <Col span={6}>
                  <Tag color="gold">避险情绪</Tag>
                  <div>影响力: 中</div>
                </Col>
                <Col span={6}>
                  <Tag color="gold">央行储备</Tag>
                  <div>影响力: 中</div>
                </Col>
              </Row>
              <div style={{ marginTop: 16 }}>
                <Button type="primary" size="middle">
                  启动黄金因子分析
                </Button>
              </div>
            </Card>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default FactorAnalysisPage;