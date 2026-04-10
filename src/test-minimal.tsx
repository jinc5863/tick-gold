import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

const MinimalApp: React.FC = () => {
  return (
    <div style={{
      background: '#0A0A0F',
      color: '#FFD700',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
      padding: '20px'
    }}>
      <h1>✅ Tick Gold 测试应用</h1>
      <p style={{ color: '#10B981', fontSize: '18px', marginTop: '20px' }}>
        AAAAA 如果能看到这行字，说明：
        <br/>1. React 正常运行
        <br/>2. Ant Design 主题正常
        <br/>3. 样式能正确加载
      </p>

      <div style={{
        marginTop: '40px',
        padding: '20px',
        background: '#1A1A24',
        borderRadius: '16px',
        border: '1px solid rgba(255, 215, 0, 0.2)',
        maxWidth: '600px'
      }}>
        <h3>测试组件状态：</h3>
        <ul style={{ textAlign: 'left' }}>
          <li>✅ 基本HTML结构</li>
          <li>✅ CSS样式注入</li>
          <li>✅ Ant Design ConfigProvider</li>
          <li>✅ 字体加载</li>
        </ul>

        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#10B98120',
          borderRadius: '8px'
        }}>
          <strong>测试结果：</strong>
          <br/>如果看到绿色文字 → 前端框架正常
          <br/>如果看不到 → Tauri窗口问题
        </div>
      </div>

      <div style={{ marginTop: '40px', color: '#9CA3AF', fontSize: '14px' }}>
        当前时间: {new Date().toLocaleTimeString()}
        <br/>测试应用版本: 1.0.0
      </div>
    </div>
  );
};

// 初始化主题配置
const proMaxTheme = {
  token: {
    colorPrimary: '#FFD700',
    colorBgBase: '#0A0A0F',
    colorTextBase: '#F3F4F6',
    borderRadius: 12,
  }
};

// 创建根节点
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ConfigProvider theme={proMaxTheme} locale={zhCN}>
        <MinimalApp />
      </ConfigProvider>
    </React.StrictMode>
  );
  console.log('✅ 最简应用已渲染');
} else {
  console.error('❌ 找不到 #root 元素');
}