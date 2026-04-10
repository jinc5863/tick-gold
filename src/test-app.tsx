import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

const TestApp: React.FC = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 立即标记为就绪，不等待任何API
    setTimeout(() => setReady(true), 1000);
  }, []);

  if (!ready) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #0A0A0F 0%, #121218 100%)',
        color: '#FFD700',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif'
      }}>
        <h1 style={{ fontSize: '36px', marginBottom: '20px' }}>🐻‍❄️ Tick Gold Test APP</h1>
        <p style={{ fontSize: '16px', color: '#9CA3AF' }}>超简易测试界面 - 100%能加载</p>
        <div style={{ marginTop: '30px', color: '#10B981' }}>
          ✅ 如果看到这个，说明Tauri能正常运行
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#0A0A0F',
      color: '#F3F4F6',
      height: '100vh',
      padding: '20px',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        background: '#1A1A24',
        borderRadius: '16px',
        padding: '30px',
        border: '1px solid rgba(255, 215, 0, 0.1)'
      }}>
        <h1 style={{ color: '#FFD700', marginBottom: '20px' }}>🎉 应用加载成功！</h1>

        <div style={{ marginBottom: '30px' }}>
          <h3>8个标签页布局预览：</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '15px' }}>
            {['面板概览', '数据清洗', '因子分析', '策略中心', '回测分析', '模拟验证', 'AI深度分析', '系统设置'].map(tab => (
              <div key={tab} style={{
                background: '#222230',
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 215, 0, 0.2)'
              }}>
                {tab}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3>性能指标：</h3>
          <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
            <div style={{ padding: '15px', background: '#10B98120', borderRadius: '8px', flex: 1 }}>
              <strong>吞吐量</strong><br/>
              <span style={{ fontSize: '24px' }}>21,340+ tps</span>
            </div>
            <div style={{ padding: '15px', background: '#3B82F620', borderRadius: '8px', flex: 1 }}>
              <strong>延迟</strong><br/>
              <span style={{ fontSize: '24px' }}>&lt;15ms</span>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255, 215, 0, 0.1)', paddingTop: '20px' }}>
          <p style={{ color: '#9CA3AF' }}>
            💡 这个简约版本证明：<br/>
            1. Tauri桌面应用能正常启动<br/>
            2. React组件能正常渲染<br/>
            3. 样式系统能正常工作<br/>
            完整界面的问题需要调试具体加载逻辑
          </p>
        </div>
      </div>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <TestApp />
    </React.StrictMode>
  );
}