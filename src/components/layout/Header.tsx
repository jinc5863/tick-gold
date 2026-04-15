import { Layout, Typography, Space } from 'antd';
import { SettingOutlined, BellOutlined } from '@ant-design/icons';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

const Header: React.FC = () => {
  return (
    <AntHeader
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: '#1C1917',
        borderBottom: '1px solid #44403C',
        height: 64,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Space align="center" size={12}>
        <Text
          strong
          style={{
            fontSize: 20,
            color: '#CA8A04',
            fontFamily: "'Inter', sans-serif",
            letterSpacing: '0.5px',
          }}
        >
          TICK GOLD
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: '#A8A29E',
            background: '#292524',
            padding: '2px 8px',
            borderRadius: 4,
          }}
        >
          XAUUSD
        </Text>
      </Space>

      <Space size={24} align="center">
        <BellOutlined
          style={{
            fontSize: 18,
            color: '#A8A29E',
            cursor: 'pointer',
          }}
        />
        <SettingOutlined
          style={{
            fontSize: 18,
            color: '#A8A29E',
            cursor: 'pointer',
          }}
        />
      </Space>
    </AntHeader>
  );
};

export default Header;
