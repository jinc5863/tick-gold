import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme } from 'antd';
import App from './App';
import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

const darkTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#CA8A04',
    colorBgContainer: '#1C1917',
    colorBgElevated: '#292524',
    colorBgLayout: '#0A0A0F',
    colorBgSpotlight: '#44403C',
    colorText: '#FAFAF9',
    colorTextSecondary: '#A8A29E',
    colorBorder: '#44403C',
    colorBgBase: '#0A0A0F',
    borderRadius: 8,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  components: {
    Layout: {
      headerBg: '#1C1917',
      siderBg: '#1C1917',
      bodyBg: '#0A0A0F',
    },
    Menu: {
      darkItemBg: '#1C1917',
      darkItemSelectedBg: '#44403C',
      darkItemHoverBg: '#292524',
    },
  },
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={darkTheme}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
