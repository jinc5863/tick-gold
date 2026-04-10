import React from 'react';
import { Card, Statistic, Progress, Row, Col, Tooltip } from 'antd';
import {
  ThunderboltOutlined,
  LineChartOutlined,
  SafetyOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  DollarOutlined
} from '@ant-design/icons';
import './PerformanceCard.css';

interface PerformanceMetric {
  label: string;
  value: number | string;
  unit?: string;
  change?: number;
  target?: number;
  icon: React.ReactNode;
  color?: string;
  description?: string;
}

interface PerformanceCardProps {
  title?: string;
  metrics?: PerformanceMetric[];
  loading?: boolean;
  compact?: boolean;
  onRefresh?: () => void;
}

const PerformanceCard: React.FC<PerformanceCardProps> = ({
  title = '黄金交易性能指标',
  metrics = [],
  loading = false,
  compact = false,
  onRefresh
}) => {
  // 默认性能指标
  const defaultMetrics: PerformanceMetric[] = [
    {
      label: '吞吐量',
      value: 21340,
      unit: 'ticks/sec',
      change: 12.3,
      target: 20000,
      icon: <ThunderboltOutlined />,
      color: '#52c41a'
    },
    {
      label: '延迟',
      value: 47,
      unit: 'ms',
      change: -5.2,
      target: 50,
      icon: <ClockCircleOutlined />,
      color: '#1890ff'
    },
    {
      label: '数据质量',
      value: 98.7,
      unit: '%',
      change: 0.3,
      target: 98.5,
      icon: <SafetyOutlined />,
      color: '#722ed1'
    },
    {
      label: '胜率',
      value: 62.4,
      unit: '%',
      change: 2.1,
      target: 60.0,
      icon: <BarChartOutlined />,
      color: '#13c2c2'
    },
    {
      label: '夏普比率',
      value: 1.8,
      change: 0.2,
      target: 1.5,
      icon: <LineChartOutlined />,
      color: '#fa8c16'
    },
    {
      label: '黄金波动率',
      value: 2.3,
      unit: '%',
      change: -0.3,
      target: 2.5,
      icon: <DollarOutlined />,
      color: '#faad14'
    },
    {
      label: '累计收益',
      value: 15.7,
      unit: '%',
      change: 1.5,
      target: 12.0,
      icon: <DollarOutlined />,
      color: '#f5222d'
    }
  ];

  const displayMetrics = metrics.length > 0 ? metrics : defaultMetrics;

  const renderMetric = (metric: PerformanceMetric, index: number) => {
    const isPositive = metric.change && metric.change > 0;
    const changeColor = isPositive ? '#3f8600' : '#cf1322';

    return (
      <Col
        key={index}
        xs={24}
        sm={12}
        lg={compact ? 12 : 8}
        xl={compact ? 6 : 4}
        style={{ marginBottom: '16px' }}
      >
        <Card size="small" className="performance-metric-card">
          <div className="metric-header">
            <div className="metric-icon" style={{ color: metric.color }}>
              {metric.icon}
            </div>
            <div className="metric-label">
              {metric.label}
              {metric.description && (
                <Tooltip title={metric.description}>
                  <span className="metric-tooltip">ⓘ</span>
                </Tooltip>
              )}
            </div>
          </div>

          <div className="metric-value">
            <Statistic
              value={metric.value}
              suffix={metric.unit}
              precision={typeof metric.value === 'number' && metric.value % 1 !== 0 ? 1 : 0}
              valueStyle={{
                color: metric.color,
                fontSize: compact ? '18px' : '24px',
                fontWeight: 600
              }}
            />
          </div>

          {metric.change !== undefined && (
            <div className="metric-change" style={{ color: changeColor }}>
              {isPositive ? '+' : ''}{metric.change}%
            </div>
          )}

          {metric.target !== undefined && (
            <div className="metric-progress">
              <Progress
                percent={Math.min((Number(metric.value) / metric.target) * 100, 100)}
                size="small"
                strokeColor={metric.color}
                trailColor="rgba(0,0,0,0.06)"
                showInfo={false}
              />
              <div className="progress-label">
                <span>目标: {metric.target}{metric.unit}</span>
                <span className="progress-percent">
                  {Math.round((Number(metric.value) / metric.target) * 100)}%
                </span>
              </div>
            </div>
          )}
        </Card>
      </Col>
    );
  };

  return (
    <Card
      title={
        <div className="performance-card-header">
          <LineChartOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          {title}
          {onRefresh && (
            <Tooltip title="刷新数据">
              <button
                className="refresh-button"
                onClick={onRefresh}
                style={{ marginLeft: 'auto' }}
              >
                ⟳
              </button>
            </Tooltip>
          )}
        </div>
      }
      className="performance-card"
      loading={loading}
      bordered={!compact}
    >
      <Row gutter={[16, 16]}>
        {displayMetrics.map(renderMetric)}
      </Row>

      {displayMetrics.length === 0 && !loading && (
        <div className="no-metrics-placeholder">
          <LineChartOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
          <p>暂无性能数据</p>
          <p style={{ fontSize: '12px', color: '#8c8c8c' }}>请配置策略并开始交易以获取性能指标</p>
        </div>
      )}
    </Card>
  );
};

export default PerformanceCard;