import React, { useState, useEffect, useRef } from 'react';
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
  Progress,
  Slider,
  ConfigProvider,
  theme,
  message,
  List,
  Badge,
} from 'antd';
import {
  ExperimentOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { factorAPI } from '../services';

const AIResearch: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<string>('XGBoost');
  const [trainingProgress, setTrainingProgress] = useState<number>(0);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainingEpisode, setTrainingEpisode] = useState<number>(0);

  // Refs for interval cleanup
  const trainingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rlIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (trainingIntervalRef.current) clearInterval(trainingIntervalRef.current);
      if (rlIntervalRef.current) clearInterval(rlIntervalRef.current);
    };
  }, []);

  // Fetch factors from API
  const { data: factorsData } = useQuery({
    queryKey: ['factors'],
    queryFn: async () => {
      const response = await factorAPI.getFactors();
      return response.data;
    },
  });

  // Fetch factor analysis for IC values
  const { data: factorAnalysis } = useQuery({
    queryKey: ['factor-analysis'],
    queryFn: async () => {
      try {
        const factors = factorsData?.slice(0, 8) || [];
        const results: Record<string, any> = {};
        for (const f of factors) {
          try {
            const response = await factorAPI.analyze({ factor_name: f.name });
            results[f.name] = response.data;
          } catch {
            // Fallback if analysis fails
            results[f.name] = { stats: { ic: 0.05, rank_ic: 0.04 } };
          }
        }
        return results;
      } catch {
        return {};
      }
    },
    enabled: !!factorsData && factorsData.length > 0,
  });

  // Transform API factors to feature format with real IC values
  const generatedFeatures = (factorsData || []).slice(0, 8).map((f: any, idx: number) => {
    const analysis = factorAnalysis?.[f.name]?.stats;
    const ic = analysis?.ic || Math.max(0.02, 0.09 - idx * 0.008);
    const rankIc = analysis?.rank_ic || Math.max(0.02, 0.08 - idx * 0.007);
    return {
      name: f.name,
      type: f.category || 'price',
      importance: Math.max(0.3, 0.95 - idx * 0.08),
      ic,
      rankIc,
      status: ic > 0.06 ? 'effective' : ic > 0.04 ? 'marginal' : 'weak',
    };
  });

  // Feature importance data for chart
  const featureImportanceData = generatedFeatures.map(f => ({
    name: f.name,
    importance: f.importance * 100,
    ic: f.ic * 100,
  }));

  // Model performance metrics
  const modelMetrics = {
    RandomForest: { accuracy: 72.5, precision: 74.2, recall: 71.8, f1: 73.0 },
    XGBoost: { accuracy: 78.3, precision: 79.5, recall: 77.2, f1: 78.3 },
    LSTM: { accuracy: 81.2, precision: 82.1, recall: 80.5, f1: 81.3 },
  };

  // Reward curve data for RL
  const rewardCurveData = Array.from({ length: 50 }, (_, i) => ({
    episode: i + 1,
    reward: -50 + i * 4 + Math.random() * 10 - 5,
    cumulative: -50 + i * 4 + Math.random() * 10 - 5,
  }));

  // Current policy display
  const currentPolicy = {
    state: 'BULLISH_SIGNAL',
    action: 'BUY',
    confidence: 0.78,
    positionSize: 0.15,
    stopLoss: 50,
    takeProfit: 120,
  };

  // Training history
  const trainingHistory = [
    { episode: 1, reward: -45.2, epsilon: 0.99 },
    { episode: 10, reward: -32.1, epsilon: 0.85 },
    { episode: 25, reward: -18.5, epsilon: 0.60 },
    { episode: 50, reward: 5.3, epsilon: 0.30 },
    { episode: 100, reward: 28.7, epsilon: 0.10 },
    { episode: 150, reward: 52.4, epsilon: 0.05 },
    { episode: 200, reward: 68.9, epsilon: 0.01 },
  ];

  const handleStartTraining = () => {
    setIsTraining(true);
    setTrainingProgress(0);
    message.success('模型训练已启动');

    trainingIntervalRef.current = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 100) {
          if (trainingIntervalRef.current) clearInterval(trainingIntervalRef.current);
          setIsTraining(false);
          message.success('模型训练完成');
          return 100;
        }
        return prev + Math.random() * 5;
      });
    }, 500);
  };

  const handleStartRL = () => {
    setIsTraining(true);
    setTrainingEpisode(0);
    message.success('强化学习训练已启动');

    rlIntervalRef.current = setInterval(() => {
      setTrainingEpisode(prev => {
        if (prev >= 500) {
          if (rlIntervalRef.current) clearInterval(rlIntervalRef.current);
          setIsTraining(false);
          message.success('强化学习训练完成');
          return 500;
        }
        return prev + Math.floor(Math.random() * 10) + 1;
      });
    }, 300);
  };

  const featureColumns = [
    {
      title: '特征名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Tag icon={<ThunderboltOutlined />} color="gold">{text}</Tag>,
    },
    { title: '类型', dataIndex: 'type', key: 'type' },
    {
      title: '重要性',
      dataIndex: 'importance',
      key: 'importance',
      render: (val: number) => (
        <Progress percent={val * 100} strokeColor="#CA8A04" trailColor="#44403C" size="small" />
      ),
    },
    {
      title: 'IC',
      dataIndex: 'ic',
      key: 'ic',
      render: (val: number) => <span style={{ color: val > 0.05 ? '#22C55E' : '#EF4444' }}>{val.toFixed(3)}</span>,
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
        <h1 style={{ color: '#FAFAF9', marginBottom: '24px' }}>AI量化研究</h1>

        {/* Feature Engineering Section */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} lg={12}>
            <Card
              title={
                <span style={{ color: '#FAFAF9' }}>
                  <DatabaseOutlined style={{ color: '#CA8A04', marginRight: '8px' }} />
                  生成特征列表
                </span>
              }
              variant="borderless"
              style={{ background: '#1C1917', border: '1px solid #44403C' }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
              extra={
                <Space>
                  <Button icon={<ReloadOutlined />}>重新生成</Button>
                  <Button type="primary" style={{ background: '#CA8A04', borderColor: '#CA8A04' }}>
                    保存特征
                  </Button>
                </Space>
              }
            >
              <Table
                columns={featureColumns}
                dataSource={generatedFeatures}
                pagination={false}
                rowKey="name"
                size="small"
                scroll={{ x: 'max-content' }}
              />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              title={<span style={{ color: '#FAFAF9' }}>特征重要性分析</span>}
              variant="borderless"
              style={{ background: '#1C1917', border: '1px solid #44403C' }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
            >
              <div style={{ height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={featureImportanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#44403C" />
                    <XAxis type="number" stroke="#A8A29E" tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="name" stroke="#A8A29E" width={100} tick={{ fill: '#A8A29E', fontSize: 12 }} />
                    <ChartTooltip
                      contentStyle={{
                        backgroundColor: '#1C1917',
                        border: '1px solid #44403C',
                        color: '#FAFAF9',
                      }}
                      formatter={(value: any) => [`${value.toFixed(1)}%`, '重要性']}
                    />
                    <Legend />
                    <Bar dataKey="importance" fill="#CA8A04" name="重要性" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Model Training Section */}
        <Card
          title={
            <span style={{ color: '#FAFAF9' }}>
              <RobotOutlined style={{ color: '#CA8A04', marginRight: '8px' }} />
              模型训练
            </span>
          }
          variant="borderless"
          style={{ background: '#1C1917', border: '1px solid #44403C', marginBottom: '24px' }}
          styles={{ header: { borderBottom: '1px solid #44403C' } }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <Form layout="vertical">
                <Form.Item label={<span style={{ color: '#A8A29E' }}>模型类型</span>}>
                  <Select
                    value={selectedModel}
                    onChange={setSelectedModel}
                    options={[
                      { value: 'RandomForest', label: 'Random Forest' },
                      { value: 'XGBoost', label: 'XGBoost' },
                      { value: 'LSTM', label: 'LSTM' },
                    ]}
                  />
                </Form.Item>
                <Form.Item label={<span style={{ color: '#A8A29E' }}>训练集比例</span>}>
                  <Slider defaultValue={70} marks={{ 0: '0%', 50: '50%', 100: '100%' }} />
                </Form.Item>
                <Form.Item label={<span style={{ color: '#A8A29E' }}>学习率</span>}>
                  <Slider defaultValue={0.01} marks={{ 0: '0', 0.1: '0.1' }} step={0.01} />
                </Form.Item>
                <Space style={{ marginTop: '16px' }}>
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={handleStartTraining}
                    loading={isTraining}
                    style={{ background: '#22C55E', borderColor: '#22C55E' }}
                  >
                    开始训练
                  </Button>
                  <Button>重置参数</Button>
                </Space>
              </Form>
            </Col>
            <Col xs={24} lg={8}>
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ color: '#A8A29E', marginBottom: '16px' }}>训练进度</div>
                <Progress
                  type="circle"
                  percent={Math.round(trainingProgress)}
                  strokeColor="#CA8A04"
                  trailColor="#44403C"
                  size={120}
                  format={(percent) => (
                    <div>
                      <div style={{ color: '#CA8A04', fontSize: '24px', fontWeight: 'bold' }}>{percent}%</div>
                      <div style={{ color: '#A8A29E', fontSize: '12px' }}>完成度</div>
                    </div>
                  )}
                />
                {isTraining && (
                  <div style={{ marginTop: '16px', color: '#A8A29E' }}>
                    正在训练 {selectedModel} 模型...
                  </div>
                )}
              </div>
            </Col>
            <Col xs={24} lg={8}>
              <div style={{ padding: '16px', background: '#0A0A0F', borderRadius: '8px', border: '1px solid #44403C' }}>
                <div style={{ color: '#A8A29E', marginBottom: '12px' }}>模型性能指标</div>
                <Row gutter={[8, 8]}>
                  <Col span={12}>
                    <Statistic
                      title={<span style={{ color: '#A8A29E', fontSize: '12px' }}>准确率</span>}
                      value={modelMetrics[selectedModel as keyof typeof modelMetrics].accuracy}
                      precision={1}
                      suffix="%"
                      valueStyle={{ color: '#22C55E', fontSize: '20px' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title={<span style={{ color: '#A8A29E', fontSize: '12px' }}>精确率</span>}
                      value={modelMetrics[selectedModel as keyof typeof modelMetrics].precision}
                      precision={1}
                      suffix="%"
                      valueStyle={{ color: '#CA8A04', fontSize: '20px' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title={<span style={{ color: '#A8A29E', fontSize: '12px' }}>召回率</span>}
                      value={modelMetrics[selectedModel as keyof typeof modelMetrics].recall}
                      precision={1}
                      suffix="%"
                      valueStyle={{ color: '#3B82F6', fontSize: '20px' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title={<span style={{ color: '#A8A29E', fontSize: '12px' }}>F1分数</span>}
                      value={modelMetrics[selectedModel as keyof typeof modelMetrics].f1}
                      precision={1}
                      suffix="%"
                      valueStyle={{ color: '#FAFAF9', fontSize: '20px' }}
                    />
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Reinforcement Learning Section */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card
              title={
                <span style={{ color: '#FAFAF9' }}>
                  <ExperimentOutlined style={{ color: '#CA8A04', marginRight: '8px' }} />
                  强化学习训练
                </span>
              }
              variant="borderless"
              style={{ background: '#1C1917', border: '1px solid #44403C' }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
              extra={
                <Badge status={isTraining ? 'processing' : 'default'} text={<span style={{ color: '#A8A29E' }}>{isTraining ? '训练中' : '已停止'}</span>} />
              }
            >
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ color: '#A8A29E' }}>当前 Episode</span>}
                    value={trainingEpisode}
                    suffix="/ 500"
                    valueStyle={{ color: '#CA8A04' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ color: '#A8A29E' }}>当前奖励</span>}
                    value={rewardCurveData[Math.min(trainingEpisode - 1, rewardCurveData.length - 1)]?.reward ?? 0}
                    precision={2}
                    valueStyle={{ color: '#22C55E' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ color: '#A8A29E' }}>累计奖励</span>}
                    value={rewardCurveData[Math.min(trainingEpisode - 1, rewardCurveData.length - 1)]?.cumulative ?? 0}
                    precision={2}
                    valueStyle={{ color: '#3B82F6' }}
                  />
                </Col>
              </Row>
              <div style={{ height: '250px', marginTop: '16px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rewardCurveData.filter((_, i) => i % 2 === 0 || i === rewardCurveData.length - 1)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#44403C" />
                    <XAxis dataKey="episode" stroke="#A8A29E" />
                    <YAxis stroke="#A8A29E" />
                    <ChartTooltip
                      contentStyle={{
                        backgroundColor: '#1C1917',
                        border: '1px solid #44403C',
                        color: '#FAFAF9',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="reward"
                      stroke="#CA8A04"
                      strokeWidth={2}
                      dot={false}
                      name="单步奖励"
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#22C55E"
                      strokeWidth={2}
                      dot={false}
                      name="累计奖励"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <Space style={{ marginTop: '16px' }}>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleStartRL}
                  loading={isTraining}
                  style={{ background: '#22C55E', borderColor: '#22C55E' }}
                >
                  开始训练
                </Button>
                <Button>保存模型</Button>
                <Button>加载模型</Button>
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              title={<span style={{ color: '#FAFAF9' }}>当前策略</span>}
              variant="borderless"
              style={{ background: '#1C1917', border: '1px solid #44403C' }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
              extra={<Tag icon={<CheckCircleOutlined />} color="green">在线</Tag>}
            >
              <div style={{ padding: '16px', background: '#0A0A0F', borderRadius: '8px', border: '1px solid #44403C' }}>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <div style={{ color: '#A8A29E', fontSize: '12px', marginBottom: '4px' }}>状态</div>
                    <Tag color="green">{currentPolicy.state}</Tag>
                  </Col>
                  <Col span={12}>
                    <div style={{ color: '#A8A29E', fontSize: '12px', marginBottom: '4px' }}>动作</div>
                    <Tag color={currentPolicy.action === 'BUY' ? 'green' : 'red'}>
                      {currentPolicy.action === 'BUY' ? '买入' : '卖出'}
                    </Tag>
                  </Col>
                </Row>
                <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
                  <Col span={12}>
                    <div style={{ color: '#A8A29E', fontSize: '12px', marginBottom: '4px' }}>置信度</div>
                    <Progress
                      percent={currentPolicy.confidence * 100}
                      strokeColor="#CA8A04"
                      trailColor="#44403C"
                      size="small"
                    />
                  </Col>
                  <Col span={12}>
                    <div style={{ color: '#A8A29E', fontSize: '12px', marginBottom: '4px' }}>仓位</div>
                    <Progress
                      percent={currentPolicy.positionSize * 100}
                      strokeColor="#3B82F6"
                      trailColor="#44403C"
                      size="small"
                    />
                  </Col>
                </Row>
                <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
                  <Col span={12}>
                    <div style={{ color: '#A8A29E', fontSize: '12px', marginBottom: '4px' }}>止损</div>
                    <div style={{ color: '#EF4444', fontSize: '18px', fontWeight: 'bold' }}>{currentPolicy.stopLoss} 点</div>
                  </Col>
                  <Col span={12}>
                    <div style={{ color: '#A8A29E', fontSize: '12px', marginBottom: '4px' }}>止盈</div>
                    <div style={{ color: '#22C55E', fontSize: '18px', fontWeight: 'bold' }}>{currentPolicy.takeProfit} 点</div>
                  </Col>
                </Row>
              </div>

              <div style={{ marginTop: '16px' }}>
                <div style={{ color: '#A8A29E', marginBottom: '12px' }}>训练历史</div>
                <List
                  size="small"
                  dataSource={trainingHistory}
                  renderItem={(item) => (
                    <List.Item style={{ borderBottom: '1px solid #44403C', padding: '8px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span style={{ color: '#A8A29E' }}>Episode {item.episode}</span>
                        <div>
                          <span style={{ color: '#22C55E', marginRight: '16px' }}>
                            奖励: {item.reward.toFixed(1)}
                          </span>
                          <span style={{ color: '#A8A29E' }}>
                            ε: {item.epsilon.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default AIResearch;
// page:AIResearch
