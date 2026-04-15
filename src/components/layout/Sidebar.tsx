import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  HistoryOutlined,
  RobotOutlined,
  FundOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Sider } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

const menuItems: MenuItem[] = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '仪表盘',
  },
  {
    key: '/data-management',
    icon: <DatabaseOutlined />,
    label: '数据管理',
    children: [
      { key: '/data-management/import', label: '导入' },
      { key: '/data-management/cleaning', label: '清洗' },
      { key: '/data-management/database', label: '数据库' },
      { key: '/data-management/statistics', label: '统计' },
    ],
  },
  {
    key: '/factor-analysis',
    icon: <ExperimentOutlined />,
    label: '量化因子',
  },
  {
    key: '/risk-control',
    icon: <SafetyOutlined />,
    label: '风控模块',
  },
  {
    key: '/ea-generator',
    icon: <ThunderboltOutlined />,
    label: 'EA策略生成',
  },
  {
    key: '/backtesting',
    icon: <HistoryOutlined />,
    label: '回测分析',
  },
  {
    key: '/ai-research',
    icon: <RobotOutlined />,
    label: 'AI深度研究',
  },
  {
    key: '/trading',
    icon: <FundOutlined />,
    label: '模拟/实盘',
  },
  {
    key: '/kline-panel',
    icon: <LineChartOutlined />,
    label: 'K线面板',
  },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    navigate(e.key);
  };

  return (
    <Sider
      width={220}
      style={{
        background: '#1C1917',
        borderRight: '1px solid #44403C',
        overflow: 'auto',
        height: 'calc(100vh - 64px)',
        position: 'sticky',
        top: 64,
        left: 0,
      }}
    >
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        defaultOpenKeys={['/data-management']}
        items={menuItems}
        onClick={handleMenuClick}
        style={{
          background: 'transparent',
          borderRight: 'none',
          marginTop: 8,
        }}
        theme="dark"
      />
    </Sider>
  );
};

export default Sidebar;
