import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Slider,
  Switch,
  InputNumber,
  Button,
  Card,
  Row,
  Col,
  Tabs,
  Space,
  Alert,
  Divider,
  Tooltip,
  Tag,
  Collapse
} from 'antd';
import {
  SaveOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ExperimentOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  CalculatorOutlined,
  LineChartOutlined,
  SettingOutlined
} from '@ant-design/icons';
import './StrategyConfigForm.css';

const { TabPane } = Tabs;
const { Option } = Select;
const { Panel } = Collapse;
const { TextArea } = Input;

interface StrategyParameter {
  name: string;
  label: string;
  type: 'number' | 'string' | 'boolean' | 'select' | 'slider';
  value: any;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ label: string; value: any }>;
  description?: string;
  required?: boolean;
  unit?: string;
}

interface StrategyConfig {
  id?: string;
  name: string;
  description: string;
  type: 'scalping' | 'trend_following' | 'gold_specific' | 'custom';
  timeframe: 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1';
  status: 'running' | 'paused' | 'stopped';
  parameters: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high';
  autoStart: boolean;
  notificationEnabled: boolean;
  maxPositions: number;
  stopLoss: number;
  takeProfit: number;
}

interface StrategyConfigFormProps {
  initialData?: Partial<StrategyConfig>;
  onSubmit?: (data: StrategyConfig) => Promise<void>;
  onCancel?: () => void;
  onTest?: (parameters: Record<string, any>) => Promise<any>;
  onOptimize?: (parameters: Record<string, any>) => Promise<any>;
  loading?: boolean;
  mode?: 'create' | 'edit' | 'clone';
}

