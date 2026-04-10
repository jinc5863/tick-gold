import React, { useEffect, useState } from 'react';
import { Row, Col, Statistic, Button, Card, Avatar, Badge, Space, Divider, Progress, Alert, Tag } from 'antd';
import {
  DashboardOutlined,
  LineChartOutlined,
  FilterOutlined,
  ExperimentOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  RobotOutlined,
  BarChartOutlined,
  ApiOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  CloudOutlined,
  SearchOutlined,
  BellOutlined,
  UserOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import RealtimeChart from './RealtimeChart';
import StrategyConfigurator from './StrategyConfigurator';
import TradeSignals from './TradeSignals';
import TopBar from './TopBar'; // 将创建的顶部导航栏
import './DashboardUpgraded.css';
import './ProDashboardSiliconFlow.css'; // 新的样式文件
import { usePerformance, useSystem, useAuth } from '../store';
import {
  Outlet,
  useNavigate,
  useLocation
} from 'react-router-dom';

// 加载状态组件 - 性能优化：避免重复渲染
const LoadingState: React.FC = () => (
  <div className="dashboard-loading-pro">
    <motion.div
      animate={{
        rotate: 360,
        scale: [1, 1.1, 1]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <div className="loading-spinner-pro">
        <DashboardOutlined style={{ fontSize: '48px', color: '#FFD700' }} />
      </div>
    </motion.div>
    <div className="loading-text-pro">正在加载专业量化交易系统...</div>
  </div>
);

// 关键性能指标组件 - 独立复用组件
const PerformanceMetricsGrid: React.FC<{ performance: any }> = ({ performance }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.2, duration: 0.5 }}
    className="performance-grid-silicon"
  >
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={4}>
        <motion.div whileHover={{ y: -3 }}>
          <Card className="perf-card throughput">
            <div className="perf-icon"><ApiOutlined /></div>
            <Statistic
              title="吞吐量"
              value={performance?.throughputTps || 21340}
              suffix="tps"
              valueStyle={{ color: '#10B981' }}
            />
          </Card>
        </motion.div>
      </Col>
      <Col xs={24} sm={12} lg={4}>
        <motion.div whileHover={{ y: -3 }}>
          <Card className="perf-card latency">
            <div className="perf-icon"><ThunderboltOutlined /></div>
            <Statistic
              title="延迟"
              value={performance?.latencyMs || 15.2}
              suffix="ms"
              valueStyle={{ color: '#3B82F6' }}
            />
          </Card>
        </motion.div>
      </Col>
      <Col xs={24} sm={12} lg={4}>
        <motion.div whileHover={{ y: -3 }}>
          <Card className="perf-card tick-count">
            <div className="perf-icon"><BarChartOutlined /></div>
            <Statistic
              title="Tick计数"
              value={performance?.tickCounter || 1245670}
              valueStyle={{ color: '#FFD700' }}
            />
          </Card>
        </motion.div>
      </Col>
      <Col xs={24} sm={12} lg={4}>
        <motion.div whileHover={{ y: -3 }}>
          <Card className="perf-card memory">
            <div className="perf-icon"><CloudOutlined /></div>
            <Statistic
              title="内存使用"
              value={85.5}
              suffix="%"
              valueStyle={{ color: '#F59E0B' }}
            />
          </Card>
        </motion.div>
      </Col>
      <Col xs={24} sm={12} lg={4}>
        <motion.div whileHover={{ y: -3 }}>
          <Card className="perf-card risk">
            <div className="perf-icon"><SafetyOutlined /></div>
            <Statistic
              title="总收益率"
              value={15.8}
              suffix="%"
              valueStyle={{ color: '#10B981' }}
            />
          </Card>
        </motion.div>
      </Col>
      <Col xs={24} sm={12} lg={4}>
        <motion.div whileHover={{ y: -3 }}>
          <Card className="perf-card position">
            <div className="perf-icon"><DashboardOutlined /></div>
            <Statistic
              title="头寸规模"
              value={2.1}
              suffix="%"
              valueStyle={{ color: '#F59E0B' }}
            />
          </Card>
        </motion.div>
      </Col>
    </Row>
  </motion.div>
);

// 状态栏组件 - 从原组件提取
const StatusBar: React.FC<{ healthStatus: string; authToken: string | null }> = ({ healthStatus, authToken }) => (
  <div className="system-status-silicon">
    <Badge
      status={healthStatus === 'healthy' ? "success" : "error"}
      text={
        <span className="status-text">
          {healthStatus === 'healthy' ? '🔵 系统正常运行' : '🔴 系统异常'}
        </span>
      }
    />
    <span className="separator">|</span>
    <span className="uptime">
      📊 Tick容量: 21,340+/sec
    </span>
    <span className="separator">|</span>
    <span className="auth-status">
      {authToken ? '✅ 已认证' : '🛠️ 开发模式'}
    </span>
  </div>
);

// 底部栏组件
const FooterBar: React.FC<{ performance: any }> = ({ performance }) => (
  <div className="footer-silicon">
    <Row align="middle">
      <Col span={8}>
        <div className="system-info">
          <span>🔍 交易品种: XAUUSD</span>
          <span className="separator">|</span>
          <span>📊 周期: M1/M5/M15/M30/H1</span>
        </div>
      </Col>
      <Col span={8} className="footer-center">
        <div className="active-process">
          <Badge status="processing" text="实时数据处理中..." />
        </div>
      </Col>
      <Col span={8} className="footer-right">
        <div className="version-info">
          <span className="version">🚀 v0.1.0 PRO MAX ULTRA</span>
          <span className="last-tick">
            📍 最后更新: {performance?.lastTick ? new Date(performance.lastTick).toLocaleTimeString() : '无数据'}
          </span>
        </div>
      </Col>
    </Row>
  </div>
);

// 侧边栏导航组件
const SidebarNav: React.FC<{ currentPath: string; onNavigate: (path: string) => void }> = ({ currentPath, onNavigate }) => {
  const navItems = [
    { key: '/overview', icon: <DashboardOutlined />, label: '面板概览', badge: 'New' },
    { key: '/data-clean', icon: <FilterOutlined />, label: '数据清洗' },
    { key: '/factor-analysis', icon: <ExperimentOutlined />, label: '因子分析', badge: 15 },
    { key: '/strategy-center', icon: <SettingOutlined />, label: '策略中心', badge: 8 },
    { key: '/backtest', icon: <PlayCircleOutlined />, label: '回测分析', badge: 'dot' },
    { key: '/simulation', icon: <RobotOutlined />, label: '模拟验证', badge: 'processing' },
    { key: '/ai-analysis', icon: <BarChartOutlined />, label: 'AI深度分析', badge: 'success' },
    { key: '/system-settings', icon: <SettingOutlined />, label: '系统设置' },
  ];

  return (
    <div className="sidebar-silicon">
      <div className="sidebar-header">
        <div className="brand-logo-silicon">
          <LineChartOutlined style={{ fontSize: '28px', color: '#FFD700' }} />
          <div className="brand-text-silicon">
            <div className="brand-title">Tick Gold</div>
            <div className="brand-subtitle">量化交易系统</div>
          </div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Button
            key={item.key}
            type={currentPath === item.key ? 'primary' : 'text'}
            icon={item.icon}
            className={`nav-item ${currentPath === item.key ? 'active' : ''}`}
            onClick={() => onNavigate(item.key)}
            block
          >
            <span className="nav-label">{item.label}</span>
            {item.badge && (
              <span className="nav-badge">
                {typeof item.badge === 'number' ? (
                  <Badge count={item.badge} size="small" />
                ) : item.badge === 'dot' ? (
                  <Badge dot />
                ) : item.badge === 'processing' ? (
                  <Badge status="processing" />
                ) : item.badge === 'success' ? (
                  <Badge status="success" />
                ) : (
                  <Badge count={item.badge as string} size="small" />
                )}
              </span>
            )}
          </Button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="quick-actions">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Button type="dashed" icon={<SettingOutlined />} block>
              快速设置
            </Button>
            <Button type="dashed" icon={<BellOutlined />} block>
              通知中心
            </Button>
          </Space>
        </div>
      </div>
    </div>
  );
};

// 主组件 - SiliconFlow 布局
const ProDashboardSiliconFlow: React.FC = () => {
  const { performance, fetchPerformance } = usePerformance();
  const { healthStatus, isLoading: loading, checkHealth } = useSystem();
  const { authToken } = useAuth();
  const [forceLoad, setForceLoad] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const initialize = async () => {
      try {
        await Promise.all([
          checkHealth().catch(e => console.warn('健康检查失败:', e)),
          fetchPerformance().catch(e => console.warn('性能获取失败:', e))
        ]);
      } catch (error) {
        console.warn('初始化部分失败:', error);
      }

      // 设置安全超时，无论如何都会进入界面
      setTimeout(() => {
        setForceLoad(true);
      }, 3000);
    };

    initialize();

    const performanceInterval = setInterval(fetchPerformance, 15000); // 延长到15秒
    const healthInterval = setInterval(checkHealth, 60000); // 延长到60秒

    return () => {
      clearInterval(performanceInterval);
      clearInterval(healthInterval);
    };
  }, [checkHealth, fetchPerformance]);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  // 如果loading超过3秒，强制进入界面
  if (loading && !forceLoad) {
    return <LoadingState />;
  }

  return (
    <div className="dashboard-silicon">
      {/* 顶部导航栏 - 使用独立的TopBar组件 */}
      <TopBar
        healthStatus={healthStatus}
        authToken={authToken}
        performance={performance}
      />

      {/* 主体布局 - 侧边栏 + 内容区域 */}
      <div className="main-layout-silicon">
        {/* 左侧边栏导航 */}
        <SidebarNav
          currentPath={location.pathname}
          onNavigate={handleNavigate}
        />

        {/* 主内容区域 */}
        <main className="content-area-silicon">
          {/* 关键性能指标 */}
          <PerformanceMetricsGrid performance={performance} />

          {/* 动态路由内容 - 各页面组件通过Outlet渲染 */}
          <div className="page-content-silicon">
            <Outlet />
          </div>

          {/* 底部栏 */}
          <FooterBar performance={performance} />
        </main>
      </div>
    </div>
  );
};

export default ProDashboardSiliconFlow;