import React, { useEffect, useState } from 'react';
import {
  Card,
  Form,
  InputNumber,
  Select,
  Switch,
  Button,
  Table,
  Tag,
  Space,
  Row,
  Col,
  Statistic,
  Divider,
  Checkbox,
  ConfigProvider,
  theme,
  message,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ThunderboltOutlined,
  FundViewOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useStrategyStore } from '../store';
import type { TradingSignal } from '@/types';

const EAGenerator: React.FC = () => {
  const [form] = Form.useForm();
  const [factors, setFactors] = useState<string[]>(['price_momentum', 'volume_ratio']);
  const [riskRules, setRiskRules] = useState<string[]>(['max_drawdown', 'stop_loss', 'position_size']);
  const [latestSignal, setLatestSignal] = useState<{ type: string; price: number; confidence: number; stopLoss: number; takeProfit: number } | null>(null);

  const {
    isRunning,
    setIsRunning,
    selectedStrategy,
    setSelectedStrategy,
    signals,
    setSignals,
    addSignal,
    positions,
    setPositions,
    todayProfit,
    setTodayProfit,
    totalSignals,
    setTotalSignals,
    winRate,
    setWinRate,
    setTotalVolume,
  } = useStrategyStore();

  // Performance metrics state
  const [sharpeRatio] = useState<number>(1.85);
  const [maxDrawdown] = useState<number>(2.3);

  const strategyList = [
    { value: 'trend_v1', label: '趋势跟踪V1' },
    { value: 'mean_reversion', label: '均值回归' },
    { value: 'arbitrage', label: '套利策略' },
    { value: 'breakout', label: '突破策略' },
  ];

  const availableFactors = [
    { label: '价格动量 (Price Momentum)', value: 'price_momentum' },
    { label: '成交量比 (Volume Ratio)', value: 'volume_ratio' },
    { label: '波动率因子 (Volatility)', value: 'volatility' },
    { label: '布林带突破 (Bollinger Break)', value: 'bollinger_break' },
    { label: 'RSI超买超卖 (RSI)', value: 'rsi' },
    { label: 'MACD信号 (MACD)', value: 'macd' },
  ];

  const availableRiskRules = [
    { label: '最大回撤限制 (Max Drawdown)', value: 'max_drawdown' },
    { label: '止损 (Stop Loss)', value: 'stop_loss' },
    { label: '仓位大小 (Position Size)', value: 'position_size' },
    { label: '隔夜风险 (Overnight Risk)', value: 'overnight_risk' },
    { label: '缺口风险 (Gap Risk)', value: 'gap_risk' },
  ];

  // Initial data loading
  useEffect(() => {
    setSignals([
      { id: 1, time: '10:30:05', symbol: 'XAUUSD', type: 'BUY', price: 2341.5, volume: 1.0, status: 'executed' },
      { id: 2, time: '10:30:12', symbol: 'XAUUSD', type: 'SELL', price: 2342.0, volume: 0.5, status: 'executed' },
      { id: 3, time: '10:30:25', symbol: 'XAUUSD', type: 'BUY', price: 2341.8, volume: 1.5, status: 'pending' },
    ]);
    setPositions([
      { id: 1, symbol: 'XAUUSD', type: 'BUY', volume: 2.5, openPrice: 2340.0, currentPrice: 2341.5, profit: 375.0 },
      { id: 2, symbol: 'XAUUSD', type: 'SELL', volume: 1.0, openPrice: 2342.5, currentPrice: 2342.0, profit: 50.0 },
    ]);
    setTodayProfit(425.5);
    setTotalSignals(156);
    setWinRate(72.5);
    setTotalVolume(3.5);
    setLatestSignal({
      type: 'BUY',
      price: 2341.5,
      confidence: 85.5,
      stopLoss: 2336.5,
      takeProfit: 2351.5,
    });
  }, [setSignals, setPositions, setTodayProfit, setTotalSignals, setWinRate, setTotalVolume]);

  // Simulate real-time signal updates when running
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const signalType = Math.random() > 0.5 ? 'BUY' : 'SELL';
      const basePrice = 2341.5 + Math.random() * 2;
      const newSignal: TradingSignal = {
        id: Date.now(),
        time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        symbol: 'XAUUSD',
        type: signalType as 'BUY' | 'SELL',
        price: basePrice,
        volume: Math.round(Math.random() * 10) / 10,
        status: 'pending',
      };
      addSignal(newSignal);
      setTotalSignals(totalSignals + 1);
      setLatestSignal({
        type: signalType,
        price: basePrice,
        confidence: Math.round((70 + Math.random() * 25) * 10) / 10,
        stopLoss: signalType === 'BUY' ? basePrice - 50 * 0.1 : basePrice + 50 * 0.1,
        takeProfit: signalType === 'BUY' ? basePrice + 100 * 0.1 : basePrice - 100 * 0.1,
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isRunning, totalSignals, addSignal, setTotalSignals]);

  const handleToggleRunning = () => {
    setIsRunning(!isRunning);
    message.success(isRunning ? '策略已暂停' : '策略已启动');
  };

  const handleSaveConfig = async () => {
    try {
      const values = await form.validateFields();
      const config = {
        strategy_name: values.strategy,
        factors: factors,
        risk_rules: riskRules,
        symbol: values.symbol,
        volume: values.volume,
        stop_loss: values.stopLoss,
        take_profit: values.takeProfit,
        risk_control: values.riskControl,
      };
      console.log('Saving config:', config);
      message.success('策略配置已保存');
    } catch {
      message.error('请检查配置参数');
    }
  };

  const _handleStartEA = () => {
    setIsRunning(true);
    message.loading({ content: '正在启动EA...', key: 'ea-start' });
    setTimeout(() => {
      message.success({ content: 'EA已成功启动', key: 'ea-start' });
    }, 1000);
  };

  const _handleStopEA = () => {
    setIsRunning(false);
    message.warning('EA已停止');
  };

  // Determine position status
  const getPositionStatus = () => {
    if (positions.length === 0) return { status: 'flat', label: '空仓', color: '#A8A29E' };
    const hasBuy = positions.some(p => p.type === 'BUY');
    const hasSell = positions.some(p => p.type === 'SELL');
    if (hasBuy && hasSell) return { status: 'both', label: '双向持仓', color: '#CA8A04' };
    if (hasBuy) return { status: 'long', label: '做多', color: '#22C55E' };
    return { status: 'short', label: '做空', color: '#EF4444' };
  };

  const positionStatus = getPositionStatus();

  const signalColumns = [
    { title: '时间', dataIndex: 'time', key: 'time' },
    { title: '品种', dataIndex: 'symbol', key: 'symbol' },
    {
      title: '信号类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'BUY' ? 'green' : 'red'}>
          {type === 'BUY' ? '买入' : '卖出'}
        </Tag>
      ),
    },
    { title: '价格', dataIndex: 'price', key: 'price' },
    { title: '交易量', dataIndex: 'volume', key: 'volume' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'executed' ? 'green' : 'orange'}>
          {status === 'executed' ? '已执行' : '待执行'}
        </Tag>
      ),
    },
  ];

  const positionColumns = [
    { title: '品种', dataIndex: 'symbol', key: 'symbol' },
    {
      title: '方向',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'BUY' ? 'green' : 'red'}>
          {type === 'BUY' ? '多' : '空'}
        </Tag>
      ),
    },
    { title: '持仓量', dataIndex: 'volume', key: 'volume' },
    { title: '开仓价', dataIndex: 'openPrice', key: 'openPrice' },
    { title: '当前价', dataIndex: 'currentPrice', key: 'currentPrice' },
    {
      title: '盈亏',
      dataIndex: 'profit',
      key: 'profit',
      render: (profit: number) => (
        <span style={{ color: profit >= 0 ? '#22C55E' : '#EF4444' }}>
          ${profit.toFixed(2)}
        </span>
      ),
    },
  ];

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
        <h1 style={{ color: '#FAFAF9', marginBottom: '24px' }}>EA策略生成器</h1>

        {/* Performance Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            <Card variant="borderless" style={{ background: '#1C1917', border: '1px solid #44403C' }}>
              <Statistic
                title={<span style={{ color: '#A8A29E' }}>今日盈亏</span>}
                value={todayProfit}
                precision={2}
                valueStyle={{ color: todayProfit >= 0 ? '#22C55E' : '#EF4444' }}
                prefix={<span style={{ color: todayProfit >= 0 ? '#22C55E' : '#EF4444' }}>{todayProfit >= 0 ? '+' : ''}</span>}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card variant="borderless" style={{ background: '#1C1917', border: '1px solid #44403C' }}>
              <Statistic
                title={<span style={{ color: '#A8A29E' }}>信号总数</span>}
                value={totalSignals}
                suffix="个"
                valueStyle={{ color: '#FAFAF9' }}
                prefix={<ThunderboltOutlined style={{ color: '#CA8A04' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card variant="borderless" style={{ background: '#1C1917', border: '1px solid #44403C' }}>
              <Statistic
                title={<span style={{ color: '#A8A29E' }}>胜率</span>}
                value={winRate}
                precision={1}
                suffix="%"
                valueStyle={{ color: '#CA8A04' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card variant="borderless" style={{ background: '#1C1917', border: '1px solid #44403C' }}>
              <Statistic
                title={<span style={{ color: '#A8A29E' }}>夏普比率</span>}
                value={sharpeRatio}
                precision={2}
                valueStyle={{ color: '#22C55E' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          {/* Strategy Configuration */}
          <Col xs={24} lg={12}>
            <Card
              title={<span style={{ color: '#FAFAF9' }}>策略配置</span>}
              variant="borderless"
              style={{ background: '#1C1917', border: '1px solid #44403C' }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
              extra={
                <Space>
                  <span style={{ color: '#A8A29E' }}>运行状态:</span>
                  <Tag icon={isRunning ? <PlayCircleOutlined /> : <PauseCircleOutlined />} color={isRunning ? 'green' : 'default'}>
                    {isRunning ? '运行中' : '已暂停'}
                  </Tag>
                </Space>
              }
            >
              <Form form={form} layout="vertical" initialValues={{
                strategy: selectedStrategy,
                symbol: 'XAUUSD',
                volume: 1.0,
                stopLoss: 50,
                takeProfit: 100,
                riskControl: true,
              }}>
                <Form.Item label={<span style={{ color: '#A8A29E' }}>策略名称</span>} name="strategy">
                  <Select
                    value={selectedStrategy}
                    onChange={setSelectedStrategy}
                    options={strategyList}
                  />
                </Form.Item>

                <Form.Item label={<span style={{ color: '#A8A29E' }}>启用因子</span>}>
                  <Checkbox.Group
                    options={availableFactors}
                    value={factors}
                    onChange={(checkedValues) => setFactors(checkedValues as string[])}
                  />
                </Form.Item>

                <Form.Item label={<span style={{ color: '#A8A29E' }}>风控规则</span>}>
                  <Checkbox.Group
                    options={availableRiskRules}
                    value={riskRules}
                    onChange={(checkedValues) => setRiskRules(checkedValues as string[])}
                  />
                </Form.Item>

                <Divider style={{ borderColor: '#44403C' }} />

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label={<span style={{ color: '#A8A29E' }}>交易品种</span>} name="symbol">
                      <Select style={{ width: '100%' }}>
                        <Select.Option value="XAUUSD">XAUUSD</Select.Option>
                        <Select.Option value="XAGUSD">XAGUSD</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label={<span style={{ color: '#A8A29E' }}>交易量</span>} name="volume">
                      <InputNumber
                        min={0.1}
                        max={10}
                        step={0.1}
                        style={{ width: '100%', background: '#0A0A0F', borderColor: '#44403C' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label={<span style={{ color: '#A8A29E' }}>止损点数</span>} name="stopLoss">
                      <Space.Compact>
                      <InputNumber
                        min={1}
                        style={{ width: "100%", background: "#0A0A0F", borderColor: "#44403C" }}
                      />
                      <span>点</span>
                    </Space.Compact>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label={<span style={{ color: '#A8A29E' }}>止盈点数</span>} name="takeProfit">
                      <Space.Compact>
                      <InputNumber
                        min={1}
                        style={{ width: "100%", background: "#0A0A0F", borderColor: "#44403C" }}
                      />
                      <span>点</span>
                    </Space.Compact>
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label={<span style={{ color: '#A8A29E' }}>启用风控</span>} name="riskControl" valuePropName="checked">
                  <Switch defaultChecked />
                </Form.Item>
              </Form>
              <Divider style={{ borderColor: '#44403C' }} />
              <Space>
                <Button
                  type="primary"
                  icon={isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  onClick={handleToggleRunning}
                  style={{ background: isRunning ? '#F97316' : '#22C55E', borderColor: isRunning ? '#F97316' : '#22C55E' }}
                >
                  {isRunning ? '暂停策略' : '启动策略'}
                </Button>
                <Button onClick={() => form.resetFields()}>重置参数</Button>
                <Button type="primary" onClick={handleSaveConfig} style={{ background: '#CA8A04', borderColor: '#CA8A04' }}>
                  保存配置
                </Button>
              </Space>
            </Card>
          </Col>

          {/* Latest Signal Display */}
          <Col xs={24} lg={12}>
            <Card
              title={<span style={{ color: '#FAFAF9' }}>最新信号</span>}
              variant="borderless"
              style={{ background: '#1C1917', border: '1px solid #44403C' }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
              extra={
                <Tag icon={<FundViewOutlined />} color="gold">
                  实时
                </Tag>
              }
            >
              {latestSignal ? (
                <div>
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Statistic
                        title={<span style={{ color: '#A8A29E' }}>信号方向</span>}
                        value={latestSignal.type === 'BUY' ? '买入' : '卖出'}
                        valueStyle={{ color: latestSignal.type === 'BUY' ? '#22C55E' : '#EF4444' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title={<span style={{ color: '#A8A29E' }}>信号价格</span>}
                        value={latestSignal.price}
                        precision={2}
                        valueStyle={{ color: '#FAFAF9' }}
                      />
                    </Col>
                  </Row>
                  <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
                    <Col span={12}>
                      <Statistic
                        title={<span style={{ color: '#A8A29E' }}>置信度</span>}
                        value={latestSignal.confidence}
                        precision={1}
                        suffix="%"
                        valueStyle={{ color: '#CA8A04' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title={<span style={{ color: '#A8A29E' }}>持仓状态</span>}
                        value={positionStatus.label}
                        valueStyle={{ color: positionStatus.color }}
                      />
                    </Col>
                  </Row>
                  <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
                    <Col span={12}>
                      <Statistic
                        title={<span style={{ color: '#A8A29E' }}>止损价</span>}
                        value={latestSignal.stopLoss}
                        precision={2}
                        valueStyle={{ color: '#EF4444' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title={<span style={{ color: '#A8A29E' }}>止盈价</span>}
                        value={latestSignal.takeProfit}
                        precision={2}
                        valueStyle={{ color: '#22C55E' }}
                      />
                    </Col>
                  </Row>
                </div>
              ) : (
                <div style={{ color: '#A8A29E', textAlign: 'center', padding: '20px' }}>
                  暂无信号
                </div>
              )}
            </Card>

            {/* Performance Metrics */}
            <Card
              title={<span style={{ color: '#FAFAF9' }}>绩效指标</span>}
              variant="borderless"
              style={{ background: '#1C1917', border: '1px solid #44403C', marginTop: '16px' }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
            >
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ color: '#A8A29E' }}>夏普比率</span>}
                    value={sharpeRatio}
                    precision={2}
                    valueStyle={{ color: '#22C55E' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ color: '#A8A29E' }}>最大回撤</span>}
                    value={maxDrawdown}
                    precision={1}
                    suffix="%"
                    valueStyle={{ color: '#EF4444' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ color: '#A8A29E' }}>胜率</span>}
                    value={winRate}
                    precision={1}
                    suffix="%"
                    valueStyle={{ color: '#CA8A04' }}
                  />
                </Col>
              </Row>
            </Card>

            {/* Signal Table */}
            <Card
              title={<span style={{ color: '#FAFAF9' }}>信号记录</span>}
              variant="borderless"
              style={{ background: '#1C1917', border: '1px solid #44403C', marginTop: '16px' }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
            >
              <Table
                columns={signalColumns}
                dataSource={signals}
                pagination={false}
                rowKey="id"
                size="small"
                scroll={{ x: 'max-content' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Position Status */}
        <Card
          title={<span style={{ color: '#FAFAF9' }}>持仓状态</span>}
          variant="borderless"
          style={{
            background: '#1C1917',
            border: '1px solid #44403C',
            marginTop: '16px',
          }}
          styles={{ header: { borderBottom: '1px solid #44403C' } }}
          extra={
            <Tag color={positionStatus.status === 'flat' ? 'default' : positionStatus.status === 'long' ? 'green' : positionStatus.status === 'short' ? 'red' : 'gold'}>
              {positionStatus.label}
            </Tag>
          }
        >
          <Table
            columns={positionColumns}
            dataSource={positions}
            pagination={false}
            rowKey="id"
          />
          <Divider style={{ borderColor: '#44403C' }} />
          <Row>
            <Col span={12}>
              <div style={{ color: '#A8A29E' }}>
                <CheckCircleOutlined style={{ color: '#22C55E', marginRight: '8px' }} />
                总持仓盈亏: <span style={{ color: '#22C55E', fontWeight: 'bold' }}>+${todayProfit.toFixed(2)}</span>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ color: '#A8A29E', textAlign: 'right' }}>
                <CloseCircleOutlined style={{ color: '#EF4444', marginRight: '8px' }} />
                浮亏限制: <span style={{ color: '#EF4444', fontWeight: 'bold' }}>$200.00</span>
              </div>
            </Col>
          </Row>
        </Card>
      </div>
    </ConfigProvider>
  );
};

export default EAGenerator;
// page:EAGenerator
