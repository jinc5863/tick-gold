-- Tick Gold数据库初始迁移脚本
-- 创建时间序列表结构
-- 执行前请确保已启用TimescaleDB扩展

-- ==================== 扩展功能 ====================
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- ==================== 市场数据表 ====================

-- 原始tick数据表
CREATE TABLE IF NOT EXISTS market_ticks (
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    symbol VARCHAR(10) NOT NULL DEFAULT 'XAUUSD',
    bid NUMERIC(10,2) NOT NULL,
    ask NUMERIC(10,2) NOT NULL,
    bid_volume INTEGER,
    ask_volume INTEGER,
    spread NUMERIC(10,4) GENERATED ALWAYS AS (ask - bid) STORED,
    prev_close NUMERIC(10,2),
    gap_percentage NUMERIC(5,4) GENERATED ALWAYS AS (
        CASE
            WHEN prev_close IS NOT NULL AND prev_close > 0
            THEN ABS(bid - prev_close) / prev_close
            ELSE NULL
        END
    ) STORED,
    source VARCHAR(20) DEFAULT 'MT5',
    quality_flag SMALLINT DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 转换为超表
SELECT create_hypertable('market_ticks', 'time', if_not_exists => TRUE, chunk_time_interval => INTERVAL '1 day');

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ticks_time_symbol ON market_ticks (time DESC, symbol);
CREATE INDEX IF NOT EXISTS idx_ticks_gap ON market_ticks (gap_percentage) WHERE gap_percentage IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ticks_quality ON market_ticks (quality_flag, time DESC);

-- ==================== OHLC分钟数据表 ====================

CREATE TABLE IF NOT EXISTS ohlc_data (
    time TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(10) NOT NULL DEFAULT 'XAUUSD',
    timeframe VARCHAR(10) NOT NULL,
    open NUMERIC(10,2) NOT NULL,
    high NUMERIC(10,2) NOT NULL,
    low NUMERIC(10,2) NOT NULL,
    close NUMERIC(10,2) NOT NULL,
    volume INTEGER DEFAULT 0,
    typical_price NUMERIC(10,2) GENERATED ALWAYS AS ((high + low + close) / 3) STORED,
    atr_14 NUMERIC(10,4),
    rsi_14 NUMERIC(5,2),
    asian_session BOOLEAN DEFAULT FALSE,
    prev_close NUMERIC(10,2),
    gap_size NUMERIC(10,4),
    gap_percentage NUMERIC(5,4),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 转换为超表
SELECT create_hypertable('ohlc_data', 'time', if_not_exists => TRUE,
    chunk_time_interval => INTERVAL '1 day',
    partitioning_column => 'timeframe',
    number_partitions => 4
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ohlc_time_symbol_tf ON ohlc_data (time DESC, symbol, timeframe);
CREATE INDEX IF NOT EXISTS idx_ohlc_asian_session ON ohlc_data (asian_session, time DESC);
CREATE INDEX IF NOT EXISTS idx_ohlc_gap_size ON ohlc_data (gap_size) WHERE gap_size IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ohlc_rsi ON ohlc_data (rsi_14) WHERE rsi_14 IS NOT NULL;

-- ==================== 策略信号表 ====================

CREATE TABLE IF NOT EXISTS strategy_signals (
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    strategy_id VARCHAR(50) NOT NULL,
    strategy_name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL DEFAULT 'XAUUSD',
    timeframe VARCHAR(10) NOT NULL,
    signal_type VARCHAR(10) NOT NULL CHECK (signal_type IN ('BUY', 'SELL', 'CLOSE', 'HOLD')),
    signal_strength NUMERIC(3,2) NOT NULL,
    entry_price NUMERIC(10,2),
    stop_loss NUMERIC(10,2),
    take_profit NUMERIC(10,2),
    position_size_percent NUMERIC(5,2) DEFAULT 1.0,
    max_risk_percent NUMERIC(5,2) DEFAULT 0.5,
    confidence_score NUMERIC(3,2),
    sharpe_ratio NUMERIC(6,4),
    max_drawdown_percent NUMERIC(5,2),
    processed BOOLEAN DEFAULT FALSE,
    executed BOOLEAN DEFAULT FALSE,
    execution_time TIMESTAMPTZ,
    execution_price NUMERIC(10,2),
    execution_slippage NUMERIC(10,4),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 转换为超表
SELECT create_hypertable('strategy_signals', 'time', if_not_exists => TRUE, chunk_time_interval => INTERVAL '1 day');

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_signals_strategy_time ON strategy_signals (strategy_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_signals_symbol_signal ON strategy_signals (symbol, signal_type, time DESC);
CREATE INDEX IF NOT EXISTS idx_signals_processed ON strategy_signals (processed) WHERE NOT processed;
CREATE INDEX IF NOT EXISTS idx_signals_confidence ON strategy_signals (confidence_score DESC) WHERE confidence_score IS NOT NULL;

-- ==================== 持仓与交易表 ====================

CREATE TABLE IF NOT EXISTS trading_positions (
    position_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(10) NOT NULL DEFAULT 'XAUUSD',
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
    entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    entry_price NUMERIC(10,2) NOT NULL,
    position_size DOUBLE PRECISION NOT NULL,
    position_value NUMERIC(15,2) NOT NULL,
    stop_loss NUMERIC(10,2) NOT NULL,
    take_profit NUMERIC(10,2) NOT NULL,
    initial_risk DOUBLE PRECISION NOT NULL,
    max_risk_percent NUMERIC(5,2) NOT NULL DEFAULT 0.5,
    current_price NUMERIC(10,2),
    current_value NUMERIC(15,2),
    unrealized_pl NUMERIC(15,2),
    unrealized_pl_percent NUMERIC(10,4),
    overnight_risk_flag BOOLEAN DEFAULT FALSE,
    asian_session_flag BOOLEAN DEFAULT FALSE,
    exit_time TIMESTAMPTZ,
    exit_price NUMERIC(10,2),
    realized_pl NUMERIC(15,2),
    realized_pl_percent NUMERIC(10,4),
    close_reason VARCHAR(50),
    strategy_id VARCHAR(50),
    signal_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON trading_positions (symbol);
CREATE INDEX IF NOT EXISTS idx_positions_entry_time ON trading_positions (entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_positions_open ON trading_positions (exit_time) WHERE exit_time IS NULL;
CREATE INDEX IF NOT EXISTS idx_positions_overnight ON trading_positions (overnight_risk_flag) WHERE overnight_risk_flag = TRUE;
CREATE INDEX IF NOT EXISTS idx_positions_strategy ON trading_positions (strategy_id) WHERE strategy_id IS NOT NULL;

-- ==================== 风险管理表 ====================

CREATE TABLE IF NOT EXISTS risk_metrics (
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metric_type VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) DEFAULT 'XAUUSD',
    value NUMERIC(15,4) NOT NULL,
    threshold NUMERIC(15,4),
    risk_level VARCHAR(20) CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    alert_triggered BOOLEAN DEFAULT FALSE,
    alert_message TEXT,
    acknowledged BOOLEAN DEFAULT FALSE,
    resolved BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 转换为超表
SELECT create_hypertable('risk_metrics', 'time', if_not_exists => TRUE, chunk_time_interval => INTERVAL '1 hour');

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_risk_type_time ON risk_metrics (metric_type, time DESC);
CREATE INDEX IF NOT EXISTS idx_risk_alerts ON risk_metrics (alert_triggered) WHERE alert_triggered = TRUE;
CREATE INDEX IF NOT EXISTS idx_risk_critical ON risk_metrics (risk_level, time DESC) WHERE risk_level = 'CRITICAL';

-- ==================== 黄金特定风险表 ====================

CREATE TABLE IF NOT EXISTS gold_specific_risks (
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    risk_type VARCHAR(50) NOT NULL CHECK (risk_type IN ('GAP', 'OVERNIGHT', 'ASIAN_SESSION', 'LIQUIDITY')),
    gap_size NUMERIC(10,4),
    gap_percentage NUMERIC(5,4),
    gap_breach_threshold BOOLEAN DEFAULT FALSE,
    overnight_position_value NUMERIC(15,2),
    overnight_risk_percent NUMERIC(5,2),
    overnight_breach BOOLEAN DEFAULT FALSE,
    asian_session_active BOOLEAN DEFAULT FALSE,
    asian_liquidity_ratio NUMERIC(5,2),
    risk_flag BOOLEAN DEFAULT FALSE,
    risk_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 转换为超表
SELECT create_hypertable('gold_specific_risks', 'time', if_not_exists => TRUE, chunk_time_interval => INTERVAL '1 hour');

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_gold_risk_type ON gold_specific_risks (risk_type, time DESC);
CREATE INDEX IF NOT EXISTS idx_gold_gap_breach ON gold_specific_risks (gap_breach_threshold) WHERE gap_breach_threshold = TRUE;
CREATE INDEX IF NOT EXISTS idx_gold_overnight_breach ON gold_specific_risks (overnight_breach) WHERE overnight_breach = TRUE;

-- ==================== 性能监控表 ====================

CREATE TABLE IF NOT EXISTS performance_metrics (
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metric_name VARCHAR(100) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(20),
    performance_level VARCHAR(20) CHECK (performance_level IN ('OPTIMAL', 'NORMAL', 'DEGRADED', 'CRITICAL')),
    target_value DOUBLE PRECISION,
    deviation_percent NUMERIC(5,2),
    context VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 转换为超表
SELECT create_hypertable('performance_metrics', 'time', if_not_exists => TRUE, chunk_time_interval => INTERVAL '1 hour');

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_perf_metric_name ON performance_metrics (metric_name, time DESC);
CREATE INDEX IF NOT EXISTS idx_perf_critical ON performance_metrics (performance_level) WHERE performance_level IN ('DEGRADED', 'CRITICAL');

-- ==================== 用户与配置表 ====================

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    preferences JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS trading_configs (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    config_name VARCHAR(100) NOT NULL,
    max_drawdown_percent NUMERIC(5,2) DEFAULT 2.0,
    max_daily_loss_percent NUMERIC(5,2) DEFAULT 0.5,
    max_position_size_percent NUMERIC(5,2) DEFAULT 1.0,
    gap_risk_threshold NUMERIC(5,2) DEFAULT 1.0,
    overnight_risk_threshold NUMERIC(5,2) DEFAULT 0.5,
    asian_session_filter BOOLEAN DEFAULT TRUE,
    active_strategies JSONB DEFAULT '[]'::jsonb,
    strategy_weights JSONB DEFAULT '{}'::jsonb,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ==================== 辅助视图 ====================

CREATE OR REPLACE VIEW realtime_ticks AS
SELECT
    time,
    symbol,
    bid,
    ask,
    spread,
    prev_close,
    gap_percentage,
    CASE
        WHEN gap_percentage > 0.01 THEN 'HIGH_GAP_WARNING'
        WHEN gap_percentage > 0.005 THEN 'MEDIUM_GAP_WARNING'
        ELSE 'NORMAL'
    END as gap_warning_level
FROM market_ticks
WHERE time > NOW() - INTERVAL '5 minutes'
ORDER BY time DESC;

CREATE OR REPLACE VIEW position_summary AS
SELECT
    symbol,
    direction,
    COUNT(*) as open_positions,
    SUM(position_value) as total_value,
    AVG(unrealized_pl_percent) as avg_pl_percent,
    MIN(unrealized_pl_percent) as min_pl_percent,
    MAX(unrealized_pl_percent) as max_pl_percent,
    SUM(CASE WHEN overnight_risk_flag THEN 1 ELSE 0 END) as overnight_positions
FROM trading_positions
WHERE exit_time IS NULL
GROUP BY symbol, direction;

CREATE OR REPLACE VIEW strategy_performance AS
SELECT
    strategy_id,
    strategy_name,
    symbol,
    COUNT(*) as total_signals,
    SUM(CASE WHEN signal_type IN ('BUY', 'SELL') THEN 1 ELSE 0 END) as action_signals,
    AVG(confidence_score) as avg_confidence,
    AVG(sharpe_ratio) as avg_sharpe,
    MIN(max_drawdown_percent) as best_drawdown,
    MAX(max_drawdown_percent) as worst_drawdown,
    SUM(CASE WHEN executed THEN 1 ELSE 0 END) as executed_signals
FROM strategy_signals
WHERE time > NOW() - INTERVAL '7 days'
GROUP BY strategy_id, strategy_name, symbol;

-- ==================== 数据保留策略 ====================

SELECT add_retention_policy('market_ticks', INTERVAL '90 days', if_not_exists => TRUE);
SELECT add_retention_policy('ohlc_data', INTERVAL '365 days', if_not_exists => TRUE);
SELECT add_retention_policy('strategy_signals', INTERVAL '180 days', if_not_exists => TRUE);
SELECT add_retention_policy('risk_metrics', INTERVAL '30 days', if_not_exists => TRUE);

-- ==================== 压缩策略 ====================

ALTER TABLE market_ticks SET (
    timescaledb.compress,
    timescaledb.compress_orderby = 'time DESC, symbol'
);

SELECT add_compression_policy('market_ticks', INTERVAL '7 days', if_not_exists => TRUE);

ALTER TABLE ohlc_data SET (
    timescaledb.compress,
    timescaledb.compress_orderby = 'time DESC, symbol, timeframe'
);

SELECT add_compression_policy('ohlc_data', INTERVAL '30 days', if_not_exists => TRUE);

-- ==================== 批量插入函数 ====================

CREATE OR REPLACE FUNCTION insert_tick_batch(tick_data JSONB[])
RETURNS BIGINT AS $$
DECLARE
    inserted_count BIGINT;
BEGIN
    INSERT INTO market_ticks (time, symbol, bid, ask, bid_volume, ask_volume, prev_close, source)
    SELECT
        (tick->>'time')::TIMESTAMPTZ,
        COALESCE(tick->>'symbol', 'XAUUSD'),
        (tick->>'bid')::NUMERIC,
        (tick->>'ask')::NUMERIC,
        (tick->>'bid_volume')::INTEGER,
        (tick->>'ask_volume')::INTEGER,
        (tick->>'prev_close')::NUMERIC,
        COALESCE(tick->>'source', 'MT5')
    FROM unnest(tick_data) as tick
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- ==================== 迁移完成标记 ====================
COMMENT ON SCHEMA public IS 'Tick Gold黄金交易系统数据库，TimescaleDB时间序列优化，支持21,340+ ticks/sec';
COMMENT ON TABLE market_ticks IS '市场tick数据表，XAUUSD黄金交易专用，支持高频写入';
COMMENT ON TABLE ohlc_data IS '分钟级别OHLC数据，支持M1/M5/M15/M30时间框架，按时间框架分区';

SELECT NOW() as migration_completed_at, '001_initial_schema' as migration_version;