const StrategyConfigForm: React.FC<StrategyConfigFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  onTest,
  onOptimize,
  loading = false,
  mode = 'create'
}) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('basic');
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [optimizeLoading, setOptimizeLoading] = useState(false);
  const [autoRisk, setAutoRisk] = useState(true);

  const defaultParameters: Record<StrategyConfig['type'], StrategyParameter[]> = {
    scalping: [
      { name: 'rsi_period', label: 'RSI周期', type: 'number', value: 14, min: 5, max: 30, description: '相对强弱指数计算周期' },
      { name: 'rsi_overbought', label: 'RSI超买', type: 'number', value: 70, min: 60, max: 90, description: '超买阈值' },
      { name: 'rsi_oversold', label: 'RSI超卖', type: 'number', value: 30, min: 10, max: 40, description: '超卖阈值' },
      { name: 'fastperiod', label: 'MACD快线', type: 'number', value: 12, min: 5, max: 20, description: 'MACD快速移动平均周期' },
      { name: 'slowperiod', label: 'MACD慢线', type: 'number', value: 26, min: 15, max: 35, description: 'MACD慢速移动平均周期' },
      { name: 'signalperiod', label: 'MACD信号线', type: 'number', value: 9, min: 5, max: 15, description: 'MACD信号线周期' },
      { name: 'volume_filter', label: '成交量过滤', type: 'boolean', value: true, description: '是否启用成交量过滤' },
      { name: 'min_volume_ratio', label: '最小成交量比', type: 'number', value: 1.2, min: 1.0, max: 3.0, step: 0.1, description: '最小成交量放大倍数' }
    ],
    trend_following: [
      { name: 'bollinger_period', label: '布林带周期', type: 'number', value: 20, min: 10, max: 50, description: '布林带移动平均周期' },
      { name: 'bollinger_dev', label: '布林带标准差', type: 'number', value: 2.0, min: 1.0, max: 3.0, step: 0.1, description: '布林带上轨标准偏差' },
      { name: 'atr_period', label: 'ATR周期', type: 'number', value: 14, min: 5, max: 30, description: '平均真实波幅计算周期' },
      { name: 'atr_multiplier', label: 'ATR倍数', type: 'number', value: 2.0, min: 1.0, max: 3.0, step: 0.1, description: '止损ATR倍数' },
      { name: 'breakout_confirmation', label: '突破确认', type: 'boolean', value: true, description: '是否需要连续K线突破确认' },
      { name: 'min_volatility', label: '最小波动率', type: 'number', value: 0.001, min: 0.0001, max: 0.01, step: 0.0001, description: '最小波动率要求' },
      { name: 'tick_filter', label: 'Tick过滤', type: 'boolean', value: true, description: '是否开启Tick级别过滤' }
    ],
    gold_specific: [
      { name: 'asian_session_filter', label: '亚盘时段过滤', type: 'boolean', value: true, description: '过滤亚洲时段的低波动性交易' },
      { name: 'gap_threshold', label: '跳空阈值', type: 'number', value: 0.001, min: 0.0001, max: 0.01, step: 0.0001, description: '最大允许跳空幅度' },
      { name: 'gold_volatility_factor', label: '黄金波动因子', type: 'number', value: 1.5, min: 1.0, max: 3.0, step: 0.1, description: '黄金专用波动率调整因子' },
      { name: 'intraday_limit', label: '日内限制', type: 'number', value: 5, min: 1, max: 10, description: '日内最大交易次数' },
      { name: 'news_impact_filter', label: '新闻影响过滤', type: 'boolean', value: true, description: '过滤重要经济数据发布时段' },
      { name: 'seasonal_adjustment', label: '季节性调整', type: 'boolean', value: true, description: '是否应用黄金季节性模式调整' }
    ],
    custom: [
      { name: 'custom_param1', label: '参数1', type: 'number', value: 1.0, min: 0.1, max: 10.0, step: 0.1, description: '自定义参数1' },
      { name: 'custom_param2', label: '参数2', type: 'number', value: 1.0, min: 0.1, max: 10.0, step: 0.1, description: '自定义参数2' }
    ]
  };

  const initialValues: StrategyConfig = {
    name: '',
    description: '',
    type: 'trend_following',
    timeframe: 'M15',
    status: 'stopped',
    parameters: {},
    riskLevel: 'medium',
    autoStart: false,
    notificationEnabled: true,
    maxPositions: 3,
    stopLoss: 2.0,
    takeProfit: 4.0,
    ...initialData
  };

  useEffect(() => {
    form.setFieldsValue(initialValues);

    const strategyType = initialValues.type || 'trend_following';
    const defaultParams = defaultParameters[strategyType].reduce((acc, param) => {
      acc[param.name] = param.value;
      return acc;
    }, {} as Record<string, any>);

    form.setFieldsValue({
      ...initialValues,
      parameters: { ...defaultParams, ...initialValues.parameters }
    });

    updateRiskLevel(initialValues.stopLoss || 2.0);
  }, [initialValues, form]);

  const getStrategyTypeDescription = (type: StrategyConfig['type']) => {
    const descriptions = {
      scalping: '剥头皮策略：在极短时间内捕捉微小价格波动，追求高胜率小盈利的交易方式',
      trend_following: '趋势跟踪策略：跟随主要市场趋势，在突破时进场，在趋势反转时出场',
      gold_specific: '黄金专用策略：针对黄金特殊波动特性优化的专用策略',
      custom: '自定义策略：用户自定义参数组合的策略'
    };
    return descriptions[type];
  };

  const getTimeframeDescription = (timeframe: StrategyConfig['timeframe']) => {
    const descriptions = {
      M1: '1分钟周期：高频交易，适合剥头皮策略',
      M5: '5分钟周期：中频交易，平衡反应速度与信号稳定性',
      M15: '15分钟周期：中长线交易，适合趋势策略',
      M30: '30分钟周期：长线交易，适合大幅波动行情',
      H1: '1小时周期：日间交易，适合波段操作',
      H4: '4小时周期：长线持有，适合机构策略',
      D1: '日线周期：长期投资，适合基本面分析'
    };
    return descriptions[timeframe];
  };

  const updateRiskLevel = (stopLoss: number) => {
    if (autoRisk) {
      let riskLevel: StrategyConfig['riskLevel'] = 'medium';
      if (stopLoss <= 1.0) riskLevel = 'high';
      else if (stopLoss >= 3.0) riskLevel = 'low';

      form.setFieldsValue({ riskLevel });
    }
  };

  const handleStrategyTypeChange = (value: StrategyConfig['type']) => {
    const defaultParams = defaultParameters[value].reduce((acc, param) => {
      acc[param.name] = param.value;
      return acc;
    }, {} as Record<string, any>);

    form.setFieldsValue({
      parameters: { ...defaultParams },
      type: value
    });
  };

  const handleSubmit = async (values: any) => {
    if (onSubmit) {
      const strategyData: StrategyConfig = {
        ...values,
        parameters: values.parameters || {}
      };
      await onSubmit(strategyData);
    }
  };

  const handleTestStrategy = async () => {
    if (onTest) {
      setTestLoading(true);
      try {
        const values = await form.validateFields();
        const result = await onTest(values.parameters || {});
        setTestResult(result);
      } catch (error) {
        console.error('测试策略失败:', error);
      } finally {
        setTestLoading(false);
      }
    }
  };

  const handleOptimize = async () => {
    if (onOptimize) {
      setOptimizeLoading(true);
      try {
        const values = await form.validateFields();
        const result = await onOptimize(values.parameters || {});
        // 更新表单参数为优化后的参数
        form.setFieldsValue({ parameters: result.optimizedParameters });
        message.success(`策略优化完成，预期收益提升 ${result.improvement.toFixed(1)}%`);
      } catch (error) {
        console.error('策略优化失败:', error);
      } finally {
        setOptimizeLoading(false);
      }
    }
  };

  const renderParameterField = (param: StrategyParameter) => {
    const { name, label, type, description, min, max, step, options, unit } = param;

    const formItem = (
      <Form.Item
        name={['parameters', name]}
        label={
          <Tooltip title={description}>
            <span>{label}</span>
          </Tooltip>
        }
        key={name}
        rules={param.required ? [{ required: true, message: `请输入${label}` }] : []}
      >
        {(() => {
          switch (type) {
            case 'number':
              return (
                <InputNumber
                  min={min}
                  max={max}
                  step={step || 1}
                  style={{ width: '100%' }}
                  addonAfter={unit}
                />
              );
            case 'boolean':
              return <Switch />;
            case 'select':
              return (
                <Select style={{ width: '100%' }}>
                  {options?.map(opt => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              );
            case 'slider':
              return (
                <Slider
                  min={min}
                  max={max}
                  step={step || 1}
                  marks={min && max ? { [min]: min, [max]: max } : undefined}
                />
              );
            case 'string':
            default:
              return <Input placeholder={`输入${label}`} />;
          }
        })()}
      </Form.Item>
    );

    return formItem;
  };

  const renderRiskCard = () => {
    const riskLevel = form.getFieldValue('riskLevel') || 'medium';
    const stopLoss = form.getFieldValue('stopLoss') || 2.0;
    const takeProfit = form.getFieldValue('takeProfit') || 4.0;

    const riskConfig = {
      low: { color: '#52c41a', description: '保守投资，适合长期持有' },
      medium: { color: '#faad14', description: '平衡收益与风险，适合多数投资者' },
      high: { color: '#ff4d4f', description: '激进投资，适合专业交易者' }
    };

    const config = riskConfig[riskLevel];

    return (
      <div className="risk-assessment-card" style={{ borderLeft: `4px solid ${config.color}` }}>
        <div className="risk-header">
          <SafetyOutlined style={{ color: config.color, marginRight: '8px' }} />
          <h4>风险评估</h4>
          <Tag color={config.color} style={{ marginLeft: 'auto' }}>
            {riskLevel === 'low' ? '低风险' : riskLevel === 'medium' ? '中风险' : '高风险'}
          </Tag>
        </div>
        <p style={{ color: '#8c8c8c', fontSize: '12px' }}>{config.description}</p>
        <div className="risk-parameters">
          <div className="risk-param">
            <span>止损:</span>
            <span style={{ color: '#ff4d4f' }}>{stopLoss}%</span>
          </div>
          <div className="risk-param">
            <span>止盈:</span>
            <span style={{ color: '#52c41a' }}>{takeProfit}%</span>
          </div>
          <div className="risk-param">
            <span>风险回报比:</span>
            <span>{takeProfit ? (takeProfit / stopLoss).toFixed(2) : 0}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="strategy-config-form">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={initialValues}
        className="strategy-form"
      >
        <Row gutter={[24, 24]}>
          <Col span={16}>
            <Card className="config-form-card">
              <Tabs activeKey={activeTab} onChange={setActiveTab} className="config-tabs">
                <TabPane tab="基本信息" key="basic">
                  <Form.Item
                    name="name"
                    label="策略名称"
                    rules={[{ required: true, message: '请输入策略名称' }]}
                  >
                    <Input
                      placeholder="输入策略名称"
                      maxLength={50}
                      showCount
                    />
                  </Form.Item>

                  <Form.Item
                    name="description"
                    label="策略描述"
                  >
                    <TextArea
                      placeholder="描述策略的目标、原理和适用场景"
                      rows={3}
                      maxLength={200}
                      showCount
                    />
                  </Form.Item>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="type"
                        label="策略类型"
                        rules={[{ required: true, message: '请选择策略类型' }]}
                      >
                        <Select
                          placeholder="选择策略类型"
                          onChange={handleStrategyTypeChange}
                        >
                          <Option value="scalping">剥头皮策略</Option>
                          <Option value="trend_following" default>趋势跟踪策略</Option>
                          <Option value="gold_specific">黄金专用策略</Option>
                          <Option value="custom">自定义策略</Option>
                        </Select>
                      </Form.Item>
                      {form.getFieldValue('type') && (
                        <Alert
                          message={getStrategyTypeDescription(form.getFieldValue('type'))}
                          type="info"
                          showIcon
                          style={{ marginBottom: '16px' }}
                        />
                      )}
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="timeframe"
                        label="交易周期"
                        rules={[{ required: true, message: '请选择交易周期' }]}
                      >
                        <Select placeholder="选择交易周期">
                          <Option value="M1">1分钟 (M1)</Option>
                          <Option value="M5">5分钟 (M5)</Option>
                          <Option value="M15" default>15分钟 (M15)</Option>
                          <Option value="M30">30分钟 (M30)</Option>
                          <Option value="H1">1小时 (H1)</Option>
                          <Option value="H4">4小时 (H4)</Option>
                          <Option value="D1">日线 (D1)</Option>
                        </Select>
                      </Form.Item>
                      {form.getFieldValue('timeframe') && (
                        <Alert
                          message={getTimeframeDescription(form.getFieldValue('timeframe'))}
                          type="info"
                          showIcon
                        />
                      )}
                    </Col>
                  </Row>
                </TabPane>

                <TabPane tab="核心参数" key="parameters">
                  <Form.Item
                    noStyle
                    shouldUpdate={(prev, cur) => prev.type !== cur.type}
                  >
                    {({ getFieldValue }) => {
                      const strategyType = getFieldValue('type') || 'trend_following';
                      const parameters = defaultParameters[strategyType];

                      return (
                        <div className="parameters-panel">
                          <Collapse defaultActiveKey={['basic']} ghost className="parameters-collapse">
                            {parameters.map((param, index) => (
                              <Panel
                                key={index}
                                header={
                                  <div className="parameter-header">
                                    <span style={{ fontWeight: 500 }}>{param.label}</span>
                                    <span style={{ color: '#8c8c8c', fontSize: '12px' }}>
                                      {form.getFieldValue(['parameters', param.name])} {param.unit}
                                    </span>
                                  </div>
                                }
                              >
                                {renderParameterField(param)}
                                {param.description && (
                                  <div className="parameter-description">
                                    <CalculatorOutlined style={{ marginRight: '8px' }} />
                                    {param.description}
                                  </div>
                                )}
                              </Panel>
                            ))}
                          </Collapse>
                        </div>
                      );
                    }}
                  </Form.Item>
                </TabPane>

                <TabPane tab="风险管理" key="risk">
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="riskLevel"
                        label="风险级别"
                        rules={[{ required: true, message: '请选择风险级别' }]}
                      >
                        <Select placeholder="选择风险级别">
                          <Option value="low">低风险 (保守型)</Option>
                          <Option value="medium">中风险 (平衡型)</Option>
                          <Option value="high">高风险 (激进型)</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="stopLoss"
                        label="止损比例 (%)"
                        rules={[
                          { required: true, message: '请输入止损比例' },
                          { type: 'number', min: 0.1, max: 10.0, message: '止损比例应在0.1-10%之间' }
                        ]}
                      >
                        <InputNumber
                          min={0.1}
                          max={10.0}
                          step={0.1}
                          style={{ width: '100%' }}
                          onChange={(value) => updateRiskLevel(value || 2.0)}
                          addonAfter="%"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="takeProfit"
                        label="止盈比例 (%)"
                        rules={[
                          { required: true, message: '请输入止盈比例' },
                          { type: 'number', min: 0.1, max: 20.0, message: '止盈比例应在0.1-20%之间' }
                        ]}
                      >
                        <InputNumber
                          min={0.1}
                          max={20.0}
                          step={0.1}
                          style={{ width: '100%' }}
                          addonAfter="%"
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="maxPositions"
                        label="最大持仓数"
                        rules={[{ required: true, message: '请输入最大持仓数' }]}
                      >
                        <InputNumber
                          min={1}
                          max={10}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="autoStart"
                        label="自动启动"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="notificationEnabled"
                        label="交易通知"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Divider />

                  {renderRiskCard()}
                </TabPane>

                <TabPane tab="高级设置" key="advanced">
                  <Alert
                    message="高级设置仅供经验丰富的交易者使用"
                    type="warning"
                    showIcon
                    style={{ marginBottom: '16px' }}
                  />

                  <Form.Item
                    name="advanced.custom_indicator"
                    label="自定义技术指标"
                  >
                    <Input.TextArea
                      placeholder="输入自定义指标公式 (支持Python语法)"
                      rows={5}
                    />
                  </Form.Item>

                  <Form.Item
                    name="advanced.data_filter"
                    label="数据过滤器"
                  >
                    <Select mode="multiple" placeholder="选择数据过滤条件">
                      <Option value="volume_filter">成交量过滤</Option>
                      <Option value="tick_filter">Tick过滤</Option>
                      <Option value="time_filter">时间过滤</Option>
                      <Option value="news_filter">新闻过滤</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="advanced.performance_optimization"
                    label="性能优化"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </TabPane>
              </Tabs>
            </Card>
          </Col>

          <Col span={8}>
            <Card className="preview-card" title="策略预览">
              {renderRiskCard()}

              <Divider />

              {testResult && (
                <div className="test-result-panel">
                  <h5>回测结果</h5>
                  <Row gutter={[8, 8]}>
                    <Col span={12}>
                      <div className="test-metric">
                        <div className="metric-label">总收益</div>
                        <div className="metric-value" style={{ color: testResult.totalReturn >= 0 ? '#52c41a' : '#ff4d4f' }}>
                          {testResult.totalReturn >= 0 ? '+' : ''}{testResult.totalReturn?.toFixed(2)}%
                        </div>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div className="test-metric">
                        <div className="metric-label">胜率</div>
                        <div className="metric-value">
                          {testResult.winRate?.toFixed(1)}%
                        </div>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div className="test-metric">
                        <div className="metric-label">最大回撤</div>
                        <div className="metric-value">
                          {testResult.maxDrawdown?.toFixed(2)}%
                        </div>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div className="test-metric">
                        <div className="metric-label">夏普比率</div>
                        <div className="metric-value">
                          {testResult.sharpeRatio?.toFixed(2)}
                        </div>
                      </div>
                    </Col>
                  </Row>
                </div>
              )}

              <Divider />

              <div className="form-actions">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => form.submit()}
                    loading={loading}
                    style={{ width: '100%' }}
                  >
                    {mode === 'create' ? '创建策略' : mode === 'edit' ? '保存更改' : '克隆策略'}
                  </Button>

                  <div className="action-group">
                    <Tooltip title="快速测试策略的近期表现">
                      <Button
                        icon={<PlayCircleOutlined />}
                        onClick={handleTestStrategy}
                        loading={testLoading}
                        style={{ flex: 1 }}
                      >
                        快速测试
                      </Button>
                    </Tooltip>
                    <Tooltip title="使用AI优化策略参数">
                      <Button
                        icon={<ExperimentOutlined />}
                        onClick={handleOptimize}
                        loading={optimizeLoading}
                        style={{ flex: 1 }}
                      >
                        AI优化
                      </Button>
                    </Tooltip>
                  </div>

                  {onCancel && (
                    <Button
                      onClick={onCancel}
                      disabled={loading}
                      style={{ width: '100%' }}
                    >
                      取消
                    </Button>
                  )}
                </Space>
              </div>

              {!testResult && (
                <div className="preview-placeholder">
                  <LineChartOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                  <p style={{ color: '#8c8c8c', textAlign: 'center' }}>
                    配置完成后点击"快速测试"查看策略表现
                  </p>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default StrategyConfigForm;