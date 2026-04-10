#!/bin/bash

echo "🚀 Tick Gold 量化交易系统 - 开发环境启动"
echo "========================================"

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装，请先安装Docker Compose"
    exit 1
fi

# 检查配置文件
if [ ! -f "config/.env" ]; then
    echo "⚠️  未找到.env文件，正在从.env.example创建..."
    cp config/.env.example config/.env
    echo "✅ .env文件已创建，请编辑配置参数"
fi

echo "📦 启动基础设施服务..."
echo "   - TimescaleDB (PostgreSQL)"
echo "   - Redis"
echo "   - MT5模拟器"

# 启动基础设施
docker-compose up -d postgres redis mt5

# 等待数据库就绪
echo "⏳ 等待数据库就绪..."
sleep 10

# 检查数据库连接
echo "🔍 检查数据库连接..."
docker-compose exec postgres pg_isready -U postgres -d tick_gold

if [ $? -ne 0 ]; then
    echo "❌ 数据库连接失败"
    exit 1
fi

echo "✅ 基础设施启动完成"
echo ""
echo "🏗️  后续步骤："
echo "  1. 启动后端服务: docker-compose up backend"
echo "  2. 启动前端服务: docker-compose up frontend"
echo "  3. 或直接启动所有服务: docker-compose up"
echo ""
echo "📊 服务访问地址："
echo "   - 前端: http://localhost:1420"
echo "   - 后端API: http://localhost:8000"
echo "   - MT5模拟器: localhost:1611"
echo "   - TimescaleDB: localhost:5432"
echo "   - Redis: localhost:6379"
echo ""
echo "🔧 开发命令："
echo "   - 查看日志: docker-compose logs -f"
echo "   - 停止服务: docker-compose down"
echo "   - 清理数据: docker-compose down -v"
echo ""
echo "📚 有关更多信息请查阅 README.md"