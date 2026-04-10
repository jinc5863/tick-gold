import React, { useState } from 'react';
import { Menu, Badge, Avatar, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  LineChartOutlined,
  FilterOutlined,
  ExperimentOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  RobotOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  CloudOutlined,
  ApiOutlined,
  DatabaseOutlined,
  CodeOutlined,
  UsergroupAddOutlined
} from '@ant-design/icons';
import './SidebarNavigation.css';

const { SubMenu } = Menu;

interface SidebarNavigationProps {
  onItemClick?: () => void;
}

// 菜单项类型定义
type MenuItem = {
  key: string;
  icon: React.ReactNode;
  label: string;
  path?: string;
  count?: number;
  badge?: string;
  status?: 'processing' | 'success' | 'error' | 'warning' | 'default';
  description?: string;
  children?: MenuItem[];
};

const SidebarNavigation: React.FC<SidebarNavigationProps> = ({ onItemClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedKeys, setSelectedKeys] = useState<string[]>(['overview']);
  const [openKeys, setOpenKeys] = useState<string[]>(['trading']);

  // 菜单key到路由path的映射
  const menuKeyToRouteMap: Record<string, string> = {
    'overview': '/overview',
    'realtime-chart': '/overview', // 暂时映射到概览
    'performance': '/overview',    // 暂时映射到概览
    'data-cleansing': '/data-clean',
    'factor-analysis': '/factor-analysis',
    'data-quality': '/data-clean', // 暂时映射到数据清洗
    'strategy-center': '/strategy-center',
    'ea-generator': '/strategy-center', // 暂时映射到策略中心
    'risk-management': '/strategy-center', // 暂时映射到策略中心
    'backtest': '/backtest',
    'trade-signals': '/backtest', // 暂时映射到回测分析
    'simulation': '/simulation',
    'ai-analysis': '/ai-analysis',
    'system-settings': '/system-settings',
    'api-config': '/system-settings', // 暂时映射到系统设置
    'user-management': '/system-settings', // 暂时映射到系统设置
  };

  // 路由path到菜单key的逆向映射（用于初始化选中状态）
  const routeToMenuKeyMap: Record<string, string> = {};
  Object.entries(menuKeyToRouteMap).forEach(([key, route]) => {
    // 避免覆盖，优先使用第一个映射
    if (!routeToMenuKeyMap[route]) {
      routeToMenuKeyMap[route] = key;
    }
  });

  // 根据当前路由更新选中状态
  React.useEffect(() => {
    const currentPath = location.pathname;
    // 尝试直接匹配
    let matchedKey = routeToMenuKeyMap[currentPath];

    // 如果没有直接匹配，尝试部分匹配（如/overview匹配/overview）
    if (!matchedKey) {
      // 遍历所有路由，看是否有匹配
      for (const [key, route] of Object.entries(menuKeyToRouteMap)) {
        if (currentPath === route || currentPath.startsWith(route + '/')) {
          matchedKey = key;
          break;
        }
      }
    }

    // 默认选中概览
    if (matchedKey) {
      console.log('路由变化，更新选中菜单:', currentPath, '->', matchedKey);
      setSelectedKeys([matchedKey]);
    } else {
      console.log('路由未匹配到菜单，默认选中overview:', currentPath);
      setSelectedKeys(['overview']);
    }
  }, [location.pathname]);

  // 处理菜单点击
  const handleMenuClick: MenuProps['onClick'] = (e) => {
    const routePath = menuKeyToRouteMap[e.key];
    if (routePath) {
      setSelectedKeys([e.key]);
      if (onItemClick) {
        onItemClick();
      }
      console.log('转到页面:', e.key, '->', routePath);
      navigate(routePath);
    } else {
      console.warn('未知的菜单key:', e.key);
    }
  };

  // 处理子菜单展开
  const handleOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
  };

  // 交易模块菜单项
  const tradingItems: MenuItem[] = [
    {
      key: 'overview',
      icon: <DashboardOutlined />,
      label: '面板概览',
      badge: 'New',
      description: '实时监控和性能指标'
    },
    {
      key: 'realtime-chart',
      icon: <LineChartOutlined />,
      label: '实时图表',
      description: '黄金价格实时走势'
    },
    {
      key: 'performance',
      icon: <ThunderboltOutlined />,
      label: '性能指标',
      description: '系统性能监控'
    }
  ];

  // 数据处理模块菜单项
  const dataItems: MenuItem[] = [
    {
      key: 'data-cleansing',
      icon: <FilterOutlined />,
      label: '数据清洗',
      count: 3,
      description: '智能数据清洗与分析'
    },
    {
      key: 'factor-analysis',
      icon: <ExperimentOutlined />,
      label: '因子分析',
      count: 15,
      description: '多因子量化分析'
    },
    {
      key: 'data-quality',
      icon: <DatabaseOutlined />,
      label: '数据质量',
      description: '监管级数据质量监控'
    }
  ];

  // 策略模块菜单项
  const strategyItems: MenuItem[] = [
    {
      key: 'strategy-center',
      icon: <SettingOutlined />,
      label: '策略中心',
      count: 8,
      description: 'EA策略生成与管理'
    },
    {
      key: 'ea-generator',
      icon: <CodeOutlined />,
      label: 'EA生成器',
      description: '自动化策略生成'
    },
    {
      key: 'risk-management',
      icon: <SafetyOutlined />,
      label: '风险管理',
      description: '黄金专用风险控制'
    }
  ];

  // 分析模块菜单项
  const analysisItems: MenuItem[] = [
    {
      key: 'backtest',
      icon: <PlayCircleOutlined />,
      label: '回测分析',
      badge: 'dot',
      description: '历史数据回测引擎'
    },
    {
      key: 'trade-signals',
      icon: <BarChartOutlined />,
      label: '交易信号',
      description: '实时交易信号分析'
    },
    {
      key: 'simulation',
      icon: <RobotOutlined />,
      label: '模拟验证',
      status: 'processing',
      description: '模拟交易与AI分析'
    },
    {
      key: 'ai-analysis',
      icon: <RobotOutlined />,
      label: 'AI深度分析',
      status: 'success',
      description: '神经网络与深度学习'
    }
  ];

  // 系统模块菜单项
  const systemItems: MenuItem[] = [
    {
      key: 'system-settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      description: '网络、安全、高级功能'
    },
    {
      key: 'api-config',
      icon: <ApiOutlined />,
      label: 'API配置',
      description: '外部接口与连接设置'
    },
    {
      key: 'user-management',
      icon: <UsergroupAddOutlined />,
      label: '用户管理',
      description: '账户权限与安全管理'
    }
  ];

  // 性能指标快捷入口
  const performanceMetrics: MenuItem[] = [
    {
      key: 'metrics-throughput',
      icon: <ApiOutlined />,
      label: '吞吐量',
      description: '21,340+ tps'
    },
    {
      key: 'metrics-latency',
      icon: <ThunderboltOutlined />,
      label: '延迟',
      description: '<50ms'
    },
    {
      key: 'metrics-memory',
      icon: <CloudOutlined />,
      label: '内存',
      description: '85.5% 使用率'
    }
  ];

  // 渲染带徽章的菜单项
  const renderMenuItem = (item: MenuItem) => {
    const { key, icon, label, count, badge, status } = item;

    let badgeElement = null;
    if (count) {
      badgeElement = <Badge count={count} size="small" style={{ marginLeft: '4px' }} />;
    } else if (badge) {
      if (badge === 'dot') {
        badgeElement = <Badge dot style={{ marginLeft: '4px' }} />;
      } else {
        badgeElement = (
          <Badge count={badge} size="small" style={{ marginLeft: '4px' }} />
        );
      }
    }

    const labelContent = (
      <Tooltip title={item.description} placement="right">
        <div className="menu-item-content">
          <span className="menu-item-label">{label}</span>
          {badgeElement}
          {!badgeElement && status && (
            <Badge status={status} style={{ marginLeft: '4px' }} />
          )}
        </div>
      </Tooltip>
    );

    return (
      <Menu.Item key={key} icon={icon}>
        {labelContent}
      </Menu.Item>
    );
  };

  // 渲染子菜单
  const renderSubMenu = (title: string, key: string, items: MenuItem[]) => {
    const iconSize = { fontSize: '16px' };
    let iconElement;

    switch (key) {
      case 'trading':
        iconElement = <LineChartOutlined style={iconSize} />;
        break;
      case 'data':
        iconElement = <DatabaseOutlined style={iconSize} />;
        break;
      case 'strategy':
        iconElement = <CodeOutlined style={iconSize} />;
        break;
      case 'analysis':
        iconElement = <BarChartOutlined style={iconSize} />;
        break;
      case 'system':
        iconElement = <SettingOutlined style={iconSize} />;
        break;
      case 'metrics':
        iconElement = <ThunderboltOutlined style={iconSize} />;
        break;
      default:
        iconElement = <DashboardOutlined style={iconSize} />;
    }

    return (
      <SubMenu key={key} icon={iconElement} title={title}>
        {items.map(renderMenuItem)}
      </SubMenu>
    );
  };

  return (
    <div className="sidebar-navigation">
      {/* 快速切换区域 */}
      <div className="nav-quick-section">
        <div className="section-title">核心交易</div>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          openKeys={openKeys}
          onOpenChange={handleOpenChange}
          onClick={handleMenuClick}
          className="main-nav-menu"
        >
          {renderMenuItem(tradingItems[0])} {/* 面板概览 */}
          {renderMenuItem(tradingItems[1])} {/* 实时图表 */}
          {renderMenuItem(performanceMetrics[0])} {/* 吞吐量 */}
        </Menu>
      </div>

      {/* 主要导航区域 */}
      <div className="nav-main-section">
        <div className="section-title">专业工具</div>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          openKeys={openKeys}
          onOpenChange={handleOpenChange}
          onClick={handleMenuClick}
          className="main-nav-menu"
        >
          {renderSubMenu('交易监控', 'trading', tradingItems)}
          {renderSubMenu('数据处理', 'data', dataItems)}
          {renderSubMenu('策略管理', 'strategy', strategyItems)}
          {renderSubMenu('分析引擎', 'analysis', analysisItems)}
          {renderSubMenu('系统配置', 'system', systemItems)}
        </Menu>
      </div>

      {/* 性能监控快捷入口 */}
      <div className="nav-metrics-section">
        <div className="section-title">实时性能</div>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          onClick={handleMenuClick}
          className="metrics-nav-menu"
        >
          {performanceMetrics.map(item => (
            <Menu.Item key={item.key} icon={item.icon}>
              <div className="metric-item">
                <span className="metric-label">{item.label}</span>
                <span className="metric-value">{item.description}</span>
              </div>
            </Menu.Item>
          ))}
        </Menu>
      </div>

      {/* 系统状态简览 */}
      <div className="nav-status-summary">
        <div className="status-item">
          <div className="status-indicator active"></div>
          <span className="status-text">数据流: 21,340+ tps</span>
        </div>
        <div className="status-item">
          <div className="status-indicator healthy"></div>
          <span className="status-text">系统: 运行正常</span>
        </div>
      </div>
    </div>
  );
};

export default SidebarNavigation;