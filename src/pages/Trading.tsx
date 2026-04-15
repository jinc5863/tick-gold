import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Select,
  Button,
  Table,
  Tag,
  Space,
  Row,
  Col,
  Statistic,
  Badge,
  Modal,
  InputNumber,
  message,
  Alert,
  Divider,
  ConfigProvider,
  theme,
} from 'antd';
import {
  WifiOutlined,
  DisconnectOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useWebSocket } from '../hooks/useWebSocket';
import { useStrategyStore } from '../store';
import type { Position } from '@/types';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/realtime';

interface ConnectionStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  latency?: string;
  lastUpdate?: string;
}

interface RiskWarning {
  id: number;
  type: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
}

const Trading: React.FC = () => {
  const [form] = Form.useForm();
  const { positions, setPositions } = useStrategyStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // WebSocket for real-time market data
  const { isConnected } = useWebSocket<{ type: string; symbol: string; bid: number; ask: number }>({
    url: WS_URL,
    onMessage: (data) => {
      if (data.type === 'tick') {
        // Market data update - could be used for real-time display
        console.debug('Market tick:', data.bid, data.ask);
      }
    },
  });

  // Update connection status based on WebSocket state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus[]>([
    { name: 'MT4', status: 'disconnected', lastUpdate: '-' },
    { name: 'MT5', status: 'disconnected', lastUpdate: '-' },
    { name: 'IBKR', status: 'disconnected', lastUpdate: '-' },
  ]);

  // Update MT5 connection based on WebSocket
  useEffect(() => {
    const now = new Date().toLocaleTimeString();
    setConnectionStatus((prev) =>
      prev.map((conn) =>
        conn.name === 'MT5'
          ? { ...conn, status: isConnected ? 'connected' : 'disconnected', latency: isConnected ? '~20ms' : undefined, lastUpdate: now }
          : conn
      )
    );
  }, [isConnected]);

  // Mock PnL data
  const pnlData = {
    today: 1250.5,
    thisWeek: 4820.3,
    thisMonth: 15840.75,
  };

  // Mock positions data
  const mockPositions: Position[] = [
    { id: 1, symbol: 'XAUUSD', type: 'BUY', volume: 2.5, openPrice: 2340.0, currentPrice: 2345.5, profit: 1375.0 },
    { id: 2, symbol: 'XAUUSD', type: 'SELL', volume: 1.0, openPrice: 2346.0, currentPrice: 2344.2, profit: 180.0 },
    { id: 3, symbol: 'XAUUSD', type: 'BUY', volume: 0.5, openPrice: 2338.5, currentPrice: 2345.5, profit: 350.0 },
  ];

  const displayPositions = positions.length > 0 ? positions : mockPositions;

  // Risk warnings
  const riskWarnings: RiskWarning[] = [
    { id: 1, type: 'critical', message: '头寸风险超过80%，建议减仓', timestamp: '10:30:25' },
    { id: 2, type: 'warning', message: '波动率上升，注意风险控制', timestamp: '10:28:10' },
    { id: 3, type: 'info', message: '今日交易次数已达上限的70%', timestamp: '10:25:00' },
  ];

  // PnL chart data
  const pnlChartData = [
    { time: '09:00', today: 0, week: 3560 },
    { time: '09:30', today: 320, week: 3880 },
    { time: '10:00', today: 580, week: 4140 },
    { time: '10:30', today: 920, week: 4480 },
    { time: '11:00', today: 1150, week: 4710 },
    { time: '11:30', today: 1250, week: 4820 },
  ];

  const positionColumns = [
    { title: '品种', dataIndex: 'symbol', key: 'symbol' },
    {
      title: '方向',
      dataIndex: 'type',
      key: 'type',
      render: (type: 'BUY' | 'SELL') => (
        <Tag color={type === 'BUY' ? 'green' : 'red'}>
          {type === 'BUY' ? '多' : '空'}
        </Tag>
      ),
    },
    { title: '数量', dataIndex: 'volume', key: 'volume', render: (v: number) => `${v} 手` },
    { title: '入场价', dataIndex: 'openPrice', key: 'openPrice', render: (v: number) => `$${v.toFixed(2)}` },
    { title: '当前价', dataIndex: 'currentPrice', key: 'currentPrice', render: (v: number) => `$${v.toFixed(2)}` },
    {
      title: '盈亏',
      dataIndex: 'profit',
      key: 'profit',
      render: (profit: number) => (
        <span style={{ color: profit >= 0 ? '#22C55E' : '#EF4444', fontWeight: 'bold' }}>
          {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, _record: Position) => (
        <Space>
          <Button size="small" type="primary" danger>
            平仓
          </Button>
          <Button size="small">详情</Button>
        </Space>
      ),
    },
  ];

  const connectionColumns = [
    { title: '交易平台', dataIndex: 'name', key: 'name' },
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
    { title: '延迟', dataIndex: 'latency', key: 'latency' },
    { title: '最后更新', dataIndex: 'lastUpdate', key: 'lastUpdate' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ConnectionStatus) =>
        record.status !== 'connected' && (
          <Button size="small" icon={<WifiOutlined />}>
            连接
          </Button>
        ),
    },
  ];

  const handleOpenOrderModal = () => {
    form.setFieldsValue({ symbol: 'XAUUSD', direction: 'BUY', quantity: 1.0 });
    setIsModalOpen(true);
  };

  const handleSubmitOrder = async () => {
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      message.success(`订单已提交: ${values.direction === 'BUY' ? '买入' : '卖出'} ${values.quantity}手 ${values.symbol}`);
      setIsModalOpen(false);
      setIsSubmitting(false);
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleRefreshPositions = () => {
    setPositions(mockPositions);
    message.success('持仓已刷新');
  };

  const getWarningColor = (type: RiskWarning['type']) => {
    switch (type) {
      case 'critical': return '#EF4444';
      case 'warning': return '#F97316';
      case 'info': return '#3B82F6';
    }
  };

  const getWarningTag = (type: RiskWarning['type']) => {
    switch (type) {
      case 'critical': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'processing';
    }
  };

  const totalProfit = displayPositions.reduce((sum, p) => sum + p.profit, 0);

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#CA8A04',
          colorBgContainer: '#1C1917',
          colorBgBase: '#0A0A0F',
        },
      }}
    >
      <div style={{ padding: '24px', background: '#0A0A0F', minHeight: '100vh' }}>
        <h1 style={{ color: '#FAFAF9', marginBottom: '24px' }}>交易执行</h1>

        {/* Connection Status */}
        <Card
          title={<span style={{ color: '#FAFAF9' }}>交易平台连接状态</span>}
          bordered={false}
          style={{ background: '#1C1917', border: '1px solid #44403C', marginBottom: '24px' }}
          headStyle={{ borderBottom: '1px solid #44403C' }}
          extra={
            <Space>
              <Badge status={connectionStatus.every(c => c.status === 'connected') ? 'success' : 'error'} />
              <span style={{ color: '#A8A29E' }}>
                {connectionStatus.filter(c => c.status === 'connected').length}/{connectionStatus.length} 已连接
              </span>
            </Space>
          }
        >
          <Table
            columns={connectionColumns}
            dataSource={connectionStatus}
            pagination={false}
            rowKey="name"
            size="small"
          />
        </Card>

        {/* PnL Display */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={8}>
            <Card bordered={false} style={{ background: '#1C1917', border: '1px solid #44403C' }}>
              <Statistic
                title={<span style={{ color: '#A8A29E' }}>今日盈亏</span>}
                value={pnlData.today}
                precision={2}
                prefix="$"
                valueStyle={{ color: pnlData.today >= 0 ? '#22C55E' : '#EF4444' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card bordered={false} style={{ background: '#1C1917', border: '1px solid #44403C' }}>
              <Statistic
                title={<span style={{ color: '#A8A29E' }}>本周盈亏</span>}
                value={pnlData.thisWeek}
                precision={2}
                prefix="$"
                valueStyle={{ color: pnlData.thisWeek >= 0 ? '#22C55E' : '#EF4444' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card bordered={false} style={{ background: '#1C1917', border: '1px solid #44403C' }}>
              <Statistic
                title={<span style={{ color: '#A8A29E' }}>本月盈亏</span>}
                value={pnlData.thisMonth}
                precision={2}
                prefix="$"
                valueStyle={{ color: pnlData.thisMonth >= 0 ? '#22C55E' : '#EF4444' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          {/* Positions Table */}
          <Col xs={24} lg={16}>
            <Card
              title={<span style={{ color: '#FAFAF9' }}>当前持仓</span>}
              bordered={false}
              style={{ background: '#1C1917', border: '1px solid #44403C' }}
              headStyle={{ borderBottom: '1px solid #44403C' }}
              extra={
                <Space>
                  <Button icon={<ReloadOutlined />} onClick={handleRefreshPositions}>
                    刷新
                  </Button>
                  <Button type="primary" style={{ background: '#CA8A04', borderColor: '#CA8A04' }} onClick={handleOpenOrderModal}>
                    下单
                  </Button>
                </Space>
              }
            >
              <Table
                columns={positionColumns}
                dataSource={displayPositions}
                pagination={false}
                rowKey="id"
                size="small"
                scroll={{ x: 'max-content' }}
              />
              <Divider style={{ borderColor: '#44403C' }} />
              <Row>
                <Col span={12}>
                  <div style={{ color: '#A8A29E' }}>
                    总持仓盈亏:{' '}
                    <span style={{ color: totalProfit >= 0 ? '#22C55E' : '#EF4444', fontWeight: 'bold', fontSize: '18px' }}>
                      {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
                    </span>
                  </div>
                </Col>
                <Col span={12} style={{ textAlign: 'right' }}>
                  <div style={{ color: '#A8A29E' }}>
                    持仓数量: <span style={{ color: '#FAFAF9' }}>{displayPositions.length}</span> 个
                  </div>
                </Col>
              </Row>
            </Card>

            {/* PnL Chart */}
            <Card
              title={<span style={{ color: '#FAFAF9' }}>盈亏曲线</span>}
              bordered={false}
              style={{ background: '#1C1917', border: '1px solid #44403C', marginTop: '16px' }}
              headStyle={{ borderBottom: '1px solid #44403C' }}
            >
              <div style={{ height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pnlChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#44403C" />
                    <XAxis dataKey="time" stroke="#A8A29E" />
                    <YAxis stroke="#A8A29E" />
                    <ChartTooltip
                      contentStyle={{
                        backgroundColor: '#1C1917',
                        border: '1px solid #44403C',
                        color: '#FAFAF9',
                      }}
                      formatter={(value: any) => [`$${value.toFixed(2)}`, '']}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="today" stroke="#CA8A04" strokeWidth={2} dot={false} name="今日" />
                    <Line type="monotone" dataKey="week" stroke="#3B82F6" strokeWidth={2} dot={false} name="本周" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

          {/* Right Column - Risk Warnings and Manual Order */}
          <Col xs={24} lg={8}>
            {/* Risk Warnings */}
            <Card
              title={
                <span style={{ color: '#FAFAF9' }}>
                  <ExclamationCircleOutlined style={{ color: '#F97316', marginRight: '8px' }} />
                  风险警告
                </span>
              }
              bordered={false}
              style={{ background: '#1C1917', border: '1px solid #44403C', marginBottom: '16px' }}
              headStyle={{ borderBottom: '1px solid #44403C' }}
            >
              {riskWarnings.map((warning) => (
                <Alert
                  key={warning.id}
                  message={warning.message}
                  type={warning.type === 'critical' ? 'error' : warning.type === 'warning' ? 'warning' : 'info'}
                  showIcon
                  icon={warning.type === 'critical' ? <CloseCircleOutlined /> : warning.type === 'warning' ? <ExclamationCircleOutlined /> : <ExclamationCircleOutlined />}
                  style={{
                    marginBottom: '12px',
                    background: '#0A0A0F',
                    border: `1px solid ${getWarningColor(warning.type)}`,
                  }}
                  action={
                    <Tag color={getWarningTag(warning.type)} style={{ marginLeft: '8px' }}>
                      {warning.timestamp}
                    </Tag>
                  }
                />
              ))}
            </Card>

            {/* Manual Order Form */}
            <Card
              title={<span style={{ color: '#FAFAF9' }}>手动下单</span>}
              bordered={false}
              style={{ background: '#1C1917', border: '1px solid #44403C' }}
              headStyle={{ borderBottom: '1px solid #44403C' }}
            >
              <Form form={form} layout="vertical">
                <Form.Item label={<span style={{ color: '#A8A29E' }}>交易品种</span>} name="symbol">
                  <Select>
                    <Select.Option value="XAUUSD">XAUUSD</Select.Option>
                    <Select.Option value="XAGUSD">XAGUSD</Select.Option>
                    <Select.Option value="EURUSD">EURUSD</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label={<span style={{ color: '#A8A29E' }}>交易方向</span>} name="direction">
                  <Select>
                    <Select.Option value="BUY">
                      <span style={{ color: '#22C55E' }}>买入 (BUY)</span>
                    </Select.Option>
                    <Select.Option value="SELL">
                      <span style={{ color: '#EF4444' }}>卖出 (SELL)</span>
                    </Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label={<span style={{ color: '#A8A29E' }}>交易数量</span>} name="quantity">
                  <InputNumber
                    min={0.1}
                    max={10}
                    step={0.1}
                    style={{ width: '100%', background: '#0A0A0F', borderColor: '#44403C' }}
                    addonAfter="手"
                  />
                </Form.Item>
                <Form.Item label={<span style={{ color: '#A8A29E' }}>执行价格</span>}>
                  <div style={{ color: '#CA8A04', fontSize: '18px', fontWeight: 'bold' }}>
                    $2345.50 <SyncOutlined spin style={{ fontSize: '14px', marginLeft: '8px' }} />
                  </div>
                </Form.Item>
                <Divider style={{ borderColor: '#44403C' }} />
                <Button
                  type="primary"
                  block
                  size="large"
                  onClick={handleSubmitOrder}
                  loading={isSubmitting}
                  style={{
                    background: form.getFieldValue('direction') === 'SELL' ? '#EF4444' : '#22C55E',
                    borderColor: form.getFieldValue('direction') === 'SELL' ? '#EF4444' : '#22C55E',
                  }}
                >
                  {form.getFieldValue('direction') === 'SELL' ? '确认卖出' : '确认买入'}
                </Button>
              </Form>
            </Card>
          </Col>
        </Row>

        {/* Order Modal */}
        <Modal
          title={<span style={{ color: '#FAFAF9' }}>下单确认</span>}
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={[
            <Button key="cancel" onClick={() => setIsModalOpen(false)}>
              取消
            </Button>,
            <Button
              key="submit"
              type="primary"
              loading={isSubmitting}
              onClick={handleSubmitOrder}
              style={{
                background: form.getFieldValue('direction') === 'SELL' ? '#EF4444' : '#22C55E',
                borderColor: form.getFieldValue('direction') === 'SELL' ? '#EF4444' : '#22C55E',
              }}
            >
              确认下单
            </Button>,
          ]}
        >
          <div style={{ padding: '16px 0' }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div style={{ color: '#A8A29E' }}>品种</div>
                <div style={{ color: '#FAFAF9', fontSize: '16px', fontWeight: 'bold' }}>
                  {form.getFieldValue('symbol')}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ color: '#A8A29E' }}>方向</div>
                <div style={{ color: form.getFieldValue('direction') === 'BUY' ? '#22C55E' : '#EF4444', fontSize: '16px', fontWeight: 'bold' }}>
                  {form.getFieldValue('direction') === 'BUY' ? '买入' : '卖出'}
                </div>
              </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
              <Col span={12}>
                <div style={{ color: '#A8A29E' }}>数量</div>
                <div style={{ color: '#FAFAF9', fontSize: '16px', fontWeight: 'bold' }}>
                  {form.getFieldValue('quantity')} 手
                </div>
              </Col>
              <Col span={12}>
                <div style={{ color: '#A8A29E' }}>执行价</div>
                <div style={{ color: '#CA8A04', fontSize: '16px', fontWeight: 'bold' }}>$2345.50</div>
              </Col>
            </Row>
          </div>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default Trading;
// page:Trading
