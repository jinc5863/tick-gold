# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Ant Design 5 + Zustand + Tauri 2.0
- **后端**: Python FastAPI (量化引擎) + Rust (Tauri命令)
- **数据库**: TimescaleDB/PostgreSQL (5432) + Redis (6379)
- **实时数据**: WebSocket + ZeroMQ (端口1611)

## 启动命令

```bash
# 1. 启动数据库和缓存
cd /Users/office01/work/tick-gold
docker-compose up -d postgres redis

# 2. 启动前端（React开发服务器）
cd src && npm run dev       # http://localhost:5173

# 3. 启动后端（FastAPI）
cd backend && source venv/bin/activate && python -m uvicorn app.main:app --reload
# API文档: http://localhost:8000/docs
```

## 开发命令

### 前端 (src/)
| 命令 | 作用 |
|------|------|
| `npm run dev` | Vite开发服务器 (5173) |
| `npm run build` | 生产构建 |
| `npm run test` / `vitest run` | 单元测试 |
| `npm run test:watch` | 测试监听模式 |
| `npm run test:coverage` | 测试覆盖率 |
| `npm run lint` | ESLint检查 |
| `npm run type-check` | TypeScript类型检查 |

### 后端 (backend/)
| 命令 | 作用 |
|------|------|
| `cd backend && source venv/bin/activate` | 激活Python虚拟环境 |
| `python -m uvicorn app.main:app --reload` | 启动API服务器 |
| `pytest tests/` | 运行所有Python测试 |

### 数据库
| 命令 | 作用 |
|------|------|
| `docker-compose up -d postgres redis` | 启动数据库服务 |
| `docker-compose down` | 停止所有服务 |
| `docker-compose logs -f postgres` | 查看PostgreSQL日志 |

## 架构概览

```
tick-gold/
├── src/                          # 前端代码
│   ├── src/                      # React组件 (注意：双层src是设计固定的)
│   ├── api/                      # API客户端
│   ├── components/               # UI组件
│   ├── hooks/                    # React Hooks
│   ├── pages/                    # 页面组件
│   ├── store/                    # Zustand状态管理
│   ├── styles/                   # 样式文件
│   ├── utils/                    # 工具函数
│   └── package.json
├── backend/                      # Python后端
│   ├── app/
│   │   ├── api/                  # API路由
│   │   ├── core/                 # 核心配置
│   │   ├── models/               # 数据模型
│   │   ├── schemas/              # Pydantic schemas
│   │   ├── services/             # 业务逻辑
│   │   └── main.py               # 入口文件
│   └── requirements.txt
├── config/
│   └── app_config.json           # 风险参数配置
└── docker-compose.yml            # 数据库服务
```

## 黄金交易参数

风险参数位于 `config/app_config.json`:

| 参数 | 值 | 说明 |
|------|-----|------|
| max_drawdown | 2% | 最大回撤 |
| max_daily_loss | 0.5% | 每日最大损失 |
| position_size | 1% | 头寸规模 |
| gap_risk | 1% | 跳空风险限制 |
| overnight_risk | 0.5% | 隔夜风险限制 |
| symbol | XAUUSD | 交易品种 |
| timeframes | M1/M5/M15/M30 | 交易周期 |

## 性能目标

- **吞吐量**: 21,340+ ticks/sec (ULTRA性能认证)
- **延迟**: <50ms 关键路径
- **数据精度**: 5位小数
- **数据来源**: MT5

## 重要说明

1. 双层src目录是设计固定的，前端代码必须在 `/src/src/` 下
2. 端口1420（Tauri）与5173（Vite）稳定版可能冲突
3. Python后端位于 `backend/app/` 目录
4. 所有对话使用中文