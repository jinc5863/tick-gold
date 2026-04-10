import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Alert,
  Typography,
  Tag,
  Space,
  Tooltip,
  Modal,
  Button,
  Timeline,
  Slider
} from 'antd';
import {
  SafetyOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  RiseOutlined,
  FallOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  GlobalOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { RiskMetrics } from '../types';
import './RiskMonitor.css';

const { Title, Text, Paragraph } = Typography;

// 黄金专用风险配置
const GOLD_RISK_CONFIG = {
  gapRisk: 0.01,        // 1% 跳空风险
  overnightRisk: 0.005, // 0.5% 隔夜风险
  maxDrawdown: 0.02,    // 2% 最大回撤
  maxDailyLoss: 0.005,  // 0.5% 最大日亏损
  positionSize: 0.01,   // 1% 头寸规模
};

// 模拟风险数据
const generateMockRiskData = (): RiskMetrics => ({
  currentDrawdown: 0.008,
  gapRiskLevel: 0.003,
  overnightRiskLevel: 0.002,
  dailyLoss: 0.0015,
  positionSize: 0.01,
  riskScore: 65,
  volatility: 0.015,
  sharpeRatio: 1.8,
  lastUpdated: new Date().toISOString(),
});

// 风险等级颜色映射
const getRiskLevelColor = (value: number, threshold: number) => {
  const ratio = value / threshold;
  if (ratio < 0.5) return '#52c41a'; // 安全
  if (ratio < 0.8) return '#faad14'; // 警告
  return '#f5222d'; // 危险
};

const RiskMonitor: React.FC = () => {
  const [riskData, setRiskData] = useState<RiskMetrics>(generateMockRiskData());
  const [alerts, setAlerts] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // 模拟数据更新
  useEffect(() => {
    const interval = setInterval(() => {
      // 模拟风险数据变化
      const newData = generateMockRiskData();
      newData.currentDrawdown += (Math.random() - 0.5) * 0.002;
      newData.gapRiskLevel += (Math.random() - 0.5) * 0.001;
      newData.overnightRiskLevel += (Math.random() - 0.5) * 0.001;
      newData.dailyLoss += (Math.random() - 0.5) * 0.0005;
      setRiskData(newData);

      // 检查风险警报
      checkRiskAlerts(newData);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const checkRiskAlerts = (data: RiskMetrics) => {
    const newAlerts: string[] = [];

    if (data.currentDrawdown > GOLD_RISK_CONFIG.maxDrawdown * 0.8) {
      newAlerts.push(`最大回撤接近警戒线: ${(data.currentDrawdown * 100).toFixed(2)}%`);
    }

    if (data.gapRiskLevel > GOLD_RISK_CONFIG.gapRisk * 0.7) {
      newAlerts.push(`跳空风险上升: ${(data.gapRiskLevel * 100).toFixed(2)}%`);
    }

    if (data.overnightRiskLevel > GOLD_RISK_CONFIG.overnightRisk * 0.8) {
      newAlerts.push(`隔夜风险较高: ${(data.overnightRiskLevel * 100).toFixed(2)}%`);
    }

    if (data.dailyLoss > GOLD_RISK_CONFIG.maxDailyLoss * 0.9) {
      newAlerts.push(`接近日亏损上限: ${(data.dailyLoss * 100).toFixed(2)}%`);
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 5));
    }
  };

  const renderRiskProgress = (title: string, value: number, threshold: number, unit: string = '%') => {
    const percent = (value / threshold) * 100;
    const color = getRiskLevelColor(value, threshold);

    return (
      <div className="risk-progress-item">
        <div className="risk-progress-header">
          <Text strong>{title}</Text>
          <Text type="secondary">
            {value > 0 ? '+' : ''}{(value * 100).toFixed(2)}{unit} / 阈值 {(threshold * 100).toFixed(2)}{unit}
          </Text>
        </div>
        <Progress
          percent={Math.min(percent, 100)}
          strokeColor={color}
          showInfo={false}
          status={percent > 80 ? 'exception' : percent > 60 ? 'active' : 'normal'}
        />
        <div className="risk-progress-footer">
          <Tag color={color}>
            {percent < 50 ? '安全' : percent < 80 ? '预警' : '危险'}
          </Tag>
          <Text type="secondary">使用率: {percent.toFixed(1)}%</Text>
        </div>
      </div>
    );
  };

  const renderRiskCard = (title: string, icon: React.ReactNode, value: number, threshold: number, unit: string = '%') => {
    const color = getRiskLevelColor(value, threshold);
    const percent = (value / threshold) * 100;

    return (
      <Col xs={24} sm={12} md={8} lg={6} key={title}>
        <Card size="small" className="risk-card">
          <Statistic
            title={
              <Space>
                {icon}
                <span>{title}</span>
              </Space>
            }
            value={(value * 100).toFixed(2)}
            suffix={unit}
            valueStyle={{
              color,
              fontSize: '20px',
              fontWeight: 'bold'
            }}
          />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            阈值: {(threshold * 100).toFixed(2)}{unit} ({percent.toFixed(1)}%)
          </Text>
        </Card>
      </Col>
    );
  };

  return (
    <div className="risk-monitor">
      {/* 风险警报条 */}
      {alerts.length > 0 && (
        <Alert
          message="风险警报"
          description={
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              {alerts.map((alert, index) => (
                <div key={index}>
                  <ExclamationCircleOutlined style={{ color: '#f5222d', marginRight: 8 }} />
                  {alert}
                </div>
              ))}
            </Space>
          }
          type="warning"
          showIcon
          closable
          onClose={() => setAlerts([])}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 风险概览卡片 */}
      <Card
        title={
          <Space>
            <SafetyOutlined />
            <span>黄金交易风险监控面板</span>
            <Tag color="gold">XAUUSD</Tag>
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="风险配置">
              <Button
                icon={<SettingOutlined />}
                size="small"
                onClick={() => setModalVisible(true)}
              >
                配置
              </Button>
            </Tooltip>
            <Tooltip title="生成风险报告">
              <Button
                icon={<BarChartOutlined />}
                size="small"
                type="primary"
              >
                报告
              </Button>
            </Tooltip>
          </Space>
        }
        className="risk-overview-card"
      >
        <Row gutter={[16, 16]}>
          {/* 顶部风险指标 */}
          {renderRiskCard('跳空风险', <ExclamationCircleOutlined />, riskData.gapRiskLevel, GOLD_RISK_CONFIG.gapRisk)}
          {renderRiskCard('隔夜风险', <ClockCircleOutlined />, riskData.overnightRiskLevel, GOLD_RISK_CONFIG.overnightRisk)}
          {renderRiskCard('最大回撤', <FallOutlined />, riskData.currentDrawdown, GOLD_RISK_CONFIG.maxDrawdown)}
          {renderRiskCard('日亏损', <WarningOutlined />, riskData.dailyLoss, GOLD_RISK_CONFIG.maxDailyLoss)}
          {renderRiskCard('头寸规模', <GlobalOutlined />, riskData.positionSize, GOLD_RISK_CONFIG.positionSize)}
          {renderRiskCard('风险评分', <SafetyOutlined />, riskData.riskScore / 100, 1, '')}
        </Row>

        {/* 风险进度条 */}
        <div className="risk-progress-section">
          <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>
            风险占用进度
          </Title>
          <Row gutter={[24, 16]}>
            <Col span={24} md={12}>
              {renderRiskProgress('跳空风险占用', riskData.gapRiskLevel, GOLD_RISK_CONFIG.gapRisk)}
              {renderRiskProgress('隔夜风险占用', riskData.overnightRiskLevel, GOLD_RISK_CONFIG.overnightRisk)}
            </Col>
            <Col span={24} md={12}>
              {renderRiskProgress('回撤占用', riskData.currentDrawdown, GOLD_RISK_CONFIG.maxDrawdown)}
              {renderRiskProgress('日亏损占用', riskData.dailyLoss, GOLD_RISK_CONFIG.maxDailyLoss)}
            </Col>
          </Row>
        </div>

        {/* 风险状态总结 */}
        <div className="risk-summary">
          <Alert
            message="当前风险状态"
            description={
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text strong>波动率:</Text>
                  <Progress
                    percent={Math.min(riskData.volatility * 1000, 100)}
                    size="small"
                    status={riskData.volatility > 0.02 ? 'exception' : 'normal'}
                  />
                  <Text type="secondary">{(riskData.volatility * 100).toFixed(2)}%</Text>
                </Col>
                <Col span={12}>
                  <Text strong>夏普比率:</Text>
                  <Progress
                    percent={Math.min(riskData.sharpeRatio * 50, 100)}
                    size="small"
                    status={riskData.sharpeRatio > 1.5 ? 'success' : 'normal'}
                  />
                  <Text type="secondary">{riskData.sharpeRatio.toFixed(2)}</Text>
                </Col>
              </Row>
            }
            type={riskData.riskScore > 70 ? 'success' : riskData.riskScore > 40 ? 'warning' : 'error'}
            showIcon
          />
        </div>

        {/* 风险时间线 */}
        <div className="risk-timeline">
          <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>
            风险事件时间线
          </Title>
          <Timeline
            mode="left"
            items={[
              {
                label: '今天 09:30',
                color: 'green',
                children: '风险监控系统启动',
              },
              {
                label: '今天 10:15',
                color: 'blue',
                children: '检测到小幅跳空风险 (0.3%)',
              },
              {
                label: '今天 11:45',
                color: 'orange',
                children: '隔夜风险增加至 0.4%',
              },
              {
                label: '当前',
                color: 'red',
                children: `当前回撤: ${(riskData.currentDrawdown * 100).toFixed(2)}%`,
              },
            ]}
          />
        </div>
      </Card>

      {/* 风险配置模态框 */}
      <Modal
        title="风险参数配置"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            取消
          </Button>,
          <Button key="save" type="primary" onClick={() => setModalVisible(false)}>
            保存配置
          </Button>,
        ]}
      >
        <div className="risk-config-form">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Text strong>跳空风险阈值</Text>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">当前: {(GOLD_RISK_CONFIG.gapRisk * 100).toFixed(1)}%</Text>
                <Slider
                  min={0.1}
                  max={5}
                  step={0.1}
                  defaultValue={GOLD_RISK_CONFIG.gapRisk * 100}
                  marks={{
                    0.1: '0.1%',
                    1: '1%',
                    2: '2%',
                    5: '5%'
                  }}
                />
              </div>
            </div>
            <div>
              <Text strong>隔夜风险阈值</Text>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">当前: {(GOLD_RISK_CONFIG.overnightRisk * 100).toFixed(1)}%</Text>
                <Slider
                  min={0.1}
                  max={3}
                  step={0.1}
                  defaultValue={GOLD_RISK_CONFIG.overnightRisk * 100}
                />
              </div>
            </div>
            <div>
              <Text strong>最大回撤阈值</Text>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">当前: {(GOLD_RISK_CONFIG.maxDrawdown * 100).toFixed(1)}%</Text>
                <Slider
                  min={0.5}
                  max={10}
                  step={0.5}
                  defaultValue={GOLD_RISK_CONFIG.maxDrawdown * 100}
                />
              </div>
            </div>
          </Space>
        </div>
      </Modal>
    </div>
  );
};

export default RiskMonitor;