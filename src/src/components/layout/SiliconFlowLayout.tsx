import React, { useState, useEffect } from 'react';
import { Layout, Drawer, Button, Space } from 'antd';
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  DashboardOutlined,
  FilterOutlined,
  ExperimentOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  RobotOutlined,
  BarChartOutlined,
  ApiOutlined
} from '@ant-design/icons';
import SidebarNavigation from './SidebarNavigation';
import TopBar from './TopBar';
import './SiliconFlowLayout.css';

const { Header, Sider, Content } = Layout;

interface SiliconFlowLayoutProps {
  children: React.ReactNode;
}

const SiliconFlowLayout: React.FC<SiliconFlowLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 检测移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 处理侧边栏切换
  const toggleSidebar = () => {
    if (isMobile) {
      setMobileDrawerOpen(!mobileDrawerOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  // 侧边栏内容
  const sidebarContent = (
    <div className="siliconflow-sidebar-content">
      {/* 品牌标识区域 */}
      <div className="sidebar-header">
        <div className="brand-identity">
          <div className="brand-logo">
            <ApiOutlined style={{ fontSize: '24px', color: 'var(--gold-primary)' }} />
          </div>
          <div className="brand-text">
            <h1 className="brand-title">Tick Gold</h1>
            <div className="brand-subtitle">PRO MAX ULTRA</div>
          </div>
        </div>
      </div>

      {/* 主要导航菜单 */}
      <div className="main-navigation">
        <SidebarNavigation
          onItemClick={() => isMobile && setMobileDrawerOpen(false)}
        />
      </div>

      {/* 系统状态区域 */}
      <div className="sidebar-footer">
        <div className="system-status-indicator">
          <div className="status-dot"></div>
          <span>实时数据流: 21,340+ ticks/sec</span>
        </div>
        <div className="performance-badge">
          <span className="badge-value">ULTRA</span>
          <span className="badge-label">性能认证</span>
        </div>
      </div>
    </div>
  );

  return (
    <Layout className="siliconflow-layout">
      {/* 桌面端固定侧边栏 */}
      {!isMobile && (
        <Sider
          width={240}
          collapsedWidth={80}
          collapsed={collapsed}
          className="siliconflow-sider"
          trigger={null}
          collapsible
        >
          {sidebarContent}
        </Sider>
      )}

      {/* 移动端抽屉侧边栏 */}
      {isMobile && (
        <Drawer
          title="导航菜单"
          placement="left"
          closable={true}
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          className="mobile-nav-drawer"
          width={240}
        >
          {sidebarContent}
        </Drawer>
      )}

      <Layout className="siliconflow-content-layout">
        {/* 顶部导航栏 */}
        <Header className="siliconflow-header">
          <div className="header-content">
            {/* 汉堡菜单按钮 - 移动端 */}
            {isMobile && (
              <Button
                type="text"
                icon={<MenuUnfoldOutlined />}
                onClick={toggleSidebar}
                className="mobile-menu-btn"
              />
            )}

            {/* 折叠/展开按钮 - 桌面端 */}
            {!isMobile && (
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={toggleSidebar}
                className="desktop-toggle-btn"
              />
            )}

            {/* 顶部工具栏 */}
            <div className="header-toolbar">
              <TopBar />
            </div>
          </div>
        </Header>

        {/* 主内容区 */}
        <Content className="siliconflow-main-content">
          <div className="content-inner">
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default SiliconFlowLayout;