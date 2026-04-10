import React from 'react';
import { Card, Row, Col, Tag, Button, Space, Tabs, Switch, Input, Form, Select } from 'antd';
import { motion } from 'framer-motion';

const { TabPane } = Tabs;
const { Option } = Select;

const SystemSettingsPage: React.FC = () => {
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    console.log('设置保存:', values);
  };

  return (
    <div className="siliconflow-page systemsettings-page">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Card className="chart-container-silicon" title="⚙️ 系统设置 & 高级功能">
          <Tabs defaultActiveKey="general" type="card">
            <TabPane tab="🌐 网络设置" key="network">
              <div className="system-settings-silicon">
                <Row gutter={[24, 24]}>
                  <Col span={12}>
                    <Card title="连接状态" size="small">
                      <p>API连接状态: <Tag color="green">已连接</Tag></p>
                      <p>WebSocket: <Tag color="green">活跃</Tag></p>
                      <p>推送延迟: <Tag color="blue">28ms</Tag></p>
                      <p>数据源: <Tag color="cyan">实时数据流</Tag></p>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="服务器配置" size="small">
                      <Form form={form} layout="vertical" size="small">
                        <Form.Item label="API端点" name="apiEndpoint">
                          <Input defaultValue="wss://api.tickgold.com/stream" />
                        </Form.Item>
                        <Form.Item label="重试次数" name="retryCount">
                          <Select defaultValue="3">
                            <Option value="1">1次</Option>
                            <Option value="2">2次</Option>
                            <Option value="3">3次</Option>
                            <Option value="5">5次</Option>
                          </Select>
                        </Form.Item>
                        <Form.Item label="超时时间" name="timeout">
                          <Select defaultValue="5000">
                            <Option value="3000">3秒</Option>
                            <Option value="5000">5秒</Option>
                            <Option value="10000">10秒</Option>
                            <Option value="15000">15秒</Option>
                          </Select>
                        </Form.Item>
                      </Form>
                    </Card>
                  </Col>
                </Row>
              </div>
            </TabPane>

            <TabPane tab="🔒 安全设置" key="security">
              <div className="system-settings-silicon">
                <Row gutter={[24, 24]}>
                  <Col span={12}>
                    <Card title="认证状态" size="small">
                      <p>双因素认证: <Tag color="green">启用</Tag></p>
                      <p>API密钥: <Tag color="orange">已设置</Tag></p>
                      <p>审计日志: <Tag color="blue">记录中</Tag></p>
                      <p>最后登录: <Tag color="cyan">今天 10:23:15</Tag></p>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="安全选项" size="small">
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span>自动登出</span>
                          <Switch defaultChecked />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span>登录通知</span>
                          <Switch defaultChecked />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span>IP白名单</span>
                          <Switch />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>API权限控制</span>
                          <Switch defaultChecked />
                        </div>
                      </div>
                    </Card>
                  </Col>
                  <Col span={24}>
                    <Card title="密钥管理" size="small">
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Button type="primary">生成新API密钥</Button>
                        <Button danger>删除失效密钥</Button>
                        <Button type="dashed">查看密钥日志</Button>
                      </Space>
                    </Card>
                  </Col>
                </Row>
              </div>
            </TabPane>

            <TabPane tab="🚀 高级功能" key="advanced">
              <div className="system-settings-silicon">
                <Row gutter={[24, 24]}>
                  <Col span={24}>
                    <Card title="高级工具">
                      <Space wrap>
                        <Button type="dashed">批量策略测试</Button>
                        <Button type="dashed">多账户管理</Button>
                        <Button type="dashed">性能监控器</Button>
                        <Button type="dashed">数据导出工具</Button>
                        <Button type="dashed">系统诊断</Button>
                        <Button type="primary">全局配置</Button>
                      </Space>
                    </Card>
                  </Col>

                  <Col span={12}>
                    <Card title="性能设置" size="small">
                      <Form form={form} layout="vertical" size="small">
                        <Form.Item label="数据处理模式">
                          <Select defaultValue="performance">
                            <Option value="performance">性能优先</Option>
                            <Option value="balance">平衡模式</Option>
                            <Option value="accuracy">精度优先</Option>
                          </Select>
                        </Form.Item>
                        <Form.Item label="缓存策略">
                          <Select defaultValue="lru">
                            <Option value="lru">LRU缓存</Option>
                            <Option value="fifo">FIFO缓存</Option>
                            <Option value="adaptive">自适应缓存</Option>
                          </Select>
                        </Form.Item>
                        <Form.Item label="并发数限制">
                          <Select defaultValue="50">
                            <Option value="10">10线程</Option>
                            <Option value="20">20线程</Option>
                            <Option value="50">50线程</Option>
                            <Option value="100">100线程</Option>
                          </Select>
                        </Form.Item>
                      </Form>
                    </Card>
                  </Col>

                  <Col span={12}>
                    <Card title="数据管理" size="small">
                      <Form form={form} layout="vertical" size="small">
                        <Form.Item label="数据保留策略">
                          <Select defaultValue="30days">
                            <Option value="7days">7天</Option>
                            <Option value="30days">30天</Option>
                            <Option value="90days">90天</Option>
                            <Option value="1year">1年</Option>
                          </Select>
                        </Form.Item>
                        <Form.Item label="备份频率">
                          <Select defaultValue="daily">
                            <Option value="hourly">每小时</Option>
                            <Option value="daily">每天</Option>
                            <Option value="weekly">每周</Option>
                          </Select>
                        </Form.Item>
                        <Form.Item label="数据压缩">
                          <Select defaultValue="enabled">
                            <Option value="enabled">启用</Option>
                            <Option value="disabled">禁用</Option>
                            <Option value="auto">自动</Option>
                          </Select>
                        </Form.Item>
                      </Form>
                    </Card>
                  </Col>
                </Row>
              </div>
            </TabPane>

            <TabPane tab="💼 交易设置" key="trading">
              <div className="system-settings-silicon">
                <Row gutter={[24, 24]}>
                  <Col span={12}>
                    <Card title="风险控制" size="small">
                      <Form form={form} layout="vertical" size="small">
                        <Form.Item label="单笔最大损失">
                          <Input defaultValue="0.1" suffix="%" />
                        </Form.Item>
                        <Form.Item label="每日最大损失">
                          <Input defaultValue="0.5" suffix="%" />
                        </Form.Item>
                        <Form.Item label="跳空风险阈值">
                          <Input defaultValue="1.0" suffix="%" />
                        </Form.Item>
                        <Form.Item label="隔夜风险阈值">
                          <Input defaultValue="0.5" suffix="%" />
                        </Form.Item>
                      </Form>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="执行设置" size="small">
                      <Form form={form} layout="vertical" size="small">
                        <Form.Item label="默认滑点">
                          <Input defaultValue="0.001" suffix="%" />
                        </Form.Item>
                        <Form.Item label="交易手续费">
                          <Input defaultValue="0.003" suffix="%" />
                        </Form.Item>
                        <Form.Item label="最小交易额">
                          <Input defaultValue="100" suffix="美元" />
                        </Form.Item>
                        <Form.Item label="报价延迟容忍度">
                          <Select defaultValue="100">
                            <Option value="50">50ms</Option>
                            <Option value="100">100ms</Option>
                            <Option value="200">200ms</Option>
                            <Option value="500">500ms</Option>
                          </Select>
                        </Form.Item>
                      </Form>
                    </Card>
                  </Col>
                </Row>
              </div>
            </TabPane>
          </Tabs>

          {/* 保存按钮 */}
          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button>重置</Button>
              <Button type="primary" onClick={() => form.submit()}>
                保存设置
              </Button>
            </Space>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default SystemSettingsPage;