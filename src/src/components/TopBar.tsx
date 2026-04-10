import React, { useState } from 'react';
import {
  Breadcrumb,
  Input,
  Button,
  Avatar,
  Badge,
  Space,
  Dropdown,
  MenuProps,
  Typography,
  Tooltip,
  Row,
  Col
} from 'antd';
import {
  SearchOutlined,
  BellOutlined,
  SettingOutlined,
  UserOutlined,
  DashboardOutlined,
  LineChartOutlined,
  ReloadOutlined,
  ExportOutlined,
  PlusOutlined,
  MenuOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import './TopBar.css';
import { useNavigate, useLocation } from 'react-router-dom';

const { Title, Text } = Typography;
const { Search } = Input;

export interface TopBarProps {
  healthStatus: string;
  authToken: string | null;
  performance?: any;
}

// 搜索输入组件
const SearchBar: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');

  const onSearch = (value: string) => {
    console.log('搜索关键词:', value);
    // TODO: 实现搜索功能
  };

  return (
    <div className="search-bar-silicon">
      <Search
        placeholder="搜索交易品种、策略、分析..."
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onSearch={onSearch}
        enterButton={
          <Button type="primary" icon={<SearchOutlined />}>
            搜索
          </Button>
        }
        className="search-input-silicon"
      />
      <div className="search-hints">
        <span className="hint-item">黄金</span>
        <span className="hint-item">XAUUSD</span>
        <span className="hint-item">策略</span>
        <span className="hint-item">风险</span>
      </div>
    </div>
  );
};

// 用户菜单下拉项
const userMenuItems: MenuProps['items'] = [
  {
    key: 'profile',
    label: '个人资料',
    icon: <UserOutlined />,
  },
  {
    key: 'settings',
    label: '账户设置',
    icon: <SettingOutlined />,
  },
  {
    key: 'security',
    label: '安全中心',
    icon: <DashboardOutlined />,
  },
  {
    type: 'divider',
  },
  {
    key: 'logout',
    label: '退出登录',
    icon: <ExportOutlined />,
    danger: true,
  },
];

// 通知下拉菜单
const notificationItems: MenuProps['items'] = [
  {
    key: 'all',
    label: (
      <div className="notification-header">
        <Title level={5} style={{ margin: 0 }}>通知中心</Title>
        <Badge count={5} size="small" />
      </div>
    ),
    type: 'group',
  },
  {
    key: 'sys-1',
    label: (
      <div className="notification-item">
        <Badge status="success" />
        <div className="notification-content">
          <Text strong>系统性能正常</Text>
          <Text type="secondary">吞吐量达到21,340+ tps</Text>
        </div>
        <Text type="secondary" className="notification-time">3分钟前</Text>
      </div>
    ),
  },
  {
    key: 'trade-1',
    label: (
      <div className="notification-item">
        <Badge status="processing" />
        <div className="notification-content">
          <Text strong>交易信号生成</Text>
          <Text type="secondary">黄金出现买入信号</Text>
        </div>
        <Text type="secondary" className="notification-time">10分钟前</Text>
      </div>
    ),
  },
  {
    key: 'risk-1',
    label: (
      <div className="notification-item">
        <Badge status="warning" />
        <div className="notification-content">
          <Text strong>风险提示</Text>
          <Text type="secondary">亚盘时段波动率增加</Text>
        </div>
        <Text type="secondary" className="notification-time">1小时前</Text>
      </div>
    ),
  },
  {
    type: 'divider',
  },
  {
    key: 'view-all',
    label: '查看所有通知',
  },
];

// 快速操作工具栏
const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const actions = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '仪表板',
      onClick: () => navigate('/overview'),
    },
    {
      key: 'new-strategy',
      icon: <PlusOutlined />,
      label: '新建策略',
      onClick: () => navigate('/strategy-center'),
    },
    {
      key: 'reload-data',
      icon: <ReloadOutlined />,
      label: '刷新数据',
      onClick: () => window.location.reload(),
    },
    {
      key: 'export',
      icon: <ExportOutlined />,
      label: '导出数据',
      onClick: () => console.log('导出数据'),
    },
  ];

  return (
    <Space size="small" className="quick-actions-silicon">
      {actions.map((action) => (
        <Tooltip key={action.key} title={action.label}>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              type="text"
              icon={action.icon}
              onClick={action.onClick}
              className="quick-action-btn"
            />
          </motion.div>
        </Tooltip>
      ))}
    </Space>
  );
};

