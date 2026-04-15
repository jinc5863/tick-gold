---
AIGC:
    ContentProducer: Minimax Agent AI
    ContentPropagator: Minimax Agent AI
    Label: AIGC
    ProduceID: e45ee388f9c91d537ec3bfa52d138234
    PropagateID: e45ee388f9c91d537ec3bfa52d138234
    ReservedCode1: 3045022100c38fabe2c82e7140b0fb6114a76f6ef79baeb4a448a9e0752a0b0cee6873784302206cdbc7e65486896eba1abb71838154b684ea7cd60d178bf6fa85de4fc9c65221
    ReservedCode2: 3044022021f63225477aff80286601aad09e7b3ad195ad521680e0fa3daafa6f64a315fa02205d3ffd2bdd97617c58d3d9f828a8a510982d12a9a575e8ff687e96d657a5f2ea
---

# XAUUSD量化系统数据字典

## 1. 核心数据实体

### 1.1 Tick数据

| 字段名 | 数据类型 | 描述 | 示例 |
|-------|---------|-----|-----|
| id | BIGINT | 主键 | 1234567890 |
| timestamp | TIMESTAMPTZ | UTC时间戳 | 2024-01-15T10:30:45.123Z |
| symbol | VARCHAR(20) | 品种代码 | XAUUSD |
| bid | DECIMAL(10,5) | 买价 | 2045.50000 |
| ask | DECIMAL(10,5) | 卖价 | 2045.52000 |
| bid_volume | BIGINT | 买盘成交量(盎司) | 500 |
| ask_volume | BIGINT | 卖盘成交量(盎司) | 350 |
| spread | DECIMAL(10,5) | 价差 | 0.02000 |
| mid_price | DECIMAL(10,5) | 中间价 | 2045.51000 |
| last | DECIMAL(10,5) | 最后成交价 | 2045.51000 |
| last_volume | BIGINT | 最后成交量 | 100 |
| trade_flag | BOOLEAN | 是否有成交 | true |
| source | VARCHAR(50) | 数据来源 | mt4_primary |
| sequence | BIGINT | 序列号 | 12345678 |
| quality_score | DECIMAL(5,2) | 数据质量分 | 98.50 |
| created_at | TIMESTAMPTZ | 创建时间 | 2024-01-15T10:30:45.124Z |

### 1.2 K线数据(OHLCV)

| 字段名 | 数据类型 | 描述 | 示例 |
|-------|---------|-----|-----|
| id | BIGINT | 主键 | 9876543210 |
| symbol | VARCHAR(20) | 品种代码 | XAUUSD |
| timeframe | VARCHAR(10) | 时间周期 | 1H, 4H, 1D |
| open_time | TIMESTAMPTZ | 开盘时间 | 2024-01-15T10:00:00Z |
| close_time | TIMESTAMPTZ | 收盘时间 | 2024-01-15T10:59:59Z |
| open | DECIMAL(10,5) | 开盘价 | 2045.50000 |
| high | DECIMAL(10,5) | 最高价 | 2048.20000 |
| low | DECIMAL(10,5) | 最低价 | 2044.80000 |
| close | DECIMAL(10,5) | 收盘价 | 2047.50000 |
| volume | BIGINT | 成交量(盎司) | 150000 |
| tick_count | INTEGER | Tick计数 | 5000 |
| quote_volume | DECIMAL(20,2) | 成交额(USD) | 307125000.00 |
| created_at | TIMESTAMPTZ | 创建时间 | 2024-01-15T11:00:00Z |

### 1.3 因子数据

| 字段名 | 数据类型 | 描述 | 示例 |
|-------|---------|-----|-----|
| id | BIGINT | 主键 | 1112223330 |
| symbol | VARCHAR(20) | 品种代码 | XAUUSD |
| factor_name | VARCHAR(50) | 因子名称 | MA5, RSI14 |
| factor_value | DECIMAL(20,8) | 因子值 | 2045.52345678 |
| parameters | JSONB | 参数字典 | {"period": 5} |
| timestamp | TIMESTAMPTZ | 计算时间 | 2024-01-15T10:30:45Z |
| source | VARCHAR(50) | 数据源 | calculated |
| created_at | TIMESTAMPTZ | 创建时间 | 2024-01-15T10:30:46Z |

### 1.4 用户账户

