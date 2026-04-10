import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Alert,
  Statistic,
  Timeline,
  Badge,
  Progress,
  Row,
  Col,
  Typography,
  Modal,
  Input,
  Form,
  Select,
  Radio,
  Switch,
  Tooltip,
  message
} from 'antd';
import {
  ThunderboltOutlined,
  RiseOutlined,
  FallOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  HistoryOutlined,
  FilterOutlined,
  SettingOutlined,
  BellOutlined,
  LineChartOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { TimelineItemProps } from 'antd/es/timeline';
import { TradingSignal, Order } from '../types';
import { useSignals, useOrders } from '../store';
import './TradeSignals.css';

const { Text, Paragraph } = Typography;
const { Option } = Select;

const TradeSignals: React.FC = () => {
  const [executingSignalId, setExecutingSignalId] = useState<string | null>(null);
  const [signalModalVisible, setSignalModalVisible] = useState(false);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<TradingSignal | null>(null);
  const [autoExecution, setAutoExecution] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [executionLogs, setExecutionLogs] = useState<TimelineItemProps[]>([
    {
      color: 'green',
      children: (
        <>
          <p>系统启动 - 交易引擎已就绪</p>
          <small>{new Date().toLocaleTimeString()}</small>
        </>
      ),
    },
  ]);

  // 从store获取数据
  const { signals = [], isFetchingSignals: loadingSignals, fetchSignals } = useSignals();
  const { orders = [], isFetchingOrders: loadingOrders, fetchOrders, executeTrade, cancelOrder } = useOrders();
  const loading = loadingSignals || loadingOrders;

  useEffect(() => {
    // 模拟数据加载
    console.log('加载交易信号数据...');

    const signalInterval = setInterval(() => {
      console.log('定时获取新信号...');
    }, 10000);

    const orderInterval = setInterval(() => {
      console.log('定时更新订单状态...');
    }, 30000);

    return () => {
      clearInterval(signalInterval);
      clearInterval(orderInterval);
    };
  }, [fetchSignals, fetchOrders]);

  // 数据加载由store处理

  // generateNewSignal函数已移除 - 使用store管理信号
  // const generateNewSignal = () => { ... };

  // getSignalReason和updateOrderStatus函数已移除 - 使用store管理订单状态

  const executeTradeAutomatically = async (signal: TradingSignal) => {
    try {
      // 调用store的executeTrade方法
      await executeTrade(signal);

      addExecutionLog({
        color: 'cyan',
        dot: <BellOutlined />,
        children: (
          <>
            <p>自动执行交易: {signal.direction} {signal.symbol}</p>
            <small>{new Date().toLocaleTimeString()}</small>
            <Text type="secondary">价格: ${signal.price.toFixed(2)} | 止损: ${signal.stopLoss.toFixed(2)} | 止盈: ${signal.takeProfit.toFixed(2)}</Text>
          </>
        ),
      });
    } catch (error) {
      console.error('自动执行交易失败:', error);
      addExecutionLog({
        color: 'red',
        dot: <ExclamationCircleOutlined />,
        children: (
          <>
            <p>自动执行交易失败: {signal.direction} {signal.symbol}</p>
            <small>{new Date().toLocaleTimeString()}</small>
            <Text type="secondary">错误: {error instanceof Error ? error.message : '未知错误'}</Text>
          </>
        ),
      });
    }
  };

  const addExecutionLog = (log: TimelineItemProps) => {
    setExecutionLogs(prev => [log, ...prev].slice(0, 10)); // 保持最近10条日志
  };

  const handleExecuteTrade = async (signal: TradingSignal) => {
    try {
      setExecutingSignalId(signal.id);
      setSelectedSignal(signal);

      const result = await executeTrade(signal);

      addExecutionLog({
        color: 'green',
        children: (
          <>
            <p>执行交易: {signal.direction} {signal.symbol}</p>
            <small>{new Date().toLocaleTimeString()}</small>
            <Tag color="processing">已提交 ({result.id})</Tag>
            <Text type="secondary">价格: ${signal.price.toFixed(2)}</Text>
          </>
        ),
      });

      message.success('交易指令已提交');
      setExecutingSignalId(null);
    } catch (error) {
      addExecutionLog({
        color: 'red',
        dot: <ExclamationCircleOutlined />,
        children: (
          <>
            <p>执行交易失败: {signal.direction} {signal.symbol}</p>
            <small>{new Date().toLocaleTimeString()}</small>
            <Text type="secondary">错误: {error instanceof Error ? error.message : '未知错误'}</Text>
          </>
        ),
      });
      message.error(`执行交易失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setExecutingSignalId(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await cancelOrder(orderId);

      addExecutionLog({
        color: 'orange',
        children: (
          <>
            <p>取消订单: {orderId}</p>
            <small>{new Date().toLocaleTimeString()}</small>
            <Tag color="warning">已取消</Tag>
          </>
        ),
      });

      message.success('订单已取消');
    } catch (error) {
      message.error(`取消订单失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const filteredOrders = filterStatus === 'all'
    ? orders
    : orders.filter(order => order.status === filterStatus);

  const signalColumns: ColumnsType<TradingSignal> = [
    {
      title: '时段',
      key: 'asianSession',
      render: (_, record) => {
        const time = new Date(record.generatedAt);
        const isAsianSession = time.getUTCHours() >= 0 && time.getUTCHours() < 8;
        return (
          <Tag color={isAsianSession ? "#722ed1" : "default"} icon={<GlobalOutlined />}>
            {isAsianSession ? '亚洲时段' : '欧美时段'}
          </Tag>
        );
      },
    },
    {
      title: '时间',
      dataIndex: 'generatedAt',
      key: 'time',
      render: (time) => new Date(time).toLocaleTimeString(),
      sorter: (a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: '方向',
      dataIndex: 'direction',
      key: 'direction',
      render: (direction) => {
        const colors = {
          BUY: { color: '#52c41a', icon: <RiseOutlined />, text: '买入' },
          SELL: { color: '#f5222d', icon: <FallOutlined />, text: '卖出' },
          HOLD: { color: '#1890ff', icon: <ClockCircleOutlined />, text: '持仓' },
        };
        const config = colors[direction as keyof typeof colors] || colors.HOLD;
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
      filters: [
        { text: '买入', value: 'BUY' },
        { text: '卖出', value: 'SELL' },
        { text: '持仓', value: 'HOLD' },
      ],
      onFilter: (value, record) => record.direction === value,
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (price) => `$${price.toFixed(2)}`,
      align: 'right',
    },
    {
      title: '止损/止盈',
      key: 'levels',
      render: (_, record) => (
        <div>
          <div>止损: ${record.stopLoss.toFixed(2)}</div>
          <div>止盈: ${record.takeProfit.toFixed(2)}</div>
        </div>
      ),
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      render: (confidence) => (
        <>
          <Progress
            percent={Math.round(confidence * 100)}
            size="small"
            status={confidence > 0.7 ? 'success' : confidence > 0.6 ? 'normal' : 'exception'}
            strokeWidth={8}
          />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {(confidence * 100).toFixed(1)}%
          </Text>
        </>
      ),
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="执行交易">
            <Button
              type="primary"
              size="small"
              icon={<ThunderboltOutlined />}
              loading={executingSignalId === record.id}
              onClick={() => handleExecuteTrade(record)}
              disabled={record.direction === 'HOLD'}
            >
              执行
            </Button>
          </Tooltip>
          <Tooltip title="查看详情">
            <Button
              size="small"
              onClick={() => {
                setSelectedSignal(record);
                setSignalModalVisible(true);
              }}
            >
              详情
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const orderColumns: ColumnsType<Order> = [
    {
      title: '订单号',
      dataIndex: 'id',
      key: 'id',
      render: (id) => <Tag color="blue">{id}</Tag>,
    },
    {
      title: '方向',
      dataIndex: 'side',
      key: 'side',
      render: (side) => (
        <Tag color={side === 'BUY' ? 'green' : 'red'} icon={side === 'BUY' ? <RiseOutlined /> : <FallOutlined />}>
          {side === 'BUY' ? '买入' : '卖出'}
        </Tag>
      ),
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (price) => `$${price.toFixed(2)}`,
      align: 'right',
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusConfig = {
          PENDING: { color: 'processing', text: '待执行', icon: <ClockCircleOutlined /> },
          FILLED: { color: 'success', text: '已成交', icon: <CheckCircleOutlined /> },
          CANCELLED: { color: 'default', text: '已取消', icon: <CloseCircleOutlined /> },
          REJECTED: { color: 'error', text: '已拒绝', icon: <ExclamationCircleOutlined /> },
        };
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
        return (
          <Badge
            status={config.color as any}
            text={
              <span>
                {config.icon} {config.text}
              </span>
            }
          />
        );
      },
      filters: Object.entries({
        PENDING: '待执行',
        FILLED: '已成交',
        CANCELLED: '已取消',
        REJECTED: '已拒绝',
      }).map(([value, text]) => ({ text, value })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time) => new Date(time).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'PENDING' && (
            <Button
              size="small"
              danger
              onClick={() => handleCancelOrder(record.id)}
            >
              取消
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const performanceStats = {
    totalTrades: orders.filter(o => o.status === 'FILLED').length,
    winRate: 65.8,
    avgProfit: 1.25,
    totalProfit: orders.reduce((sum, order) => {
      const profit = order.side === 'BUY' ? 2.5 : -1.2;
      return sum + profit;
    }, 0),
  };

  return (
    <div className="trade-signals">
      {/* 顶部指标栏 */}
      <Row gutter={[16, 16]} className="signal-stats">
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="活跃信号"
              value={signals.length}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="总交易次数"
              value={performanceStats.totalTrades}
              prefix={<LineChartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="胜率"
              value={performanceStats.winRate}
              suffix="%"
              precision={1}
              valueStyle={{ color: performanceStats.winRate > 60 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="总利润"
              value={performanceStats.totalProfit}
              prefix="$"
              precision={2}
              valueStyle={{ color: performanceStats.totalProfit > 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {/* 左侧信号面板 */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <ThunderboltOutlined />
                <span>实时交易信号</span>
                <Tag color="processing">{signals.length} 个信号</Tag>
<Tag icon={<GlobalOutlined />} color="gold">黄金交易</Tag>
{new Date().getUTCHours() >= 0 && new Date().getUTCHours() < 8 && (
  <Tag color="#722ed1">⏰ 亚洲时段</Tag>
)}
              </Space>
            }
            extra={
              <Space>
                <Switch
                  checkedChildren="自动执行开"
                  unCheckedChildren="自动执行关"
                  checked={autoExecution}
                  onChange={setAutoExecution}
                />
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchSignals}
                  loading={loading}
                  size="small"
                >
                  刷新
                </Button>
              </Space>
            }
          >
            <Table
              columns={signalColumns}
              dataSource={signals}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 8, simple: true }}
              size="small"
              scroll={{ x: 'max-content' }}
            />

            {/* 信号摘要 */}
            <div className="signal-summary">
              <Alert
                message={
                  <Row gutter={[16, 16]}>
                    <Col span={8}>
                      <Text strong>最新信号:</Text>
                      {signals.length > 0 && (
                        <div>
                          <Tag color={signals[0].direction === 'BUY' ? 'green' : signals[0].direction === 'SELL' ? 'red' : 'blue'}>
                            {signals[0].direction}
                          </Tag>
                          <div>${signals[0].price.toFixed(2)}</div>
                        </div>
                      )}
                    </Col>
                    <Col span={8}>
                      <Text strong>平均置信度:</Text>
                      <div>
                        <Progress
                          percent={signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length * 100}
                          size="small"
                          showInfo={false}
                        />
                        {(signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length * 100 || 0).toFixed(1)}%
                      </div>
                    </Col>
                    <Col span={8}>
                      <Text strong>信号分布:</Text>
                      <div>
                        <span>买入: {signals.filter(s => s.direction === 'BUY').length}</span>
                        <span style={{ marginLeft: 8 }}>卖出: {signals.filter(s => s.direction === 'SELL').length}</span>
                        <span style={{ marginLeft: 8 }}>持仓: {signals.filter(s => s.direction === 'HOLD').length}</span>
                      </div>
                    </Col>
                  </Row>
                }
                type="info"
              />
            </div>
          </Card>

          {/* 执行日志 */}
          <Card
            title={
              <Space>
                <HistoryOutlined />
                <span>执行日志</span>
              </Space>
            }
            style={{ marginTop: 16 }}
            bodyStyle={{ padding: '16px 24px' }}
          >
            <Timeline
              items={executionLogs}
              style={{ maxHeight: 300, overflow: 'auto' }}
            />
          </Card>
        </Col>

        {/* 右侧订单面板 */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <CheckCircleOutlined />
                <span>订单管理</span>
                <Tag color="blue">{orders.length} 个订单</Tag>
              </Space>
            }
            extra={
              <Select
                value={filterStatus}
                onChange={setFilterStatus}
                style={{ width: 120 }}
                size="small"
                suffixIcon={<FilterOutlined />}
              >
                <Option value="all">全部状态</Option>
                <Option value="PENDING">待执行</Option>
                <Option value="FILLED">已成交</Option>
                <Option value="CANCELLED">已取消</Option>
              </Select>
            }
          >
            <Table
              columns={orderColumns}
              dataSource={filteredOrders}
              rowKey="id"
              loading={loadingOrders}
              pagination={{ pageSize: 5, simple: true }}
              size="small"
              scroll={{ x: 'max-content' }}
            />

            {/* 订单统计 */}
            <div className="order-stats">
              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <Statistic
                    title="未完成订单"
                    value={orders.filter(o => o.status === 'PENDING').length}
                    valueStyle={{ color: orders.filter(o => o.status === 'PENDING').length > 0 ? '#fa8c16' : '#3f8600' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="今日成交"
                    value={orders.filter(o => o.status === 'FILLED' && new Date(o.updatedAt).toDateString() === new Date().toDateString()).length}
                  />
                </Col>
              </Row>
            </div>
          </Card>

          {/* 风险管理提醒 */}
          <Card
            title={
              <Space>
                <ExclamationCircleOutlined />
                <span>风险提示</span>
              </Space>
            }
            style={{ marginTop: 16 }}
            type="inner"
          >
            <Alert
              message="风险管理设置"
              description={
                <ul>
                  <li>最大单笔亏损: 2.0%</li>
                  <li>最大日亏损: 5.0%</li>
                  <li>最大持仓: 4个订单</li>
                  <li>止损距离: 5.0点</li>
                  <li>止盈比例: 1:2</li>
                </ul>
              }
              type="warning"
              showIcon
            />
            <div style={{ marginTop: 12 }}>
              <Text type="secondary">
                <ClockCircleOutlined /> 最后风控检查: {new Date().toLocaleTimeString()}
              </Text>
            </div>
          </Card>

          {/* 快速操作 */}
          <Card
            title="快速操作"
            style={{ marginTop: 16 }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                block
                onClick={() => {
                  if (signals.length > 0) {
                    handleExecuteTrade(signals[0]);
                  }
                }}
                disabled={!signals.length || signals[0].direction === 'HOLD'}
              >
                执行最新信号
              </Button>
              <Button
                icon={<SettingOutlined />}
                block
                onClick={() => setOrderModalVisible(true)}
              >
                配置交易参数
              </Button>
              <Button
                icon={<BellOutlined />}
                block
                onClick={() => {
                  addExecutionLog({
                    color: 'purple',
                    children: (
                      <>
                        <p>手动触发系统检查</p>
                        <small>{new Date().toLocaleTimeString()}</small>
                      </>
                    ),
                  });
                }}
              >
                系统健康检查
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 信号详情模态框 */}
      <Modal
        title="交易信号详情"
        open={signalModalVisible}
        onCancel={() => setSignalModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setSignalModalVisible(false)}>
            关闭
          </Button>,
          selectedSignal && selectedSignal.direction !== 'HOLD' && (
            <Button
              key="execute"
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={() => {
                handleExecuteTrade(selectedSignal);
                setSignalModalVisible(false);
              }}
            >
              执行交易
            </Button>
          ),
        ]}
      >
        {selectedSignal && (
          <div className="signal-detail">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="信号方向"
                  value={selectedSignal.direction === 'BUY' ? '买入' : selectedSignal.direction === 'SELL' ? '卖出' : '持仓'}
                  valueStyle={{ color: selectedSignal.direction === 'BUY' ? '#52c41a' : selectedSignal.direction === 'SELL' ? '#f5222d' : '#1890ff' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="目标价格"
                  value={selectedSignal.price}
                  prefix="$"
                  precision={2}
                />
              </Col>
              <Col span={24}>
                <div>
                  <Text strong>止损: </Text>
                  <Text type="secondary">${selectedSignal.stopLoss.toFixed(2)}</Text>
                </div>
                <div>
                  <Text strong>止盈: </Text>
                  <Text type="secondary">${selectedSignal.takeProfit.toFixed(2)}</Text>
                </div>
                <div>
                  <Text strong>置信度: </Text>
                  <Progress
                    percent={selectedSignal.confidence * 100}
                    style={{ width: '60%', display: 'inline-block', marginLeft: 8 }}
                  />
                </div>
              </Col>
              <Col span={24}>
                <Text strong>交易理由:</Text>
                <Paragraph>{selectedSignal.reason}</Paragraph>
              </Col>
              <Col span={24}>
                <Text strong>生成时间:</Text>
                <Paragraph>{new Date(selectedSignal.generatedAt).toLocaleString()}</Paragraph>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* 交易配置模态框 */}
      <Modal
        title="交易参数配置"
        open={orderModalVisible}
        onCancel={() => setOrderModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setOrderModalVisible(false)}>
            取消
          </Button>,
          <Button key="save" type="primary" onClick={() => setOrderModalVisible(false)}>
            保存配置
          </Button>,
        ]}
      >
        <Form layout="vertical">
          <Form.Item label="默认交易量">
            <Select defaultValue="0.1">
              <Option value="0.01">0.01手</Option>
              <Option value="0.05">0.05手</Option>
              <Option value="0.1">0.10手</Option>
              <Option value="0.2">0.20手</Option>
              <Option value="0.5">0.50手</Option>
            </Select>
          </Form.Item>
          <Form.Item label="默认止损点数">
            <Input defaultValue="50" suffix="点" />
          </Form.Item>
          <Form.Item label="默认止盈比例">
            <Radio.Group defaultValue="2">
              <Radio value="1">1:1</Radio>
              <Radio value="2">1:2</Radio>
              <Radio value="3">1:3</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="交易确认方式">
            <Radio.Group defaultValue="auto">
              <Radio value="auto">自动执行</Radio>
              <Radio value="confirm">确认后执行</Radio>
              <Radio value="manual">手动执行</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="启用高级风控">
            <Switch defaultChecked />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TradeSignals;