-- TICK GOLD黄金交易系统数据库schema
-- TimescaleDB时间序列表设计
-- 专注于XAUUSD黄金交易，支持21,340+ ticks/sec写入性能

-- ==================== 扩展功能 ====================
-- 激活TimescaleDB扩展
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- ==================== 市场数据表 ====================

-- 原始tick数据表（最高频率）
CREATE TABLE market_ticks (
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    symbol VARCHAR(10) NOT NULL DEFAULT 'XAUUSD',
    bid NUMERIC(10,2) NOT NULL,
    ask NUMERIC(10,2) NOT NULL,
    bid_volume INTEGER,
    ask_volume INTEGER,
    spread NUMERIC(10,4) GENERATED ALWAYS AS (ask - bid) STORED,
    -- 用于跳空风险检测
    prev_close NUMERIC(10,2),
    gap_percentage NUMERIC(5,4) GENERATED ALWAYS AS (
        CASE
            WHEN prev_close IS NOT NULL AND prev_close > 0
            THEN ABS(bid - prev_close) / prev_close
            ELSE NULL
        END
    ) STORED,
    source VARCHAR(20) DEFAULT 'MT5',
    quality_flag SMALLINT DEFAULT 1, -- 数据质量标志：1=正常，0=异常，2=修复
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 转换为超表，按时间分区（1天分区）
SELECT create_hypertable('market_ticks', 'time', chunk_time_interval => INTERVAL '1 day');

-- 为高频查询创建索引
CREATE INDEX idx_ticks_time_symbol ON market_ticks (time DESC, symbol);
CREATE INDEX idx_ticks_gap ON market_ticks (gap_percentage) WHERE gap_percentage IS NOT NULL;
CREATE INDEX idx_ticks_quality ON market_ticks (quality_flag, time DESC);

-- 压缩策略：7天后压缩
ALTER TABLE market_ticks SET (
    timescaledb.compress,
    timescaledb.compress_orderby = 'time DESC, symbol'
);

SELECT add_compression_policy('market_ticks', INTERVAL '7 days');

-- ==================== OHLC分钟数据表 ====================

-- M1/M5/M15/M30分钟数据表
CREATE TABLE ohlc_data (
    time TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(10) NOT NULL DEFAULT 'XAUUSD',
    timeframe VARCHAR(10) NOT NULL, -- 'M1', 'M5', 'M15', 'M30'
    open NUMERIC(10,2) NOT NULL,
    high NUMERIC(10,2) NOT NULL,
    low NUMERIC(10,2) NOT NULL,
    close NUMERIC(10,2) NOT NULL,
    volume INTEGER DEFAULT 0,
    -- 黄金专用指标
    typical_price NUMERIC(10,2) GENERATED ALWAYS AS ((high + low + close) / 3) STORED,
    -- 波动率指标
    atr_14 NUMERIC(10,4), -- 平均真实范围（14周期）
    rsi_14 NUMERIC(5,2),  -- RSI指标
    -- 亚太时段标志（黄金交易重要时段）
    asian_session BOOLEAN DEFAULT FALSE,
    -- 跳空检测
    prev_close NUMERIC(10,2),
    gap_size NUMERIC(10,4),
    gap_percentage NUMERIC(5,4),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 转换为超表，按时间分区，按时间框架分区
SELECT create_hypertable('ohlc_data', 'time',
    chunk_time_interval => INTERVAL '1 day',
    partitioning_column => 'timeframe',
    number_partitions => 4
);

-- 高效查询的索引
CREATE INDEX idx_ohlc_time_symbol_tf ON ohlc_data (time DESC, symbol, timeframe);
CREATE INDEX idx_ohlc_asian_session ON ohlc_data (asian_session, time DESC);
CREATE INDEX idx_ohlc_gap_size ON ohlc_data (gap_size) WHERE gap_size IS NOT NULL;
CREATE INDEX idx_ohlc_rsi ON ohlc_data (rsi_14) WHERE rsi_14 IS NOT NULL;

-- 压缩策略：30天后压缩
ALTER TABLE ohlc_data SET (
    timescaledb.compress,
    timescaledb.compress_orderby = 'time DESC, symbol, timeframe'
);

SELECT add_compression_policy('ohlc_data', INTERVAL '30 days');

-- ==================== 策略信号表 ====================

CREATE TABLE strategy_signals (
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    strategy_id VARCHAR(50) NOT NULL,
    strategy_name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL DEFAULT 'XAUUSD',
    timeframe VARCHAR(10) NOT NULL,
    -- 信号类型：BUY, SELL, CLOSE, HOLD
    signal_type VARCHAR(10) NOT NULL CHECK (signal_type IN ('BUY', 'SELL', 'CLOSE', 'HOLD')),
    -- 信号强度 -1.0到1.0
    signal_strength NUMERIC(3,2) NOT NULL,
    -- 信号来源价格
    entry_price NUMERIC(10,2),
    stop_loss NUMERIC(10,2),
    take_profit NUMERIC(10,2),
    -- 风险管理参数
    position_size_percent NUMERIC(5,2) DEFAULT 1.0,
    max_risk_percent NUMERIC(5,2) DEFAULT 0.5,
    -- 性能指标
    confidence_score NUMERIC(3,2),
    sharpe_ratio NUMERIC(6,4),
    max_drawdown_percent NUMERIC(5,2),
    -- 处理状态
    processed BOOLEAN DEFAULT FALSE,
    executed BOOLEAN DEFAULT FALSE,
    execution_time TIMESTAMPTZ,
    execution_price NUMERIC(10,2),
    execution_slippage NUMERIC(10,4),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 转换为超表
SELECT create_hypertable('strategy_signals', 'time', chunk_time_interval => INTERVAL '1 day');

-- 策略查询优化索引
CREATE INDEX idx_signals_strategy_time ON strategy_signals (strategy_id, time DESC);
CREATE INDEX idx_signals_symbol_signal ON strategy_signals (symbol, signal_type, time DESC);
CREATE INDEX idx_signals_processed ON strategy_signals (processed) WHERE NOT processed;
CREATE INDEX idx_signals_confidence ON strategy_signals (confidence_score DESC) WHERE confidence_score IS NOT NULL;

-- ==================== 持仓与交易表 ====================

CREATE TABLE trading_positions (
    position_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(10) NOT NULL DEFAULT 'XAUUSD',
    -- 交易方向：LONG, SHORT
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
    entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    entry_price NUMERIC(10,2) NOT NULL,
    position_size DOUBLE PRECISION NOT NULL,
    position_value NUMERIC(15,2) NOT NULL,
    -- 风险管理
    stop_loss NUMERIC(10,2) NOT NULL,
    take_profit NUMERIC(10,2) NOT NULL,
    initial_risk DOUBLE PRECISION NOT NULL, -- 初始风险金额
    max_risk_percent NUMERIC(5,2) NOT NULL DEFAULT 0.5,
    -- 当前状态
    current_price NUMERIC(10,2),
    current_value NUMERIC(15,2),
    unrealized_pl NUMERIC(15,2),
    unrealized_pl_percent NUMERIC(10,4),
    -- 隔夜风险标志
    overnight_risk_flag BOOLEAN DEFAULT FALSE,
    asian_session_flag BOOLEAN DEFAULT FALSE,
    -- 平仓信息
    exit_time TIMESTAMPTZ,
    exit_price NUMERIC(10,2),
    realized_pl NUMERIC(15,2),
    realized_pl_percent NUMERIC(10,4),
    close_reason VARCHAR(50),
    -- 关联信息
    strategy_id VARCHAR(50),
    signal_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 持仓查询优化索引
CREATE INDEX idx_positions_symbol ON trading_positions (symbol);
CREATE INDEX idx_positions_entry_time ON trading_positions (entry_time DESC);
CREATE INDEX idx_positions_open ON trading_positions (exit_time) WHERE exit_time IS NULL;
CREATE INDEX idx_positions_overnight ON trading_positions (overnight_risk_flag) WHERE overnight_risk_flag = TRUE;
CREATE INDEX idx_positions_strategy ON trading_positions (strategy_id) WHERE strategy_id IS NOT NULL;

-- ==================== 风险管理表 ====================

CREATE TABLE risk_metrics (
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metric_type VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) DEFAULT 'XAUUSD',
    -- 风险指标
    value NUMERIC(15,4) NOT NULL,
    threshold NUMERIC(15,4),
    -- 风险等级：LOW, MEDIUM, HIGH, CRITICAL
    risk_level VARCHAR(20) CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    -- 是否触发警报
    alert_triggered BOOLEAN DEFAULT FALSE,
    alert_message TEXT,
    -- 处理状态
    acknowledged BOOLEAN DEFAULT FALSE,
    resolved BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 转换为超表
SELECT create_hypertable('risk_metrics', 'time', chunk_time_interval => INTERVAL '1 hour');

-- 风险监控索引
CREATE INDEX idx_risk_type_time ON risk_metrics (metric_type, time DESC);
CREATE INDEX idx_risk_alerts ON risk_metrics (alert_triggered) WHERE alert_triggered = TRUE;
CREATE INDEX idx_risk_critical ON risk_metrics (risk_level, time DESC) WHERE risk_level = 'CRITICAL';

-- ==================== 黄金特定风险表 ====================

CREATE TABLE gold_specific_risks (
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    risk_type VARCHAR(50) NOT NULL CHECK (risk_type IN ('GAP', 'OVERNIGHT', 'ASIAN_SESSION', 'LIQUIDITY')),
    -- 跳空风险
    gap_size NUMERIC(10,4),
    gap_percentage NUMERIC(5,4),
    gap_breach_threshold BOOLEAN DEFAULT FALSE,
    -- 隔夜风险
    overnight_position_value NUMERIC(15,2),
    overnight_risk_percent NUMERIC(5,2),
    overnight_breach BOOLEAN DEFAULT FALSE,
    -- 亚太时段风险
    asian_session_active BOOLEAN DEFAULT FALSE,
    asian_liquidity_ratio NUMERIC(5,2),
    -- 通用风险标志
    risk_flag BOOLEAN DEFAULT FALSE,
    risk_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 转换为超表
SELECT create_hypertable('gold_specific_risks', 'time', chunk_time_interval => INTERVAL '1 hour');

CREATE INDEX idx_gold_risk_type ON gold_specific_risks (risk_type, time DESC);
CREATE INDEX idx_gold_gap_breach ON gold_specific_risks (gap_breach_threshold) WHERE gap_breach_threshold = TRUE;
CREATE INDEX idx_gold_overnight_breach ON gold_specific_risks (overnight_breach) WHERE overnight_breach = TRUE;

-- ==================== 性能监控表 ====================

CREATE TABLE performance_metrics (
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metric_name VARCHAR(100) NOT NULL,
    -- 性能指标
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(20),
    -- 性能等级
    performance_level VARCHAR(20) CHECK (performance_level IN ('OPTIMAL', 'NORMAL', 'DEGRADED', 'CRITICAL')),
    -- 基准比较
    target_value DOUBLE PRECISION,
    deviation_percent NUMERIC(5,2),
    -- 上下文信息
    context VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 转换为超表
SELECT create_hypertable('performance_metrics', 'time', chunk_time_interval => INTERVAL '1 hour');

CREATE INDEX idx_perf_metric_name ON performance_metrics (metric_name, time DESC);
CREATE INDEX idx_perf_critical ON performance_metrics (performance_level) WHERE performance_level IN ('DEGRADED', 'CRITICAL');

-- ==================== 用户与配置表 ====================

CREATE TABLE users (
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

CREATE TABLE trading_configs (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    config_name VARCHAR(100) NOT NULL,
    -- 风险管理配置
    max_drawdown_percent NUMERIC(5,2) DEFAULT 2.0,
    max_daily_loss_percent NUMERIC(5,2) DEFAULT 0.5,
    max_position_size_percent NUMERIC(5,2) DEFAULT 1.0,
    -- 黄金专用配置
    gap_risk_threshold NUMERIC(5,2) DEFAULT 1.0,
    overnight_risk_threshold NUMERIC(5,2) DEFAULT 0.5,
    asian_session_filter BOOLEAN DEFAULT TRUE,
    -- 策略配置
    active_strategies JSONB DEFAULT '[]'::jsonb,
    strategy_weights JSONB DEFAULT '{}'::jsonb,
    -- 其他配置
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ==================== 辅助视图 ====================

-- 实时tick数据视图
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

-- 持仓概览视图
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

-- 策略性能视图
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

-- tick数据保留90天原始数据，7天后压缩
SELECT add_retention_policy('market_ticks', INTERVAL '90 days');

-- OHLC数据保留1年
SELECT add_retention_policy('ohlc_data', INTERVAL '365 days');

-- 策略信号保留180天
SELECT add_retention_policy('strategy_signals', INTERVAL '180 days');

-- 风险指标保留30天
SELECT add_retention_policy('risk_metrics', INTERVAL '30 days');

-- ==================== 批量插入优化 ====================

-- 为高频插入创建专用函数
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

-- ==================== 表空间估算 ====================

-- 注释：此schema针对21,340+ ticks/sec吞吐量优化
-- 预期存储需求：
-- market_ticks: 约 21,340/sec × 86400 sec/day ≈ 1.84亿条/天
--               每条约 100字节，每日约 18.4GB
-- 压缩后降至约 3.7GB/天

COMMENT ON TABLE market_ticks IS '市场tick数据表，XAUUSD黄金交易专用，支持21,340+ ticks/sec写入';
COMMENT ON TABLE ohlc_data IS '分钟级别OHLC数据，支持M1/M5/M15/M30时间框架';
COMMENT ON TABLE strategy_signals IS '策略信号表，存储量化策略生成的交易信号';
COMMENT ON TABLE trading_positions IS '持仓交易表，跟踪所有开仓和平仓交易';
COMMENT ON TABLE risk_metrics IS '风险管理指标表，实时监控系统风险';
COMMENT ON TABLE gold_specific_risks IS '黄金专用风险表，监控跳空、隔夜等黄金特有风险';