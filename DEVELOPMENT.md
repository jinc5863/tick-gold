# 开发环境设置指南

## 项目概述

Tick Gold 是一个专为 XAUUSD（黄金外汇合约）设计的高性能量化交易系统，专注于 M1、M5、M15、M30 四个交易周期。

### 技术栈
- **前端**: Tauri 2.0 + React 18 + TypeScript + Zustand + Ant Design
- **后端**: Rust (Tauri命令) + Python FastAPI (量化计算)
- **数据库**: TimescaleDB + PostgreSQL + Redis
- **量化引擎**: NumPy + Pandas + TA-Lib + Backtrader
- **消息队列**: ZeroMQ

## 环境要求

### 必需软件
1. **Node.js 18+** - 前端运行时
2. **Python 3.11+** - 后端量化计算
3. **Rust 1.70+
3. **Rust 1.70+** - Tauri桌面应用
4. **PostgreSQL 14+** - 主数据库
5. **Redis 7+** - 缓存和消息队列
6. **Git** - 版本控制

### 推荐工具
1. **VS Code** + Claude Code扩展
2. **Docker** + Docker Compose (用于数据库服务)
3. **Postman** 或 **Insomnia** - API测试

## 快速开始

### 方法一：使用Docker（推荐）
```bash
# 启动所有服务（前端、后端、数据库）
docker-compose up -d

# 访问应用
# 前端: http://localhost:1420
# 后端API: http://localhost:8000
# 数据库管理: http://localhost:8080 (pgAdmin)
```

### 方法二：本地开发环境

#### 1. 克隆项目
```bash
git clone <repository-url>
cd tick-gold
```

#### 2. 前端环境设置
```bash
# 进入前端目录
cd src

# 安装依赖
npm install

# 运行开发服务器
npm run dev
# 访问: http://localhost:5173

# 运行Tauri开发模式
npm run tauri dev
# 将启动桌面应用
```

#### 3. 后端环境设置
```bash
# 进入后端目录
cd src/backend

# 创建Python虚拟环境
python -m venv venv

# 激活虚拟环境
# Linux/Mac:
source venv/bin/activate
# Windows:
# venv\Scripts\activate

# 安装Python依赖
pip install -r requirements.txt

# 运行Python后端
python main.py
# API将在 http://localhost:8000 启动
```

#### 4. 数据库设置
```bash
# 使用Docker启动数据库服务（推荐）
docker-compose up db redis -d

# 或手动安装和配置
# PostgreSQL: https://www.postgresql.org/download/
# Redis: https://redis.io/download/
```

## 详细配置

### 环境变量配置
项目使用环境变量管理配置：

1. 前端环境变量: `src/.env.development`
   ```bash
   VITE_APP_NAME="Tick Gold - Development"
   VITE_API_BASE_URL=http://localhost:8000
   VITE_TAURI_DEV=true
   VITE_DEV_MODE=true
   ```

2. 后端环境变量: `src/backend/.env`
   ```bash
   DATABASE_URL=postgresql://postgres:password@localhost:5432/tickgold
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=your-secret-key-change-in-production
   ```

### 数据库初始化
```bash
# 创建数据库（如果使用Docker会自动创建）
createdb tickgold

# 运行数据库迁移（如果需要）
cd src/backend
alembic upgrade head
```

## 项目结构说明

```
tick-gold/
├── src/                          # 前端源代码
│   ├── src/                      # React组件
│   │   ├── components/           # UI组件
│   │   ├── store/               # Zustand状态管理
│   │   ├── api/                 # API客户端
│   │   └── utils/               # 工具函数
│   ├── backend/                  # 后端代码
│   │   ├── python/              # Python量化引擎
│   │   └── rust/                # Rust核心逻辑
│   ├── gold/                    # 黄金交易专用模块
│   ├── compliance/              # 合规与风控
│   └── quant/                   # 量化策略
├── tests/                       # 测试文件
├── config/                      # 配置文件
├── docs/                        # 文档
├── public/                      # 静态资源
└── scripts/                     # 开发脚本
```

## 开发命令

### 前端开发
```bash
# 进入前端目录
cd src

# 启动开发服务器
npm run dev

# 启动Tauri桌面应用开发模式
npm run tauri dev

# 运行测试
npm test
npm run test:watch    # 监听模式
npm run test:coverage # 覆盖率测试

# 代码检查
npm run lint

# 类型检查
npm run type-check

# 构建生产版本
npm run build
npm run tauri build
```