| 字段名 | 数据类型 | 描述 | 示例 |
|-------|---------|-----|-----|
| id | UUID | 主键 | 550e8400-e29b-41d4-a716-446655440000 |
| username | VARCHAR(100) | 用户名 | trader001 |
| email | VARCHAR(255) | 邮箱 | trader@example.com |
| phone | VARCHAR(20) | 手机号 | +86-13800138000 |
| password_hash | VARCHAR(255) | 密码哈希 | $2b$12$... |
| role | VARCHAR(20) | 角色 | ADMIN, TRADER, VIEWER |
| status | VARCHAR(20) | 状态 | ACTIVE, INACTIVE, SUSPENDED |
| created_at | TIMESTAMPTZ | 创建时间 | 2024-01-01T00:00:00Z |
| updated_at | TIMESTAMPTZ | 更新时间 | 2024-01-15T10:30:00Z |
| last_login_at | TIMESTAMPTZ | 最后登录 | 2024-01-15T10:30:00Z |

### 1.5 交易账户

| 字段名 | 数据类型 | 描述 | 示例 |
|-------|---------|-----|-----|
| id | UUID | 主键 | 550e8400-e29b-41d4-a716-446655440001 |
| user_id | UUID | 用户ID | 550e8400-e29b-41d4-a716-446655440000 |
| account_no | VARCHAR(50) | 账户号 | ACC001 |
| broker | VARCHAR(50) | Broker | MT4_LIVE, IB_DEMO |
| balance | DECIMAL(20,2) | 余额 | 50000.00 |
| equity | DECIMAL(20,2) | 净值 | 51500.00 |
| margin | DECIMAL(20,2) | 已用保证金 | 4100.00 |
| free_margin | DECIMAL(20,2) | 可用保证金 | 47400.00 |
| margin_level | DECIMAL(10,2) | 保证金比例 | 1246.34 |
| currency | VARCHAR(10) | 币种 | USD |
| status | VARCHAR(20) | 状态 | ACTIVE, CLOSED |
| created_at | TIMESTAMPTZ | 创建时间 | 2024-01-01T00:00:00Z |
| updated_at | TIMESTAMPTZ | 更新时间 | 2024-01-15T10:30:00Z |

### 1.6 持仓记录

| 字段名 | 数据类型 | 描述 | 示例 |
|-------|---------|-----|-----|
| id | UUID | 主键 | 550e8400-e29b-41d4-a716-446655440002 |
| account_id | UUID | 账户ID | 550e8400-e29b-41d4-a716-446655440001 |
| order_id | UUID | 开仓订单ID | 550e8400-e29b-41d4-a716-446655440003 |
| symbol | VARCHAR(20) | 品种代码 | XAUUSD |
| side | VARCHAR(10) | 方向 | LONG, SHORT |
| volume | DECIMAL(10,2) | 持仓量(手) | 1.00 |
| open_price | DECIMAL(10,5) | 开仓价 | 2045.50000 |
| current_price | DECIMAL(10,5) | 当前价 | 2048.20000 |
| stop_loss | DECIMAL(10,5) | 止损价 | 2035.50000 |
| take_profit | DECIMAL(10,5) | 止盈价 | 2065.50000 |
| open_time | TIMESTAMPTZ | 开仓时间 | 2024-01-15T10:30:00Z |
| swap | DECIMAL(20,2) | 隔夜利息 | -5.50 |
| commission | DECIMAL(20,2) | 手续费 | -10.00 |
| unrealized_pnl | DECIMAL(20,2) | 浮动盈亏 | 270.00 |
| realized_pnl | DECIMAL(20,2) | 已实现盈亏 | 0.00 |
| status | VARCHAR(20) | 状态 | OPEN, CLOSED |
| strategy_id | UUID | 策略ID | 550e8400-e29b-41d4-a716-446655440010 |
| magic_number | INTEGER | 订单标识 | 12345 |
| created_at | TIMESTAMPTZ | 创建时间 | 2024-01-15T10:30:00Z |
| updated_at | TIMESTAMPTZ | 更新时间 | 2024-01-15T10:35:00Z |

### 1.7 订单记录

