import React, { useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Select,
  Row,
  Col,
  Statistic,
  Progress,
  Checkbox,
  ConfigProvider,
  theme,
  message,
  Modal,
  Form,
  InputNumber,
  Divider,
} from 'antd';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  LineChartOutlined,
  BarChartOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { factorAPI, strategyAPI } from '../services';
import { useFactorStore } from '../store';
import type { Factor } from '@/types';

const FactorAnalysis: React.FC = () => {
  const [form] = Form.useForm();
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);
  const {
    factors,
    setFactors,
    selectedFactors,
    setSelectedFactors,
    toggleFactor,
  } = useFactorStore();

  // Fetch factors from API
  const { isLoading } = useQuery({
    queryKey: ['factors'],
    queryFn: async () => {
      const response = await factorAPI.getFactors();
      return response.data;
    },
    onSuccess: (data) => {
      setFactors(data);
    },
  });

  // Analyze mutation
  const analyzeMutation = useMutation({
    mutationFn: async (factorNames: string[]) => {
      const response = await factorAPI.analyze({ factors: factorNames });
      return response.data;
    },
    onSuccess: () => {
      message.success('因子分析完成');
    },
  });

  // Generate strategy mutation
  const generateStrategyMutation = useMutation({
    mutationFn: async (params: {
      factor_names: string[];
      initial_capital: number;
      max_position_size: number;
      commission: number;
    }) => {
      const response = await strategyAPI.backtest({
        strategy_name: '因子选股策略',
        start_time: '2026-01-01',
        end_time: '2026-04-14',
        parameters: params.factor_names.map((name) => ({ name, value: 1 })),
        initial_capital: params.initial_capital,
      });
      return response.data;
    },
    onSuccess: () => {
      message.success('策略生成成功');
      setIsStrategyModalOpen(false);
    },
    onError: () => {
      message.error('策略生成失败');
    },
  });

  // Mock data for initial render
  const mockFactors: Factor[] = [
    { id: 1, name: 'MA5', description: '5周期移动平均', ic: 0.085, ir: 0.42, rankIC: 0.072, rankIR: 0.38, status: 'effective', selected: true },
    { id: 2, name: 'MA10', description: '10周期移动平均', ic: 0.068, ir: 0.35, rankIC: 0.061, rankIR: 0.32, status: 'effective', selected: true },
    { id: 3, name: 'MA20', description: '20周期移动平均', ic: 0.052, ir: 0.28, rankIC: 0.048, rankIR: 0.25, status: 'marginal', selected: false },
    { id: 4, name: 'VOL20', description: '20周期成交量加权', ic: 0.045, ir: 0.22, rankIC: 0.041, rankIR: 0.21, status: 'marginal', selected: false },
    { id: 5, name: 'RSI14', description: '14周期相对强弱指标', ic: 0.038, ir: 0.18, rankIC: 0.035, rankIR: 0.16, status: 'weak', selected: false },
    { id: 6, name: 'MACD', description: '异同移动平均线', ic: 0.092, ir: 0.48, rankIC: 0.085, rankIR: 0.45, status: 'effective', selected: true },
    { id: 7, name: 'BOLL', description: '布林带指标', ic: 0.031, ir: 0.15, rankIC: 0.028, rankIR: 0.13, status: 'weak', selected: false },
    { id: 8, name: 'KDJ', description: '随机指标', ic: 0.055, ir: 0.26, rankIC: 0.051, rankIR: 0.24, status: 'marginal', selected: false },
  ];

  // Extended factor type with IC_T and Decay
  interface ExtendedFactor extends Factor {
    icMean: number;
    icT: number;
    decay: number;
  }

  const mockExtendedFactors: ExtendedFactor[] = mockFactors.map((f) => ({
    ...f,
    icMean: f.ic * (0.9 + Math.random() * 0.2),
    icT: f.ir * 1.2,
    decay: Math.floor(Math.random() * 10) + 5,
  }));

  const displayFactors = factors.length > 0 ? mockExtendedFactors : mockExtendedFactors;

  // IC time series data
  const icTimeSeriesData = [
    { date: '04-01', ma5: 0.08, ma10: 0.06, macd: 0.09 },
    { date: '04-02', ma5: 0.07, ma10: 0.05, macd: 0.10 },
    { date: '04-03', ma5: 0.09, ma10: 0.07, macd: 0.08 },
    { date: '04-04', ma5: 0.06, ma10: 0.04, macd: 0.11 },
    { date: '04-05', ma5: 0.10, ma10: 0.08, macd: 0.09 },
    { date: '04-06', ma5: 0.08, ma10: 0.06, macd: 0.12 },
    { date: '04-07', ma5: 0.07, ma10: 0.05, macd: 0.10 },
    { date: '04-08', ma5: 0.09, ma10: 0.07, macd: 0.11 },
    { date: '04-09', ma5: 0.06, ma10: 0.04, macd: 0.09 },
    { date: '04-10', ma5: 0.08, ma10: 0.06, macd: 0.10 },
  ];

  // Group backtest returns
  const groupReturnsData = [
    { group: 'Q1(高)', returns: 12.5 },
    { group: 'Q2', returns: 8.3 },
    { group: 'Q3', returns: 4.2 },
    { group: 'Q4(低)', returns: -2.1 },
  ];

  const columns = [
    {
      title: '因子名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Tag icon={<ThunderboltOutlined />} color="gold">
          {text}
        </Tag>
      ),
    },
    { title: '描述', dataIndex: 'description', key: 'description' },
    {
      title: 'IC Mean',
      dataIndex: 'icMean',
      key: 'icMean',
      render: (val: number) => <span style={{ color: val > 0.05 ? '#22C55E' : '#EF4444' }}>{val.toFixed(4)}</span>,
    },
    {
      title: 'IC_T',
      dataIndex: 'icT',
      key: 'icT',
      render: (val: number) => <span style={{ color: val > 0.5 ? '#22C55E' : val > 0.3 ? '#F97316' : '#EF4444' }}>{val.toFixed(3)}</span>,
    },
    {
      title: 'Decay Period',
      dataIndex: 'decay',
      key: 'decay',
      render: (val: number) => <span style={{ color: '#A8A29E' }}>{val}天</span>,
    },
    {
      title: 'IC',
      dataIndex: 'ic',
      key: 'ic',
      render: (val: number) => <span style={{ color: val > 0.05 ? '#22C55E' : '#EF4444' }}>{val.toFixed(3)}</span>,
    },
    {
      title: 'IR',
      dataIndex: 'ir',
      key: 'ir',
      render: (val: number) => <span style={{ color: val > 0.3 ? '#22C55E' : '#EF4444' }}>{val.toFixed(2)}</span>,
    },
    {
      title: 'RankIC',
      dataIndex: 'rankIC',
      key: 'rankIC',
      render: (val: number) => <span style={{ color: val > 0.05 ? '#22C55E' : '#EF4444' }}>{val.toFixed(3)}</span>,
    },
    {
      title: 'RankIR',
      dataIndex: 'rankIR',
      key: 'rankIR',
      render: (val: number) => <span style={{ color: val > 0.3 ? '#22C55E' : '#EF4444' }}>{val.toFixed(2)}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config: Record<string, { color: string; label: string }> = {
          effective: { color: 'green', label: '有效' },
          marginal: { color: 'orange', label: '边缘' },
          weak: { color: 'red', label: '弱' },
        };
        return <Tag color={config[status]?.color}>{config[status]?.label}</Tag>;
      },
    },
    {
      title: '选择',
      dataIndex: 'selected',
      key: 'selected',
      render: (_: boolean, record: ExtendedFactor) => (
        <Checkbox
          checked={selectedFactors.includes(record.name)}
          onChange={() => toggleFactor(record.name)}
        />
      ),
    },
  ];

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const effectiveFactors = displayFactors
        .filter((f) => f.status === 'effective')
        .map((f) => f.name);
      setSelectedFactors(effectiveFactors);
    } else {
      setSelectedFactors([]);
    }
  };

  const handleSaveConfig = () => {
    analyzeMutation.mutate(selectedFactors);
    message.success('因子配置已保存');
  };

  const handleGenerateStrategy = () => {
    if (selectedFactors.length === 0) {
      message.warning('请先选择至少一个因子');
      return;
    }
    setIsStrategyModalOpen(true);
  };

  const handleStrategySubmit = (values: { initial_capital: number; max_position_size: number; commission: number }) => {
    generateStrategyMutation.mutate({
      factor_names: selectedFactors,
      ...values,
    });
  };

  const effectiveCount = displayFactors.filter((f) => f.status === 'effective').length;
  const avgIC = displayFactors
    .filter((f) => selectedFactors.includes(f.name))
    .reduce((sum, f) => sum + f.icMean, 0) / (selectedFactors.length || 1);
  const avgIR = displayFactors
    .filter((f) => selectedFactors.includes(f.name))
    .reduce((sum, f) => sum + f.ir, 0) / (selectedFactors.length || 1);
  const avgDecay = displayFactors
    .filter((f) => selectedFactors.includes(f.name))
    .reduce((sum, f) => sum + f.decay, 0) / (selectedFactors.length || 1);

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
        <h1 style={{ color: '#FAFAF9', marginBottom: '24px' }}>量化因子分析</h1>

        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ background: '#1C1917', border: '1px solid #44403C' }}>
              <Statistic
                title={<span style={{ color: '#A8A29E' }}>候选因子数</span>}
                value={displayFactors.length}
                prefix={<ThunderboltOutlined style={{ color: '#CA8A04' }} />}
                valueStyle={{ color: '#FAFAF9' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ background: '#1C1917', border: '1px solid #44403C' }}>
              <Statistic
                title={<span style={{ color: '#A8A29E' }}>有效因子数</span>}
                value={effectiveCount}
                prefix={<CheckCircleOutlined style={{ color: '#22C55E' }} />}
                valueStyle={{ color: '#22C55E' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ background: '#1C1917', border: '1px solid #44403C' }}>
              <Statistic
                title={<span style={{ color: '#A8A29E' }}>已选因子数</span>}
                value={selectedFactors.length}
                valueStyle={{ color: '#CA8A04' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ background: '#1C1917', border: '1px solid #44403C' }}>
              <Statistic
                title={<span style={{ color: '#A8A29E' }}>因子IC均值</span>}
                value={avgIC}
                precision={4}
                valueStyle={{ color: '#FAFAF9' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card
              title={<span style={{ color: '#FAFAF9' }}>候选因子列表</span>}
              bordered={false}
              style={{ background: '#1C1917', border: '1px solid #44403C' }}
              headStyle={{ borderBottom: '1px solid #44403C' }}
              extra={
                <Space>
                  <Checkbox onChange={(e) => handleSelectAll(e.target.checked)}>
                    全选有效因子
                  </Checkbox>
                  <Select
                    mode="multiple"
                    placeholder="选择显示的因子"
                    value={selectedFactors}
                    onChange={setSelectedFactors}
                    style={{ minWidth: 200 }}
                  >
                    {displayFactors.map((f) => (
                      <Select.Option key={f.name} value={f.name}>
                        {f.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Space>
              }
            >
              <Table
                columns={columns}
                dataSource={displayFactors}
                pagination={false}
                rowKey="id"
                size="small"
                loading={isLoading}
                scroll={{ x: 'max-content' }}
              />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              title={<span style={{ color: '#FAFAF9' }}>IC时序图</span>}
              bordered={false}
              style={{ background: '#1C1917', border: '1px solid #44403C' }}
              headStyle={{ borderBottom: '1px solid #44403C' }}
              extra={<LineChartOutlined style={{ color: '#CA8A04' }} />}
            >
              <div style={{ height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={icTimeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#44403C" />
                    <XAxis dataKey="date" stroke="#A8A29E" />
                    <YAxis stroke="#A8A29E" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1C1917',
                        border: '1px solid #44403C',
                        color: '#FAFAF9',
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="ma5" stroke="#CA8A04" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="ma10" stroke="#3B82F6" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="macd" stroke="#22C55E" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card
              title={<span style={{ color: '#FAFAF9' }}>分组回测收益</span>}
              bordered={false}
              style={{
                background: '#1C1917',
                border: '1px solid #44403C',
                marginTop: '16px',
              }}
              headStyle={{ borderBottom: '1px solid #44403C' }}
              extra={<BarChartOutlined style={{ color: '#CA8A04' }} />}
            >
              <div style={{ height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={groupReturnsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#44403C" />
                    <XAxis dataKey="group" stroke="#A8A29E" />
                    <YAxis stroke="#A8A29E" tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1C1917',
                        border: '1px solid #44403C',
                        color: '#FAFAF9',
                      }}
                      formatter={(value: any) => [`${value}%`, '收益率']}
                    />
                    <Bar dataKey="returns" fill="#CA8A04" radius={[4, 4, 0, 0]}>
                      {groupReturnsData.map((entry, index) => (
                        <Bar key={`cell-${index}`} fill={entry.returns >= 0 ? '#22C55E' : '#EF4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
        </Row>

        <Card
          title={<span style={{ color: '#FAFAF9' }}>已选因子配置</span>}
          bordered={false}
          style={{
            background: '#1C1917',
            border: '1px solid #44403C',
            marginTop: '16px',
          }}
          headStyle={{ borderBottom: '1px solid #44403C' }}
          extra={
            <Space>
              <Button
                onClick={() => {
                  setSelectedFactors([]);
                  setFactors(mockFactors);
                }}
              >
                重置
              </Button>
              <Button
                type="primary"
                onClick={handleSaveConfig}
                style={{ background: '#CA8A04', borderColor: '#CA8A04' }}
              >
                保存配置
              </Button>
              <Button
                type="primary"
                icon={<ExperimentOutlined />}
                onClick={handleGenerateStrategy}
                style={{ background: '#22C55E', borderColor: '#22C55E' }}
                disabled={selectedFactors.length === 0}
              >
                生成策略
              </Button>
            </Space>
          }
        >
          <Row gutter={16}>
            <Col span={6}>
              <div style={{ color: '#A8A29E', marginBottom: '8px' }}>已选因子</div>
              <div style={{ color: '#FAFAF9', fontSize: '18px', fontWeight: 'bold' }}>
                {selectedFactors.length} 个
              </div>
            </Col>
            <Col span={6}>
              <div style={{ color: '#A8A29E', marginBottom: '8px' }}>平均IC Mean</div>
              <div style={{ color: '#22C55E', fontSize: '18px', fontWeight: 'bold' }}>
                {avgIC.toFixed(4)}
              </div>
            </Col>
            <Col span={6}>
              <div style={{ color: '#A8A29E', marginBottom: '8px' }}>平均IR</div>
              <div style={{ color: '#22C55E', fontSize: '18px', fontWeight: 'bold' }}>
                {avgIR.toFixed(2)}
              </div>
            </Col>
            <Col span={6}>
              <div style={{ color: '#A8A29E', marginBottom: '8px' }}>平均Decay</div>
              <div style={{ color: '#FAFAF9', fontSize: '18px', fontWeight: 'bold' }}>
                {avgDecay.toFixed(1)} 天
              </div>
            </Col>
          </Row>
          <Progress
            percent={Math.round((selectedFactors.length / displayFactors.length) * 100)}
            strokeColor="#CA8A04"
            trailColor="#44403C"
            style={{ marginTop: '16px' }}
          />
        </Card>

        <Modal
          title={<span style={{ color: '#FAFAF9' }}>生成交易策略</span>}
          open={isStrategyModalOpen}
          onCancel={() => setIsStrategyModalOpen(false)}
          footer={null}
          styles={{
            content: { backgroundColor: '#1C1917', border: '1px solid #44403C' },
            header: { backgroundColor: '#1C1917', borderBottom: '1px solid #44403C' },
          }}
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              initial_capital: 100000,
              max_position_size: 10,
              commission: 0.0003,
            }}
            onFinish={handleStrategySubmit}
          >
            <Divider style={{ color: '#A8A29E' }}>策略参数</Divider>

            <Form.Item label={<span style={{ color: '#A8A29E' }}>初始资金</span>} name="initial_capital">
              <InputNumber
                style={{ width: '100%', background: '#0A0A0F', borderColor: '#44403C' }}
                min={10000}
                step={10000}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => Number(value!.replace(/,/g, ''))}
              />
            </Form.Item>

            <Form.Item label={<span style={{ color: '#A8A29E' }}>最大仓位 (%)</span>} name="max_position_size">
              <InputNumber
                style={{ width: '100%', background: '#0A0A0F', borderColor: '#44403C' }}
                min={1}
                max={100}
                step={1}
              />
            </Form.Item>

            <Form.Item label={<span style={{ color: '#A8A29E' }}>手续费率</span>} name="commission">
              <InputNumber
                style={{ width: '100%', background: '#0A0A0F', borderColor: '#44403C' }}
                min={0}
                max={0.01}
                step={0.0001}
                precision={4}
              />
            </Form.Item>

            <Divider style={{ color: '#A8A29E' }}>选中的因子</Divider>
            <div style={{ marginBottom: '16px' }}>
              {selectedFactors.map((name) => (
                <Tag key={name} color="gold" style={{ marginBottom: '4px' }}>
                  {name}
                </Tag>
              ))}
            </div>

            <Form.Item>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={() => setIsStrategyModalOpen(false)}>取消</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={generateStrategyMutation.isPending}
                  style={{ background: '#22C55E', borderColor: '#22C55E' }}
                >
                  生成
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default FactorAnalysis;
// page:FactorAnalysis
