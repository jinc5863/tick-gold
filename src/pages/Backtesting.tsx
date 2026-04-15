import React from 'react';
import {
  Card,
  Form,
  InputNumber,
  Select,
  DatePicker,
  Button,
  Table,
  Tag,
  Space,
  Row,
  Col,
  Statistic,
  ConfigProvider,
  theme,
  message,
} from 'antd';
import { useMutation } from '@tanstack/react-query';
import {
  ExperimentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { strategyAPI } from '../api';
import { useStrategyStore } from '../store';

const { RangePicker } = DatePicker;

const Backtesting: React.FC = () => {
  const [form] = Form.useForm();

  const {
    backtestConfig,
    backtestResult,
    setBacktestResult,
    backtestLoading,
    setBacktestLoading,
  } = useStrategyStore();

  // Transform frontend config to API format
  const transformConfig = (config: any) => ({
    strategy_name: config.strategy_name || 'momentum',
    start_time: config.start_time || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: config.end_time || new Date().toISOString(),
    parameters: config.parameters || [],
    initial_capital: config.initial_capital || 100000,
  });

  // Backtest mutation
  const backtestMutation = useMutation({
    mutationFn: async (config: any) => {
      const response = await strategyAPI.backtest(transformConfig(config));
      return response.data;
    },
    onSuccess: (data) => {
      setBacktestResult(data);
      message.success('回测完成');
    },
    onError: () => {
      message.error('回测失败');
    },
    onSettled: () => {
      setBacktestLoading(false);
    },
  });

  // Mock data for equity curve
  const equityData = [
    { date: '04-01', inSample: 100000, outSample: 100000 },
    { date: '04-02', inSample: 100250, outSample: 100100 },
    { date: '04-03', inSample: 100520, outSample: 100280 },
    { date: '04-04', inSample: 100480, outSample: 100150 },
    { date: '04-05', inSample: 100850, outSample: 100420 },
    { date: '04-06', inSample: 101200, outSample: 100680 },
    { date: '04-07', inSample: 101580, outSample: 100920 },
    { date: '04-08', inSample: 101350, outSample: 100750 },
    { date: '04-09', inSample: 101720, outSample: 101050 },
    { date: '04-10', inSample: 102100, outSample: 101380 },
    { date: '04-11', inSample: 102450, outSample: 101620 },
    { date: '04-12', inSample: 102380, outSample: 101580 },
    { date: '04-13', inSample: 102850, outSample: 101920 },
    { date: '04-14', inSample: 103200, outSample: 102150 },
  ];

  // Monthly returns data
  const monthlyReturns = [
    { month: '1月', inSample: '3.2%', outSample: '2.1%' },
    { month: '2月', inSample: '2.8%', outSample: '1.9%' },
    { month: '3月', inSample: '-1.2%', outSample: '-0.8%' },
    { month: '4月', inSample: '4.5%', outSample: '2.5%' },
  ];

  // Trades summary
  const tradesSummary = [
    { metric: '总交易次数', inSample: 245, outSample: 120 },
    { metric: '盈利交易', inSample: 172, outSample: 82 },
    { metric: '亏损交易', inSample: 73, outSample: 38 },
    { metric: '胜率', inSample: '70.2%', outSample: '68.3%' },
    { metric: '平均盈利', inSample: '$850', outSample: '$720' },
    { metric: '平均亏损', inSample: '-$420', outSample: '-$380' },
    { metric: '盈亏比', inSample: '2.02', outSample: '1.89' },
  ];

  const handleRunBacktest = async () => {
    setBacktestLoading(true);
    try {
      const values = await form.validateFields();
      const config = {
        strategy_name: values.strategy || 'momentum',
        start_time: values.rangePicker?.[0]?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_time: values.rangePicker?.[1]?.toISOString() || new Date().toISOString(),
        parameters: [],
        initial_capital: values.initialCapital || 100000,
      };
      backtestMutation.mutate(config);
    } catch {
      setBacktestLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setBacktestResult(null);
    message.info('参数已重置');
  };

  const summaryColumns = [
    { title: '指标', dataIndex: 'metric', key: 'metric' },
    { title: '样本内', dataIndex: 'inSample', key: 'inSample' },
    { title: '样本外', dataIndex: 'outSample', key: 'outSample' },
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
        <h1 style={{ color: '#FAFAF9', marginBottom: '24px' }}>回测分析</h1>

        {/* Parameters */}
        <Card
          title={<span style={{ color: '#FAFAF9' }}>参数设置</span>}
          bordered={false}
          style={{ background: '#1C1917', border: '1px solid #44403C' }}
          headStyle={{ borderBottom: '1px solid #44403C' }}
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={backtestConfig}
          >
            <Row gutter={16}>
              <Col xs={24} sm={12} lg={6}>
                <Form.Item label={<span style={{ color: '#A8A29E' }}>策略选择</span>} name="strategy">
                  <Select style={{ width: '100%' }}>
                    <Select.Option value="trend_v1">趋势跟踪V1</Select.Option>
                    <Select.Option value="mean_reversion">均值回归</Select.Option>
                    <Select.Option value="arbitrage">套利策略</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Form.Item label={<span style={{ color: '#A8A29E' }}>回测时间范围</span>} name="dateRange">
                  <RangePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Form.Item label={<span style={{ color: '#A8A29E' }}>初始资金</span>} name="initialCapital">
                  <InputNumber
                    min={0}
                    style={{ width: '100%', background: '#0A0A0F', borderColor: '#44403C' }}
                    formatter={(value) => `$ ${value}`}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Form.Item label={<span style={{ color: '#A8A29E' }}>交易品种</span>} name="symbol">
                  <Select style={{ width: '100%' }}>
                    <Select.Option value="XAUUSD">XAUUSD</Select.Option>
                    <Select.Option value="XAGUSD">XAGUSD</Select.Option>
                    <Select.Option value="EURUSD">EURUSD</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={12} lg={6}>
                <Form.Item label={<span style={{ color: '#A8A29E' }}>样本内比例</span>} name="inSampleRatio">
                  <InputNumber
                    min={0}
                    max={100}
                    style={{ width: '100%', background: '#0A0A0F', borderColor: '#44403C' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Form.Item label={<span style={{ color: '#A8A29E' }}>手续费</span>} name="commission">
                  <InputNumber
                    min={0}
                    style={{ width: '100%', background: '#0A0A0F', borderColor: '#44403C' }}
                    addonAfter="$/手"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Form.Item label={<span style={{ color: '#A8A29E' }}>滑点</span>} name="slippage">
                  <InputNumber
                    min={0}
                    style={{ width: '100%', background: '#0A0A0F', borderColor: '#44403C' }}
                    addonAfter="点"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Form.Item label={<span style={{ color: '#A8A29E' }}>杠杆</span>} name="leverage">
                  <InputNumber
                    min={1}
                    max={100}
                    style={{ width: '100%', background: '#0A0A0F', borderColor: '#44403C' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
          <Space style={{ marginTop: '16px' }}>
            <Button
              type="primary"
              icon={<ExperimentOutlined />}
              onClick={handleRunBacktest}
              loading={backtestLoading}
              style={{ background: '#CA8A04', borderColor: '#CA8A04' }}
            >
              运行回测
            </Button>
            <Button onClick={handleReset}>重置参数</Button>
            <Button>导入参数</Button>
            <Button>导出报告</Button>
          </Space>
        </Card>

        {/* Results */}
        {backtestResult && (
          <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ background: '#1C1917', border: '1px solid #44403C' }}>
                <Statistic
                  title={<span style={{ color: '#A8A29E' }}>总收益率</span>}
                  value={backtestResult.totalReturn}
                  precision={1}
                  suffix="%"
                  valueStyle={{ color: '#22C55E' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ background: '#1C1917', border: '1px solid #44403C' }}>
                <Statistic
                  title={<span style={{ color: '#A8A29E' }}>夏普比率</span>}
                  value={backtestResult.sharpeRatio}
                  precision={2}
                  valueStyle={{ color: '#CA8A04' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ background: '#1C1917', border: '1px solid #44403C' }}>
                <Statistic
                  title={<span style={{ color: '#A8A29E' }}>最大回撤</span>}
                  value={backtestResult.maxDrawdown}
                  precision={1}
                  suffix="%"
                  valueStyle={{ color: '#EF4444' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ background: '#1C1917', border: '1px solid #44403C' }}>
                <Statistic
                  title={<span style={{ color: '#A8A29E' }}>胜率</span>}
                  value={backtestResult.winRate}
                  precision={1}
                  suffix="%"
                  valueStyle={{ color: '#FAFAF9' }}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* Equity Curve */}
        <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
          <Col xs={24} lg={16}>
            <Card
              title={<span style={{ color: '#FAFAF9' }}>权益曲线</span>}
              bordered={false}
              style={{ background: '#1C1917', border: '1px solid #44403C' }}
              headStyle={{ borderBottom: '1px solid #44403C' }}
              extra={<LineChartOutlined style={{ color: '#CA8A04' }} />}
            >
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#44403C" />
                    <XAxis dataKey="date" stroke="#A8A29E" />
                    <YAxis stroke="#A8A29E" domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1C1917',
                        border: '1px solid #44403C',
                        color: '#FAFAF9',
                      }}
                      formatter={(value: any) => [`$${value.toLocaleString()}`, '']}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="inSample"
                      stroke="#CA8A04"
                      fill="#CA8A04"
                      fillOpacity={0.1}
                      name="样本内"
                    />
                    <Area
                      type="monotone"
                      dataKey="outSample"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.1}
                      name="样本外"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              title={<span style={{ color: '#FAFAF9' }}>月度收益对比</span>}
              bordered={false}
              style={{ background: '#1C1917', border: '1px solid #44403C' }}
              headStyle={{ borderBottom: '1px solid #44403C' }}
            >
              <Table
                columns={summaryColumns}
                dataSource={monthlyReturns.map((item, index) => ({ ...item, key: index }))}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        </Row>

        {/* Summary Table */}
        <Card
          title={<span style={{ color: '#FAFAF9' }}>交易统计</span>}
          bordered={false}
          style={{
            background: '#1C1917',
            border: '1px solid #44403C',
            marginTop: '16px',
          }}
          headStyle={{ borderBottom: '1px solid #44403C' }}
        >
          <Table
            columns={summaryColumns}
            dataSource={tradesSummary.map((item, index) => ({ ...item, key: index }))}
            pagination={false}
          />
        </Card>

        {/* Conclusion */}
        <Card
          title={<span style={{ color: '#FAFAF9' }}>回测结论</span>}
          bordered={false}
          style={{
            background: '#1C1917',
            border: '1px solid #44403C',
            marginTop: '16px',
          }}
          headStyle={{ borderBottom: '1px solid #44403C' }}
        >
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <div
                style={{
                  padding: '16px',
                  background: '#0A0A0F',
                  borderRadius: '8px',
                  border: '1px solid #44403C',
                }}
              >
                <div style={{ color: '#A8A29E', marginBottom: '8px' }}>
                  <CheckCircleOutlined style={{ color: '#22C55E', marginRight: '8px' }} />
                  稳定性评估
                </div>
                <Tag color="green">样本内外一致性良好</Tag>
                <div style={{ color: '#FAFAF9', marginTop: '8px', fontSize: '12px' }}>
                  样本内收益: 3.2% / 样本外收益: 2.15%
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div
                style={{
                  padding: '16px',
                  background: '#0A0A0F',
                  borderRadius: '8px',
                  border: '1px solid #44403C',
                }}
              >
                <div style={{ color: '#A8A29E', marginBottom: '8px' }}>
                  <CheckCircleOutlined style={{ color: '#22C55E', marginRight: '8px' }} />
                  过拟合风险
                </div>
                <Tag color="green">低风险</Tag>
                <div style={{ color: '#FAFAF9', marginTop: '8px', fontSize: '12px' }}>
                  样本外衰减: 32.8%
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div
                style={{
                  padding: '16px',
                  background: '#0A0A0F',
                  borderRadius: '8px',
                  border: '1px solid #44403C',
                }}
              >
                <div style={{ color: '#A8A29E', marginBottom: '8px' }}>
                  <CloseCircleOutlined style={{ color: '#F97316', marginRight: '8px' }} />
                  综合评级
                </div>
                <Tag color="gold">B+</Tag>
                <div style={{ color: '#FAFAF9', marginTop: '8px', fontSize: '12px' }}>
                  建议: 可考虑实盘测试
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      </div>
    </ConfigProvider>
  );
};

export default Backtesting;
// page:Backtesting