| 字段名 | 数据类型 | 描述 | 示例 |
|-------|---------|-----|-----|
| id | UUID | 主键 | 550e8400-e29b-41d4-a716-446655440003 |
| account_id | UUID | 账户ID | 550e8400-e29b-41d4-a716-446655440001 |
| order_no | VARCHAR(50) | 订单号 | ORD20240115001 |
| symbol | VARCHAR(20) | 品种代码 | XAUUSD |
| type | VARCHAR(20) | 订单类型 | MARKET, LIMIT, STOP |
| side | VARCHAR(10) | 方向 | BUY, SELL |
| volume | DECIMAL(10,2) | 订单量(手) | 1.00 |
| price | DECIMAL(10,5) | 订单价格 | 2045.50000 |
| stop_loss | DECIMAL(10,5) | 止损价 | 2035.50000 |
| take_profit | DECIMAL(10,5) | 止盈价 | 2065.50000 |
| filled_volume | DECIMAL(10,2) | 已成交量 | 1.00 |
| avg_price | DECIMAL(10,5) | 平均价 | 2045.52000 |
| status | VARCHAR(20) | 状态 | PENDING, FILLED, PARTIAL, CANCELLED |
| filled_time | TIMESTAMPTZ | 成交时间 | 2024-01-15T10:30:05Z |
| expire_time | TIMESTAMPTZ | 过期时间 | 2024-01-15T11:30:00Z |
| slippage | DECIMAL(10,5) | 滑点 | 0.00020 |
| commission | DECIMAL(20,2) | 手续费 | -10.00 |
| strategy_id | UUID | 策略ID | 550e8400-e29b-41d4-a716-446655440010 |
| magic_number | INTEGER | 订单标识 | 12345 |
| comment | VARCHAR(255) | 备注 | Trend Follow EA |
| created_at | TIMESTAMPTZ | 创建时间 | 2024-01-15T10:30:00Z |
| updated_at | TIMESTAMPTZ | 更新时间 | 2024-01-15T10:30:05Z |

### 1.8 策略记录

| 字段名 | 数据类型 | 描述 | 示例 |
|-------|---------|-----|-----|
| id | UUID | 主键 | 550e8400-e29b-41d4-a716-446655440010 |
| user_id | UUID | 用户ID | 550e8400-e29b-41d4-a716-446655440000 |
| name | VARCHAR(100) | 策略名称 | Trend Following MA |
| type | VARCHAR(50) | 策略类型 | TREND, MEAN_REVERSION, SCALPING |
| description | TEXT | 描述 | 基于均线交叉的趋势跟踪策略 |
| config | JSONB | 策略配置 | {"ma_fast": 10, "ma_slow": 20} |
| code | TEXT | EA代码(MQL5) | extern int FastMA = 10; |
| status | VARCHAR(20) | 状态 | DRAFT, BACKTESTING, SIMULATING, LIVE, STOPPED |
| equity_curve | JSONB | 净值曲线 | [{"date": "2024-01", "equity": 10000}] |
| performance | JSONB | 绩效指标 | {"total_return": 15.2, "sharpe": 1.85} |
| created_at | TIMESTAMPTZ | 创建时间 | 2024-01-01T00:00:00Z |
| updated_at | TIMESTAMPTZ | 更新时间 | 2024-01-15T10:30:00Z |

### 1.9 回测记录

| 字段名 | 数据类型 | 描述 | 示例 |
|-------|---------|-----|-----|
| id | UUID | 主键 | 550e8400-e29b-41d4-a716-446655440020 |
| strategy_id | UUID | 策略ID | 550e8400-e29b-41d4-a716-446655440010 |
| user_id | UUID | 用户ID | 550e8400-e29b-41d4-a716-446655440000 |
| name | VARCHAR(100) | 回测名称 | Trend MA Backtest 2024 |
| start_date | DATE | 开始日期 | 2023-01-01 |
| end_date | DATE | 结束日期 | 2023-12-31 |
| initial_balance | DECIMAL(20,2) | 初始资金 | 10000.00 |
| final_equity | DECIMAL(20,2) | 最终净值 | 11520.00 |
| total_return | DECIMAL(10,2) | 总收益率 | 15.20 |
| sharpe_ratio | DECIMAL(10,4) | 夏普比率 | 1.8500 |
| max_drawdown | DECIMAL(10,2) | 最大回撤 | -8.50 |
| win_rate | DECIMAL(10,2) | 胜率 | 62.30 |
| profit_factor | DECIMAL(10,4) | 盈亏比 | 1.8500 |
| total_trades | INTEGER | 总交易数 | 150 |
| avg_holding_hours | DECIMAL(10,2) | 平均持仓(小时) | 4.5 |
| status | VARCHAR(20) | 状态 | RUNNING, COMPLETED, FAILED |
| result_data | JSONB | 详细结果 | {...} |
| created_at | TIMESTAMPTZ | 创建时间 | 2024-01-10T10:30:00Z |
| completed_at | TIMESTAMPTZ | 完成时间 | 2024-01-10T10:35:00Z |

