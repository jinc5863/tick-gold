import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Form,
  Input,
  Select,
  Slider,
  Button,
  Switch,
  Alert,
  Typography,
  Tag,
  Steps,
  Statistic,
  Divider,
  Collapse,
  Space,
  Modal,
  message
} from 'antd';
import {
  CodeOutlined,
  PlayCircleOutlined,
  DownloadOutlined,
  SettingOutlined,
  ExperimentOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import { StrategyDefinition, StrategyParameter } from '../types';
import './StrategyConfigurator.css';
import { useStrategies, useSystem } from '../store';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Step } = Steps;
const { Panel } = Collapse;

const StrategyConfigurator: React.FC = () => {
  const [form] = Form.useForm();
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyDefinition | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);

  // 从store获取数据
  const { strategies, fetchStrategies, isFetchingStrategies } = useStrategies();
  // 系统加载状态暂不使用
  // const { isLoading } = useSystem();

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  useEffect(() => {
    if (strategies.length > 0 && !selectedStrategy) {
      setSelectedStrategy(strategies[0]);
      initializeForm(strategies[0]);
    }
  }, [strategies, selectedStrategy]);

  // 移除loadStrategies函数，直接使用store的fetchStrategies

  const initializeForm = (strategy: StrategyDefinition) => {
    const initialValues: Record<string, any> = {};
    strategy.parameters.forEach(param => {
      initialValues[param.name] = param.defaultValue;
    });
    initialValues.strategyName = strategy.name;
    initialValues.symbol = 'XAUUSD';
    initialValues.timeframe = strategy.timeframe;

    form.setFieldsValue(initialValues);
  };

  const handleStrategySelect = (strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId);
    if (strategy) {
      setSelectedStrategy(strategy);
      initializeForm(strategy);
      setGeneratedCode('');
      setTestResults(null);
      setCurrentStep(0);
    }
  };

  const handleGenerateCode = async () => {
    if (!selectedStrategy) return;

    await form.validateFields();
    setGeneratingCode(true);
    setCurrentStep(1);

    try {
      // TODO: 调用实际的生成策略API
      // const values = form.getFieldsValue();
      // const response = await strategyApi.generateStrategy(
      //   values.symbol,
      //   values.timeframe,
      //   values
      // );
      // 临时使用模拟数据
      const mockResponse = {
        strategy: {
          code: generateMockStrategyCode()
        }
      };

      setGeneratedCode(mockResponse.strategy.code);
      setCurrentStep(2);
      message.success('策略代码生成成功');
    } catch (error) {
      console.error('生成策略失败:', error);
      message.error('策略生成失败，将使用模拟代码');
      setGeneratedCode(generateMockStrategyCode());
      setCurrentStep(2);
    } finally {
      setGeneratingCode(false);
    }
  };

  const generateMockStrategyCode = () => {
    const values = form.getFieldsValue();
    return `#!/usr/bin/env python3
"""
${values.strategyName || '黄金交易策略'}
时间周期: ${values.timeframe || 'M1'}
交易品种: ${values.symbol || 'XAUUSD'}
生成时间: ${new Date().toLocaleString()}
"""

import talib
import numpy as np
import pandas as pd
from typing import Dict, List, Optional

class GoldTradingStrategy:
    """黄金量化交易策略"""

    def __init__(self, params: Dict):
        self.params = params
        self.name = "${values.strategyName || '黄金策略'}"
        self.symbol = "${values.symbol || 'XAUUSD'}"
        self.timeframe = "${values.timeframe || 'M1'}"

        # 策略参数
        self.fast_period = params.get('fastperiod', ${values.fastperiod || 12})
        self.slow_period = params.get('slowperiod', ${values.slowperiod || 26})
        self.signal_period = params.get('signalperiod', ${values.signalperiod || 9})
        self.rsi_period = params.get('rsi_period', ${values.rsi_period || 14})
        self.rsi_overbought = params.get('rsi_overbought', ${values.rsi_overbought || 70})
        self.rsi_oversold = params.get('rsi_oversold', ${values.rsi_oversold || 30})

    def calculate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """计算交易信号"""

        # 计算MACD指标
        macd, macd_signal, macd_hist = talib.MACD(
            data['close'],
            fastperiod=self.fast_period,
            slowperiod=self.slow_period,
            signalperiod=self.signal_period
        )

        # 计算RSI指标
        rsi = talib.RSI(data['close'], timeperiod=self.rsi_period)

        # 初始化信号
        signals = pd.DataFrame(index=data.index)
        signals['signal'] = 0
        signals['position'] = 0

        # MACD金叉买入信号
        buy_condition = (macd > macd_signal) & (rsi < self.rsi_overbought)
        signals.loc[buy_condition, 'signal'] = 1

        # MACD死叉卖出信号
        sell_condition = (macd < macd_signal) & (rsi > self.rsi_oversold)
        signals.loc[sell_condition, 'signal'] = -1

        # RSI过滤：超买超卖区域不交易
        signals.loc[rsi > self.rsi_overbought, 'signal'] = 0
        signals.loc[rsi < self.rsi_oversold, 'signal'] = 0

        # 计算仓位
        signals['position'] = signals['signal'].cumsum()

        return signals

    def calculate_risk_metrics(self, data: pd.DataFrame, signals: pd.DataFrame) -> Dict:
        """计算风险指标"""

        returns = data['close'].pct_change()
        strategy_returns = returns * signals['signal'].shift(1)

        metrics = {
            'total_return': strategy_returns.sum() * 100,
            'sharpe_ratio': calculate_sharpe_ratio(strategy_returns),
            'max_drawdown': calculate_max_drawdown(strategy_returns) * 100,
            'win_rate': calculate_win_rate(strategy_returns),
            'total_trades': len(signals[signals['signal'] != 0])
        }

        return metrics

def calculate_sharpe_ratio(returns: pd.Series) -> float:
    """计算夏普比率"""
    if len(returns) < 2:
        return 0.0
    return returns.mean() / returns.std() * np.sqrt(252)

def calculate_max_drawdown(returns: pd.Series) -> float:
    """计算最大回撤"""
    cumulative = (1 + returns).cumprod()
    running_max = cumulative.cummax()
    drawdown = (cumulative - running_max) / running_max
    return drawdown.min()

def calculate_win_rate(returns: pd.Series) -> float:
    """计算胜率"""
    winning_trades = returns[returns > 0].count()
    total_trades = returns[returns != 0].count()
    return winning_trades / total_trades if total_trades > 0 else 0.0

# 使用示例
if __name__ == "__main__":
    # 参数配置
    params = {
        'fastperiod': ${values.fastperiod || 12},
        'slowperiod': ${values.slowperiod || 26},
        'signalperiod': ${values.signalperiod || 9},
        'rsi_period': ${values.rsi_period || 14},
        'rsi_overbought': ${values.rsi_overbought || 70},
        'rsi_oversold': ${values.rsi_oversold || 30}
    }

    # 创建策略实例
    strategy = GoldTradingStrategy(params)

    print(f"策略名称: {strategy.name}")
    print(f"交易品种: {strategy.symbol}")
    print(f"时间周期: {strategy.timeframe}")
    print("参数配置:")
    for key, value in params.items():
        print(f"  {key}: {value}")`;
  };

  const runBacktest = () => {
    setCurrentStep(3);

    // 模拟回测结果
    setTimeout(() => {
      setTestResults({
        totalReturn: 15.8,
        sharpeRatio: 1.82,
        maxDrawdown: 4.2,
        winRate: 68.5,
        totalTrades: 254,
        profitFactor: 1.95,
        averageTrade: 0.62,
        monthsProfitable: 11,
        bestTrade: 2.8,
        worstTrade: -1.5,
      });
      setCurrentStep(4);
      message.success('回测完成');
    }, 2000);
  };

  const downloadStrategy = () => {
    if (!generatedCode) {
      message.warning('请先生成策略代码');
      return;
    }

    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gold_strategy_${selectedStrategy?.name || 'custom'}_${new Date().toISOString().split('T')[0]}.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    message.success('策略已下载');
  };

  const renderParameterInput = (param: StrategyParameter) => {
    const { name, type, defaultValue, min, max, step, options, description } = param;
    const label = `${name} - ${description}`;

    switch (type) {
      case 'number':
        return (
          <Form.Item
            key={name}
            label={label}
            name={name}
            initialValue={defaultValue}
            rules={[{ required: true, message: `请输入${name}` }]}
          >
            <Slider
              min={min || 0}
              max={max || 100}
              step={step || 1}
              marks={{
                [min || 0]: min || 0,
                [max || 100]: max || 100
              }}
            />
          </Form.Item>
        );

      case 'enum':
        return (
          <Form.Item
            key={name}
            label={label}
            name={name}
            initialValue={defaultValue}
            rules={[{ required: true, message: `请选择${name}` }]}
          >
            <Select>
              {options?.map(option => (
                <Option key={option} value={option}>{option}</Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'boolean':
        return (
          <Form.Item
            key={name}
            label={label}
            name={name}
            initialValue={defaultValue}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        );

      default:
        return (
          <Form.Item
            key={name}
            label={label}
            name={name}
            initialValue={defaultValue}
            rules={[{ required: true, message: `请输入${name}` }]}
          >
            <Input placeholder={`请输入${name}`} />
          </Form.Item>
        );
    }
  };

  const steps = [
    {
      title: '选择策略',
      description: '选择基础策略模板',
    },
    {
      title: '参数配置',
      description: '调整策略参数',
    },
    {
      title: '生成代码',
      description: '生成Python代码',
    },
    {
      title: '回测测试',
      description: '验证策略效果',
    },
    {
      title: '完成',
      description: '策略就绪',
    },
  ];

  return (
    <div className="strategy-configurator">
      <Row gutter={[24, 24]}>
        {/* 左侧配置面板 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <SettingOutlined />
                <span>策略配置</span>
              </Space>
            }
            extra={
              <Select
                value={selectedStrategy?.id}
                onChange={handleStrategySelect}
                style={{ width: 200 }}
                loading={isFetchingStrategies}
                placeholder="选择策略"
              >
                {strategies.map(strategy => (
                  <Option key={strategy.id} value={strategy.id}>
                    {strategy.name}
                  </Option>
                ))}
              </Select>
            }
          >
            <Steps current={currentStep} size="small">
              {steps.map(step => (
                <Step key={step.title} title={step.title} description={step.description} />
              ))}
            </Steps>

            <Divider />

            {selectedStrategy && (
              <>
                <Collapse defaultActiveKey={['1']} ghost>
                  <Panel header="策略描述" key="1">
                    <Paragraph>{selectedStrategy.description}</Paragraph>
                    <Space size={[8, 8]} wrap>
                      <Tag icon={<ExperimentOutlined />} color="blue">
                        {selectedStrategy.symbol}
                      </Tag>
                      <Tag icon={<SafetyOutlined />} color="green">
                        {selectedStrategy.timeframe}
                      </Tag>
                      <Tag color="orange">
                        {selectedStrategy.parameters.length} 个参数
                      </Tag>
                    </Space>
                  </Panel>
                </Collapse>

                <Divider />

                <Form
                  form={form}
                  layout="vertical"
                  disabled={currentStep > 1}
                >
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Form.Item
                        label="策略名称"
                        name="strategyName"
                        rules={[{ required: true, message: '请输入策略名称' }]}
                      >
                        <Input placeholder="请输入策略名称" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="交易品种"
                        name="symbol"
                        rules={[{ required: true, message: '请选择交易品种' }]}
                      >
                        <Input placeholder="XAUUSD" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Title level={5}>策略参数</Title>
                  <Row gutter={[16, 16]}>
                    {selectedStrategy?.parameters.map(param => (
                      <Col xs={24} md={12} key={param.name}>
                        {renderParameterInput(param)}
                      </Col>
                    ))}
                  </Row>

                  <Form.Item>
                    <Space>
                      <Button
                        type="primary"
                        icon={<CodeOutlined />}
                        onClick={handleGenerateCode}
                        loading={generatingCode}
                        disabled={currentStep > 1}
                      >
                        生成策略代码
                      </Button>
                      <Button
                        icon={<PlayCircleOutlined />}
                        onClick={runBacktest}
                        disabled={!generatedCode || currentStep < 2}
                      >
                        运行回测
                      </Button>
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={downloadStrategy}
                        disabled={!generatedCode}
                      >
                        下载策略
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </>
            )}
          </Card>

          {/* 回测结果 */}
          {testResults && (
            <Card title="回测结果" style={{ marginTop: 24 }}>
              <Row gutter={[24, 24]}>
                <Col xs={12} sm={8}>
                  <Statistic
                    title="总收益率"
                    value={testResults.totalReturn}
                    suffix="%"
                    precision={2}
                    valueStyle={{ color: testResults.totalReturn > 0 ? '#3f8600' : '#cf1322' }}
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <Statistic
                    title="夏普比率"
                    value={testResults.sharpeRatio}
                    precision={2}
                    valueStyle={{ color: testResults.sharpeRatio > 1.5 ? '#3f8600' : '#fa8c16' }}
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <Statistic
                    title="最大回撤"
                    value={testResults.maxDrawdown}
                    suffix="%"
                    precision={2}
                    valueStyle={{ color: testResults.maxDrawdown > 10 ? '#cf1322' : '#3f8600' }}
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <Statistic
                    title="胜率"
                    value={testResults.winRate}
                    suffix="%"
                    precision={1}
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <Statistic
                    title="总交易次数"
                    value={testResults.totalTrades}
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <Statistic
                    title="盈利因子"
                    value={testResults.profitFactor}
                    precision={2}
                  />
                </Col>
              </Row>
            </Card>
          )}
        </Col>

        {/* 右侧代码预览 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <CodeOutlined />
                <span>生成的策略代码</span>
                {generatedCode && (
                  <Tag color="success">
                    {selectedStrategy?.timeframe} | {selectedStrategy?.symbol}
                  </Tag>
                )}
              </Space>
            }
            extra={
              <Button
                type="link"
                onClick={() => setPreviewModalVisible(true)}
                disabled={!generatedCode}
              >
                全屏预览
              </Button>
            }
          >
            {generatedCode ? (
              <div className="code-preview">
                <pre>{generatedCode}</pre>
              </div>
            ) : (
              <div className="code-placeholder">
                <Alert
                  message="尚未生成策略代码"
                  description="请先在左侧配置策略参数，然后点击'生成策略代码'按钮"
                  type="info"
                  showIcon
                />
              </div>
            )}
          </Card>

          {/* 风险提示 */}
          <Card title="风险提示" style={{ marginTop: 24 }}>
            <Alert
              message="重要风险提示"
              description={
                <ul>
                  <li>本策略仅在历史数据中测试，不代表未来表现</li>
                  <li>实盘交易前请充分测试，谨慎评估风险</li>
                  <li>建议初始仓位不超过总资金的2%</li>
                  <li>请设置合适的止损止盈，控制风险敞口</li>
                  <li>市场波动加剧时，策略可能会失效</li>
                </ul>
              }
              type="warning"
              showIcon
            />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">
                生成时间: {new Date().toLocaleString()}
                {selectedStrategy && ` | 策略模板: ${selectedStrategy.name}`}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 代码全屏预览模态框 */}
      <Modal
        title="策略代码预览"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        width="90%"
        footer={[
          <Button key="download" icon={<DownloadOutlined />} onClick={downloadStrategy}>
            下载代码
          </Button>,
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        <div className="fullscreen-code">
          <pre>{generatedCode}</pre>
        </div>
      </Modal>
    </div>
  );
};

export default StrategyConfigurator;