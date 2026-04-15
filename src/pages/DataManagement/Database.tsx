import React, { useState } from 'react';
import dayjs from 'dayjs';
import {
  Card,
  Form,
  Select,
  DatePicker,
  Button,
  Table,
  Space,
  Tag,
  Modal,
  message,
  Row,
  Col,
  ConfigProvider,
  theme,
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import {
  SearchOutlined,
  DeleteOutlined,
  ExportOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { dataAPI } from '../../api';
import type { Tick } from '@/types';

const { RangePicker } = DatePicker;

const Database: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  // Query parameters from form
  const [queryParams, setQueryParams] = useState<any>({});

  // Transform API response to frontend format
  const transformTickData = (ticks: any[]): Tick[] => {
    return ticks.map((tick) => ({
      id: tick.id,
      symbol: tick.symbol,
      time: tick.timestamp ? dayjs(tick.timestamp).format('YYYY-MM-DD HH:mm:ss') : tick.time,
      bid: tick.bid,
      ask: tick.ask,
      volume: tick.volume || tick.bid_size || 0,
      source: tick.session || 'API',
      status: tick.is_valid === 1 ? 'valid' : tick.is_valid === 0 ? 'anomaly' : 'valid',
    }));
  };

  // Fetch ticks data
  const { data: ticksResponse, isLoading, refetch } = useQuery({
    queryKey: ['ticks', queryParams, pagination],
    queryFn: async () => {
      try {
        const response = await dataAPI.getTicks({
          ...queryParams,
          page: pagination.current,
          limit: pagination.pageSize,
        });
        return response.data;
      } catch (error) {
        console.error('Failed to fetch ticks:', error);
        return null;
      }
    },
  });

  // Mock data for initial render when API is not available
  const mockData: Tick[] = [
    { id: 1, symbol: 'XAUUSD', time: '2026-04-14 09:30:00', bid: 2341.5, ask: 2341.7, volume: 1250, source: 'MT5', status: 'valid' },
    { id: 2, symbol: 'XAUUSD', time: '2026-04-14 09:30:01', bid: 2341.6, ask: 2341.8, volume: 980, source: 'MT5', status: 'valid' },
    { id: 3, symbol: 'XAUUSD', time: '2026-04-14 09:30:02', bid: 2341.4, ask: 2341.6, volume: 1100, source: 'MT5', status: 'valid' },
    { id: 4, symbol: 'XAUUSD', time: '2026-04-14 09:30:03', bid: 2341.7, ask: 2341.9, volume: 1350, source: 'MT5', status: 'anomaly' },
    { id: 5, symbol: 'XAUUSD', time: '2026-04-14 09:30:04', bid: 2341.8, ask: 2342.0, volume: 1020, source: 'MT5', status: 'valid' },
    { id: 6, symbol: 'XAUUSD', time: '2026-04-14 09:30:05', bid: 2341.9, ask: 2342.1, volume: 890, source: 'MT5', status: 'valid' },
    { id: 7, symbol: 'XAUUSD', time: '2026-04-14 09:30:06', bid: 2342.0, ask: 2342.2, volume: 1200, source: 'MT5', status: 'valid' },
    { id: 8, symbol: 'XAUUSD', time: '2026-04-14 09:30:07', bid: 2341.8, ask: 2342.0, volume: 1150, source: 'MT5', status: 'duplicate' },
  ];

  const databaseData = ticksResponse?.ticks ? transformTickData(ticksResponse.ticks) : mockData;
  const totalCount = ticksResponse?.total ?? 1000;

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '交易品种', dataIndex: 'symbol', key: 'symbol' },
    { title: '时间', dataIndex: 'time', key: 'time' },
    { title: '买价', dataIndex: 'bid', key: 'bid' },
    { title: '卖价', dataIndex: 'ask', key: 'ask' },
    { title: '成交量', dataIndex: 'volume', key: 'volume' },
    { title: '数据源', dataIndex: 'source', key: 'source' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config: Record<string, { color: string; label: string }> = {
          valid: { color: 'green', label: '有效' },
          anomaly: { color: 'red', label: '异常' },
          duplicate: { color: 'orange', label: '重复' },
        };
        return <Tag color={config[status]?.color}>{config[status]?.label}</Tag>;
      },
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();
      setQueryParams(values);
      await refetch();
      message.success('查询完成');
    } catch {
      // Validation failed
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setSelectedRowKeys([]);
    setQueryParams({});
    message.info('已重置');
  };

  const handleDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的记录');
      return;
    }
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 条记录吗？此操作不可撤销。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        message.success(`已删除 ${selectedRowKeys.length} 条记录`);
        setSelectedRowKeys([]);
      },
    });
  };

  const handleExport = () => {
    message.success('数据导出中...');
    setTimeout(() => {
      message.success('导出完成');
    }, 1500);
  };

  const handleTableChange = (paginationConfig: any) => {
    setPagination({
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize,
    });
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
        <h1 style={{ color: '#FAFAF9', marginBottom: '24px' }}>数据库管理</h1>

        <Card
          title={<span style={{ color: '#FAFAF9' }}>查询条件</span>}
          bordered={false}
          style={{ background: '#1C1917', border: '1px solid #44403C' }}
          headStyle={{ borderBottom: '1px solid #44403C' }}
        >
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col xs={24} sm={12} lg={6}>
                <Form.Item label={<span style={{ color: '#A8A29E' }}>交易品种</span>} name="symbol">
                  <Select allowClear placeholder="请选择">
                    <Select.Option value="XAUUSD">XAUUSD</Select.Option>
                    <Select.Option value="XAGUSD">XAGUSD</Select.Option>
                    <Select.Option value="EURUSD">EURUSD</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Form.Item label={<span style={{ color: '#A8A29E' }}>数据状态</span>} name="status">
                  <Select allowClear placeholder="请选择">
                    <Select.Option value="valid">有效</Select.Option>
                    <Select.Option value="anomaly">异常</Select.Option>
                    <Select.Option value="duplicate">重复</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Form.Item label={<span style={{ color: '#A8A29E' }}>数据源</span>} name="source">
                  <Select allowClear placeholder="请选择">
                    <Select.Option value="MT5">MT5</Select.Option>
                    <Select.Option value="MT4">MT4</Select.Option>
                    <Select.Option value="API">API</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Form.Item label={<span style={{ color: '#A8A29E' }}>时间范围</span>} name="dateRange">
                  <RangePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col span={24}>
                <Space>
                  <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    onClick={handleSearch}
                    loading={loading}
                    style={{ background: '#CA8A04', borderColor: '#CA8A04' }}
                  >
                    查询
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={handleReset}>
                    重置
                  </Button>
                </Space>
              </Col>
            </Row>
          </Form>
        </Card>

        <Card
          title={<span style={{ color: '#FAFAF9' }}>数据列表</span>}
          bordered={false}
          style={{
            background: '#1C1917',
            border: '1px solid #44403C',
            marginTop: '16px',
          }}
          headStyle={{ borderBottom: '1px solid #44403C' }}
          extra={
            <Space>
              <span style={{ color: '#A8A29E' }}>
                已选择 {selectedRowKeys.length} 项
              </span>
              <Button icon={<ExportOutlined />} onClick={handleExport}>
                导出
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleDelete}
                disabled={selectedRowKeys.length === 0}
              >
                删除
              </Button>
            </Space>
          }
        >
          <Table
            columns={columns}
            dataSource={databaseData}
            rowSelection={rowSelection}
            rowKey="id"
            loading={isLoading}
            pagination={{
              total: totalCount,
              current: pagination.current,
              pageSize: pagination.pageSize,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
            onChange={handleTableChange}
            scroll={{ x: 'max-content' }}
          />
        </Card>
      </div>
    </ConfigProvider>
  );
};

export default Database;
// page:Database