### 后端开发
```bash
# 进入后端目录
cd src/backend

# 确保虚拟环境已激活
source venv/bin/activate

# 运行Python后端
python main.py

# 运行测试
pytest tests/unit/
pytest tests/integration/
pytest --cov=src tests/  # 覆盖率测试
```

### 数据库管理
```bash
# 使用Docker Compose管理服务
docker-compose up -d           # 启动所有服务
docker-compose down            # 停止所有服务
docker-compose logs -f db      # 查看数据库日志

# 数据库连接
psql -h localhost -U postgres -d tickgold
```

## 测试环境

### 单元测试
```bash
# 前端测试
cd src && npm test

# 后端测试
cd src/backend && pytest tests/unit/
```

### 集成测试
```bash
# 需要数据库运行
cd src/backend && pytest tests/integration/
```

### 端到端测试
```bash
# 需要完整环境运行
cd src && npm run test:e2e
```

## 性能监控

### 前端性能
```bash
# 运行性能测试
cd src && npm run build -- --profile

# 分析包大小
npm run analyze
```

### 后端性能
```bash
# 使用locust进行压力测试
cd src/backend && locust -f tests/load_test.py
```

## 故障排除

### 常见问题

1. **Python依赖安装失败**
   ```bash
   # 更新pip
   pip install --upgrade pip
   
   # 安装系统依赖（Ubuntu/Debian）
   sudo apt-get install build-essential python3-dev
   
   # 安装TA-Lib依赖
   # Ubuntu: sudo apt-get install libta-lib-dev
   # Mac: brew install ta-lib
   ```

2. **Rust编译错误**
   ```bash
   # 更新Rust
   rustup update
   
   # 检查Rust依赖
   cargo check
   ```

3. **数据库连接失败**
   ```bash
   # 检查PostgreSQL服务状态
   sudo systemctl status postgresql
   
   # 检查Redis服务状态
   sudo systemctl status redis-server
   ```

4. **Tauri构建问题**
   ```bash
   # 清理缓存
   npm run clean
   
   # 重新安装依赖
   rm -rf node_modules
   npm install
   ```

5. **端口冲突**
   ```bash
   # 检查端口使用情况
   lsof -i :5173  # 前端端口
   lsof -i :8000  # 后端端口
   lsof -i :5432  # 数据库端口
   ```

### 调试技巧

1. **前端调试**
   - 浏览器开发者工具
   - React Developer Tools扩展
   - Redux DevTools扩展

2. **后端调试**
   - Python调试器：`import pdb; pdb.set_trace()`
   - 使用VS Code调试配置
   - 查看日志：`tail -f logs/app.log`

3. **数据库调试**
   - pgAdmin界面：http://localhost:8080
   - Redis CLI：`redis-cli monitor`

## 生产部署

### 环境准备
```bash
# 创建生产环境配置文件
cp .env.example .env.production

# 更新环境变量
# 设置正确的数据库URL、API密钥等

# 构建前端
cd src && npm run build

# 构建Tauri应用
npm run tauri build

# 启动后端服务
cd src/backend && gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### 监控与维护
- 日志管理：使用ELK Stack或类似方案
- 性能监控：Prometheus + Grafana
- 错误追踪：Sentry或类似服务

## 开发规范

### 代码提交
使用Conventional Commits规范：
- `feat:` 新功能
- `fix:` 修复bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建过程或工具更新

### 分支管理
- `main` - 生产分支
- `develop` - 开发分支
- `feature/*` - 功能分支
- `bugfix/*` - 修复分支
- `release/*` - 发布分支

### 代码审查
所有更改必须通过代码审查：
1. 创建Pull Request
2. 通过自动化测试
3. 至少一名开发人员审查
4. 符合代码规范

## 获取帮助

### 内部资源
- 项目文档：`docs/` 目录
- API文档：http://localhost:8000/docs
- 架构设计：`docs/architecture.md`

### 技术支持
- 开发团队Slack频道
- 问题跟踪系统
- 定期站会

---

*最后更新: 2026-04-07*

*注意：本指南需根据实际开发环境调整，如有问题请咨询开发团队。*