// 主组件 - 顶部导航栏
const TopBar: React.FC<TopBarProps> = ({ healthStatus, authToken, performance }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [systemMenuVisible, setSystemMenuVisible] = useState(false);

  // 根据当前路径生成面包屑
  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const items = [
      {
        title: (
          <Button type="text" icon={<DashboardOutlined />} onClick={() => navigate('/')}>
            首页
          </Button>
        ),
      },
    ];

    pathSegments.forEach((segment, index) => {
      const path = `/${pathSegments.slice(0, index + 1).join('/')}`;
      let title = segment;

      // 将路径映射为中文名称
      const nameMap: Record<string, string> = {
        overview: '面板概览',
        'data-clean': '数据清洗',
        'factor-analysis': '因子分析',
        'strategy-center': '策略中心',
        backtest: '回测分析',
        simulation: '模拟验证',
        'ai-analysis': 'AI深度分析',
        'system-settings': '系统设置',
      };

      if (nameMap[segment]) {
        title = nameMap[segment];
      }

      if (index === pathSegments.length - 1) {
        items.push({
          title: <span className="breadcrumb-current">{title}</span>,
        });
      } else {
        items.push({
          title: (
            <Button type="text" onClick={() => navigate(path)}>
              {title}
            </Button>
          ),
        });
      }
    });

    return items;
  };

  // 系统菜单项
  const systemMenuItems: MenuProps['items'] = [
    {
      key: 'system-status',
      label: (
        <div className="system-status-mini">
          <div className="status-indicator">
            <Badge status={healthStatus === 'healthy' ? 'success' : 'error'} />
            <span>系统状态: {healthStatus === 'healthy' ? '正常' : '异常'}</span>
          </div>
          <div className="performance-metrics-mini">
            <Text type="secondary">吞吐量: {performance?.throughputTps || 21340} tps</Text>
            <Text type="secondary">延迟: {performance?.latencyMs || 15.2} ms</Text>
          </div>
        </div>
      ),
    },
    {
      type: 'divider',
    },
    {
      key: 'performance',
      icon: <LineChartOutlined />,
      label: '性能监控',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
    {
      key: 'help',
      icon: <GlobalOutlined />,
      label: '帮助文档',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="topbar-silicon"
    >
      <Row align="middle" wrap={false}>
        {/* 左侧：面包屑导航 */}
        <Col flex="auto" className="topbar-left">
          <div className="breadcrumb-container">
            <Breadcrumb items={generateBreadcrumbs()} separator="›" />
            {/* 页面标题区域 */}
            <div className="page-title-area">
              <Title level={4} className="page-title">
                {generateBreadcrumbs()[generateBreadcrumbs().length - 1].title as string}
              </Title>
              <Text type="secondary" className="page-description">
                <Badge
                  status={healthStatus === 'healthy' ? 'success' : 'error'}
                  text={`系统${healthStatus === 'healthy' ? '运行中' : '异常'}`}
                />
                {performance && (
                  <span className="perf-indicator">
                    <LineChartOutlined style={{ marginLeft: 12 }} />
                    延迟: {performance.latencyMs || 15.2}ms
                  </span>
                )}
              </Text>
            </div>
          </div>
        </Col>

        {/* 右侧功能区 */}
        <Col flex="none" className="topbar-right">
          <Space size="middle" align="center">
            {/* 全局搜索 */}
            <div className="topbar-search">
              <SearchBar />
            </div>

            {/* 快速操作工具栏 */}
            <div className="topbar-quick-actions">
              <QuickActions />
            </div>

            {/* 通知中心 */}
            <Dropdown
              menu={{ items: notificationItems }}
              trigger={['click']}
              placement="bottomRight"
              overlayClassName="notification-dropdown"
            >
              <Tooltip title="通知">
                <Badge count={3} size="small">
                  <Button
                    type="text"
                    icon={<BellOutlined />}
                    className="topbar-action-btn"
                  />
                </Badge>
              </Tooltip>
            </Dropdown>

            {/* 系统菜单 */}
            <Dropdown
              menu={{ items: systemMenuItems }}
              trigger={['click']}
              placement="bottomRight"
              overlayClassName="system-dropdown"
              open={systemMenuVisible}
              onOpenChange={setSystemMenuVisible}
            >
              <Tooltip title="系统信息">
                <Button
                  type="text"
                  icon={<SettingOutlined />}
                  className={`topbar-action-btn ${systemMenuVisible ? 'active' : ''}`}
                />
              </Tooltip>
            </Dropdown>

            {/* 用户账户 */}
            <Dropdown
              menu={{ items: userMenuItems }}
              trigger={['click']}
              placement="bottomRight"
              overlayClassName="user-dropdown"
            >
              <div className="user-profile">
                <Avatar
                  size="default"
                  style={{ backgroundColor: '#FFD700', color: '#000' }}
                  icon={<UserOutlined />}
                  className="user-avatar"
                />
                <div className="user-info">
                  <Text strong className="user-name">
                    Tick Gold Pro
                  </Text>
                  <Text type="secondary" className="user-status">
                    {authToken ? '专业版用户' : '开发模式'}
                  </Text>
                </div>
              </div>
            </Dropdown>

            {/* 响应式菜单按钮（小屏幕显示） */}
            <div className="mobile-menu-toggle">
              <Tooltip title="菜单">
                <Button
                  type="text"
                  icon={<MenuOutlined />}
                  className="topbar-action-btn"
                />
              </Tooltip>
            </div>
          </Space>
        </Col>
      </Row>
    </motion.div>
  );
};

export default TopBar;