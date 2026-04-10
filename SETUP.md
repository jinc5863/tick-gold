# Tick Gold 量化交易系统 - 快速启动指南

## 概述

Tick Gold 是一个高性能的XAUUSD黄金量化交易系统，采用现代化的React技术栈和新拟态UI设计。

## 系统要求

- Node.js 18+
- Python 3.11+（用于量化引擎）
- Rust 1.70+（用于Tauri桌面应用）
- PostgreSQL 14+ 和 Redis 7+（推荐使用Docker）

## 快速启动（开发模式）

### 1. 克隆项目
```bash
git clone <repository-url>
cd tick-gold
```

### 2. 启动数据库（Docker方式）
```bash
# 使用Docker Compose启动所需服务
docker-compose up -d db redis

# 或者手动安装：
# PostgreSQL: https://www.postgresql.org/download/
# Redis: https://redis.io/download/
```

### 3. 前端开发
```bash
# 进入前端目录
cd src

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问: http://localhost:5173
```

### 4. 后端开发
```bash
# 进入后端Python目录
cd src/backend/python

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Linux/Mac:
source venv/bin/activate
# Windows:
# venv\Scripts\activate

# 安装Python依赖
pip install -r requirements.txt

# 启动Python后端
python main.py

# API将在 http://localhost:8000 启动
```

### 5. Tauri桌面应用
```bash
# 在前端目录中
cd src

# 启动Tauri开发模式
npm run tauri dev

# 这将构建并启动桌面应用
```

## 项目结构

```
tick-gold/
├── src/                          # 前端源代码
│   ├── src/                      # React组件
│   │   ├── components/           # UI组件库
│   │   ├── store/               # Zustand状态管理
│   │   ├── pages/               # 页面组件
│   │   ├── api/                 # API客户端
│   │   └── utils/               # 工具函数
│   ├── backend/                  # 后端代码
│   │   ├── python/              # Python量化引擎
│   │   └── rust/                # Rust核心逻辑
│   ├── Cargo.toml               # Rust配置
│   ├── tauri.conf.json          # Tauri配置
│   └── package.json             # Node.js配置
├── tests/                       # 测试文件
├── config/                      # 配置文件
├── docker-compose.yml           # Docker服务配置
└── DEVELOPMENT.md              # 详细开发文档
```

## 核心功能

### 已实现的组件
1. **新拟态UI组件库** - 金融风格的组件设计
2. **实时价格图表** - 支持多个时间周期
3. **策略管理系统** - 创建、编辑、执行策略
4. **交易信号监控** - 实时交易信号展示
5. **性能监控面板** - 系统性能和指标监控
6. **WebSocket连接** - 实时数据流
3. **Zustand状态管理** - 模块化、高性能的状态管理
4. **策略管理系统** - 策略配置、回测、执行
5. **实时交易仪表板** - 综合交易界面

### 技术特性
- **高性能架构**：21,340+ ticks/sec处理能力
- **新拟态设计**：专业金融交易界面
- **实时数据**：WebSocket实时连接
- **模块化设计**：易于扩展和维护
- **响应式布局**：支持多设备

## 开发命令

### 前端开发
```bash
cd src
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run preview          # 预览构建结果
npm test                 # 运行测试
npm run lint             # 代码检查
npm run type-check       # TypeScript类型检查
npm run tauri dev        # Tauri桌面应用开发
```

### 后端Python
```bash
cd src/backend/python
source venv/bin/activate  # 激活虚拟环境
python main.py            # 启动API服务
pytest                    # 运行Python测试
```

## 环境配置

### 前端环境变量
创建 `.env.development`:
```bash
VITE_APP_NAME="Tick Gold - Development"
VITE_API_BASE_URL=http://localhost:8000
VITE_TAURI_DEV=true
VITE_DEV_MODE=true
```

### 后端环境变量
创建 `src/backend/.env`:
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/tickgold
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-change-in-production
```

## 故障排除

### 常见问题

1. **Python依赖安装失败**
   ```bash
   # 安装系统依赖
   # Ubuntu/Debian:
   sudo apt-get install python3-dev build-essential
   # Mac:
   brew install python-tk@3.11
   ```

2. **Tauri编译错误**
   ```bash
   # 确保Rust正确安装
   rustup update
   # 清理缓存
   npm run clean
   ```

3. **端口冲突**
   ```bash
   # 检查端口使用
   lsof -i :5173  # 前端
   lsof -i :8000  # 后端
   lsof -i :1420  # Tauri
   ```

4. **数据库连接失败**
   ```bash
   # 使用Docker快速启动
   docker-compose up -d db redis
   ```

## 测试

### 运行测试
```bash
# 前端测试
cd src && npm test

# Python后端测试
cd src/backend/python && pytest tests/
```

### 测试覆盖率
```bash
npm run test:coverage  # 前端覆盖率
pytest --cov           # 后端覆盖率
```

## 部署

### 生产构建
```bash
# 前端构建
cd src && npm run build

# Tauri构建
npm run tauri build

# Python后端部署
cd src/backend/python
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### 容器化部署
使用提供的Docker Compose文件：
```bash
docker-compose up -d --build
```

## 贡献指南

1. Fork项目仓库
2. 创建功能分支
3. 提交代码变更
4. 运行测试
5. 创建Pull Request

### 代码规范
-m `feat:` 新功能
-m `fix:` 修复bug  
-m `docs:` 文档更新
-m `style:` 代码格式
-m `refactor:` 重构
-m `test:` 测试相关
-m `chore:` 构建更新

## 技术支持

- GitHub Issues: 报告问题和功能请求
- 开发文档: 查看`DEVELOPMENT.md`
- 架构设计: 查看`docs/`目录

---

**版本**: v0.1.0  
**更新日期**: 2026-04-07  
**状态**: 开发中