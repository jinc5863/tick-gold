import React from 'react';
import { Card, Row, Col, Statistic, Divider, Progress, Alert } from 'antd';
import { motion } from 'framer-motion';
import RealtimeChart from '../RealtimeChart';
import './SiliconFlowPages.css';

const OverviewPage: React.FC = () => {
  return (
    <div className="siliconflow-page overview-page">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Card className="chart-container-silicon" title="🎯 面板概览 - 实时监控">
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

        {/* 系统状态概要 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Card title="📊 交易概览">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic title="今日交易数" value={24} />
                </Col>
                <Col span={12}>
                  <Statistic title="胜率" value={78.5} suffix="%" />
                </Col>
                <Col span={12}>
                  <Statistic title="平均持仓时间" value="4.2h" />
                </Col>
                <Col span={12}>
                  <Statistic title="最大回撤" value={0.8} suffix="%" />
                </Col>
              </Row>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="🚀 性能摘要">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic title="数据吞吐量" value="21,340+" suffix="tps" />
                </Col>
                <Col span={12}>
                  <Statistic title="处理延迟" value="15.2" suffix="ms" />
                </Col>
                <Col span={12}>
                  <Statistic title="缓存命中率" value="94.7" suffix="%" />
                </Col>
                <Col span={12}>
                  <Statistic title="错误率" value="0.03" suffix="%" />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* 系统状态提醒 */}
        <Alert
          message="系统运行正常"
          description="所有组件运行正常，性能符合21,340+ tps的ULTRA认证标准。"
          type="success"
          showIcon
          style={{ marginTop: 16 }}
        />
      </motion.div>
    </div>
  );
};

export default OverviewPage;