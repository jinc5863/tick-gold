from fastapi import FastAPI, HTTPException, Depends, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
import numpy as np
import pandas as pd
# import talib  # TODO: 需要安装 TA-Lib: brew install ta-lib && pip install TA-Lib
from datetime import datetime, timedelta
import json
import logging
from typing import Optional, List, Dict, Any
import jwt
from config import config

# 导入数据库模块
from database import init_database, close_database, check_database_health, db_manager
from redis_config import init_cache, close_cache

# 设置日志
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(config.LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=config.APP_NAME,
    version=config.APP_VERSION,
    description=config.APP_DESCRIPTION,
    docs_url="/docs" if config.API_DEBUG else None,
    redoc_url="/redoc" if config.API_DEBUG else None
)

# 应用生命周期事件
@app.on_event("startup")
async def startup_event():
    """应用启动时初始化数据库连接"""
    try:
        await init_database()
        await init_cache()
        logger.info("✅ 数据库和Redis连接已初始化")
    except Exception as e:
        logger.error(f"❌ 数据库初始化失败: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时清理数据库连接"""
    try:
        await close_database()
        await close_cache()
        logger.info("✅ 数据库和Redis连接已关闭")
    except Exception as e:
        logger.error(f"❌ 数据库关闭失败: {e}")

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420", "http://127.0.0.1:1420"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 安全配置
security = HTTPBearer()

# 依赖函数
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(
            credentials.credentials,
            config.SECRET_KEY,
            algorithms=["HS256"]
        )
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效或过期的令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Pydantic模型定义
class TickData(BaseModel):
    """Tick数据模型"""
    time: datetime = Field(default_factory=datetime.now)
    symbol: str = Field(default='XAUUSD', max_length=10)
    bid: float = Field(ge=0)
    ask: float = Field(ge=0)
    bid_volume: Optional[int] = None
    ask_volume: Optional[int] = None
    source: str = Field(default='MT5', max_length=20)

class TickBatch(BaseModel):
    """批量Tick数据模型"""
    ticks: List[TickData]

# 数据API端点
@app.post("/api/data/ticks/batch")
async def insert_tick_batch(batch: TickBatch, background_tasks: BackgroundTasks):
    """批量插入tick数据"""
    try:
        # 转换为字典列表
        ticks_data = [tick.dict() for tick in batch.ticks]

        # 异步插入（不阻塞响应）
        inserted_count = await db_manager.batch_insert_ticks(ticks_data)

        # 异步缓存到Redis
        async def cache_ticks():
            try:
                from redis_config import cache_manager
                if len(ticks_data) > 0:
                    symbol = ticks_data[0]['symbol']
                    await cache_manager.cache_tick_buffer(symbol, ticks_data)
            except Exception as e:
                logger.error(f"缓存tick数据失败: {e}")

        background_tasks.add_task(cache_ticks)

        return {
            "status": "success",
            "inserted_count": inserted_count,
            "total_count": len(batch.ticks),
            "performance": {
                "success_rate": inserted_count / len(batch.ticks) * 100 if batch.ticks else 0,
                "timestamp": datetime.now().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"批量插入tick数据失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/data/ticks/latest")
async def get_latest_ticks(
    symbol: str = "XAUUSD",
    limit: int = 100,
    use_cache: bool = True
):
    """获取最新的tick数据"""
    try:
        # 首先尝试从Redis缓存获取
        if use_cache:
            from redis_config import cache_manager
            cached_ticks = await cache_manager.get_cached_tick_buffer(symbol)
            if cached_ticks and len(cached_ticks) >= limit:
                return {
                    "status": "success",
                    "source": "redis_cache",
                    "count": len(cached_ticks[:limit]),
                    "ticks": cached_ticks[:limit],
                    "timestamp": datetime.now().isoformat()
                }

        # 从数据库查询
        async with db_manager.acquire_postgres() as conn:
            ticks = await conn.fetch("""
                SELECT time, symbol, bid, ask, bid_volume, ask_volume, spread, source
                FROM market_ticks
                WHERE symbol = $1
                ORDER BY time DESC
                LIMIT $2
            """, symbol, limit)

            ticks_data = [{
                'time': row['time'].isoformat(),
                'symbol': row['symbol'],
                'bid': float(row['bid']),
                'ask': float(row['ask']),
                'bid_volume': row['bid_volume'],
                'ask_volume': row['ask_volume'],
                'spread': float(row['spread']) if row['spread'] else None,
                'source': row['source']
            } for row in ticks]

            # 异步缓存到Redis
            async def cache_to_redis():
                try:
                    from redis_config import cache_manager
                    await cache_manager.cache_tick_buffer(symbol, ticks_data)
                except Exception as e:
                    logger.warning(f"缓存tick数据到Redis失败: {e}")

            import asyncio
            asyncio.create_task(cache_to_redis())

            return {
                "status": "success",
                "source": "database",
                "count": len(ticks_data),
                "ticks": ticks_data,
                "timestamp": datetime.now().isoformat()
            }
    except Exception as e:
        logger.error(f"获取最新tick数据失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/data/ohlc")
async def get_ohlc_data(
    symbol: str = "XAUUSD",
    timeframe: str = "M1",
    limit: int = 100,
    use_cache: bool = True
):
    """获取OHLC数据"""
    try:
        # 尝试从Redis缓存获取
        if use_cache:
            from redis_config import cache_manager
            cached_data = await cache_manager.get_cached_ohlc(symbol, timeframe)
            if cached_data:
                return {
                    "status": "success",
                    "source": "redis_cache",
                    "symbol": symbol,
                    "timeframe": timeframe,
                    "count": len(cached_data[:limit]),
                    "data": cached_data[:limit],
                    "timestamp": datetime.now().isoformat()
                }

        # 从数据库查询
        async with db_manager.acquire_postgres() as conn:
            ohlc_data = await conn.fetch("""
                SELECT time, symbol, timeframe, open, high, low, close, volume,
                       atr_14, rsi_14, asian_session, gap_percentage
                FROM ohlc_data
                WHERE symbol = $1 AND timeframe = $2
                ORDER BY time DESC
                LIMIT $3
            """, symbol, timeframe, limit)

            data = [{
                'time': row['time'].isoformat(),
                'symbol': row['symbol'],
                'timeframe': row['timeframe'],
                'open': float(row['open']),
                'high': float(row['high']),
                'low': float(row['low']),
                'close': float(row['close']),
                'volume': row['volume'],
                'atr_14': float(row['atr_14']) if row['atr_14'] else None,
                'rsi_14': float(row['rsi_14']) if row['rsi_14'] else None,
                'asian_session': row['asian_session'],
                'gap_percentage': float(row['gap_percentage']) if row['gap_percentage'] else None
            } for row in ohlc_data]

            # 异步缓存到Redis
            async def cache_to_redis():
                try:
                    from redis_config import cache_manager
                    await cache_manager.cache_ohlc_data(symbol, timeframe, data)
                except Exception as e:
                    logger.warning(f"缓存OHLC数据到Redis失败: {e}")

            import asyncio
            asyncio.create_task(cache_to_redis())

            return {
                "status": "success",
                "source": "database",
                "symbol": symbol,
                "timeframe": timeframe,
                "count": len(data),
                "data": data,
                "timestamp": datetime.now().isoformat()
            }
    except Exception as e:
        logger.error(f"获取OHLC数据失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/data/performance/stats")
async def get_performance_stats():
    """获取性能统计"""
    try:
        async with db_manager.acquire_postgres() as conn:
            # 获取最近性能指标
            performance_metrics = await conn.fetch("""
                SELECT metric_name, value, unit, performance_level, time
                FROM performance_metrics
                WHERE time > NOW() - INTERVAL '1 hour'
                ORDER BY time DESC
                LIMIT 50
            """)

            # 计算写入性能
            write_tps = await conn.fetchval("""
                SELECT AVG(value)
                FROM performance_metrics
                WHERE metric_name = 'write_throughput_current'
                AND time > NOW() - INTERVAL '5 minutes'
            """) or 0

            # 计算读取延迟
            read_latency = await conn.fetchval("""
                SELECT AVG(value)
                FROM performance_metrics
                WHERE metric_name = 'read_latency_current'
                AND time > NOW() - INTERVAL '5 minutes'
            """) or 0

            return {
                "status": "success",
                "timestamp": datetime.now().isoformat(),
                "performance_metrics": [dict(row) for row in performance_metrics],
                "summary": {
                    "write_throughput_tps": float(write_tps),
                    "read_latency_ms": float(read_latency),
                    "target_write_tps": config.MAX_TICK_RATE,
                    "target_read_ms": config.TARGET_LATENCY,
                    "write_performance_percentage": min(100, (write_tps / config.MAX_TICK_RATE) * 100),
                    "read_performance_percentage": max(0, 100 - max(0, read_latency - config.TARGET_LATENCY))
                }
            }
    except Exception as e:
        logger.error(f"获取性能统计失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class TickData(BaseModel):
    timestamp: str
    bid: float
    ask: float
    volume: float

class StrategyRequest(BaseModel):
    symbol: str
    timeframe: str
    parameters: dict

# 模拟数据库连接函数
async def get_db_connection():
    """获取数据库连接（这里需要实际实现）"""
    return None

class TickData(BaseModel):
    timestamp: str
    bid: float
    ask: float
    volume: float

class StrategyRequest(BaseModel):
    symbol: str
    timeframe: str
    parameters: dict

@app.post("/api/tick")
async def receive_tick_data(tick: TickData):
    """接收tick数据"""
    try:
        # 处理tick数据
        print(f"Received tick: {tick.timestamp} - Bid: {tick.bid}, Ask: {tick.ask}, Volume: {tick.volume}")
        return {"status": "success", "message": "Tick data received"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/strategy")
async def generate_strategy(request: StrategyRequest):
    """生成量化策略"""
    try:
        # 根据请求生成策略
        strategy = {
            "symbol": request.symbol,
            "timeframe": request.timeframe,
            "parameters": request.parameters,
            "generated_at": datetime.now().isoformat()
        }
        return {"status": "success", "strategy": strategy}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tick")
async def receive_tick_data(tick: TickData, token: dict = Depends(verify_token)):
    """接收tick数据"""
    try:
        # 处理tick数据
        logger.info(f"收到tick数据：{tick.timestamp} - Bid: {tick.bid}, Ask: {tick.ask}, Volume: {tick.volume}")

        # 这里应该实际存储到数据库
        # connection = await get_db_connection()
        # 存储逻辑...

        return {
            "status": "success",
            "message": "Tick数据接收成功",
            "data": {
                "timestamp": tick.timestamp,
                "bid": tick.bid,
                "ask": tick.ask,
                "spread": tick.ask - tick.bid,
                "processed_at": datetime.now().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"处理tick数据失败：{e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/strategy")
async def generate_strategy(request: StrategyRequest, token: dict = Depends(verify_token)):
    """生成量化策略"""
    try:
        logger.info(f"生成策略：{request.symbol} - {request.timeframe}")

        # 这里应该整合quant模块的策略生成
        from quant.strategies import TradingStrategies

        # 模拟数据生成（实际应该使用真实数据）
        sample_data = pd.DataFrame({
            'close': np.random.uniform(2000, 2100, 100)
        })

        # 根据策略类型选择
        if request.parameters.get('strategy_type') == 'scalping':
            signals = TradingStrategies.scalping_strategy(sample_data, request.parameters)
        elif request.parameters.get('strategy_type') == 'trend':
            signals = TradingStrategies.trend_following_strategy(sample_data, request.parameters)
        else:
            signals = pd.DataFrame({'signal': [0] * len(sample_data)})

        # 生成策略代码
        code = TradingStrategies.generate_strategy_code(
            request.parameters.get('strategy_type', 'scalping'),
            request.parameters
        )

        strategy = {
            "symbol": request.symbol,
            "timeframe": request.timeframe,
            "parameters": request.parameters,
            "generated_at": datetime.now().isoformat(),
            "signals": signals['signal'].tolist()[-10:],  # 返回最后10个信号
            "code": code
        }

        return {"status": "success", "strategy": strategy}
    except Exception as e:
        logger.error(f"生成策略失败：{e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    """健康检查"""
    try:
        # 检查数据库健康状态
        db_health = await check_database_health()

        # 计算服务运行时间（简化的实现）
        startup_time = getattr(health_check, '_startup_time', None)
        if startup_time is None:
            health_check._startup_time = datetime.now()
            startup_time = health_check._startup_time

        uptime_seconds = int((datetime.now() - startup_time).total_seconds())

        # 总体健康状态
        overall_healthy = all(db_health.values())

        return {
            "status": "healthy" if overall_healthy else "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "service": config.APP_NAME,
            "version": config.APP_VERSION,
            "uptime": f"{uptime_seconds}s",
            "database_health": db_health,
            "performance_target": {
                "ticks_per_second": config.MAX_TICK_RATE,
                "target_latency_ms": config.TARGET_LATENCY
            }
        }
    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

@app.get("/api/database/health")
async def database_health_check():
    """数据库健康检查（详细版）"""
    try:
        # 导入数据库监控器
        from db_monitor import DatabaseMonitor

        monitor = DatabaseMonitor()
        if await monitor.initialize():
            metrics = await monitor.collect_metrics()
            await monitor.close()

            return {
                "status": "success",
                "timestamp": datetime.now().isoformat(),
                "overall_status": metrics["summary"]["overall_status"],
                "performance_rating": metrics["summary"]["performance_rating"],
                "postgres": metrics["postgres"],
                "redis": metrics["redis"],
                "write_performance": metrics["write_performance"],
                "read_performance": metrics["read_performance"]
            }
        else:
            return {
                "status": "error",
                "message": "无法初始化数据库监控器",
                "timestamp": datetime.now().isoformat()
            }
    except Exception as e:
        logger.error(f"数据库健康检查失败: {e}")
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/api/database/stats")
async def database_stats():
    """获取数据库统计信息"""
    try:
        async with db_manager.acquire_postgres() as conn:
            # 基本统计
            total_ticks = await conn.fetchval("SELECT COUNT(*) FROM market_ticks")
            today_ticks = await conn.fetchval("""
                SELECT COUNT(*) FROM market_ticks
                WHERE time > NOW() - INTERVAL '1 day'
            """)
            last_hour_ticks = await conn.fetchval("""
                SELECT COUNT(*) FROM market_ticks
                WHERE time > NOW() - INTERVAL '1 hour'
            """)

            # 表大小
            db_size = await conn.fetchval(f"SELECT pg_database_size($1)", config.DB_NAME)

            # 连接信息
            connections = await conn.fetchval("""
                SELECT COUNT(*) FROM pg_stat_activity
                WHERE datname = $1
            """, config.DB_NAME)

            return {
                "status": "success",
                "timestamp": datetime.now().isoformat(),
                "statistics": {
                    "total_ticks": total_ticks,
                    "ticks_last_hour": last_hour_ticks,
                    "ticks_last_24h": today_ticks,
                    "database_size_bytes": db_size,
                    "database_size_human": f"{db_size / (1024*1024):.2f} MB",
                    "active_connections": connections
                }
            }
    except Exception as e:
        logger.error(f"获取数据库统计失败: {e}")
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/api/redis/info")
async def redis_info():
    """获取Redis信息"""
    try:
        async with db_manager.acquire_redis() as redis:
            info = await redis.info()
            keys_count = await redis.dbsize()

            return {
                "status": "success",
                "timestamp": datetime.now().isoformat(),
                "redis_info": {
                    "version": info.get('redis_version'),
                    "uptime_seconds": int(info.get('uptime_in_seconds', 0)),
                    "used_memory_human": info.get('used_memory_human', '0'),
                    "total_keys": keys_count,
                    "connected_clients": int(info.get('connected_clients', 0)),
                    "memory_usage_percent": float(info.get('used_memory', 0)) / float(info.get('maxmemory', 1) or 1) * 100
                }
            }
    except Exception as e:
        logger.error(f"获取Redis信息失败: {e}")
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/api/config")
async def get_config(token: dict = Depends(verify_token)):
    """获取系统配置"""
    return {
        "status": "success",
        "config": {
            "app": {
                "name": config.APP_NAME,
                "version": config.APP_VERSION,
                "description": config.APP_DESCRIPTION
            },
            "trading": {
                "symbol": config.SYMBOL,
                "timeframes": config.TIMEFRAMES,
                "default_timeframe": config.DEFAULT_TIMEFRAME,
                "data_precision": config.DATA_PRECISION
            },
            "performance": {
                "max_tick_rate": config.MAX_TICK_RATE,
                "target_latency": config.TARGET_LATENCY
            },
            "risk": {
                "max_drawdown": config.MAX_DRAWDOWN,
                "max_daily_loss": config.MAX_DAILY_LOSS,
                "position_size": config.POSITION_SIZE,
                "stop_loss": config.STOP_LOSS,
                "take_profit": config.TAKE_PROFIT
            }
        }
    }

@app.get("/api/gold/indicators")
async def get_gold_indicators(
    timeframe: str = "M1",
    limit: int = 100,
    token: dict = Depends(verify_token)
):
    """获取黄金专用指标"""
    try:
        # 这里应该从数据库或实时数据流获取数据
        # 目前返回模拟数据
        times = pd.date_range(end=datetime.now(), periods=limit, freq="1min")
        prices = np.random.uniform(2000, 2100, limit)

        data = pd.DataFrame({
            'close': prices
        }, index=times)

        from quant.indicators import TechnicalIndicators

        # 计算多种指标
        macd, macdsignal, _ = TechnicalIndicators.calculate_macd(data)
        rsi = TechnicalIndicators.calculate_rsi(data)
        upper, middle, lower = TechnicalIndicators.calculate_bollinger_bands(data)
        golden_indicators = TechnicalIndicators.calculate_golden_indicators(data)

        return {
            "status": "success",
            "indicators": {
                "timestamps": [t.isoformat() for t in times],
                "prices": prices.tolist(),
                "macd": macd.tolist()[-10:],
                "rsi": rsi.tolist()[-10:],
                "bollinger_upper": upper.tolist()[-10:],
                "bollinger_middle": middle.tolist()[-10:],
                "bollinger_lower": lower.tolist()[-10:],
                "gold_indicators": {
                    "volatility": golden_indicators['volatility'].tolist()[-10:],
                    "gap_factor": golden_indicators['gap_factor'].tolist()[-10:]
                }
            },
            "timeframe": timeframe,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"获取指标失败：{e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/auth/token")
async def generate_token():
    """生成测试令牌（仅限开发环境）"""
    if not config.API_DEBUG:
        raise HTTPException(status_code=403, detail="此端点仅在开发环境可用")

    # 生成测试令牌
    payload = {
        "sub": "tickgold_user",
        "role": "developer",
        "exp": datetime.now() + timedelta(hours=24)
    }

    token = jwt.encode(payload, config.SECRET_KEY, algorithm="HS256")

    return {
        "status": "success",
        "token": token,
        "expires_in": "24小时",
        "note": "该令牌仅用于开发和测试，生产环境请使用真实认证"
    }