import React, { useState } from 'react';
import {
  Card,
  Upload,
  Button,
  Form,
  Select,
  DatePicker,
  Table,
  Space,
  message,
  Tabs,
  Tag,
  ConfigProvider,
  theme,
} from 'antd';
import { useMutation } from '@tanstack/react-query';
import {
  InboxOutlined,
  UploadOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { dataAPI } from '../../services';
import { useDataStore } from '../../store';

const { RangePicker } = DatePicker;

const DataImport: React.FC = () => {
  const [fileList, setFileList] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { importing, setImporting } = useDataStore();

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const response = await dataAPI.import(file);
      return response.data;
    },
    onSuccess: () => {
      message.success('数据导入成功');
      setFileList([]);
      setSelectedFile(null);
    },
    onError: () => {
      message.error('数据导入失败');
    },
    onSettled: () => {
      setImporting(false);
    },
  });

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    fileList,
    beforeUpload: (file) => {
      const isCSV = file.name.endsWith('.csv');
      if (!isCSV) {
        message.error(`${file.name} 仅支持 CSV 格式`);
        return false;
      }
      setFileList([...fileList, file]);
      setSelectedFile(file.name);
      return false;
    },
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
      if (selectedFile === file.name) {
        setSelectedFile(null);
      }
    },
  };

  const handleUpload = () => {
    if (fileList.length === 0) {
      message.warning('请先选择文件');
      return;
    }
    setImporting(true);
    // Import first file only for simplicity
    importMutation.mutate(fileList[0]);
  };

  // Mock field mapping data
  const fieldMappingData = [
    { sourceField: 'time', targetField: 'timestamp', status: 'mapped' },
    { sourceField: 'bid', targetField: 'bid_price', status: 'mapped' },
    { sourceField: 'ask', targetField: 'ask_price', status: 'mapped' },
    { sourceField: 'volume', targetField: 'tick_volume', status: 'mapped' },
  ];

  const fieldMappingColumns = [
    { title: '源字段', dataIndex: 'sourceField', key: 'sourceField' },
    {
      title: '映射状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag icon={<CheckCircleOutlined />} color="success">
          {status === 'mapped' ? '已映射' : '未映射'}
        </Tag>
      ),
    },
    { title: '目标字段', dataIndex: 'targetField', key: 'targetField' },
  ];

  // Mock preview data
  const previewColumns = [
    { title: '时间', dataIndex: 'time', key: 'time' },
    { title: '买价', dataIndex: 'bid', key: 'bid' },
    { title: '卖价', dataIndex: 'ask', key: 'ask' },
    { title: '成交量', dataIndex: 'volume', key: 'volume' },
  ];

  const previewData = [
    { time: '2026-04-14 09:30:00', bid: 2341.5, ask: 2341.7, volume: 1250 },
    { time: '2026-04-14 09:30:01', bid: 2341.6, ask: 2341.8, volume: 980 },
    { time: '2026-04-14 09:30:02', bid: 2341.4, ask: 2341.6, volume: 1100 },
    { time: '2026-04-14 09:30:03', bid: 2341.7, ask: 2341.9, volume: 1350 },
    { time: '2026-04-14 09:30:04', bid: 2341.8, ask: 2342.0, volume: 1020 },
  ];

  const tabItems = [
    {
      key: 'upload',
      label: '文件上传',
      children: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Upload.Dragger {...uploadProps} style={{ background: '#1C1917', border: '1px solid #44403C' }}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: '#CA8A04' }} />
            </p>
            <p className="ant-upload-text" style={{ color: '#FAFAF9' }}>
              点击或拖拽文件到此处上传
            </p>
            <p className="ant-upload-hint" style={{ color: '#A8A29E' }}>
              支持 CSV 格式文件，单个文件不超过 100MB
            </p>
          </Upload.Dragger>

          <Card
            title={<span style={{ color: '#FAFAF9' }}>上传文件列表</span>}
            variant="borderless"
            style={{ background: '#1C1917', border: '1px solid #44403C' }}
            styles={{ header: { borderBottom: '1px solid #44403C' } }}
          >
            {fileList.length > 0 ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                {fileList.map((file) => (
                  <Card
                    key={file.name}
                    size="small"
                    style={{
                      background: selectedFile === file.name ? '#44403C' : '#0A0A0F',
                      border: '1px solid #44403C',
                    }}
                  >
                    <Space>
                      <FileTextOutlined style={{ color: '#CA8A04' }} />
                      <span style={{ color: '#FAFAF9' }}>{file.name}</span>
                      <span style={{ color: '#A8A29E' }}>
                        ({(file.size / 1024).toFixed(2)} KB)
                      </span>
                    </Space>
                  </Card>
                ))}
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  onClick={handleUpload}
                  loading={importing}
                  style={{ background: '#CA8A04', borderColor: '#CA8A04' }}
                >
                  开始导入
                </Button>
              </Space>
            ) : (
              <div style={{ color: '#A8A29E', textAlign: 'center', padding: '20px' }}>
                暂无上传文件
              </div>
            )}
          </Card>
        </Space>
      ),
    },
    {
      key: 'mapping',
      label: '字段映射',
      children: (
        <Card
          title={<span style={{ color: '#FAFAF9' }}>字段映射配置</span>}
          variant="borderless"
          style={{ background: '#1C1917', border: '1px solid #44403C' }}
          styles={{ header: { borderBottom: '1px solid #44403C' } }}
        >
          <Form layout="vertical">
            <Form.Item label={<span style={{ color: '#A8A29E' }}>时间字段</span>}>
              <Select defaultValue="time" style={{ width: 200 }}>
                <Select.Option value="time">time</Select.Option>
                <Select.Option value="timestamp">timestamp</Select.Option>
                <Select.Option value="datetime">datetime</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label={<span style={{ color: '#A8A29E' }}>价格字段</span>}>
              <Space>
                <Select defaultValue="bid" placeholder="买价">
                  <Select.Option value="bid">bid</Select.Option>
                  <Select.Option value="buy">buy</Select.Option>
                </Select>
                <Select defaultValue="ask" placeholder="卖价">
                  <Select.Option value="ask">ask</Select.Option>
                  <Select.Option value="sell">sell</Select.Option>
                </Select>
              </Space>
            </Form.Item>
            <Form.Item label={<span style={{ color: '#A8A29E' }}>成交量字段</span>}>
              <Select defaultValue="volume" placeholder="成交量">
                <Select.Option value="volume">volume</Select.Option>
                <Select.Option value="vol">vol</Select.Option>
              </Select>
            </Form.Item>
          </Form>
          <Table
            columns={fieldMappingColumns}
            dataSource={fieldMappingData}
            pagination={false}
            rowKey="sourceField"
            style={{ marginTop: '16px' }}
          />
        </Card>
      ),
    },
    {
      key: 'preview',
      label: '数据预览',
      children: (
        <Card
          title={<span style={{ color: '#FAFAF9' }}>数据预览</span>}
          variant="borderless"
          style={{ background: '#1C1917', border: '1px solid #44403C' }}
          styles={{ header: { borderBottom: '1px solid #44403C' } }}
        >
          <Table
            columns={previewColumns}
            dataSource={previewData}
            pagination={false}
            rowKey="time"
            scroll={{ x: 'max-content' }}
          />
        </Card>
      ),
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
        <h1 style={{ color: '#FAFAF9', marginBottom: '24px' }}>数据导入</h1>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card
            title={<span style={{ color: '#FAFAF9' }}>导入时间范围</span>}
            variant="borderless"
            style={{ background: '#1C1917', border: '1px solid #44403C' }}
            styles={{ header: { borderBottom: '1px solid #44403C' } }}
          >
            <Space>
              <RangePicker style={{ background: '#1C1917', borderColor: '#44403C' }} />
              <Button type="primary" style={{ background: '#CA8A04', borderColor: '#CA8A04' }}>
                应用筛选
              </Button>
            </Space>
          </Card>

          <Tabs
            items={tabItems}
            style={{ background: '#1C1917', padding: '16px', borderRadius: '8px' }}
            tabBarStyle={{ borderBottom: '1px solid #44403C' }}
          />
        </Space>
      </div>
    </ConfigProvider>
  );
};

export default DataImport;
// page:DataImport
