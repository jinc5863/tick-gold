# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 快速参考摘要
**Tick Gold - XAUUSD量化交易系统** - 高性能量化交易系统，专注于黄金交易，已通过ULTRA性能认证（21,340+ ticks/sec）。

### 🚀 快速启动命令
```bash
# 启动核心服务
cd /Users/office01/work/tick-gold
docker-compose up -d postgres redis

# 启动前端（选一种）
cd src
npm run tauri dev                    # Tauri桌面应用模式（端口1420）
npm run dev                          # Web模式（端口5173）

# 启动后端
cd src/backend
source venv/bin/activate
python main.py                       # FastAPI API服务（端口8000）
```

### 🏗️ 架构概要
- **前端**: Tauri 2.0 + React 18 + TypeScript（桌面应用） + Vite（Web）
- **后端**: Python FastAPI + Rust (Tauri桥接) + 量化引擎
- **数据库**: TimescaleDB + PostgreSQL + Redis
- **性能**: 21,340+ ticks/sec处理能力，50ms延迟目标

### 🔧 关键配置
- `config/app_config.json` - 风险参数和交易设置
- `src/src-tauri/tauri.conf.json` - Tauri桌面应用配置
- `src/vite.config.ts` - Web前端构建配置

## 语言要求
**所有与用户的对话必须使用中文**。这是本项目的强制性要求，请在所有沟通中严格遵守。

## Project Overview

**Tick Gold - XAUUSD量化交易系统**

一个专为XAUUSD（黄金外汇合约）设计的高性能量化交易系统，专注于M1、M5、M15、M30四个交易周期。系统已通过ULTRA性能认证，具备21,340+ ticks/sec的处理能力。

## 当前状态检查清单
执行任何操作前，请确认以下状态：
1. **✅ 项目结构已验证** - 双层src目录，Tauri 2.0配置正确
2. **❌ 启动问题** - Vite可能无法正确解析不在`/src/src/`目录下的`.tsx`文件
3. **⚠️ 端口使用** - 多端口模式需要注意配置
4. **⚠️ 配置不一致性** - app_config.json中不同目标值需要注意

## ☎️ 服务URL（开发环境）
- **前端Web（Vite开发）**: http://localhost:5173
- **前端Tauri（桌面应用）**: http://localhost:1420（开发模式）
- **后端API (FastAPI)**: http://localhost:8000
- **API文档**: http://localhost:8000/docs（FastAPI自动生成）
- **pgAdmin数据库管理**: http://localhost:8080 (用户名admin@tickgold.com，密码admin123)
- **PostgreSQL数据库**: localhost:5432，数据库名`tickgold`
- **Redis缓存**: localhost:6379，密码`RedisPassword123`

## 🏗️ 架构要点

### 双前端模式
1. **Tauri桌面应用** (`npm run tauri dev`) - 桌面应用，端口1420
   - 使用`capabilities`系统而非`allowlist`（Tauri 2.0标准）
   - 通过Rust桥接调用Python量化引擎
2. **Vite Web界面** (`npm run dev`) - 备用Web界面，端口5173
   - 支持多配置文件：`vite.config.ts`（默认）和`vite-upgraded.config.ts`（稳定版）

### 三后端模式
1. **FastAPI独立服务** (`src/backend/python/main.py`) - Python量化引擎，端口8000
   - NumPy + Pandas + TA-Lib + Backtrader + scikit-learn策略执行
2. **Tauri内置后端** (`src/src-tauri/src/`) - Rust桌面应用后端
   - 通过Tauri的`#[tauri::command]`宏暴露Rust函数给前端
3. **Mock服务器** (`backend/mock_server.py`) - 模拟数据服务器
   - 模拟XAUUSD黄金数据波动特性和跳空风险

## ⚠️ 重要警告

### Tauri 2.0配置警告
```json
// Tauri 1.x（错误）:
{
  "tauri": {
    "allowlist": { ... }  // 不允许！
  }
}

// Tauri 2.0（正确）:
{
  "app": {
    "security": {
      "csp": null
    }
  }
}
// 权限控制通过`capabilities`系统实现，在`src-tauri/capabilities/`目录下定义
```

### 结构警告
- **双层src目录**: 前端代码位于`/src/src/`目录（异常结构）
- **端口冲突**: 1420端口被Tauri和Vite稳定版共享
- **入口点问题**: `test-minimal.tsx`文件位于根目录`/src/`，但Vite期望在`/src/src/`

### 黄金专用风险参数（来自app_config.json）
- **跳空风险**: 1% (gap_risk)
- **隔夜风险**: 0.5% (overnight_risk)
- **最大回撤**: 2% (max_drawdown)
- **每日最大损失**: 0.5% (max_daily_loss)
- **头寸规模**: 1% (position_size)

### 性能要求
- 目标处理能力：100,000 ticks/sec（已认证21,340+）
- 延迟目标：<50ms关键路径
- 数据压缩比：10:1
- 内存：1M tick缓冲区实时分析

## 📚 详细文档链接
详细的开发命令、测试方法、故障排除等已移至对应文档：

- **开发手册**: [DEVELOPMENT.md](./DEVELOPMENT.md) - 完整的开发环境设置和命令
- **项目总结**: [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - 项目历史、已完成功能和计划
- **数据库设置**: [DATABASE_SETUP_COMPLETE.md](./DATABASE_SETUP_COMPLETE.md) - 数据库配置和初始化
- **黄金引擎**: [GOLD_ENGINE_SUMMARY.md](./GOLD_ENGINE_SUMMARY.md) - 黄金交易专用逻辑
- **快速设置**: [SETUP.md](./SETUP.md) - 简化设置指南

---

**文档精简说明**：
为减少Claude Code上下文占用，此文档已从724行精简。
完整的开发命令、测试方法、故障排除等内容请参考上述链接。

**Claude Code使用建议**：
1. 始终以中文与用户对话
2. 优先解决前端入口点配置问题
3. 验证所有黄金交易专用逻辑
4. 确保任何更改不影响性能基准
5. 遵循Tauri 2.0的最佳实践

**性能目标优先**：21,340+ ticks/sec（已认证），目标100,000 ticks/sec

*最后更新: 2026-04-09 (精简版)*
*完整文档请参考 DEVELOPMENT.md 等文档*