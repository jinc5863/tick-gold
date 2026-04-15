import React, { useState } from 'react';
import {
  Card,
  Form,
  Select,
  Switch,
  Table,
  Tag,
  Space,
  Row,
  Col,
  Statistic,
  Button,
  ConfigProvider,
  theme,
  message,
} from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { dataAPI } from '../../services';
import { useDataStore } from '../../store';

interface CleaningRule {
  id: number;
  ruleName: string;
  enabled: boolean;
  description: string;
}

const DataClean: React.FC = () => {
  const [form] = Form.useForm();
  const [cleaningRules, setCleaningRules] = useState<CleaningRule[]>([
    { id: 1, ruleName: '去除重复数据', enabled: true, description: '删除时间戳完全重复的记录' },
    { id: 2, ruleName: '价格异常检测', enabled: true, description: '过滤价格偏离超过3个标准差的记录' },
    { id: 3, ruleName: '时间连续性检查', enabled: true, description: '检测并标记时间间隔异常的记录' },
    { id: 4, ruleName: '成交量过滤', enabled: false, description: '过滤成交量为0或负数的记录' },
    { id: 5, ruleName: '买卖价差检查', enabled: true, description: '过滤价差超过阈值的记录' },
  ]);

  const { setCleaningResult, setStats } = useDataStore();

  // Clean mutation
  const cleanMutation = useMutation({
    mutationFn: async (config: any) => {
      const response = await dataAPI.clean(config);
      return response.data;
    },
    onSuccess: (data) => {
      message.success('数据清洗完成');
      setCleaningResult(data);
      setStats({
        totalTicks: data.originalCount,
        validTicks: data.cleanedCount,
        anomalyTicks: data.removedCount,
      });
    },
    onError: () => {
      message.error('数据清洗失败');
    },
  });

  // Preview query
  const { data: previewData } = useQuery({
    queryKey: ['clean-preview'],
    queryFn: async () => [
      { id: 1, time: '2026-04-14 09:30:00', bid: 2341.5, ask: 2341.7, flag: 'normal' },
      { id: 2, time: '2026-04-14 09:30:01', bid: 2341.6, ask: 2341.8, flag: 'normal' },
      { id: 3, time: '2026-04-14 09:30:02', bid: 2341.4, ask: 2341.6, flag: 'duplicate' },
      { id: 4, time: '2026-04-14 09:30:03', bid: 2341.7, ask: 2341.9, flag: 'normal' },
      { id: 5, time: '2026-04-14 09:30:04', bid: 9999.0, ask: 9999.2, flag: 'anomaly' },
      { id: 6, time: '2026-04-14 09:30:05', bid: 2341.8, ask: 2342.0, flag: 'normal' },
    ],
  });

  const rulesColumns = [
    { title: '规则名称', dataIndex: 'ruleName', key: 'ruleName' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    {
      title: '启用状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean, record: CleaningRule) => (
        <Switch
          checked={enabled}
          onChange={(checked) => {
            setCleaningRules((prev) =>
              prev.map((r) => (r.id === record.id ? { ...r, enabled: checked } : r))
            );
          }}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, _record: CleaningRule) => (
        <Space>
          <Button type="text" danger size="small" icon={<DeleteOutlined />}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const previewColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '时间', dataIndex: 'time', key: 'time' },
    { title: '买价', dataIndex: 'bid', key: 'bid' },
    { title: '卖价', dataIndex: 'ask', key: 'ask' },
    {
      title: '标记',
      dataIndex: 'flag',
      key: 'flag',
      render: (flag: string) => {
        const colors: Record<string, string> = {
          normal: 'green',
          duplicate: 'orange',
          anomaly: 'red',
          gap: 'blue',
        };
        const labels: Record<string, string> = {
          normal: '正常',
          duplicate: '重复',
          anomaly: '异常',
          gap: '缺失',
        };
        return <Tag color={colors[flag]}>{labels[flag]}</Tag>;
      },
    },
  ];

  const flagStats = [
    { flag: '正常', count: 1250000, color: '#22C55E' },
    { flag: '重复', count: 3200, color: '#F97316' },
    { flag: '异常', count: 1200, color: '#EF4444' },
    { flag: '缺失', count: 800, color: '#3B82F6' },
  ];

  const handleExecuteClean = () => {
    const config = {
      removeDuplicates: cleaningRules.find((r) => r.ruleName === '去除重复数据')?.enabled ?? true,
      priceAnomalyThreshold: 3,
      timeContinuityCheck: cleaningRules.find((r) => r.ruleName === '时间连续性检查')?.enabled ?? true,
      volumeFilter: cleaningRules.find((r) => r.ruleName === '成交量过滤')?.enabled ?? false,
      spreadThreshold: 0.5,
    };
    cleanMutation.mutate(config);
  };

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
        <h1 style={{ color: '#FAFAF9', marginBottom: '24px' }}>数据清洗</h1>

        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ background: '#1C1917', border: '1px solid #44403C' }}>
              <Statistic
                title={<span style={{ color: '#A8A29E' }}>原始数据量</span>}
                value={1255200}
                valueStyle={{ color: '#FAFAF9' }}
                prefix={<FilterOutlined style={{ color: '#CA8A04' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ background: '#1C1917', border: '1px solid #44403C' }}>
              <Statistic
                title={<span style={{ color: '#A8A29E' }}>清洗后数据量</span>}
                value={1250000}
                valueStyle={{ color: '#22C55E' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ background: '#1C1917', border: '1px solid #44403C' }}>
              <Statistic
                title={<span style={{ color: '#A8A29E' }}>删除数据量</span>}
                value={5200}
                valueStyle={{ color: '#EF4444' }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ background: '#1C1917', border: '1px solid #44403C' }}>
              <Statistic
                title={<span style={{ color: '#A8A29E' }}>清洗耗时</span>}
                value={3.2}
                suffix="秒"
                valueStyle={{ color: '#FAFAF9' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              title={<span style={{ color: '#FAFAF9' }}>清洗规则配置</span>}
              bordered={false}
              style={{ background: '#1C1917', border: '1px solid #44403C' }}
              headStyle={{ borderBottom: '1px solid #44403C' }}
              extra={
                <Button type="primary" style={{ background: '#CA8A04', borderColor: '#CA8A04' }}>
                  添加规则
                </Button>
              }
            >
              <Form form={form} layout="vertical">
                <Form.Item label={<span style={{ color: '#A8A29E' }}>价格偏离阈值（标准差倍数）</span>}>
                  <Select defaultValue="3" style={{ width: 200 }}>
                    <Select.Option value="2">2倍</Select.Option>
                    <Select.Option value="3">3倍</Select.Option>
                    <Select.Option value="4">4倍</Select.Option>
                    <Select.Option value="5">5倍</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label={<span style={{ color: '#A8A29E' }}>买卖价差阈值</span>}>
                  <Select defaultValue="0.5" style={{ width: 200 }}>
                    <Select.Option value="0.3">0.3</Select.Option>
                    <Select.Option value="0.5">0.5</Select.Option>
                    <Select.Option value="1.0">1.0</Select.Option>
                  </Select>
                </Form.Item>
              </Form>
              <Table
                columns={rulesColumns}
                dataSource={cleaningRules}
                pagination={false}
                rowKey="id"
              />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              title={<span style={{ color: '#FAFAF9' }}>Flag统计</span>}
              bordered={false}
              style={{ background: '#1C1917', border: '1px solid #44403C' }}
              headStyle={{ borderBottom: '1px solid #44403C' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {flagStats.map((stat) => (
                  <div
                    key={stat.flag}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#0A0A0F',
                      borderRadius: '4px',
                      border: '1px solid #44403C',
                    }}
                  >
                    <Space>
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: stat.color,
                        }}
                      />
                      <span style={{ color: '#FAFAF9' }}>{stat.flag}</span>
                    </Space>
                    <span style={{ color: '#FAFAF9', fontWeight: 'bold' }}>
                      {stat.count.toLocaleString()}
                    </span>
                  </div>
                ))}
              </Space>
            </Card>
          </Col>
        </Row>

        <Card
          title={<span style={{ color: '#FAFAF9' }}>实时预览</span>}
          bordered={false}
          style={{
            background: '#1C1917',
            border: '1px solid #44403C',
            marginTop: '16px',
          }}
          headStyle={{ borderBottom: '1px solid #44403C' }}
          extra={
            <Space>
              <Button icon={<FilterOutlined />}>只显示异常</Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleExecuteClean}
                loading={cleanMutation.isPending}
                style={{ background: '#CA8A04', borderColor: '#CA8A04' }}
              >
                执行清洗
              </Button>
            </Space>
          }
        >
          <Table
            columns={previewColumns}
            dataSource={previewData ?? []}
            pagination={{ pageSize: 5 }}
            rowKey="id"
            scroll={{ x: 'max-content' }}
          />
        </Card>
      </div>
    </ConfigProvider>
  );
};

export default DataClean;
// page:DataClean