### 1.10 风控规则

| 字段名 | 数据类型 | 描述 | 示例 |
|-------|---------|-----|-----|
| id | UUID | 主键 | 550e8400-e29b-41d4-a716-446655440030 |
| user_id | UUID | 用户ID | 550e8400-e29b-41d4-a716-446655440000 |
| name | VARCHAR(100) | 规则名称 | 日亏损限额 |
| type | VARCHAR(50) | 规则类型 | DAILY_LOSS, MARGIN, POSITION |
| condition | JSONB | 条件表达式 | {"field": "daily_pnl", "op": "<", "value": -5000} |
| action | JSONB | 执行动作 | {"type": "BLOCK_ORDER"} |
| params | JSONB | 参数字典 | {"limit": 5000} |
| severity | VARCHAR(20) | 严重级别 | CRITICAL, WARNING, INFO |
| status | VARCHAR(20) | 状态 | ENABLED, DISABLED |
| created_at | TIMESTAMPTZ | 创建时间 | 2024-01-01T00:00:00Z |
| updated_at | TIMESTAMPTZ | 更新时间 | 2024-01-15T10:30:00Z |

### 1.11 风控告警

| 字段名 | 数据类型 | 描述 | 示例 |
|-------|---------|-----|-----|
| id | UUID | 主键 | 550e8400-e29b-41d4-a716-446655440031 |
| rule_id | UUID | 规则ID | 550e8400-e29b-41d4-a716-446655440030 |
| account_id | UUID | 账户ID | 550e8400-e29b-41d4-a716-446655440001 |
| severity | VARCHAR(20) | 级别 | P1, P2, P3, P4 |
| title | VARCHAR(200) | 告警标题 | 账户日亏损超限 |
| message | TEXT | 告警消息 | 日亏损达到-$5,000 |
| details | JSONB | 详细信息 | {"pnl": -5200, "limit": -5000} |
| status | VARCHAR(20) | 状态 | TRIGGERED, ACKNOWLEDGED, RESOLVED |
| triggered_at | TIMESTAMPTZ | 触发时间 | 2024-01-15T10:30:00Z |
| acknowledged_at | TIMESTAMPTZ | 确认时间 | 2024-01-15T10:35:00Z |
| acknowledged_by | UUID | 确认人 | 550e8400-e29b-41d4-a716-446655440000 |
| resolved_at | TIMESTAMPTZ | 解决时间 | 2024-01-15T11:00:00Z |

---

## 2. 枚举值定义

### 2.1 订单类型 (OrderType)

| 值 | 描述 |
|---|-----|
| MARKET | 市价单 |
| LIMIT | 限价单 |
| STOP | 止损单 |
| STOP_LIMIT | 止损限价单 |
| TAKE_PROFIT | 止盈单 |
| TRAILING_STOP | 移动止损 |

### 2.2 订单方向 (OrderSide)

| 值 | 描述 |
|---|-----|
| BUY | 买入/做多 |
| SELL | 卖出/做空 |

### 2.3 订单状态 (OrderStatus)

| 值 | 描述 |
|---|-----|
| PENDING | 待执行 |
| SUBMITTED | 已提交 |
| PARTIAL | 部分成交 |
| FILLED | 完全成交 |
| CANCELLED | 已取消 |
| REJECTED | 已拒绝 |
| EXPIRED | 已过期 |

### 2.4 持仓状态 (PositionStatus)

| 值 | 描述 |
|---|-----|
| OPEN | 开仓中 |
| CLOSING | 平仓中 |
| CLOSED | 已平仓 |
| LIQUIDATED | 强平 |

### 2.5 策略类型 (StrategyType)

