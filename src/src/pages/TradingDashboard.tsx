import React, { useEffect, useState } from 'react';
import { Row, Col, Tabs, Card, message, Button, Space, Tooltip, Badge } from 'antd';
import {
  DashboardOutlined,
  SettingOutlined,
  BellOutlined,
  ReloadOutlined,
  ExportOutlined,
  AppstoreOutlined,
  SafetyOutlined
} from '@ant-design/icons';

// 导入组件
import RealtimeChart from '../components/RealtimeChart';
import TradeSignals from '../components/TradeSignals';
import StrategyConfigurator from '../components/StrategyConfigurator';
import PerformanceCard from '../components/ui/cards/PerformanceCard';
import StrategyCard, { StrategyConfig } from '../components/ui/cards/StrategyCard';
import RiskMonitor from '../components/RiskMonitor';

// 导入状态管理
import { useSystem, useAuth, useTrade, useConfig, useWebSocket } from '../store';
// UI UX PRO MAX统一主题系统 - 本地ConfigProvider已移除
// 主题由全局main-upgraded.tsx统一管理

// 导入样式
import './TradingDashboard.css';

const { TabPane } = Tabs;

const TradingDashboard: React.FC = () => {
  // 状态管理hooks
  const { healthStatus, performance, isLoading, checkHealth, fetchPerformance } = useSystem();
  const { authToken, isAuthenticated } = useAuth();
  const {
    strategys,
    accounts,
    tradeHistory,
    fetchStrategies,
    createStrategy,
    updateStrategy,
    deleteStrategy,
    executeTrade
  } = useTrade();
  const { userConfig, updateUserConfig } = useConfig();
  const { status: wsStatus, isConnected, connect, disconnect } = useWebSocket();

  // 本地状态
  const [activeTab, setActiveTab] = useState('overview');
  const [editingStrategy, setEditingStrategy] = useState<StrategyConfig | null>(null);
  const [darkMode, setDarkMode] = useState(true); // PRO MAX默认暗色模式
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 初始化
  useEffect(() => {
    const initialize = async () => {
      try {
        await Promise.all([
          checkHealth(),
          fetchPerformance(),
          fetchStrategies()
        ]);

        // 如果已认证且WebSocket未连接，则连接
        if (isAuthenticated && !isConnected) {
          await connect();
        }
      } catch (error) {
        message.error('初始化失败: ' + (error as Error).message);
      }
    };

    initialize();

    // 设置自动刷新
    let refreshInterval: NodeJS.Timeout;
    if (autoRefresh) {
      refreshInterval = setInterval(() => {
        fetchPerformance();
        fetchStrategies();
      }, 10000); // 每10秒刷新
    }

    // 监听窗口事件
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkHealth();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, isConnected, autoRefresh]);

  // WebSocket连接状态处理
  useEffect(() => {
    if (wsStatus === 'error') {
      message.error('WebSocket连接错误');
    } else if (wsStatus === 'connected') {
      message.success('实时数据连接已建立');
    }
  }, [wsStatus]);

  // 策略管理操作
  const handleCreateStrategy = async (strategyData: any) => {
    try {
      await createStrategy(strategyData);
      message.success('策略创建成功');
      setEditingStrategy(null);
    } catch (error) {
      message.error('创建策略失败: ' + (error as Error).message);
    }
  };

  const handleUpdateStrategy = async (id: string, updates: Partial<StrategyConfig>) => {
    try {
      await updateStrategy(id, updates);
      message.success('策略更新成功');
      setEditingStrategy(null);
    } catch (error) {
      message.error('更新策略失败: ' + (error as Error).message);
    }
  };

  const handleDeleteStrategy = async (id: string) => {
    try {
      await deleteStrategy(id);
      message.success('策略删除成功');
    } catch (error) {
      message.error('删除策略失败: ' + (error as Error).message);
    }
  };

  const handleToggleStrategy = async (id: string, status: StrategyConfig['status']) => {
    try {
      await updateStrategy(id, { status });
      const action = status === 'running' ? '启动' : '暂停';
      message.success(`策略已${action}`);
    } catch (error) {
      message.error('操作失败: ' + (error as Error).message);
    }
  };

  const handleCloneStrategy = (strategy: StrategyConfig) => {
    const clonedStrategy = {
      ...strategy,
      id: '',
      name: `${strategy.name} (副本)`,
      status: 'stopped' as const,
      createdAt: new Date().toISOString()
    };
    setEditingStrategy(clonedStrategy);
  };

  const handleTradeExecute = async (tradeData: any) => {
    try {
      const result = await executeTrade(tradeData);
      message.success('交易执行成功');
      return result;
    } catch (error) {
      message.error('交易执行失败: ' + (error as Error).message);
      throw error;
    }
  };

  // 渲染头部工具栏
  const renderToolbar = () => (
    <div className="dashboard-toolbar">
      <Space>
        <Tooltip title="刷新数据">
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchPerformance}
            loading={isLoading}
          >
            刷新
          </Button>
        </Tooltip>

        <Tooltip title="导出数据">
          <Button icon={<ExportOutlined />}>
            导出
          </Button>
        </Tooltip>

        <Tooltip title="切换主题">
          <Button
            onClick={() => {
              setDarkMode(!darkMode);
              updateUserConfig({ theme: darkMode ? 'light' : 'dark' });
            }}
          >
            {darkMode ? '浅色模式' : '深色模式'}
          </Button>
        </Tooltip>

        <Tooltip title="系统设置">
          <Button icon={<SettingOutlined />}>
            设置
          </Button>
        </Tooltip>

        <Badge
          count={accounts?.[0]?.floatingProfit ? accounts[0].floatingProfit.toFixed(2) : 0}
          className={accounts?.[0]?.floatingProfit >= 0 ? 'profit-badge' : 'loss-badge'}
        >
          <span className="account-info">
            余额: {accounts?.[0]?.balance?.toFixed(2) || 0}
          </span>
        </Badge>
      </Space>
    </div>
  );

  // 渲染状态指示器
  const renderStatusIndicators = () => (
    <div className="status-indicators">
      <div className={`status-indicator ${healthStatus}`}>
        <span className="status-dot"></span>
        系统状态: {healthStatus === 'healthy' ? '正常' : '异常'}
      </div>

      <div className={`status-indicator ${wsStatus}`}>
        <span className="status-dot"></span>
        实时连接: {isConnected ? '已连接' : '断开'}
      </div>

      <div className="status-indicator performance">
        <span className="status-dot"></span>
        延迟: {performance?.latencyMs || 0}ms
      </div>
    </div>
  );

  // 主渲染函数 - UI UX PRO MAX统一主题系统
  return (
    <div className="trading-dashboard">
        {/* 头部 */}
        <div className="dashboard-header">
          <div className="header-left">
            <DashboardOutlined className="header-icon" />
            <h1>Tick Gold 量化交易系统</h1>
            <span className="header-subtitle">XAUUSD 黄金交易对量化分析</span>
          </div>
          <div className="header-right">
            {renderStatusIndicators()}
            {renderToolbar()}
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="dashboard-content">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            className="main-tabs"
            size="large"
          >
            {/* 概览标签页 */}
            <TabPane tab={<><AppstoreOutlined /> 概览</>} key="overview">
              <Row gutter={[16, 16]}>
                {/* 实时图表 */}
                <Col span={16}>
                  <Card
                    title="实时价格图表 (XAUUSD)"
                    className="chart-card"
                    extra={
                      <Space>
                        <Button size="small">M1</Button>
                        <Button size="small">M5</Button>
                        <Button size="small" type="primary">M15</Button>
                        <Button size="small">M30</Button>
                      </Space>
                    }
                  >
                    <RealtimeChart timeframe="M15" />
                  </Card>
                </Col>

                {/* 性能指标 */}
                <Col span={8}>
                  <PerformanceCard
                    title="系统性能指标"
                    onRefresh={fetchPerformance}
                    loading={isLoading}
                  />
                </Col>

                {/* 交易信号 */}
                <Col span={12}>
                  <Card title="实时交易信号" className="signals-card">
                    <TradeSignals
                      signals={tradeHistory || []}
                      onExecuteTrade={handleTradeExecute}
                    />
                  </Card>
                </Col>

                {/* 账户信息 */}
                <Col span={12}>
                  <Card
                    title="账户信息"
                    className="account-card"
                    extra={
                      <Badge
                        status={accounts?.[0]?.floatingProfit >= 0 ? "success" : "error"}
                        text={accounts?.[0]?.floatingProfit >= 0 ? "盈利" : "亏损"}
                      />
                    }
                  >
                    <div className="account-stats">
                      {accounts?.map(account => (
                        <div key={account.id} className="account-item">
                          <div className="stat-row">
                            <span>余额:</span>
                            <strong>{account.balance?.toFixed(2)}</strong>
                          </div>
                          <div className="stat-row">
                            <span>净值:</span>
                            <strong>{account.equity?.toFixed(2)}</strong>
                          </div>
                          <div className="stat-row">
                            <span>浮动盈亏:</span>
                            <strong className={account.floatingProfit >= 0 ? 'positive' : 'negative'}>
                              {account.floatingProfit >= 0 ? '+' : ''}{account.floatingProfit?.toFixed(2)}
                            </strong>
                          </div>
                          <div className="stat-row">
                            <span>收益率:</span>
                            <strong className={account.profitPct >= 0 ? 'positive' : 'negative'}>
                              {account.profitPct >= 0 ? '+' : ''}{account.profitPct?.toFixed(2)}%
                            </strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </Col>
              </Row>
            </TabPane>

            {/* 策略标签页 */}
            <TabPane tab={<><SettingOutlined /> 策略管理</>} key="strategies">
              <Row gutter={[16, 16]}>
                {/* 策略配置器 */}
                <Col span={editingStrategy ? 12 : 24}>
                  <Card
                    title="策略配置中心"
                    className="strategy-config-card"
                    extra={
                      <Button
                        type="primary"
                        onClick={() => setEditingStrategy({
                          id: '',
                          name: '',
                          type: 'trend_following',
                          timeframe: 'M15',
                          status: 'stopped',
                          performance: {
                            totalReturn: 0,
                            winRate: 0,
                            maxDrawdown: 0,
                            sharpeRatio: 0,
                            tradesCount: 0
                          },
                          parameters: {},
                          riskLevel: 'medium',
                          autoStart: false,
                          notificationEnabled: true,
                          maxPositions: 3,
                          stopLoss: 2.0,
                          takeProfit: 4.0,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString()
                        })}
                      >
                        新建策略
                      </Button>
                    }
                  >
                    {editingStrategy ? (
                      <div className="strategy-editor">
                        <StrategyConfigurator
                          initialData={editingStrategy}
                          onSubmit={editingStrategy.id ?
                            (data) => handleUpdateStrategy(editingStrategy.id, data) :
                            handleCreateStrategy
                          }
                          onCancel={() => setEditingStrategy(null)}
                          mode={editingStrategy.id ? 'edit' : 'create'}
                        />
                      </div>
                    ) : (
                      <div className="strategy-grid">
                        {(strategys || []).slice(0, 4).map(strategy => (
                          <StrategyCard
                            key={strategy.id}
                            strategy={strategy}
                            onStart={handleToggleStrategy}
                            onPause={handleToggleStrategy}
                            onEdit={setEditingStrategy}
                            onDelete={handleDeleteStrategy}
                            onClone={handleCloneStrategy}
                            onStatusChange={handleToggleStrategy}
                            showActions
                            compact={false}
                          />
                        ))}
                      </div>
                    )}
                  </Card>
                </Col>

                {/* 策略列表 */}
                {!editingStrategy && (
                  <Col span={12}>
                    <Card title="运行中策略" className="active-strategies-card">
                      {(strategys || [])
                        .filter(s => s.status === 'running')
                        .map(strategy => (
                          <StrategyCard
                            key={strategy.id}
                            strategy={strategy}
                            onStart={handleToggleStrategy}
                            onPause={handleToggleStrategy}
                            onEdit={setEditingStrategy}
                            onDelete={handleDeleteStrategy}
                            compact
                          />
                        ))}
                      {(strategys || []).filter(s => s.status === 'running').length === 0 && (
                        <div className="no-active-strategies">
                          <BellOutlined />
                          <p>暂无运行中的策略</p>
                          <p className="hint">点击&quot;新建策略&quot;创建或启动现有策略</p>
                        </div>
                      )}
                    </Card>
                  </Col>
                )}
              </Row>
            </TabPane>

            {/* 风险管理标签页 */}
            <TabPane tab={<><SafetyOutlined /> 风险管理</>} key="risk">
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <RiskMonitor />
                </Col>
              </Row>
            </TabPane>

            {/* 交易历史标签页 */}
            <TabPane tab={<><ExportOutlined /> 交易历史</>} key="history">
              <Card title="交易历史记录">
                <div className="trade-history-container">
                  <div className="history-filters">
                    <Space>
                      <Button>今天</Button>
                      <Button type="primary">本周</Button>
                      <Button>本月</Button>
                      <Button>全部</Button>
                    </Space>
                  </div>
                  <div className="history-table">
                    {/* 交易历史表格组件待实现 */}
                    <p className="placeholder-text">交易历史表格组件待实现...</p>
                  </div>
                </div>
              </Card>
            </TabPane>
          </Tabs>
        </div>

        {/* 底部状态栏 */}
        <div className="dashboard-footer">
          <div className="footer-left">
            <span>© 2026 Tick Gold 量化交易系统</span>
            <span className="version">版本 v0.1.0</span>
          </div>
          <div className="footer-right">
            <span className="last-update">
              最后更新: {performance?.timestamp || new Date().toLocaleString()}
            </span>
            <span className="data-source">
              数据源: Tick数据流 (21,340+ ticks/sec)
            </span>
          </div>
        </div>
      </div>
      );
};

export default TradingDashboard;