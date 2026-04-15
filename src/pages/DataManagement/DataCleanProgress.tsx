import React, { useState, useEffect } from 'react';
import { Card, Progress, Tag, Button, Space, Row, Col, Statistic, Timeline } from 'antd';
import {
  CheckCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';
import useWebSocket from '../../hooks/useWebSocket';

interface CleaningProgress {
  type: string;
  progress: number;
  processed: number;
  total: number;
  speed: string;
  stage: string;
  timestamp: string;
}

const WS_URL = 'ws://localhost:8000/ws/realtime';

const DataCleanProgress: React.FC = () => {
  const [isCleaning, setIsCleaning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(1000000);
  const [speed, setSpeed] = useState('0 ticks/sec');
  const [stage, setStage] = useState('idle');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const handleCleaningMessage = (data: CleaningProgress) => {
    if (data.type === 'cleaning_progress') {
      setProgress(data.progress);
      setProcessed(data.processed);
      setTotal(data.total);
      setSpeed(data.speed);
      setStage(data.stage);
    }
  };

  const { isConnected, send, reconnect } = useWebSocket<CleaningProgress>({
    url: WS_URL,
    onMessage: handleCleaningMessage,
    onConnect: () => {
      send({ type: 'subscribe', topic: 'cleaning' });
    },
  });

  // Simulate cleaning progress (since backend broadcasts cleaning progress)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isCleaning && startTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
        setElapsedTime(elapsed);

        // Simulate progress update
        const newProcessed = Math.min(processed + Math.floor(Math.random() * 5000 + 10000), total);
        const newProgress = (newProcessed / total) * 100;

        setProcessed(newProcessed);
        setProgress(newProgress);

        // Determine stage
        if (newProgress < 30) {
          setStage('duplicate_removal');
        } else if (newProgress < 60) {
          setStage('anomaly_detection');
        } else if (newProgress < 90) {
          setStage('gap_filling');
        } else {
          setStage('final_validation');
        }

        // Update speed
        const currentSpeed = elapsed > 0 ? Math.floor(newProcessed / elapsed) : 0;
        setSpeed(`${currentSpeed.toLocaleString()} ticks/sec`);

        if (newProcessed >= total) {
          setIsCleaning(false);
          setStage('completed');
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCleaning, startTime, processed, total]);

  const startCleaning = () => {
    setIsCleaning(true);
    setStartTime(new Date());
    setProgress(0);
    setProcessed(0);
    setStage('starting');
    send({ type: 'subscribe', topic: 'cleaning' });
  };

  const pauseCleaning = () => {
    setIsCleaning(false);
    setStage('paused');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStageLabel = (stage: string): string => {
    const labels: Record<string, string> = {
      idle: '等待开始',
      starting: '初始化...',
      duplicate_removal: '去除重复数据',
      anomaly_detection: '异常检测',
      gap_filling: '缺失填充',
      final_validation: '最终验证',
      completed: '清洗完成',
      paused: '已暂停',
    };
    return labels[stage] || stage;
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#22C55E' }} />;
      case 'paused':
        return <PauseCircleOutlined style={{ color: '#F97316' }} />;
      case 'idle':
        return <ClockCircleOutlined style={{ color: '#A8A29E' }} />;
      default:
        return <SyncOutlined spin style={{ color: '#CA8A04' }} />;
    }
  };

  return (
    <div style={{ padding: '24px', background: '#0A0A0F', minHeight: '100vh' }}>
      <h1 style={{ color: '#FAFAF9', marginBottom: '24px' }}>数据清洗进度</h1>

      {/* Connection Status */}
      <div style={{ marginBottom: '16px' }}>
        <Tag color={isConnected ? 'green' : 'red'}>
          {isConnected ? 'WebSocket 已连接' : 'WebSocket 未连接'}
        </Tag>
        {!isConnected && (
          <Button size="small" onClick={reconnect} style={{ marginLeft: '8px' }}>
            重连
          </Button>
        )}
      </div>

      {/* Progress Overview */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#1C1917', border: '1px solid #44403C' }}>
            <Statistic
              title={<span style={{ color: '#A8A29E' }}>总数据量</span>}
              value={total}
              valueStyle={{ color: '#FAFAF9' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#1C1917', border: '1px solid #44403C' }}>
            <Statistic
              title={<span style={{ color: '#A8A29E' }}>已处理</span>}
              value={processed}
              valueStyle={{ color: '#CA8A04' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#1C1917', border: '1px solid #44403C' }}>
            <Statistic
              title={<span style={{ color: '#A8A29E' }}>处理速度</span>}
              value={speed}
              valueStyle={{ color: '#22C55E', fontSize: '20px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#1C1917', border: '1px solid #44403C' }}>
            <Statistic
              title={<span style={{ color: '#A8A29E' }}>已用时间</span>}
              value={formatTime(elapsedTime)}
              valueStyle={{ color: '#FAFAF9' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Progress Card */}
      <Card
        bordered={false}
        style={{ background: '#1C1917', border: '1px solid #44403C', marginBottom: '24px' }}
      >
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ marginBottom: '24px' }}>
            <Tag icon={getStageIcon(stage)} color={stage === 'completed' ? 'success' : 'processing'} size="large">
              {getStageLabel(stage)}
            </Tag>
          </div>

          <Progress
            type="circle"
            percent={Math.min(progress, 100)}
            strokeColor={{
              '0%': '#CA8A04',
              '100%': '#22C55E',
            }}
            trailColor="#44403C"
            size={200}
            format={() => (
              <div>
                <div style={{ color: '#FAFAF9', fontSize: '36px', fontWeight: 'bold' }}>
                  {progress.toFixed(1)}%
                </div>
                <div style={{ color: '#A8A29E', fontSize: '14px' }}>
                  {processed.toLocaleString()} / {total.toLocaleString()}
                </div>
              </div>
            )}
          />
        </div>

        {/* Control Buttons */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Space size="large">
            {!isCleaning ? (
              <Button
                type="primary"
                size="large"
                icon={<SyncOutlined />}
                onClick={startCleaning}
                style={{ background: '#CA8A04', borderColor: '#CA8A04' }}
              >
                {stage === 'paused' ? '继续清洗' : '开始清洗'}
              </Button>
            ) : (
              <Button
                size="large"
                icon={<PauseCircleOutlined />}
                onClick={pauseCleaning}
                style={{ borderColor: '#F97316', color: '#F97316' }}
              >
                暂停
              </Button>
            )}
            <Button
              size="large"
              icon={<DeleteOutlined />}
              danger
              disabled={isCleaning}
            >
              取消
            </Button>
          </Space>
        </div>
      </Card>

      {/* Processing Timeline */}
      <Card
        title={<span style={{ color: '#FAFAF9' }}>处理阶段</span>}
        bordered={false}
        style={{ background: '#1C1917', border: '1px solid #44403C' }}
        headStyle={{ borderBottom: '1px solid #44403C' }}
      >
        <Timeline
          items={[
            {
              color: progress >= 30 ? 'green' : 'gray',
              children: (
                <div>
                  <div style={{ color: '#FAFAF9' }}>去除重复数据</div>
                  <div style={{ color: '#A8A29E', fontSize: '12px' }}>
                    {progress >= 30 ? '已完成' : progress > 0 ? '处理中...' : '等待中'}
                  </div>
                </div>
              ),
            },
            {
              color: progress >= 60 ? 'green' : progress >= 30 ? 'blue' : 'gray',
              children: (
                <div>
                  <div style={{ color: '#FAFAF9' }}>异常检测</div>
                  <div style={{ color: '#A8A29E', fontSize: '12px' }}>
                    {progress >= 60 ? '已完成' : progress >= 30 ? '处理中...' : '等待中'}
                  </div>
                </div>
              ),
            },
            {
              color: progress >= 90 ? 'green' : progress >= 60 ? 'blue' : 'gray',
              children: (
                <div>
                  <div style={{ color: '#FAFAF9' }}>缺失填充</div>
                  <div style={{ color: '#A8A29E', fontSize: '12px' }}>
                    {progress >= 90 ? '已完成' : progress >= 60 ? '处理中...' : '等待中'}
                  </div>
                </div>
              ),
            },
            {
              color: progress >= 100 ? 'green' : progress >= 90 ? 'blue' : 'gray',
              children: (
                <div>
                  <div style={{ color: '#FAFAF9' }}>最终验证</div>
                  <div style={{ color: '#A8A29E', fontSize: '12px' }}>
                    {progress >= 100 ? '已完成' : progress >= 90 ? '处理中...' : '等待中'}
                  </div>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default DataCleanProgress;