| 值 | 描述 |
|---|-----|
| TREND | 趋势跟踪 |
| MEAN_REVERSION | 均值回归 |
| SCALPING | 剥头皮 |
| GRID | 网格交易 |
| HEDGE | 对冲套利 |
| COMBINATION | 组合策略 |

### 2.6 策略状态 (StrategyStatus)

| 值 | 描述 |
|---|-----|
| DRAFT | 草稿 |
| BACKTESTING | 回测中 |
| SIMULATING | 模拟交易中 |
| LIVE | 实盘运行 |
| PAUSED | 已暂停 |
| STOPPED | 已停止 |
| FAILED | 失败 |

### 2.7 回测状态 (BacktestStatus)

| 值 | 描述 |
|---|-----|
| QUEUED | 排队中 |
| RUNNING | 运行中 |
| COMPLETED | 已完成 |
| FAILED | 失败 |
| CANCELLED | 已取消 |

### 2.8 告警级别 (AlertSeverity)

| 值 | 描述 | 响应时限 |
|---|---|---------|
| P1_CRITICAL | 紧急 | 5分钟 |
| P2_HIGH | 严重 | 15分钟 |
| P3_MEDIUM | 警告 | 1小时 |
| P4_LOW | 提示 | 24小时 |

### 2.9 告警状态 (AlertStatus)

| 值 | 描述 |
|---|-----|
| TRIGGERED | 已触发 |
| NOTIFIED | 已通知 |
| ACKNOWLEDGED | 已确认 |
| RESOLVED | 已解决 |
| ESCALATED | 已升级 |

### 2.10 用户角色 (UserRole)

| 值 | 描述 | 权限 |
|---|---|-----|
| ADMIN | 管理员 | 全部权限 |
| TRADER | 交易员 | 交易、风控查看 |
| RESEARCHER | 研究员 | 因子分析、回测 |
| RISK_MANAGER | 风控经理 | 风控配置、查看 |
| VIEWER | 查看者 | 只读权限 |

### 2.11 账户状态 (AccountStatus)

| 值 | 描述 |
|---|-----|
| PENDING | 待激活 |
| ACTIVE | 正常 |
| SUSPENDED | 暂停 |
| CLOSED | 已关闭 |

---

## 3. API请求响应格式

### 3.1 统一响应格式

```json
{
  "success": true,
  "code": 200,
  "message": "Success",
  "data": { ... },
  "timestamp": "2024-01-15T10:30:45.123Z",
  "request_id": "req_abc123"
}
```

### 3.2 分页响应格式

```json
{
  "success": true,
  "code": 200,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 100,
      "total_pages": 5
    }
  },
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

### 3.3 错误响应格式

```json
{
  "success": false,
  "code": 400,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Invalid parameter",
    "details": [
      {
        "field": "price",
        "message": "Price must be positive"
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:45.123Z",
  "request_id": "req_abc123"
}
```

---

## 4. WebSocket消息格式

### 4.1 Tick消息

```json
{
  "type": "tick",
  "symbol": "XAUUSD",
  "data": {
    "bid": 2045.50,
    "ask": 2045.52,
    "bid_volume": 500,
    "ask_volume": 350,
    "spread": 0.02
  },
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

### 4.2 K线消息

```json
{
  "type": "ohlcv",
  "symbol": "XAUUSD",
  "timeframe": "1H",
  "data": {
    "open": 2045.50,
    "high": 2048.20,
    "low": 2044.80,
    "close": 2047.50,
    "volume": 150000
  },
  "timestamp": "2024-01-15T10:59:59Z",
  "is_closed": true
}
```

### 4.3 持仓更新消息

```json
{
  "type": "position",
  "action": "UPDATE",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "symbol": "XAUUSD",
    "side": "LONG",
    "volume": 1.00,
    "open_price": 2045.50,
    "current_price": 2048.20,
    "unrealized_pnl": 270.00
  },
  "timestamp": "2024-01-15T10:35:00Z"
}
```

### 4.4 告警消息

```json
{
  "type": "alert",
  "severity": "P2_HIGH",
  "title": "账户日亏损超限",
  "message": "账户日亏损达到-$5,000，已触发风控规则",
  "data": {
    "account_id": "550e8400-e29b-41d4-a716-446655440001",
    "daily_pnl": -5200.00,
    "limit": -5000.00
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requires_ack": true
}
```

---

**文档结束**
