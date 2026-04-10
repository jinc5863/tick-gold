import React, { useState } from 'react';
import {
  Card,
  Tag,
  Progress,
  Button,
  Dropdown,
  Menu,
  Tooltip,
  Badge,
  Switch,
  Modal,
  message
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  LineChartOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SettingOutlined,
  CopyOutlined
} from '@ant-design/icons';
import './StrategyCard.css';

export interface StrategyConfig {
  id: string;
  name: string;
  description?: string;
  type: 'scalping' | 'trend_following' | 'gold_specific' | 'custom';
  timeframe: 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1';
  status: 'running' | 'paused' | 'stopped' | 'error';
  performance: {
    totalReturn: number;
    winRate: number;
    maxDrawdown: number;
    sharpeRatio: number;
    tradesCount: number;
  };
  lastUpdated: string;
  parameters: Record<string, any>;
  isOptimized?: boolean;
  riskLevel?: 'low' | 'medium' | 'high';
}

interface StrategyCardProps {
  strategy: StrategyConfig;
  onStart?: (id: string) => void;
  onPause?: (id: string) => void;
  onEdit?: (strategy: StrategyConfig) => void;
  onDelete?: (id: string) => void;
  onClone?: (strategy: StrategyConfig) => void;
  onStatusChange?: (id: string, status: StrategyConfig['status']) => void;
  compact?: boolean;
  showActions?: boolean;
}

