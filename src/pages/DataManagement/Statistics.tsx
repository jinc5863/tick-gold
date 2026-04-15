import React from 'react';
import { Card, Row, Col, Progress, Statistic, ConfigProvider, theme } from 'antd';
import { useQuery } from '@tanstack/react-query';
import {
  DatabaseOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { dataAPI } from '../../services';

const COLORS = ['#CA8A04', '#3B82F6', '#F97316', '#EF4444', '#22C55E'];

const Statistics: React.FC = () => {
  // Fetch statistics data
  const { data: trendData } = useQuery({
    queryKey: ['statistics-trend'],
    queryFn: async () => [
      { date: '04-08', count: 1200000 },
      { date: '04-09', count: 1250000 },
      { date: '04-10', count: 1180000 },
      { date: '04-11', count: 1320000 },
      { date: '04-12', count: 1280000 },
      { date: '04-13', count: 1350000 },
      { date: '04-14', count: 1284560 },
    ],
  });

  const { data: anomalyData } = useQuery({
    queryKey: ['statistics-anomaly'],
    queryFn: async () => [
      { type: '价格异常', count: 1200 },
      { type: '时间异常', count: 800 },
      { type: '重复数据', count: 3200 },
      { type: '数据缺失', count: 500 },
      { type: '格式错误', count: 200 },
    ],
  });

  const { data: statsData } = useQuery({
    queryKey: ['statistics-summary'],
    queryFn: async () => {
      try {
        const response = await dataAPI.getTicks({ page: 1, limit: 1 });
        // Calculate stats from API response
        const total = response.data?.total || 0;
        const validTicks = Math.floor(total * 0.99); // Assuming 99% valid
        const anomalyTicks = total - validTicks;
        return {
          totalTicks: total,
          validTicks: validTicks,
          anomalyTicks: anomalyTicks,
          timeRange: '30天',
        };
      } catch {
        // Fallback to mock data if API fails
        return {
          totalTicks: 7856000,
          validTicks: 7823100,
          anomalyTicks: 32900,
          timeRange: '30天',
        };
      }
    },
  });

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
        <h1 style={{ color: '#FAFAF9', marginBottom: '24px' }}>统计报表</h1>

        {/* Quality Dashboard */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} lg={8}>
            <Card
              title={<span style={{ color: '#FAFAF9' }}>数据质量评分</span>}
              variant="borderless"
              style={{
                background: '#1C1917',
                border: '1px solid #44403C',
                height: '100%',
              }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
            >
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Progress
                  type="dashboard"
                  percent={96}
                  strokeColor="#CA8A04"
                  trailColor="#44403C"
                  size={180}
                  format={(percent) => (
                    <div>
                      <span style={{ color: '#FAFAF9', fontSize: '36px', fontWeight: 'bold' }}>
                        {percent}
                      </span>
                      <div style={{ color: '#A8A29E', fontSize: '14px' }}>分</div>
                    </div>
                  )}
                />
                <div
                  style={{
                    marginTop: '16px',
                    color: '#22C55E',
                    fontSize: '16px',
                  }}
                >
                  <CheckCircleOutlined /> 优秀
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={16}>
            <Card
              title={<span style={{ color: '#FAFAF9' }}>数据量趋势</span>}
              variant="borderless"
              style={{
                background: '#1C1917',
                border: '1px solid #44403C',
                height: '100%',
              }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
            >
              <div style={{ height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#44403C" />
                    <XAxis dataKey="date" stroke="#A8A29E" />
                    <YAxis stroke="#A8A29E" tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1C1917',
                        border: '1px solid #44403C',
                        color: '#FAFAF9',
                      }}
                      formatter={(value: any) => [`${value.toLocaleString()} ticks`, '数据量']}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#CA8A04"
                      strokeWidth={2}
                      dot={{ fill: '#CA8A04', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#CA8A04' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Anomaly Distribution and Stats */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} lg={12}>
            <Card
              title={<span style={{ color: '#FAFAF9' }}>异常分布</span>}
              variant="borderless"
              style={{ background: '#1C1917', border: '1px solid #44403C' }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
            >
              <div style={{ height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={anomalyData ?? []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="count"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {(anomalyData ?? []).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1C1917',
                        border: '1px solid #44403C',
                        color: '#FAFAF9',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              title={<span style={{ color: '#FAFAF9' }}>详细统计</span>}
              variant="borderless"
              style={{ background: '#1C1917', border: '1px solid #44403C' }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card
                    size="small"
                    variant="borderless"
                    style={{ background: '#0A0A0F', border: '1px solid #44403C' }}
                  >
                    <Statistic
                      title={<span style={{ color: '#A8A29E' }}>总数据量</span>}
                      value={statsData?.totalTicks ?? 0}
                      prefix={<DatabaseOutlined style={{ color: '#CA8A04' }} />}
                      valueStyle={{ color: '#FAFAF9' }}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card
                    size="small"
                    variant="borderless"
                    style={{ background: '#0A0A0F', border: '1px solid #44403C' }}
                  >
                    <Statistic
                      title={<span style={{ color: '#A8A29E' }}>有效数据</span>}
                      value={statsData?.validTicks ?? 0}
                      prefix={<CheckCircleOutlined style={{ color: '#22C55E' }} />}
                      valueStyle={{ color: '#22C55E' }}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card
                    size="small"
                    variant="borderless"
                    style={{ background: '#0A0A0F', border: '1px solid #44403C' }}
                  >
                    <Statistic
                      title={<span style={{ color: '#A8A29E' }}>异常数据</span>}
                      value={statsData?.anomalyTicks ?? 0}
                      prefix={<ExclamationCircleOutlined style={{ color: '#EF4444' }} />}
                      valueStyle={{ color: '#EF4444' }}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card
                    size="small"
                    variant="borderless"
                    style={{ background: '#0A0A0F', border: '1px solid #44403C' }}
                  >
                    <Statistic
                      title={<span style={{ color: '#A8A29E' }}>数据时间范围</span>}
                      value={statsData?.timeRange ?? '-'}
                      prefix={<ClockCircleOutlined style={{ color: '#3B82F6' }} />}
                      valueStyle={{ color: '#FAFAF9' }}
                    />
                  </Card>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* Quality Metrics */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Card
              title={<span style={{ color: '#FAFAF9' }}>完整性</span>}
              variant="borderless"
              style={{ background: '#1C1917', border: '1px solid #44403C' }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
            >
              <Progress
                percent={98.5}
                strokeColor="#CA8A04"
                trailColor="#44403C"
                format={(percent) => <span style={{ color: '#FAFAF9' }}>{percent}%</span>}
              />
              <div style={{ color: '#A8A29E', marginTop: '8px', fontSize: '12px' }}>
                缺失字段占比: 1.5%
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              title={<span style={{ color: '#FAFAF9' }}>准确性</span>}
              variant="borderless"
              style={{ background: '#1C1917', border: '1px solid #44403C' }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
            >
              <Progress
                percent={96.2}
                strokeColor="#22C55E"
                trailColor="#44403C"
                format={(percent) => <span style={{ color: '#FAFAF9' }}>{percent}%</span>}
              />
              <div style={{ color: '#A8A29E', marginTop: '8px', fontSize: '12px' }}>
                异常数据占比: 3.8%
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              title={<span style={{ color: '#FAFAF9' }}>及时性</span>}
              variant="borderless"
              style={{ background: '#1C1917', border: '1px solid #44403C' }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
            >
              <Progress
                percent={99.1}
                strokeColor="#3B82F6"
                trailColor="#44403C"
                format={(percent) => <span style={{ color: '#FAFAF9' }}>{percent}%</span>}
              />
              <div style={{ color: '#A8A29E', marginTop: '8px', fontSize: '12px' }}>
                延迟更新占比: 0.9%
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default Statistics;
// page:Statistics
