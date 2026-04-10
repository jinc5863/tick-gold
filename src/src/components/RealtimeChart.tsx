import React, { useEffect, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import { Card, Row, Col, Select, Button, Statistic, Spin } from 'antd';
import { ReloadOutlined, DownloadOutlined, BellOutlined } from '@ant-design/icons';
import { tickApi } from '../api';
import { GoldIndicator } from '../types';
import './RealtimeChart.css';
import { useIndicators } from '../store';

const { Option } = Select;

const timeframes = [
  { value: 'M1', label: '1分钟' },
  { value: 'M5', label: '5分钟' },
  { value: 'M15', label: '15分钟' },
  { value: 'M30', label: '30分钟' },
];

const availableIndicators = [
  { value: 'price', label: '价格', color: '#1890ff' },
  { value: 'macd', label: 'MACD', color: '#52c41a' },
  { value: 'rsi', label: 'RSI', color: '#f5222d' },
  { value: 'bollinger', label: '布林带', color: '#722ed1' },
  { value: 'volatility', label: '波动率', color: '#fa8c16' },
  { value: 'gold_volatility', label: '黄金波动率', color: '#faad14' },
  { value: 'gap_detection', label: '跳空检测', color: '#ff4d4f' },
];

const RealtimeChart: React.FC = () => {
  // 黄金专用风险配置
  const goldRiskConfig = {
    gapRisk: 0.01,      // 1% 跳空风险
    overnightRisk: 0.005, // 0.5% 隔夜风险
    maxDrawdown: 0.02,   // 2% 最大回撤
  };

  const [timeframe, setTimeframe] = useState<string>('M1');
  const [activeIndicators, setActiveIndicators] = useState<string[]>(['price', 'macd', 'rsi']);
  const [localData, setLocalData] = useState<GoldIndicator[]>([]);

  // 从store获取数据
  const {
    indicators,
    fetchIndicators,
    isFetchingIndicators: storeLoading,
    lastIndicatorsUpdate: storeLastUpdate
  } = useIndicators();

  // 派生状态
  const currentPrice = indicators.length > 0 ? indicators[indicators.length - 1].price : null;
  const lastUpdate = storeLastUpdate || new Date();

  const fetchData = useCallback(async () => {
    try {
      await fetchIndicators(timeframe);
    } catch (error) {
      console.error('获取指标数据失败:', error);
    }
  }, [fetchIndicators, timeframe]);

  const updateCurrentPrice = useCallback(() => {
    if (localData.length > 0) {
      // 创建模拟价格更新
      const lastItem = {...localData[localData.length - 1]};
      const priceChange = (Math.random() - 0.5) * 0.5; // 小幅度随机波动
      const newPrice = lastItem.price + priceChange;

      // 更新本地数据用于显示动画效果
      const updatedData = [...localData];
      updatedData[localData.length - 1] = {
        ...lastItem,
        price: newPrice,
        timestamp: new Date().toISOString(),
      };

      setLocalData(updatedData);
    }
  }, [localData]);

  // 检测跳空区域
  const detectGaps = useCallback(() => {
    if (localData.length < 2) return [];
    const gaps = [];
    for (let i = 1; i < localData.length; i++) {
      const prev = localData[i - 1];
      const curr = localData[i];
      if (prev && curr && prev.price && curr.price && prev.timestamp && curr.timestamp) {
        const change = Math.abs(curr.price - prev.price) / prev.price;
        if (change > goldRiskConfig.gapRisk) {
          gaps.push({
            x1: prev.timestamp,
            x2: curr.timestamp,
            gapSize: change
          });
        }
      }
    }
    return gaps;
  }, [localData]);

  useEffect(() => {
    fetchData();

    // 设置定时更新（根据时间周期调整更新频率）
    const intervalTime = timeframe === 'M1' ? 10000 : timeframe === 'M5' ? 30000 : 60000;
    const interval = setInterval(fetchData, intervalTime);

    // 模拟实时tick更新（更频繁）
    const tickInterval = setInterval(updateCurrentPrice, 2000);

    return () => {
      clearInterval(interval);
      clearInterval(tickInterval);
    };
  }, [timeframe, fetchData, updateCurrentPrice]);

  // 同步store中的indicators到本地数据
  useEffect(() => {
    if (indicators.length > 0) {
      setLocalData([...indicators]);
    }
  }, [indicators]);

  const handleIndicatorToggle = (indicator: string) => {
    if (activeIndicators.includes(indicator)) {
      setActiveIndicators(activeIndicators.filter(item => item !== indicator));
    } else {
      setActiveIndicators([...activeIndicators, indicator]);
    }
  };

  const handleDownloadData = () => {
    const jsonData = JSON.stringify(localData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gold_indicators_${timeframe}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 模拟黄金专用tick数据
  const sendGoldTestTick = () => {
    const goldTickData = {
      symbol: 'XAUUSD',
      asset_type: 'gold',
      timestamp: new Date().toISOString(),
      bid: (currentPrice || 2050) - 0.5,
      ask: (currentPrice || 2050) + 0.5,
      spread: 0.1,
      volume: Math.random() * 10,
      // 黄金专用字段
      asian_session: new Date().getUTCHours() >= 0 && new Date().getUTCHours() < 8,
      volatility_index: Math.random() * 3 + 0.5, // 0.5-3.5 黄金波动率指数
      gap_risk: goldRiskConfig.gapRisk,
      overnight_risk: goldRiskConfig.overnightRisk,
    };

    tickApi.sendTick(goldTickData)
      .then(response => {
        console.log('黄金测试Tick发送成功:', response);
      })
      .catch(error => {
        console.error('黄金测试Tick发送失败:', error);
      });
  };

  const formatTooltipValue = (value: any) => {
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return value;
  };

  const formatXAxis = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // 检测跳空
  const gaps = detectGaps();

  return (
    <div className="realtime-chart">
      {/* 控制面板 */}
      <Row gutter={[16, 16]} className="chart-controls">
        <Col xs={24} sm={12} md={6}>
          <div className="control-group">
            <div className="control-label">时间周期</div>
            <Select
              value={timeframe}
              onChange={setTimeframe}
              style={{ width: '100%' }}
            >
              {timeframes.map(tf => (
                <Option key={tf.value} value={tf.value}>{tf.label}</Option>
              ))}
            </Select>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div className="control-group">
            <div className="control-label">当前价格</div>
            <Statistic
              value={currentPrice || 0}
              precision={2}
              prefix="$"
              valueStyle={{ color: currentPrice && currentPrice > 2050 ? '#3f8600' : '#cf1322' }}
            />
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div className="control-group">
            <div className="control-label">操作</div>
            <Row gutter={8}>
              <Col span={8}>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchData}
                  loading={storeLoading}
                  block
                  size="small"
                >
                  刷新
                </Button>
              </Col>
              <Col span={8}>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadData}
                  block
                  size="small"
                >
                  下载
                </Button>
              </Col>
              <Col span={8}>
                <Button
                  icon={<BellOutlined />}
                  onClick={sendGoldTestTick}
                  block
                  size="small"
                  type="primary"
                >
                  黄金Tick
                </Button>
              </Col>
            </Row>
          </div>
        </Col>

              </Row>

      {/* 指标切换 */}
      <Row gutter={[8, 8]} className="indicator-selector">
        <Col span={24}>
          <div className="control-label">显示指标</div>
          <div className="indicator-buttons">
            {availableIndicators.map(indicator => (
              <Button
                key={indicator.value}
                type={activeIndicators.includes(indicator.value) ? 'primary' : 'default'}
                style={{
                  backgroundColor: activeIndicators.includes(indicator.value) ? indicator.color : undefined,
                  borderColor: indicator.color,
                }}
                size="small"
                onClick={() => handleIndicatorToggle(indicator.value)}
              >
                {indicator.label}
              </Button>
            ))}
          </div>
        </Col>
      </Row>

      {/* 价格图表 */}
      <Card className="chart-container">
        <div className="chart-header">
          <h3>黄金价格实时走势图 (XAUUSD - {timeframes.find(tf => tf.value === timeframe)?.label})</h3>
          <div className="last-update">
            最后更新: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>

        <div className="chart-wrapper">
          {storeLoading && localData.length === 0 ? (
            <div className="chart-loading">
              <Spin tip="正在加载图表数据..." />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={localData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatXAxis}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => value.toFixed(2)}
                />
                <Tooltip
                  formatter={formatTooltipValue}
                  labelFormatter={(label) => `时间: ${new Date(label).toLocaleString()}`}
                />
                <Legend />

                {/* 跳空区域标记 */}
                {activeIndicators.includes('gap_detection') && gaps.map((gap, index) => (
                  <ReferenceArea
                    key={`gap-${index}`}
                    x1={gap.x1}
                    x2={gap.x2}
                    stroke="#ff4d4f"
                    strokeOpacity={0.2}
                    fill="#ff4d4f"
                    fillOpacity={0.1}
                    label={`跳空 ${(gap.gapSize * 100).toFixed(1)}%`}
                  />
                ))}

                {activeIndicators.includes('price') && (
                  <Line
                    type="monotone"
                    dataKey="price"
                    name="价格"
                    stroke="#1890ff"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                )}

                {activeIndicators.includes('bollinger') && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="bollingerUpper"
                      name="布林上轨"
                      stroke="#722ed1"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="bollingerMiddle"
                      name="布林中轨"
                      stroke="#722ed1"
                      strokeWidth={1}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="bollingerLower"
                      name="布林下轨"
                      stroke="#722ed1"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      dot={false}
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 技术指标图表 */}
        <div className="technical-chart">
          <h4>技术指标</h4>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={localData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                interval="preserveStartEnd"
              />
              <YAxis />
              <Tooltip formatter={formatTooltipValue} />
              <Legend />

              {activeIndicators.includes('macd') && (
                <Area
                  type="monotone"
                  dataKey="macd"
                  name="MACD"
                  stroke="#52c41a"
                  fill="#52c41a"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              )}

              {activeIndicators.includes('rsi') && (
                <>
                  <Line
                    type="monotone"
                    dataKey="rsi"
                    name="RSI"
                    stroke="#f5222d"
                    strokeWidth={2}
                  />
                  <ReferenceLine y={70} stroke="#ff4d4f" strokeDasharray="3 3" />
                  <ReferenceLine y={30} stroke="#ff4d4f" strokeDasharray="3 3" />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default RealtimeChart;