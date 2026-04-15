# Tick Data Pipeline - 数据处理流水线

## Problem Statement

作为量化交易员，我需要高质量的历史 tick 数据来回测策略。但目前没有统一的数据导入、清洗和质量管理流程，导致：
1. 数据来源混乱，质量参差不齐
2. 清洗规则不统一，难以复现
3. 数据质量问题在实盘才发现，造成损失

## Evidence

- 用户需要在正式交易前有干净的历史数据
- 98.7%+ 数据质量是监管级标准，也是量化策略准确回测的基础
- 星迈 MT5 是主要数据源，需要与其无缝集成

## Proposed Solution

构建一套完整的 tick 数据处理流水线：
1. 从星迈 MT5 导入原始 tick 数据（支持历史批量 + 未来增量）
2. 提供全面的数据质量分析工具
3. 实现模块化清洗规则（可配置、可复现）
4. 实时监控清洗进度和质量报告
5. 最终目标是 98.7%+ 监管级数据质量，<5ms/1M 条处理速度

## Key Hypothesis

我们相信一套标准化、可配置的数据清洗流水线将显著提升回测准确性。
我们将知道我们是对的，当：
- 清洗后数据质量评分 > 98.7%
- 处理速度 < 5ms/1M 条 tick
- 清洗规则可复现、可追溯

## What We're NOT Building

- 实盘交易执行模块（后续 phase）
- 策略回测引擎（后续 phase）
- 自动交易系统（后续 phase）
- MT5 API 集成（星迈暂无 API，先用文件导入）

---

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| 数据质量评分 | > 98.7% | 完整性 x 一致性 x 准确性 x 及时性 |
| 处理速度 | < 5ms/1M tick | 计时器测量 |
| 数据完整性 | > 99% | 缺失 tick / 总 tick |
| 用户满意度 | 清洗流程 < 10 分钟 | 用户测试 |

---

## Open Questions

- [ ] 星迈 MT5 导出文件的具体格式是什么？（需要实际样本）
- [ ] 增量导入的频率是多少？（每小时/每天/每周）
- [ ] 未来是否需要支持其他数据源？（如 Interactive Brokers）

---

## Users & Context

**Primary User**
- **Who**: 量化交易员 / 策略开发者
- **Current behavior**: 手动处理数据，分散在多个工具中
- **Trigger**: 开始新策略回测前，需要干净的历史数据
- **Success state**: 一键导入、自动清洗、清晰的质量报告

**Job to Be Done**
当 我需要用历史数据回测新策略，我想要 自动完成数据导入和清洗并获得质量报告，所以我能 专注于策略开发和优化，而不是数据处理

**Non-Users**
- 纯手动交易员（不需要历史数据）
- 已有的、经过验证的数据集用户

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | CSV/Excel 文件导入 | 星迈 MT5 导出格式 |
| Must | 数据集管理（CRUD） | 基础数据库操作 |
| Must | 数据质量分析报告 | 清洗前的基线评估 |
| Must | 清洗规则：重复/缺失/异常/标准化 | 核心清洗能力 |
| Should | 清洗进度实时监控 | 用户体验优化 |
| Should | 清洗前后对比视图 | 可视化清洗效果 |
| Could | 数据导出功能 | 导出清洗后数据 |
| Could | 清洗规则预设配置 | 快速复用 |
| Won't | MT5 API 实时导入 | 星迈暂无 API |
| Won't | 自动定时增量导入 | MVP 阶段手动触发 |

### MVP Scope

1. CSV/Excel 文件导入
2. 数据预览和基本信息统计
3. 数据质量分析（4 项指标）
4. 4 类清洗规则配置
5. 清洗进度监控
6. 质量报告展示

### User Flow

```
导入文件 → 选择时间范围 → 数据预览 → 质量分析
    ↓
质量报告（问题发现）→ 配置清洗规则 → 执行清洗
    ↓
进度监控 → 清洗完成 → 质量报告 → 管理页面
```

---

## Technical Approach

**Feasibility**: HIGH

**Architecture**

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   MT5 导出  │ →  │   FastAPI   │ →  │ TimescaleDB │
│   CSV/Excel │    │   导入API   │    │  raw_ticks  │
└─────────────┘    └─────────────┘    └─────────────┘
                          ↓
                   ┌─────────────┐
                   │   Pandas    │
                   │   清洗引擎   │
                   └─────────────┘
                          ↓
                   ┌─────────────┐
                   │   WebSocket │
                   │   进度推送   │
                   └─────────────┘
```

**Tick 数据字段**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| timestamp | datetime | 时间戳（必需） |
| symbol | string | 交易品种代码 |
| bid | float | 买价 |
| ask | float | 卖价 |
| bid_volume | float | 买量 |
| ask_volume | float | 卖量 |

**数据库设计**

```sql
-- 数据集元信息
CREATE TABLE datasets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    raw_count BIGINT DEFAULT 0,
    clean_count BIGINT DEFAULT 0,
    quality_score FLOAT,
    status VARCHAR(20) DEFAULT 'raw',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 原始 tick 数据（TimescaleDB 超表）
