import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Select, DatePicker, Button, Space, Tag, Segmented, message } from 'antd';
import {
  LineChartOutlined,
  BarChartOutlined,
  PieChartOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { dataAPI } from '../services';

const { RangePicker } = DatePicker;

type Symbol = 'XAUUSD' | 'XAUUSDmicro' | 'XAUUSDoz';
type Timeframe = 'M1' | 'M5' | 'M15' | 'H1' | 'H4' | 'D1';

const BASE_PRICE = 2340;

// Convert ticks to OHLC candles
const ticksToOHLC = (ticks: any[], timeframe: Timeframe): any[] => {
  if (!ticks || ticks.length === 0) return [];

  const intervalMinutes: Record<Timeframe, number> = {
    M1: 1, M5: 5, M15: 15, H1: 60, H4: 240, D1: 1440,
  };
  const mins = intervalMinutes[timeframe];

  const candles: Map<string, any> = new Map();

  ticks.forEach((tick) => {
    const time = dayjs(tick.timestamp);
    const candleTime = time.startOf('minute').add(Math.floor(time.minute() / mins) * mins, 'minute').format('YYYY-MM-DD HH:mm');

    if (!candles.has(candleTime)) {
      candles.set(candleTime, {
        time: candleTime,
        open: tick.bid,
        high: tick.bid,
        low: tick.bid,
        close: tick.bid,
        volume: tick.volume || 0,
      });
    } else {
      const candle = candles.get(candleTime);
      candle.high = Math.max(candle.high, tick.bid);
      candle.low = Math.min(candle.low, tick.bid);
      candle.close = tick.bid;
      candle.volume += tick.volume || 0;
    }
  });

  return Array.from(candles.values()).slice(-100);
};

const KlinePanel: React.FC = () => {
  const [symbol, setSymbol] = useState<Symbol>('XAUUSD');
  const [timeframe, setTimeframe] = useState<Timeframe>('M1');
  const [klineData, setKlineData] = useState<any[]>([]);

  // Fetch ticks data from API
  const { data: ticksData, isLoading, refetch } = useQuery({
    queryKey: ['kline-ticks', symbol],
    queryFn: async () => {
      const response = await dataAPI.getTicks({ limit: 500 });
      return response.data?.ticks || [];
    },
  });

  // Convert ticks to OHLC when data or timeframe changes
  useEffect(() => {
    if (ticksData && ticksData.length > 0) {
      const ohlc = ticksToOHLC(ticksData, timeframe);
      setKlineData(ohlc.length > 0 ? ohlc : generateMockData());
    } else {
      setKlineData(generateMockData());
    }
  }, [ticksData, timeframe]);

  // Generate mock data as fallback
  const generateMockData = () => {
    const data: any[] = [];
    let basePrice = BASE_PRICE;
    const now = dayjs();

    for (let i = 100; i >= 0; i--) {
      const time = now.subtract(i, 'minute').format('YYYY-MM-DD HH:mm');
      const open = basePrice + Math.random() * 2 - 1;
      const close = open + Math.random() * 4 - 2;
      const high = Math.max(open, close) + Math.random() * 2;
      const low = Math.min(open, close) - Math.random() * 2;
      const volume = Math.floor(Math.random() * 1000) + 500;

      data.push({ time, open, close, high, low, volume });
      basePrice = close;
    }
    return data;
  };

  const handleRefresh = () => {
    refetch();
    message.success('数据已刷新');
  };

  // Calculate latest OHLC for display
  const latestCandle = klineData[klineData.length - 1];
  const openPrice = latestCandle?.open?.toFixed(2) || '2340.00';
  const highPrice = latestCandle?.high?.toFixed(2) || '2343.00';
  const lowPrice = latestCandle?.low?.toFixed(2) || '2340.00';
  const closePrice = latestCandle?.close?.toFixed(2) || '2342.00';

  const recentTrades = useMemo(() => klineData.slice(-10).reverse(), [klineData]);

  const timeframeOptions = [
    { value: 'M1', label: '1分钟' },
    { value: 'M5', label: '5分钟' },
    { value: 'M15', label: '15分钟' },
    { value: 'H1', label: '1小时' },
    { value: 'H4', label: '4小时' },
    { value: 'D1', label: '日线' },
  ];

  return (
    <div style={{ padding: 0 }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <h1 style={{ color: '#FAFAF9', marginBottom: 24 }}>K线面板</h1>
        </Col>
      </Row>

      {/* 控制栏 */}
      <Card
        size="small"
        style={{
          background: '#1C1917',
          borderColor: '#44403C',
          marginBottom: 16,
        }}
      >
        <Space wrap size="middle">
          <Space>
            <span style={{ color: '#A8A29E' }}>品种:</span>
            <Select
              value={symbol}
              onChange={setSymbol}
              style={{ width: 120 }}
              options={[
                { value: 'XAUUSD', label: 'XAUUSD' },
                { value: 'XAUUSDmicro', label: 'XAUUSD Micro' },
                { value: 'XAUUSDoz', label: 'XAUUSD oz' },
              ]}
            />
          </Space>

          <Space>
            <span style={{ color: '#A8A29E' }}>周期:</span>
            <Segmented
              value={timeframe}
              onChange={(v) => setTimeframe(v as Timeframe)}
              options={timeframeOptions}
            />
          </Space>

          <Space>
            <RangePicker
              style={{ background: '#0A0A0F', borderColor: '#44403C' }}
            />
          </Space>

          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={isLoading}>刷新</Button>
          <Button icon={<BarChartOutlined />}>指标</Button>
          <Button icon={<LineChartOutlined />}>画线</Button>
        </Space>
      </Card>

      {/* K线图 */}
      <Card
        title={
          <Space>
            <span style={{ color: '#FAFAF9' }}>{symbol}</span>
            <Tag color="gold">{timeframe}</Tag>
            {isLoading && <Tag color="blue">加载中...</Tag>}
          </Space>
        }
        extra={
          <Space>
            <Tag>O 2341.50</Tag>
            <Tag color="green">H {highPrice}</Tag>
            <Tag color="red">L {lowPrice}</Tag>
            <Tag>C {closePrice}</Tag>
          </Space>
        }
        style={{
          background: '#1C1917',
          borderColor: '#44403C',
        }}
      >
        <div style={{ height: 500, background: '#0A0A0F' }}>
          {klineData.length > 0 ? (
            <div style={{ padding: '16px', height: '100%' }}>
              {/* 价格区域 */}
              <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', color: '#FAFAF9' }}>
                <span>当前: <span style={{ color: '#22C55E' }}>{closePrice}</span></span>
                <span>开盘: {openPrice}</span>
                <span>最高: <span style={{ color: '#22C55E' }}>{highPrice}</span></span>
                <span>最低: <span style={{ color: '#EF4444' }}>{lowPrice}</span></span>
              </div>
              {/* K线数据预览 */}
              <div style={{ color: '#A8A29E', fontSize: 12, maxHeight: 400, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #44403C' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>时间</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>开盘</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>最高</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>最低</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>收盘</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>成交量</th>
                    </tr>
                  </thead>
                  <tbody>
                    {klineData.slice(-20).map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #292524' }}>
                        <td style={{ padding: '6px', color: '#A8A29E' }}>{item.time}</td>
                        <td style={{ padding: '6px', textAlign: 'right', color: '#FAFAF9' }}>{item.open?.toFixed(2)}</td>
                        <td style={{ padding: '6px', textAlign: 'right', color: '#22C55E' }}>{item.high?.toFixed(2)}</td>
                        <td style={{ padding: '6px', textAlign: 'right', color: '#EF4444' }}>{item.low?.toFixed(2)}</td>
                        <td style={{ padding: '6px', textAlign: 'right', color: item.close >= item.open ? '#22C55E' : '#EF4444' }}>{item.close?.toFixed(2)}</td>
                        <td style={{ padding: '6px', textAlign: 'right', color: '#A8A29E' }}>{(item.volume / 1000).toFixed(1)}K</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#A8A29E',
            }}>
              <div style={{ textAlign: 'center' }}>
                <PieChartOutlined style={{ fontSize: 48, color: '#CA8A04' }} />
                <div style={{ marginTop: 16, fontSize: 18 }}>加载中...</div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 技术指标 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={8}>
          <Card
            title={<span style={{ color: '#A8A29E' }}>MA (移动平均线)</span>}
            size="small"
            style={{ background: '#1C1917', borderColor: '#44403C' }}
          >
            <div style={{ color: '#22C55E' }}>MA5: 2341.20</div>
            <div style={{ color: '#22C55E' }}>MA10: 2340.85</div>
            <div style={{ color: '#22C55E' }}>MA20: 2339.50</div>
            <div style={{ color: '#CA8A04' }}>MA60: 2338.20</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card
            title={<span style={{ color: '#A8A29E' }}>MACD</span>}
            size="small"
            style={{ background: '#1C1917', borderColor: '#44403C' }}
          >
            <div style={{ color: '#22C55E' }}>DIF: +2.35</div>
            <div style={{ color: '#22C55E' }}>DEA: +1.82</div>
            <div style={{ color: '#EF4444' }}>MACD: +1.06</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card
            title={<span style={{ color: '#A8A29E' }}>RSI</span>}
            size="small"
            style={{ background: '#1C1917', borderColor: '#44403C' }}
          >
            <div style={{ color: '#22C55E' }}>RSI(6): 58.32</div>
            <div style={{ color: '#CA8A04' }}>RSI(12): 56.18</div>
            <div style={{ color: '#EF4444' }}>RSI(24): 54.85</div>
          </Card>
        </Col>
      </Row>

      {/* 成交明细 */}
      <Card
        title={<span style={{ color: '#A8A29E' }}>实时成交</span>}
        size="small"
        style={{
          background: '#1C1917',
          borderColor: '#44403C',
          marginTop: 16,
        }}
      >
        <div style={{ maxHeight: 200, overflow: 'auto' }}>
          {recentTrades.map((item) => (
            <div
              key={item.time}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0',
                borderBottom: '1px solid #292524',
                color: item.close > item.open ? '#22C55E' : '#EF4444',
              }}
            >
              <span>{item.time}</span>
              <span>{(item.volume / 1000).toFixed(1)}K</span>
              <span>{item.close.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default KlinePanel;
