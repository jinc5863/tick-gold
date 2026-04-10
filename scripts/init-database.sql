-- Tick Gold 量化交易系统数据库初始化脚本
-- 创建TimescaleDB扩展和表结构

-- 启用TimescaleDB扩展
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 创建tick数据表（使用TimescaleDB进行超表分区）
CREATE TABLE tick_data (
    id BIGSERIAL NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    bid DECIMAL(10,5) NOT NULL,
    ask DECIMAL(10,5) NOT NULL,
    volume DECIMAL(15,2) NOT NULL,
    source VARCHAR(20) DEFAULT 'MT5',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 将tick_data转换为超表，按时间分区
SELECT create_hypertable('tick_data', 'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE);

-- 创建索引
CREATE INDEX idx_tick_data_symbol_time ON tick_data (symbol, timestamp DESC);
CREATE INDEX idx_tick_data_timestamp ON tick_data (timestamp DESC);

-- 创建分钟级别数据聚合表
CREATE TABLE minute_bars (
    symbol VARCHAR(10) NOT NULL,
    timeframe VARCHAR(5) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    open DECIMAL(10,5) NOT NULL,
    high DECIMAL(10,5) NOT NULL,
    low DECIMAL(10,5) NOT NULL,
    close DECIMAL(10,5) NOT NULL,
    volume DECIMAL(15,2) NOT NULL,
    trades_count INTEGER DEFAULT 0,
    PRIMARY KEY (symbol, timeframe, timestamp)
);

-- 创建交易策略结果表
CREATE TABLE strategy_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    strategy_name VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    timeframe VARCHAR(5) NOT NULL,
    parameters JSONB NOT NULL,
    signal_direction VARCHAR(10) NOT NULL, -- 'BUY', 'SELL', 'HOLD'
    signal_confidence DECIMAL(5,4) NOT NULL,
    signal_price DECIMAL(10,5) NOT NULL,
    stop_loss DECIMAL(10,5),
    take_profit DECIMAL(10,5),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    executed_at TIMESTAMPTZ,
    execution_price DECIMAL(10,5),
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'EXECUTED', 'CANCELLED', 'EXPIRED'
    profit_loss DECIMAL(10,5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建性能指标表
CREATE TABLE performance_metrics (
    metric_id SERIAL PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(20,10) NOT NULL,
    metric_timestamp TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(10),
    timeframe VARCHAR(5),
    source VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建风险管理表
CREATE TABLE risk_metrics (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    position_size DECIMAL(10,5) NOT NULL,
    max_drawdown DECIMAL(5,4) NOT NULL DEFAULT 0.02,
    max_daily_loss DECIMAL(5,4) NOT NULL DEFAULT 0.005,
    current_pnl DECIMAL(10,5) DEFAULT 0,
    daily_pnl DECIMAL(10,5) DEFAULT 0,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建审计日志表
CREATE TABLE audit_logs (
    log_id BIGSERIAL PRIMARY KEY,
    log_level VARCHAR(20) NOT NULL,
    log_source VARCHAR(100) NOT NULL,
    log_message TEXT NOT NULL,
    log_data JSONB,
    user_id VARCHAR(50),
    session_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建视图：实时监控视图
CREATE VIEW realtime_monitoring AS
SELECT
    symbol,
    COUNT(*) as tick_count,
    MIN(timestamp) as first_tick,
    MAX(timestamp) as last_tick,
    AVG(bid) as avg_bid,
    AVG(ask) as avg_ask,
    MAX(bid - ask) as max_spread
FROM tick_data
WHERE timestamp > NOW() - INTERVAL '1 minute'
GROUP BY symbol;

-- 创建视图：策略性能视图
CREATE VIEW strategy_performance_view AS
SELECT
    strategy_name,
    symbol,
    timeframe,
    COUNT(*) as signal_count,
    SUM(CASE WHEN signal_direction = 'BUY' THEN 1 ELSE 0 END) as buy_signals,
    SUM(CASE WHEN signal_direction = 'SELL' THEN 1 ELSE 0 END) as sell_signals,
    AVG(signal_confidence) as avg_confidence,
    AVG(profit_loss) as avg_profit_loss,
    SUM(profit_loss) as total_profit_loss
FROM strategy_results
WHERE status = 'EXECUTED' AND profit_loss IS NOT NULL
GROUP BY strategy_name, symbol, timeframe;

-- 创建函数：插入tick数据
CREATE OR REPLACE FUNCTION insert_tick_data(
    p_symbol VARCHAR(10),
    p_timestamp TIMESTAMPTZ,
    p_bid DECIMAL(10,5),
    p_ask DECIMAL(10,5),
    p_volume DECIMAL(15,2),
    p_source VARCHAR(20) DEFAULT 'MT5'
) RETURNS VOID AS $$
BEGIN
    INSERT INTO tick_data (symbol, timestamp, bid, ask, volume, source)
    VALUES (p_symbol, p_timestamp, p_bid, p_ask, p_volume, p_source);
END;
$$ LANGUAGE plpgsql;

-- 创建函数：生成分钟级别数据
CREATE OR REPLACE FUNCTION generate_minute_bars()
RETURNS TRIGGER AS $$
DECLARE
    bar_open DECIMAL(10,5);
    bar_high DECIMAL(10,5);
    bar_low DECIMAL(10,5);
    bar_close DECIMAL(10,5);
    bar_volume DECIMAL(15,2);
    bar_timestamp TIMESTAMPTZ;
BEGIN
    -- 这里应该实现实际的聚合逻辑
    -- 目前只是一个示例函数
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：每分钟自动生成bar数据（需要更复杂的实现）
-- CREATE TRIGGER trigger_generate_minute_bars
-- AFTER INSERT ON tick_data
-- FOR EACH ROW
-- EXECUTE FUNCTION generate_minute_bars();

-- 注释说明
COMMENT ON DATABASE tick_gold IS 'Tick Gold - XAUUSD量化交易系统数据库';
COMMENT ON TABLE tick_data IS '原始tick数据表，使用TimescaleDB进行时间分区';
COMMENT ON TABLE strategy_results IS '交易策略结果记录表';
COMMENT ON TABLE risk_metrics IS '风险管理指标表';
COMMENT ON TABLE audit_logs IS '系统审计日志表';

-- 权限设置示例
GRANT CONNECT ON DATABASE tick_gold TO tickgold_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tickgold_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tickgold_user;

-- 完成消息
SELECT '✅ Tick Gold数据库初始化完成' AS message;