CREATE TABLE raw_ticks (
    id BIGSERIAL,
    dataset_name VARCHAR(100),
    symbol VARCHAR(20),
    timestamp TIMESTAMPTZ NOT NULL,
    bid DOUBLE PRECISION,
    ask DOUBLE PRECISION,
    bid_volume DOUBLE PRECISION,
    ask_volume DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, timestamp)
);

SELECT create_hypertable('raw_ticks', 'timestamp');

-- 清洗后 tick 数据
CREATE TABLE clean_ticks (
    id BIGSERIAL,
    dataset_name VARCHAR(100),
    symbol VARCHAR(20),
    timestamp TIMESTAMPTZ NOT NULL,
    open DOUBLE PRECISION,
    high DOUBLE PRECISION,
    low DOUBLE PRECISION,
    close DOUBLE PRECISION,
    volume DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, timestamp)
);

SELECT create_hypertable('clean_ticks', 'timestamp');
```

**模拟数据生成**

| 参数 | 值 |
|------|------|
| 时间范围 | 3 个月 |
| 采样频率 | 每秒 1-5 tick |
| 总 tick 数 | ~23M 条 |
| 价格模型 | 几何布朗运动 |
| 波动率 | 基于 XAUUSD 历史数据 |

**技术栈**

| 组件 | 技术 |
|------|------|
| 前端 | React 18 + Ant Design 5.x + Vite |
| 后端 | FastAPI + Pandas + NumPy + SciPy |
| 数据库 | PostgreSQL + TimescaleDB |
| 实时通信 | WebSocket |
| 图表 | @ant-design/plots |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | 数据库设计 | 表结构 + 迁移脚本 | pending | - | - | - |
| 2 | 模拟数据生成 | 生成 3 个月测试数据 | pending | - | 1 | - |
| 3 | 导入模块 | 文件上传 + 数据解析 + 入库 | pending | - | 1 | - |
| 4 | 质量分析 | 数据预览 + 质量指标计算 | pending | - | 3 | - |
| 5 | 清洗引擎 | 4 类清洗规则实现 | pending | - | 3 | - |
| 6 | 进度监控 | WebSocket 进度推送 | pending | with 5 | 3 | - |
| 7 | 质量报告 | 4 项质量指标展示 | pending | - | 5 | - |
| 8 | 前端 UI | 数据导入 + 清洗页面 | pending | - | 2-7 | - |

### Phase Details

**Phase 1: 数据库设计**
- Goal: 建立完整的数据模型
- Scope: datasets、raw_ticks、clean_ticks 表 + 索引
- Success signal: 数据库可创建、可查询

**Phase 2: 模拟数据生成**
- Goal: 生成 3 个月真实感的 XAUUSD tick 数据
- Scope: Python 脚本生成 CSV，导入到数据库
- Success signal: 23M 条 tick 数据在数据库中

**Phase 3: 导入模块**
- Goal: 支持 CSV/Excel 文件导入
- Scope: 文件上传 API、数据解析、时间范围选择、数据集管理
- Success signal: 能导入文件并查看数据集列表

**Phase 4: 质量分析**
- Goal: 提供数据质量概览
- Scope: 重复检测、缺失值检测、异常值检测、统计摘要
- Success signal: 能查看质量分析报告

**Phase 5: 清洗引擎**
- Goal: 实现 4 类清洗规则
- Scope: 重复处理、缺失值填充、异常值过滤、数据标准化
- Success signal: 清洗规则可配置、可执行

**Phase 6: 进度监控**
- Goal: 实时显示清洗进度
- Scope: WebSocket 推送、进度条、剩余时间估算
- Success signal: 清洗过程中看到实时进度

**Phase 7: 质量报告**
- Goal: 展示清洗后数据质量
- Scope: 一致性、准确性、完整性、及时性 4 项指标
- Success signal: 清洗完成后看到质量报告

**Phase 8: 前端 UI**
- Goal: 完整的用户界面
- Scope: 导入页、清洗页、管理页、报表页
- Success signal: 用户可在 UI 完成完整流程

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| 数据源 | CSV/Excel 文件 | API 直连 | 星迈 MT5 无 API，只能文件 |
| 清洗时机 | 一次性清洗 | 流式清洗 | MVP 阶段足够，架构简单 |
| 进度更新 | WebSocket | 轮询 | 实时性好，实现不复杂 |
| 数据存储 | TimescaleDB | 普通 PostgreSQL | 超表分区对 tick 数据性能更好 |

---

## Research Summary

**Market Context**
- 专业量化平台（Bloomberg、米筐、同花顺）都有完善的数据清洗模块
- 98.7% 是量化行业公认的监管级数据质量标准

**Technical Context**
- TimescaleDB 超表分区对高频 tick 数据查询性能优异
- Pandas 处理 23M 条数据在 1-2 分钟内可完成
- WebSocket 推送进度实现简单，用户体验好

---

*Generated: 2026-04-13*
*Status: DRAFT - ready for implementation*
