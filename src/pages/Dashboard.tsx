import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Tag, Table, Button, Badge, Space, Tooltip } from 'antd';
import {
  DatabaseOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  DashboardOutlined,
  CheckCircleOutlined,
  DisconnectOutlined,
  WifiOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SettingOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import { useWebSocket, UseWebSocketOptions } from '../hooks/useWebSocket';
import { useStrategyStore } from '../store/strategyStore';
import './Dashboard.css';

interface MarketData {
  type: string;
  symbol: string;
  bid: number;
  ask: number;
  spread?: number;
  timestamp: string;
}

interface ConnectionStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  latency?: string;
  lastUpdate?: string;
}

interface QuickAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  type: 'primary' | 'default' | 'danger';
  disabled?: boolean;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/realtime';

const Dashboard: React.FC = () => {
  // Real-time price data for chart
  const [priceData, setPriceData] = useState<{ time: string; price: number }[]>([
    { time: '09:30', price: 2341.5 },
    { time: '09:35', price: 2342.1 },
    { time: '09:40', price: 2341.8 },
    { time: '09:45', price: 2343.2 },
    { time: '09:50', price: 2342.5 },
    { time: '09:55', price: 2344.0 },
    { time: '10:00', price: 2343.7 },
  ]);

  // Current market data from WebSocket
  const [marketData, setMarketData] = useState<MarketData | null>(null);

  // Store data
  const { isRunning } = useStrategyStore();

  // Connection status for MT4/MT5/IBKR
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus[]>([
    { name: 'MT4', status: 'connected', latency: '23ms', lastUpdate: new Date().toLocaleTimeString() },
    { name: 'MT5', status: 'connected', latency: '18ms', lastUpdate: new Date().toLocaleTimeString() },
    { name: 'IBKR', status: 'disconnected', lastUpdate: '-' },
  ]);

  // Quick actions
  const quickActions: QuickAction[] = [
    { key: 'new-strategy', label: '新建策略', icon: <PlusOutlined />, type: 'primary' },
    { key: 'start-ea', label: '启动EA', icon: <PlayCircleOutlined />, type: 'default', disabled: isRunning },
    { key: 'stop-ea', label: '停止EA', icon: <PauseCircleOutlined />, type: 'danger', disabled: !isRunning },
    { key: 'refresh', label: '刷新数据', icon: <ReloadOutlined />, type: 'default' },
    { key: 'settings', label: '系统设置', icon: <SettingOutlined />, type: 'default' },
  ];

  // WebSocket message handler
  const handleMarketMessage: UseWebSocketOptions<MarketData>['onMessage'] = (data) => {
    if (data.type === 'market') {
      setMarketData(data);

      // Update price chart
      const now = new Date();
      const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      setPriceData((prev) => {
        const newData = [...prev, { time: timeStr, price: data.bid }];
        return newData.slice(-20);
      });

      // Update connection status latency randomly
      setConnectionStatus((prev) =>
        prev.map((item) =>
          item.status === 'connected'
            ? { ...item, latency: `${(Math.random() * 10 + 15).toFixed(0)}ms`, lastUpdate: now.toLocaleTimeString() }
            : item
        )
      );
    }
  };

  const { isConnected, connectionState, send, reconnect } = useWebSocket<MarketData>({
    url: WS_URL,
    onMessage: handleMarketMessage,
    onConnect: () => {
      send({ type: 'subscribe', topic: 'market' });
      send({ type: 'subscribe', topic: 'system' });
    },
    onDisconnect: () => {
      console.log('WebSocket disconnected');
    },
  });

  // Subscribe to topics when connected
  useEffect(() => {
    if (isConnected) {
      send({ type: 'subscribe', topic: 'market' });
      send({ type: 'subscribe', topic: 'system' });
    }
  }, [isConnected, send]);

  // Current price from WebSocket or fallback
  const currentPrice = marketData?.bid ?? 2344.5;
  const spread = marketData?.spread ?? 0.02;
  const priceChange = marketData
    ? ((currentPrice - priceData[0]?.price) / priceData[0]?.price * 100).toFixed(2)
    : '0.87';
  const isPriceUp = parseFloat(priceChange) >= 0;

  // Dashboard stats (in real app, these would come from stores/API)
  const dashboardStats = {
    todayVolume: 1284560,
    volumeChange: 15.2,
    effectiveFactors: 156,
    riskRating: 'A-',
    runningStrategies: 23,
  };

  // Connection status columns
  const connectionColumns = [
    {
      title: '交易平台',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <span style={{ color: '#FAFAF9', fontWeight: 500 }}>{name}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: ConnectionStatus['status']) => (
        <Tag
          icon={status === 'connected' ? <CheckCircleOutlined /> : <DisconnectOutlined />}
          color={status === 'connected' ? 'success' : status === 'error' ? 'error' : 'default'}
        >
          {status === 'connected' ? '已连接' : status === 'error' ? '错误' : '未连接'}
        </Tag>
      ),
    },
    {
      title: '延迟',
      dataIndex: 'latency',
      key: 'latency',
      render: (latency: string) => (
        <span style={{ color: latency && latency !== '-' ? '#22C55E' : '#A8A29E' }}>
          {latency || '-'}
        </span>
      ),
    },
  ];

  const handleQuickAction = (action: QuickAction) => {
    console.log('Quick action:', action.key);
    // Action handlers would be implemented here
  };

  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1 className="dashboard-title">仪表盘</h1>
          <span className="dashboard-subtitle">XAUUSD 量化交易系统总览</span>
        </div>
        <div className="header-right">
          <div className="connection-badge">
            {isConnected ? (
              <Badge status="success" text={<span className="connection-text">实时连接</span>} />
            ) : (
              <Badge status="error" text={<span className="connection-text">断线</span>} />
            )}
            <Tag
              icon={isConnected ? <WifiOutlined /> : <DisconnectOutlined />}
              color={isConnected ? 'green' : 'red'}
              className="connection-tag"
            >
              {connectionState === 'connecting' ? '连接中...' : isConnected ? '已连接' : '未连接'}
            </Tag>
            {!isConnected && (
              <Button size="small" onClick={reconnect} className="reconnect-btn">
                点击重连
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="stat-card stat-card-volume">
            <div className="stat-card-content">
              <div className="stat-icon-wrapper volume-icon">
                <DatabaseOutlined className="stat-icon" />
              </div>
              <div className="stat-info">
                <span className="stat-label">今日数据处理量</span>
                <div className="stat-value-row">
                  <Statistic
                    value={dashboardStats.todayVolume}
                    precision={0}
                    suffix=" ticks"
                    valueStyle={{ color: '#FAFAF9', fontSize: '24px' }}
                    className="statistic"
                  />
                </div>
                <div className={`stat-change ${dashboardStats.volumeChange >= 0 ? 'positive' : 'negative'}`}>
                  {dashboardStats.volumeChange >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  <span>{Math.abs(dashboardStats.volumeChange)}%</span>
                  <span className="change-label">较昨日</span>
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="stat-card stat-card-factors">
            <div className="stat-card-content">
              <div className="stat-icon-wrapper factors-icon">
                <ThunderboltOutlined className="stat-icon" />
              </div>
              <div className="stat-info">
                <span className="stat-label">有效因子数</span>
                <div className="stat-value-row">
                  <Statistic
                    value={dashboardStats.effectiveFactors}
                    precision={0}
                    suffix="个"
                    valueStyle={{ color: '#FAFAF9', fontSize: '24px' }}
                    className="statistic"
                  />
                </div>
                <div className="stat-subtitle">活跃因子</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="stat-card stat-card-risk">
            <div className="stat-card-content">
              <div className="stat-icon-wrapper risk-icon">
                <SafetyOutlined className="stat-icon" />
              </div>
              <div className="stat-info">
                <span className="stat-label">风控评级</span>
                <div className="stat-value-row">
                  <span className="risk-rating">{dashboardStats.riskRating}</span>
                </div>
                <div className="stat-subtitle">综合风险等级</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="stat-card stat-card-strategies">
            <div className="stat-card-content">
              <div className="stat-icon-wrapper strategies-icon">
                <DashboardOutlined className="stat-icon" />
              </div>
              <div className="stat-info">
                <span className="stat-label">EA策略数</span>
                <div className="stat-value-row">
                  <Statistic
                    value={dashboardStats.runningStrategies}
                    precision={0}
                    suffix="个"
                    valueStyle={{ color: '#FAFAF9', fontSize: '24px' }}
                    className="statistic"
                  />
                </div>
                <div className="stat-running">运行中</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Market Price and Connection Status Row */}
      <Row gutter={[16, 16]} className="main-row">
        <Col xs={24} lg={16}>
          <Card
            title={
              <div className="card-title-wrapper">
                <span>XAUUSD 实时行情</span>
                {isConnected && (
                  <Badge
                    status="processing"
                    text={<span className="live-badge">LIVE</span>}
                  />
                )}
              </div>
            }
            bordered={false}
            className="market-card"
          >
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title={<span className="stat-title">当前价格</span>}
                  value={currentPrice}
                  precision={2}
                  prefix="$"
                  valueStyle={{ color: '#CA8A04', fontSize: '36px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={<span className="stat-title">点差</span>}
                  value={spread}
                  precision={2}
                  valueStyle={{ color: '#A8A29E', fontSize: '24px' }}
                />
              </Col>
            </Row>
            <Row gutter={16} className="price-details">
              <Col span={12}>
                <Statistic
                  title={<span className="stat-title">涨跌幅</span>}
                  value={parseFloat(priceChange)}
                  precision={2}
                  suffix="%"
                  prefix={isPriceUp ? '+' : ''}
                  valueStyle={{ color: isPriceUp ? '#22C55E' : '#EF4444', fontSize: '20px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={<span className="stat-title">更新时间</span>}
                  value={marketData?.timestamp
                    ? new Date(marketData.timestamp).toLocaleTimeString('zh-CN')
                    : '-'}
                  valueStyle={{ color: '#A8A29E', fontSize: '16px' }}
                />
              </Col>
            </Row>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={priceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#44403C" />
                  <XAxis dataKey="time" stroke="#A8A29E" tick={{ fill: '#A8A29E' }} />
                  <YAxis stroke="#A8A29E" tick={{ fill: '#A8A29E' }} domain={['auto', 'auto']} />
                  <ChartTooltip
                    contentStyle={{
                      backgroundColor: '#1C1917',
                      border: '1px solid #44403C',
                      color: '#FAFAF9',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#CA8A04"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={<span className="card-title">连接状态</span>}
            bordered={false}
            className="connection-card"
          >
            <Table
              columns={connectionColumns}
              dataSource={connectionStatus}
              pagination={false}
              size="small"
              rowKey="name"
              className="connection-table"
            />
            <div className="EA-status">
              <div className="EA-status-label">EA运行状态</div>
              <Tag color={isRunning ? 'success' : 'default'} className="EA-status-tag">
                {isRunning ? '运行中' : '已停止'}
              </Tag>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions Row */}
      <Row gutter={[16, 16]} className="actions-row">
        <Col span={24}>
          <Card bordered={false} className="actions-card">
            <div className="actions-header">
              <span className="actions-title">快捷操作</span>
            </div>
            <Space size={12} wrap className="actions-buttons">
              {quickActions.map((action) => (
                <Tooltip key={action.key} title={action.label}>
                  <Button
                    type={action.type === 'primary' ? 'primary' : 'default'}
                    icon={action.icon}
                    disabled={action.disabled}
                    onClick={() => handleQuickAction(action)}
                    className={`action-btn action-btn-${action.type}`}
                  >
                    {action.label}
                  </Button>
                </Tooltip>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
