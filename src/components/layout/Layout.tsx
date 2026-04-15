import { Layout as AntLayout } from 'antd';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

const { Content } = AntLayout;

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <AntLayout style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      <Header />
      <AntLayout>
        <Sidebar />
        <Content
          style={{
            margin: 0,
            padding: '24px',
            background: '#0A0A0F',
            overflow: 'auto',
          }}
        >
          {children || <Outlet />}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
