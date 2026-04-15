import React from 'react';
import {
  Card,
  Form,
  InputNumber,
  Select,
  Slider,
  Table,
  Tag,
  Space,
  Button,
  Row,
  Col,
  Progress,
  ConfigProvider,
  theme,
  message,
  List,
  Switch,
  Divider,
} from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SaveOutlined,
  LockOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { riskAPI } from '../services';
import { useRiskStore } from '../store';
import type { RiskIndicator, AuditTrade } from '@/types';

interface RiskAlertRule {
  key: string;
  name: string;
  enabled: boolean;
  threshold: number;
  action: 'block' | 'warn' | 'notify';
}

const RiskControl: React.FC = () => {
  const [form] = Form.useForm();
  const [alertRules, setAlertRules] = React.useState<RiskAlertRule[]>([
    { key: '1', name: '头寸超限预警', enabled: true, threshold: 80, action: 'warn' },
    { key: '2', name: '杠杆率过高预警', enabled: true, threshold: 70, action: 'block' },
    { key: '3', name: '隔夜风险预警', enabled: true, threshold: 60, action: 'warn' },
    { key: '4', name: '波动率预警', enabled: false, threshold: 75, action: 'notify' },
    { key: '5', name: '流动性预警', enabled: true, threshold: 50, action: 'warn' },
    { key: '6', name: '缺口风险预警', enabled: true, threshold: 40, action: 'block' },
  ]);

  const {
    indicators,
    setIndicators,
    auditTrades,
    setAuditTrades,
    updateTradeStatus,
    positionRiskThreshold,
    setPositionRiskThreshold,
    leverageLimit,
    setLeverageLimit,
    overnightRiskLimit,
    setOvernightRiskLimit,
    gapRiskLimit,
    setGapRiskLimit,
    autoRiskMode,
    setAutoRiskMode,
    overallRating,
  } = useRiskStore();

  // Calculate risk rating based on metrics
  const getRiskRating = () => {
    if (overallRating >= 80) return { grade: 'A', color: '#22C55E', label: '优秀' };
    if (overallRating >= 60) return { grade: 'B', color: '#3B82F6', label: '良好' };
    if (overallRating >= 40) return { grade: 'C', color: '#F97316', label: '中等' };
    return { grade: 'D', color: '#EF4444', label: '较差' };
  };

  const riskRating = getRiskRating();

  // Fetch risk indicators
  const { data: riskIndicators } = useQuery({
    queryKey: ['risk-indicators'],
    queryFn: async () => [
      { key: '1', name: '头寸风险', currentValue: 65, maxValue: 100, unit: '%', status: 'safe' as const },
      { key: '2', name: '杠杆率', currentValue: 45, maxValue: 100, unit: '%', status: 'safe' as const },
      { key: '3', name: '波动率风险', currentValue: 78, maxValue: 100, unit: '%', status: 'warning' as const },
      { key: '4', name: '流动性风险', currentValue: 30, maxValue: 100, unit: '%', status: 'safe' as const },
      { key: '5', name: '隔夜风险', currentValue: 85, maxValue: 100, unit: '%', status: 'danger' as const },
      { key: '6', name: '缺口风险', currentValue: 20, maxValue: 100, unit: '%', status: 'safe' as const },
    ],
    onSuccess: (data) => {
      setIndicators(data);
    },
  });

  // Fetch audit trades
  const { data: tradesData } = useQuery({
    queryKey: ['audit-trades'],
    queryFn: async () => [
      { id: 1, tradeId: 'T20260414001', strategy: '趋势跟踪V1', type: '买入', symbol: 'XAUUSD', volume: 2.5, price: 2341.5, riskLevel: 'high', status: 'pending', submitTime: '2026-04-14 09:30:00' },
      { id: 2, tradeId: 'T20260414002', strategy: '均值回归', type: '卖出', symbol: 'XAUUSD', volume: 1.0, price: 2342.0, riskLevel: 'medium', status: 'approved', submitTime: '2026-04-14 09:25:00' },
      { id: 3, tradeId: 'T20260414003', strategy: '趋势跟踪V1', type: '买入', symbol: 'XAUUSD', volume: 5.0, price: 2341.8, riskLevel: 'critical', status: 'rejected', submitTime: '2026-04-14 09:20:00' },
      { id: 4, tradeId: 'T20260414004', strategy: '套利策略', type: '买入', symbol: 'XAUUSD', volume: 0.5, price: 2341.6, riskLevel: 'low', status: 'approved', submitTime: '2026-04-14 09:15:00' },
    ],
    onSuccess: (data) => {
      setAuditTrades(data);
    },
  });

  // Risk check mutation (for future use)
  const _riskCheckMutation = useMutation({
    mutationFn: async (order: any) => {
      const response = await riskAPI.check(order);
      return response.data;
    },
    onSuccess: () => {
      message.success('风控检查通过');
    },
    onError: () => {
      message.error('风控检查未通过');
    },
  });

  const displayIndicators = indicators.length > 0 ? indicators : riskIndicators ?? [];
  const displayTrades = auditTrades.length > 0 ? auditTrades : tradesData ?? [];

  const auditColumns = [
    { title: '交易ID', dataIndex: 'tradeId', key: 'tradeId' },
    { title: '策略', dataIndex: 'strategy', key: 'strategy' },
    { title: '类型', dataIndex: 'type', key: 'type' },
    { title: '品种', dataIndex: 'symbol', key: 'symbol' },
    { title: '交易量', dataIndex: 'volume', key: 'volume' },
    { title: '价格', dataIndex: 'price', key: 'price' },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      render: (level: string) => {
        const config: Record<string, { color: string; label: string }> = {
          low: { color: 'green', label: '低' },
          medium: { color: 'orange', label: '中' },
          high: { color: 'red', label: '高' },
          critical: { color: 'purple', label: '极高' },
        };
        return <Tag color={config[level]?.color}>{config[level]?.label}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
          pending: { color: 'gold', icon: <ExclamationCircleOutlined />, label: '待审核' },
          approved: { color: 'green', icon: <CheckCircleOutlined />, label: '已通过' },
          rejected: { color: 'red', icon: <CloseCircleOutlined />, label: '已拒绝' },
        };
        return (
          <Tag color={config[status]?.color} icon={config[status]?.icon}>
            {config[status]?.label}
          </Tag>
        );
      },
    },
    { title: '提交时间', dataIndex: 'submitTime', key: 'submitTime' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: AuditTrade) =>
        record.status === 'pending' && (
          <Space>
            <Button
              size="small"
              type="primary"
              style={{ background: '#22C55E', borderColor: '#22C55E' }}
              onClick={() => updateTradeStatus(record.id, 'approved')}
            >
              通过
            </Button>
            <Button
              size="small"
              danger
              onClick={() => updateTradeStatus(record.id, 'rejected')}
            >
              拒绝
            </Button>
          </Space>
        ),
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe':
        return '#22C55E';
      case 'warning':
        return '#F97316';
      case 'danger':
        return '#EF4444';
      default:
        return '#A8A29E';
    }
  };

  const handleSaveSettings = () => {
    message.success('风控设置已保存');
  };

  const handleAlertRuleChange = (key: string, enabled: boolean) => {
    setAlertRules((prev) =>
      prev.map((rule) => (rule.key === key ? { ...rule, enabled } : rule))
    );
    message.success('预警规则已更新');
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
        <h1 style={{ color: '#FAFAF9', marginBottom: '24px' }}>风控模块</h1>

        {/* Risk Rating and Key Metrics Row */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} lg={6}>
            <Card
              title={<span style={{ color: '#FAFAF9' }}>综合评级</span>}
              variant="borderless"
              style={{
                background: '#1C1917',
                border: '1px solid #44403C',
                height: '100%',
              }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
            >
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    border: `4px solid ${riskRating.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    flexDirection: 'column',
                  }}
                >
                  <span style={{ color: riskRating.color, fontSize: '36px', fontWeight: 'bold' }}>
                    {riskRating.grade}
                  </span>
                </div>
                <div style={{ marginTop: '12px', color: riskRating.color, fontSize: '16px', fontWeight: 'bold' }}>
                  {riskRating.label}
                </div>
                <div style={{ marginTop: '4px', color: '#A8A29E', fontSize: '12px' }}>
                  评级分数: {overallRating}
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={6}>
            <Card
              title={<span style={{ color: '#FAFAF9' }}>最大回撤</span>}
              variant="borderless"
              style={{
                background: '#1C1917',
                border: '1px solid #44403C',
                height: '100%',
              }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
            >
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ color: '#EF4444', fontSize: '32px', fontWeight: 'bold' }}>-2.35%</div>
                <div style={{ color: '#A8A29E', fontSize: '12px', marginTop: '8px' }}>
                  当前账户历史最大回撤
                </div>
                <Progress
                  percent={23.5}
                  strokeColor="#EF4444"
                  trailColor="#44403C"
                  showInfo={false}
                  style={{ marginTop: '12px' }}
                />
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={6}>
            <Card
              title={<span style={{ color: '#FAFAF9' }}>隔夜风险</span>}
              variant="borderless"
              style={{
                background: '#1C1917',
                border: '1px solid #44403C',
                height: '100%',
              }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
            >
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ color: '#F97316', fontSize: '32px', fontWeight: 'bold' }}>0.52%</div>
                <div style={{ color: '#A8A29E', fontSize: '12px', marginTop: '8px' }}>
                  持仓过夜平均风险暴露
                </div>
                <Progress
                  percent={52}
                  strokeColor="#F97316"
                  trailColor="#44403C"
                  showInfo={false}
                  style={{ marginTop: '12px' }}
                />
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={6}>
            <Card
              title={<span style={{ color: '#FAFAF9' }}>缺口风险</span>}
              variant="borderless"
              style={{
                background: '#1C1917',
                border: '1px solid #44403C',
                height: '100%',
              }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
            >
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ color: '#22C55E', fontSize: '32px', fontWeight: 'bold' }}>0.15%</div>
                <div style={{ color: '#A8A29E', fontSize: '12px', marginTop: '8px' }}>
                  跳空缺口风险暴露
                </div>
                <Progress
                  percent={15}
                  strokeColor="#22C55E"
                  trailColor="#44403C"
                  showInfo={false}
                  style={{ marginTop: '12px' }}
                />
              </div>
            </Card>
          </Col>
        </Row>

        {/* Three-Layer Risk Control */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          {/* Pre-trade Layer */}
          <Col xs={24} lg={8}>
            <Card
              title={
                <Space>
                  <LockOutlined style={{ color: '#CA8A04' }} />
                  <span style={{ color: '#FAFAF9' }}>交易前风控</span>
                </Space>
              }
              variant="borderless"
              style={{
                background: '#1C1917',
                border: '1px solid #44403C',
                height: '100%',
              }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
            >
              <div style={{ marginBottom: '12px' }}>
                <Tag color="green">参数校验</Tag>
              </div>
              <List
                size="small"
                dataSource={[
                  '仓位大小验证',
                  '保证金充足性检查',
                  '交易时间段校验',
                  '合约乘数验证',
                  '交易权限确认',
                ]}
                renderItem={(item) => (
                  <List.Item style={{ borderBottom: 'none', padding: '4px 0' }}>
                    <CheckCircleOutlined style={{ color: '#22C55E', marginRight: '8px' }} />
                    <span style={{ color: '#A8A29E' }}>{item}</span>
                  </List.Item>
                )}
              />
              <Divider style={{ margin: '12px 0', borderColor: '#44403C' }} />
              <div style={{ color: '#A8A29E', fontSize: '12px' }}>
                <div style={{ marginBottom: '4px' }}>当前状态: <span style={{ color: '#22C55E' }}>正常</span></div>
                <div>拦截订单: 0笔</div>
              </div>
            </Card>
          </Col>

          {/* In-trade Layer */}
          <Col xs={24} lg={8}>
            <Card
              title={
                <Space>
                  <ThunderboltOutlined style={{ color: '#F97316' }} />
                  <span style={{ color: '#FAFAF9' }}>交易中风控</span>
                </Space>
              }
              variant="borderless"
              style={{
                background: '#1C1917',
                border: '1px solid #44403C',
                height: '100%',
              }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
            >
              <div style={{ marginBottom: '12px' }}>
                <Tag color="orange">实时监控</Tag>
              </div>
              <List
                size="small"
                dataSource={[
                  '实时价格监控',
                  '动态止损跟踪',
                  '浮动盈亏预警',
                  '保证金预警',
                  '持仓限额监控',
                ]}
                renderItem={(item) => (
                  <List.Item style={{ borderBottom: 'none', padding: '4px 0' }}>
                    <CheckCircleOutlined style={{ color: '#22C55E', marginRight: '8px' }} />
                    <span style={{ color: '#A8A29E' }}>{item}</span>
                  </List.Item>
                )}
              />
              <Divider style={{ margin: '12px 0', borderColor: '#44403C' }} />
              <div style={{ color: '#A8A29E', fontSize: '12px' }}>
                <div style={{ marginBottom: '4px' }}>动态止损: <span style={{ color: '#22C55E' }}>已激活</span></div>
                <div>当前触发: 0笔</div>
              </div>
            </Card>
          </Col>

          {/* Post-trade Layer */}
          <Col xs={24} lg={8}>
            <Card
              title={
                <Space>
                  <FileTextOutlined style={{ color: '#3B82F6' }} />
                  <span style={{ color: '#FAFAF9' }}>交易后风控</span>
                </Space>
              }
              variant="borderless"
              style={{
                background: '#1C1917',
                border: '1px solid #44403C',
                height: '100%',
              }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
            >
              <div style={{ marginBottom: '12px' }}>
                <Tag color="blue">报告归因</Tag>
              </div>
              <List
                size="small"
                dataSource={[
                  '日终风险报告',
                  ' Performance归因分析',
                  '交易成本分析',
                  '风险调整收益计算',
                  '异常交易审查',
                ]}
                renderItem={(item) => (
                  <List.Item style={{ borderBottom: 'none', padding: '4px 0' }}>
                    <CheckCircleOutlined style={{ color: '#22C55E', marginRight: '8px' }} />
                    <span style={{ color: '#A8A29E' }}>{item}</span>
                  </List.Item>
                )}
              />
              <Divider style={{ margin: '12px 0', borderColor: '#44403C' }} />
              <div style={{ color: '#A8A29E', fontSize: '12px' }}>
                <div style={{ marginBottom: '4px' }}>报告生成: <span style={{ color: '#22C55E' }}>已开启</span></div>
                <div>下次生成: 17:00</div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Risk Indicators and Settings Row */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          {/* Risk Indicator Settings */}
          <Col xs={24} lg={12}>
            <Card
              title={<span style={{ color: '#FAFAF9' }}>风险指标设置</span>}
              variant="borderless"
              style={{
                background: '#1C1917',
                border: '1px solid #44403C',
              }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
            >
              <Form form={form} layout="vertical">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label={<span style={{ color: '#A8A29E' }}>头寸风险阈值</span>}>
                      <Slider
                        value={positionRiskThreshold}
                        onChange={setPositionRiskThreshold}
                        max={100}
                        trackStyle={{ background: '#CA8A04' }}
                        handleStyle={{ borderColor: '#CA8A04' }}
                      />
                      <div style={{ color: '#A8A29E' }}>当前: {positionRiskThreshold}% / 最大: 100%</div>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label={<span style={{ color: '#A8A29E' }}>杠杆率上限</span>}>
                      <Slider
                        value={leverageLimit}
                        onChange={setLeverageLimit}
                        max={100}
                        trackStyle={{ background: '#CA8A04' }}
                        handleStyle={{ borderColor: '#CA8A04' }}
                      />
                      <div style={{ color: '#A8A29E' }}>当前: {leverageLimit}% / 最大: 100%</div>
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label={<span style={{ color: '#A8A29E' }}>隔夜风险限额</span>}>
                      <Space.Compact>
                        <InputNumber
                          value={overnightRiskLimit}
                          onChange={(val) => setOvernightRiskLimit(val ?? 50)}
                          min={0}
                          max={100}
                          style={{ width: "100%", background: "#0A0A0F", borderColor: "#44403C" }}
                        />
                        <span>%</span>
                      </Space.Compact>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label={<span style={{ color: '#A8A29E' }}>缺口风险限额</span>}>
                      <Space.Compact>
                        <InputNumber
                          value={gapRiskLimit}
                          onChange={(val) => setGapRiskLimit(val ?? 20)}
                          min={0}
                          max={100}
                          style={{ width: "100%", background: "#0A0A0F", borderColor: "#44403C" }}
                        />
                        <span>%</span>
                      </Space.Compact>
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label={<span style={{ color: '#A8A29E' }}>自动风控模式</span>}>
                  <Select
                    value={autoRiskMode}
                    onChange={setAutoRiskMode}
                    style={{ width: 200 }}
                  >
                    <Select.Option value="strict">严格模式</Select.Option>
                    <Select.Option value="moderate">适中模式</Select.Option>
                    <Select.Option value="relaxed">宽松模式</Select.Option>
                  </Select>
                </Form.Item>
              </Form>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSaveSettings}
                style={{ background: '#CA8A04', borderColor: '#CA8A04', marginTop: '16px' }}
              >
                保存设置
              </Button>
            </Card>
          </Col>

          {/* Risk Alert Rules */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <WarningOutlined style={{ color: '#EF4444' }} />
                  <span style={{ color: '#FAFAF9' }}>风险预警规则</span>
                </Space>
              }
              variant="borderless"
              style={{
                background: '#1C1917',
                border: '1px solid #44403C',
              }}
              styles={{ header: { borderBottom: '1px solid #44403C' } }}
            >
              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {alertRules.map((rule) => (
                  <div
                    key={rule.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid #44403C',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#FAFAF9', marginBottom: '4px' }}>{rule.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#A8A29E', fontSize: '12px' }}>
                          阈值: {rule.threshold}%
                        </span>
                        <Tag
                          color={rule.action === 'block' ? 'red' : rule.action === 'warn' ? 'orange' : 'blue'}
                          style={{ margin: 0 }}
                        >
                          {rule.action === 'block' ? '拦截' : rule.action === 'warn' ? '警告' : '通知'}
                        </Tag>
                      </div>
                    </div>
                    <Switch
                      checked={rule.enabled}
                      onChange={(checked) => handleAlertRuleChange(rule.key, checked)}
                      checkedChildren="开"
                      unCheckedChildren="关"
                    />
                  </div>
                ))}
              </div>
            </Card>
          </Col>
        </Row>

        {/* Risk Indicators Display */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          {displayIndicators.map((indicator: RiskIndicator) => (
            <Col key={indicator.key} xs={24} sm={12} lg={4}>
              <Card
                variant="borderless"
                style={{ background: '#1C1917', border: '1px solid #44403C' }}
                styles={{ body: { padding: '12px' } }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#A8A29E', fontSize: '12px', marginBottom: '8px' }}>
                    {indicator.name}
                  </div>
                  <Progress
                    type="circle"
                    percent={indicator.currentValue}
                    size={60}
                    strokeColor={getStatusColor(indicator.status)}
                    trailColor="#44403C"
                    format={(percent) => (
                      <span style={{ color: '#FAFAF9', fontSize: '12px' }}>{percent}%</span>
                    )}
                  />
                  <div style={{ marginTop: '8px' }}>
                    <Tag color={getStatusColor(indicator.status)}>
                      {indicator.status === 'safe' ? '安全' : indicator.status === 'warning' ? '警告' : '危险'}
                    </Tag>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Audit Status Table */}
        <Card
          title={<span style={{ color: '#FAFAF9' }}>审核状态</span>}
          variant="borderless"
          style={{ background: '#1C1917', border: '1px solid #44403C' }}
          styles={{ header: { borderBottom: '1px solid #44403C' } }}
          extra={
            <Space>
              <Select defaultValue="all" style={{ width: 120 }}>
                <Select.Option value="all">全部</Select.Option>
                <Select.Option value="pending">待审核</Select.Option>
                <Select.Option value="approved">已通过</Select.Option>
                <Select.Option value="rejected">已拒绝</Select.Option>
              </Select>
              <Button icon={<SaveOutlined />}>导出</Button>
            </Space>
          }
        >
          <Table
            columns={auditColumns}
            dataSource={displayTrades}
            pagination={{ pageSize: 5 }}
            rowKey="id"
            scroll={{ x: 'max-content' }}
          />
        </Card>
      </div>
    </ConfigProvider>
  );
};

export default RiskControl;
// page:RiskControl