const StrategyCard: React.FC<StrategyCardProps> = ({
  strategy,
  onStart,
  onPause,
  onEdit,
  onDelete,
  onClone,
  onStatusChange,
  compact = false,
  showActions = true
}) => {
  const [activeTab, setActiveTab] = useState<'performance' | 'parameters'>('performance');
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const getStatusConfig = (status: StrategyConfig['status']) => {
    const configs = {
      running: { color: '#52c41a', text: '运行中', icon: <PlayCircleOutlined /> },
      paused: { color: '#faad14', text: '已暂停', icon: <PauseCircleOutlined /> },
      stopped: { color: '#d9d9d9', text: '已停止', icon: <PauseCircleOutlined /> },
      error: { color: '#ff4d4f', text: '错误', icon: <ExclamationCircleOutlined /> }
    };
    return configs[status];
  };

  const getTypeConfig = (type: StrategyConfig['type']) => {
    const configs = {
      scalping: { color: '#13c2c2', text: '剥头皮' },
      trend_following: { color: '#1890ff', text: '趋势跟踪' },
      gold_specific: { color: '#722ed1', text: '黄金专用' },
      custom: { color: '#fa8c16', text: '自定义' }
    };
    return configs[type];
  };

  const getRiskConfig = (level?: StrategyConfig['riskLevel']) => {
    const configs = {
      low: { color: '#52c41a', text: '低风险' },
      medium: { color: '#faad14', text: '中风险' },
      high: { color: '#ff4d4f', text: '高风险' }
    };
    return level ? configs[level] : { color: '#d9d9d9', text: '未设置' };
  };

  const getTimeframeIcon = (timeframe: StrategyConfig['timeframe']) => {
    const icons = {
      M1: '1m',
      M5: '5m',
      M15: '15m',
      M30: '30m',
      H1: '1H',
      H4: '4H',
      D1: '1D'
    };
    return icons[timeframe];
  };

  const handleStart = async () => {
    if (onStart) {
      setActionLoading(true);
      try {
        await onStart(strategy.id);
        message.success(`策略 "${strategy.name}" 已启动`);
      } catch (error) {
        message.error('启动策略失败');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handlePause = async () => {
    if (onPause) {
      setActionLoading(true);
      try {
        await onPause(strategy.id);
        message.success(`策略 "${strategy.name}" 已暂停`);
      } catch (error) {
        message.error('暂停策略失败');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleStatusToggle = async (checked: boolean) => {
    const newStatus = checked ? 'running' : 'paused';
    if (onStatusChange) {
      setActionLoading(true);
      try {
        await onStatusChange(strategy.id, newStatus);
        message.success(`策略状态已更新为 ${getStatusConfig(newStatus).text}`);
      } catch (error) {
        message.error('更新策略状态失败');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleDelete = () => {
    setConfirmModalVisible(true);
  };

  const confirmDelete = () => {
    if (onDelete) {
      onDelete(strategy.id);
      message.success(`策略 "${strategy.name}" 已删除`);
    }
    setConfirmModalVisible(false);
  };

  const actionMenu = (
    <Menu>
      <Menu.Item
        key="edit"
        icon={<EditOutlined />}
        onClick={() => onEdit && onEdit(strategy)}
      >
        编辑策略
      </Menu.Item>
      <Menu.Item
        key="clone"
        icon={<CopyOutlined />}
        onClick={() => onClone && onClone(strategy)}
      >
        克隆策略
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        key="delete"
        icon={<DeleteOutlined />}
        danger
        onClick={handleDelete}
      >
        删除策略
      </Menu.Item>
    </Menu>
  );

  const statusConfig = getStatusConfig(strategy.status);
  const typeConfig = getTypeConfig(strategy.type);
  const riskConfig = getRiskConfig(strategy.riskLevel);

  return (
    <>
      <Card
        className={`strategy-card ${compact ? 'compact' : ''}`}
        title={
          <div className="strategy-card-header">
            <div className="strategy-header-left">
              <Badge
                status={strategy.status === 'running' ? 'success' : 'default'}
                className="strategy-status-badge"
              />
              <div className="strategy-title">
                <h3>{strategy.name}</h3>
                <div className="strategy-meta">
                  <Tag color={typeConfig.color} className="strategy-type-tag">
                    {typeConfig.text}
                  </Tag>
                  <Tag className="timeframe-tag">
                    {getTimeframeIcon(strategy.timeframe)}
                  </Tag>
                  {strategy.isOptimized && (
                    <Tag color="gold" icon={<CheckCircleOutlined />}>
                      已优化
                    </Tag>
                  )}
                </div>
              </div>
            </div>
            <div className="strategy-header-right">
              {showActions && (
                <>
                  <Tooltip title={strategy.status === 'running' ? '暂停策略' : '启动策略'}>
                    <Switch
                      checked={strategy.status === 'running'}
                      onChange={handleStatusToggle}
                      loading={actionLoading}
                      checkedChildren={<PlayCircleOutlined />}
                      unCheckedChildren={<PauseCircleOutlined />}
                      className="strategy-switch"
                    />
                  </Tooltip>
                  <Dropdown overlay={actionMenu} trigger={['click']}>
                    <Button
                      type="text"
                      icon={<MoreOutlined />}
                      className="strategy-action-button"
                    />
                  </Dropdown>
                </>
              )}
            </div>
          </div>
        }
        extra={
          !compact && showActions && (
            <div className="strategy-extra">
              <Tag color={riskConfig.color}>{riskConfig.text}</Tag>
              <Tag color={statusConfig.color} icon={statusConfig.icon}>
                {statusConfig.text}
              </Tag>
            </div>
          )
        }
        loading={actionLoading}
      >
        {strategy.description && (
          <div className="strategy-description">
            <p>{strategy.description}</p>
          </div>
        )}

        <div className="strategy-tabs">
          <div className="tab-buttons">
            <button
              className={`tab-button ${activeTab === 'performance' ? 'active' : ''}`}
              onClick={() => setActiveTab('performance')}
            >
              <LineChartOutlined /> 性能
            </button>
            <button
              className={`tab-button ${activeTab === 'parameters' ? 'active' : ''}`}
              onClick={() => setActiveTab('parameters')}
            >
              <SettingOutlined /> 参数
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'performance' ? (
              <div className="performance-metrics">
                <div className="performance-metric">
                  <div className="metric-label">总收益</div>
                  <div
                    className="metric-value"
                    style={{ color: strategy.performance.totalReturn >= 0 ? '#3f8600' : '#cf1322' }}
                  >
                    {strategy.performance.totalReturn >= 0 ? '+' : ''}
                    {strategy.performance.totalReturn.toFixed(2)}%
                  </div>
                  <Progress
                    percent={Math.min(Math.abs(strategy.performance.totalReturn), 100)}
                    strokeColor={strategy.performance.totalReturn >= 0 ? '#52c41a' : '#ff4d4f'}
                    size="small"
                    showInfo={false}
                  />
                </div>

                <div className="performance-metric">
                  <div className="metric-label">胜率</div>
                  <div className="metric-value">
                    {strategy.performance.winRate.toFixed(1)}%
                  </div>
                  <Progress
                    percent={strategy.performance.winRate}
                    strokeColor="#1890ff"
                    size="small"
                    showInfo={false}
                  />
                </div>

                <div className="performance-metric">
                  <div className="metric-label">最大回撤</div>
                  <div className="metric-value">
                    {strategy.performance.maxDrawdown.toFixed(2)}%
                  </div>
                  <Progress
                    percent={strategy.performance.maxDrawdown}
                    strokeColor="#faad14"
                    size="small"
                    showInfo={false}
                  />
                </div>

                <div className="performance-metric">
                  <div className="metric-label">交易次数</div>
                  <div className="metric-value">
                    {strategy.performance.tradesCount}
                  </div>
                </div>
              </div>
            ) : (
              <div className="parameters-list">
                <div className="parameters-grid">
                  {Object.entries(strategy.parameters).slice(0, 6).map(([key, value]) => (
                    <div key={key} className="parameter-item">
                      <span className="parameter-key">{key}</span>
                      <span className="parameter-value">{String(value)}</span>
                    </div>
                  ))}
                  {Object.keys(strategy.parameters).length > 6 && (
                    <div className="more-parameters">
                      还有 {Object.keys(strategy.parameters).length - 6} 个参数...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="strategy-footer">
          <div className="last-updated">
            更新于: {new Date(strategy.lastUpdated).toLocaleString()}
          </div>
          <div className="footer-actions">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit && onEdit(strategy)}
            >
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => onClone && onClone(strategy)}
            >
              克隆
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        title="确认删除"
        open={confirmModalVisible}
        onOk={confirmDelete}
        onCancel={() => setConfirmModalVisible(false)}
        okText="删除"
        cancelText="取消"
        okType="danger"
      >
        <p>确定要删除策略 "{strategy.name}" 吗？</p>
        <p style={{ color: '#ff4d4f', fontSize: '12px' }}>
          此操作将永久删除该策略及其所有历史数据。
        </p>
      </Modal>
    </>
  );
};

export default StrategyCard;