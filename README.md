# Tick Gold - XAUUSD量化交易系统

## 快速开始

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Ant Design 5.x
- **后端**: Python 3.11 + FastAPI + SQLAlchemy
- **数据库**: TimescaleDB + Redis
- **实时**: WebSocket

## 开发

```bash
# 前端开发
cd src && npm run dev

# 后端开发
cd backend && source venv/bin/activate && uvicorn app.main:app --reload
```

## API 文档

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
