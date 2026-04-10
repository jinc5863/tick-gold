import React from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import SiliconFlowLayout from './components/layout/SiliconFlowLayout';
import OverviewPage from './components/siliconflow-pages/OverviewPage';
import DataCleanPage from './components/siliconflow-pages/DataCleanPage';
import FactorAnalysisPage from './components/siliconflow-pages/FactorAnalysisPage';
import StrategyCenterPage from './components/siliconflow-pages/StrategyCenterPage';
import BacktestPage from './components/siliconflow-pages/BacktestPage';
import SimulationPage from './components/siliconflow-pages/SimulationPage';
import AIAnalysisPage from './components/siliconflow-pages/AIAnalysisPage';
import SystemSettingsPage from './components/siliconflow-pages/SystemSettingsPage';

// UI UX PRO MAX SiliconFlow 统一路由配置
// 使用SiliconFlowLayout作为主布局容器，整合了侧边栏和顶部导航
// 采用真正的嵌套路由结构，和SiliconFlow一样的专业配置

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <SiliconFlowLayout>
        <div className="siliconflow-page-container">
          {/* Outlet渲染当前活动子页面 */}
          <Outlet />
        </div>
      </SiliconFlowLayout>
    ),
    children: [
      {
        index: true,
        element: <OverviewPage />,
      },
      {
        path: 'overview',
        element: <OverviewPage />,
      },
      {
        path: 'data-clean',
        element: <DataCleanPage />,
      },
      {
        path: 'factor-analysis',
        element: <FactorAnalysisPage />,
      },
      {
        path: 'strategy-center',
        element: <StrategyCenterPage />,
      },
      {
        path: 'backtest',
        element: <BacktestPage />,
      },
      {
        path: 'simulation',
        element: <SimulationPage />,
      },
      {
        path: 'ai-analysis',
        element: <AIAnalysisPage />,
      },
      {
        path: 'system-settings',
        element: <SystemSettingsPage />,
      },
    ],
  },
  // 兼容性重定向路由 - 保持向后兼容，修正错误配置
  {
    path: '/dashboard',
    element: (
      <SiliconFlowLayout>
        <div className="siliconflow-page-container">
          <OverviewPage />
        </div>
      </SiliconFlowLayout>
    ),
  },
  {
    path: '/realtime',
    element: (
      <SiliconFlowLayout>
        <div className="siliconflow-page-container">
          <OverviewPage />
        </div>
      </SiliconFlowLayout>
    ),
  },
  {
    path: '/strategies',
    element: (
      <SiliconFlowLayout>
        <div className="siliconflow-page-container">
          <StrategyCenterPage />  // ✅ 修正
        </div>
      </SiliconFlowLayout>
    ),
  },
  {
    path: '/signals',
    element: (
      <SiliconFlowLayout>
        <div className="siliconflow-page-container">
          <BacktestPage />  // 保留给交易信号，但需要确认是否有专门的交易信号页面
        </div>
      </SiliconFlowLayout>
    ),
  },
  // 添加更多兼容性路由
  {
    path: '/api-config',
    element: (
      <SiliconFlowLayout>
        <div className="siliconflow-page-container">
          <SystemSettingsPage />  // API配置可能在此
        </div>
      </SiliconFlowLayout>
    ),
  },
  {
    path: '/user-management',
    element: (
      <SiliconFlowLayout>
        <div className="siliconflow-page-container">
          <SystemSettingsPage />  // 用户管理可能在此
        </div>
      </SiliconFlowLayout>
    ),
  },
]);

const AppRouterSiliconFlowUnified: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRouterSiliconFlowUnified;