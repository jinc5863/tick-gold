import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ProDashboard8Tabs from './components/ProDashboard8Tabs';
import StrategyConfigurator from './components/StrategyConfigurator';
import TradeSignals from './components/TradeSignals';
import RealtimeChart from './components/RealtimeChart';

// UI UX PRO MAX 统一路由配置
// 使用ProDashboard8Tabs作为主界面，内部标签处理所有功能
const router = createBrowserRouter([
  {
    path: '/',
    element: <ProDashboard8Tabs />,
  },
  // 兼容性路由 - 可重定向到主界面
  {
    path: '/realtime',
    element: <ProDashboard8Tabs />,
  },
  {
    path: '/strategies',
    element: <ProDashboard8Tabs />,
  },
  {
    path: '/signals',
    element: <ProDashboard8Tabs />,
  },
]);

const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;