import React, { useState } from 'react';
import {
  Breadcrumb,
  Button,
  Input,
  Space,
  Badge,
  Avatar,
  Dropdown,
  Menu,
  Modal,
  Tooltip,
  Tag,
  Divider
} from 'antd';
import {
  SearchOutlined,
  BellOutlined,
  SettingOutlined,
  UserOutlined,
  ReloadOutlined,
  ExportOutlined,
  FilterOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  GlobalOutlined,
  LogoutOutlined,
  ProfileOutlined,
  DashboardOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import './TopBar.css';

const { Search } = Input;

interface TopBarProps {
  pageTitle?: string;
  breadcrumbItems?: { title: string; href?: string }[];
}

const TopBar: React.FC<TopBarProps> = ({
  pageTitle = '交易面板概览',
  breadcrumbItems = [
    { title: '首页', href: '#' },
    { title: '交易系统', href: '#trading' },
    { title: '面板概览', href: '#' },
  ]
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);

  // 搜索处理
  const handleSearch = (value: string) => {
    console.log('搜索关键词:', value);
    // 实现搜索逻辑
  };

  // 用户菜单配置
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      key: 'preferences',
      icon: <SettingOutlined />,
      label: '偏好设置',
    },
    {
      key: 'activity',
      icon: <DashboardOutlined />,
      label: '活动记录',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ];

  // 通知菜单配置
  const notificationMenuItems: MenuProps['items'] = [
    {
      key: 'notification-1',
      label: (
        <div className="notification-item">
          <Badge status="processing" />
          <div className="notification-content">
            <div className="notification-title">系统更新</div>
            <div className="notification-desc">新版本 v0.1.0 已就绪</div>
            <div className="notification-time">5分钟前</div>
          </div>
        </div>
      ),
    },
    {
      key: 'notification-2',
      label: (
        <div className="notification-item">
          <Badge status="success" />
          <div className="notification-content">
            <div className="notification-title">交易信号</div>
            <div className="notification-desc">发现XAUUSD买入机会</div>
            <div className="notification-time">15分钟前</div>
          </div>
        </div>
      ),
    },
    {
      key: 'notification-3',
      label: (
        <div className="notification-item">
          <Badge status="warning" />
          <div className="notification-content">
            <div className="notification-title">风险提示</div>
            <div className="notification-desc">黄金价格波动增大</div>
            <div className="notification-time">1小时前</div>
          </div>
        </div>
      ),
    },
    {
      type: 'divider',
    },
    {
      key: 'view-all',
      label: (
        <Button type="link" block>
          查看所有通知
        </Button>
      ),
    },
  ];

  // 快速操作菜单
  const quickActionItems: MenuProps['items'] = [
    {
      key: 'refresh-data',
      icon: <ReloadOutlined />,
      label: '刷新数据',
      onClick: () => console.log('刷新数据'),
    },
    {
      key: 'new-strategy',
      icon: <PlusOutlined />,
      label: '新建策略',
      onClick: () => console.log('新建策略'),
    },
    {
      key: 'export-report',
      icon: <ExportOutlined />,
      label: '导出报告',
      onClick: () => console.log('导出报告'),
    },
    {
      key: 'apply-filter',
      icon: <FilterOutlined />,
      label: '应用筛选器',
      onClick: () => console.log('应用筛选器'),
    },
  ];

  // 用户菜单点击处理
  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    console.log('用户菜单点击:', key);
    switch (key) {
      case 'logout':
        console.log('退出登录');
        break;
      case 'profile':
        console.log('个人资料');
        break;
      default:
        break;
    }
  };

  return (
    <div className="siliconflow-topbar">
      {/* 左侧：面包屑导航和页面标题 */}
      <div className="topbar-left">
        <div className="breadcrumb-section">
          <Breadcrumb
            items={breadcrumbItems}
            separator="/"
            className="silicon-breadcrumb"
          />
          <h1 className="page-title">{pageTitle}</h1>
          <p className="page-subtitle">
            实时监控XAUUSD黄金价格和交易性能 • 21,340+ ticks/sec • ULTRA认证系统
          </p>
        </div>
      </div>

      {/* 中间：全局搜索框 */}
      <div className="topbar-center">
        <Search
          placeholder="搜索策略、交易对、用户..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onSearch={handleSearch}
          style={{ width: 320 }}
          className="global-search"
          size="middle"
          prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
          allowClear
        />
      </div>

      {/* 右侧：工具栏和用户区域 */}
      <div className="topbar-right">
        <Space size="middle" align="center">
          {/* 快速操作按钮 */}
          <Dropdown
            menu={{ items: quickActionItems }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Button
              type="text"
              icon={<PlusOutlined />}
              className="quick-action-btn"
            >
              快速操作
            </Button>
          </Dropdown>

          {/* 通知中心 */}
          <Dropdown
            menu={{ items: notificationMenuItems }}
            placement="bottomRight"
            trigger={['click']}
            overlayClassName="notification-dropdown"
          >
            <Badge count={3} size="small" style={{ cursor: 'pointer' }}>
              <Button
                type="text"
                icon={<BellOutlined />}
                className="notification-btn"
              />
            </Badge>
          </Dropdown>

          {/* 系统性能徽章 */}
          <div className="performance-badge">
            <Tag color="green" icon={<ThunderboltOutlined />}>
              ULTRA
            </Tag>
            <span className="performance-metric">21,340+ tps</span>
          </div>

          {/* 帮助中心 */}
          <Tooltip title="帮助中心">
            <Button
              type="text"
              icon={<QuestionCircleOutlined />}
              className="help-btn"
            />
          </Tooltip>

          {/* 设置按钮 */}
          <Tooltip title="系统设置">
            <Button
              type="text"
              icon={<SettingOutlined />}
              className="settings-btn"
            />
          </Tooltip>

          {/* 用户区域 */}
          <Dropdown
            menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
            placement="bottomRight"
            trigger={['click']}
          >
            <div className="user-avatar-section" style={{ cursor: 'pointer' }}>
              <Avatar
                size="default"
                style={{
                  backgroundColor: 'var(--gold-primary)',
                  color: '#000',
                  fontWeight: 'bold',
                }}
              >
                TG
              </Avatar>
              <div className="user-info">
                <div className="user-name">Tick Gold</div>
                <div className="user-role">管理员</div>
              </div>
            </div>
          </Dropdown>
        </Space>
      </div>
    </div>
  );
};

export default TopBar;