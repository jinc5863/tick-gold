#!/usr/bin/env python3
"""
Tick Gold 量化交易系统 - 后端模拟服务器
提供REST API和WebSocket支持
"""

import asyncio
import json
import random
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# ==================== 数据模型定义 ====================

class TickData(BaseModel):
    symbol: str
    timestamp: str
    bid: float
    ask: float
    volume: float
    spread: float = 0.5

class PerformanceMetrics(BaseModel):
    tick_counter: int
    throughput_tps: float
    latency_ms: float
    uptime_seconds: int
    last_tick: str

class GoldIndicator(BaseModel):
    timestamp: str
    price: float
    macd: float
    macd_signal: float
    rsi: float
    bollinger_upper: float
    bollinger_middle: float
    bollinger_lower: float
    volatility: float
    gap_factor: float

class TradingSignal(BaseModel):
    id: str
    symbol: str
    direction: str  # BUY, SELL, HOLD
    confidence: float
    price: float
    stop_loss: float
    take_profit: float
    reason: str
    generated_at: str

class Order(BaseModel):
    id: str
    symbol: str
    side: str  # BUY, SELL
    price: float
    quantity: float
    status: str  # PENDING, FILLED, CANCELLED, REJECTED
    created_at: str
    updated_at: str

class StrategyDefinition(BaseModel):
    id: str
    name: str
    description: str
    parameters: List[Dict[str, Any]]
    timeframe: str
    symbol: str

# ==================== 模拟数据生成器 ====================

class DataGenerator:
    """模拟数据生成器"""

    def __init__(self):
        self.base_price = 2050.0
        self.tick_counter = 10000
        self.start_time = time.time()

    def generate_tick(self) -> TickData:
        """生成tick数据"""
        price_change = (random.random() - 0.5) * 2
        self.base_price += price_change

        return TickData(
            symbol="XAUUSD",
            timestamp=datetime.utcnow().isoformat(),
            bid=self.base_price - 0.5,
            ask=self.base_price + 0.5,
            volume=random.random() * 10,
            spread=0.5
        )

    def generate_indicators(self, count: int = 100) -> List[GoldIndicator]:
        """生成黄金指标数据"""
        indicators = []
        now = datetime.utcnow()
        base_price = self.base_price

        for i in range(count):
            time_offset = (count - i - 1) * 60  # 1分钟间隔
            timestamp = (now - timedelta(seconds=time_offset)).isoformat()

            # 模拟价格序列
            price_change = (random.random() - 0.5) * 5
            price = base_price + price_change * (i / count)

            # 技术指标
            macd = (random.random() - 0.5) * 2
            macd_signal = macd * 0.8 + random.random() * 0.4 - 0.2
            rsi = 50 + (random.random() - 0.5) * 20
            volatility = random.random() * 0.02

            indicators.append(GoldIndicator(
                timestamp=timestamp,
                price=price,
                macd=macd,
                macd_signal=macd_signal,
                rsi=rsi,
                bollinger_upper=price * 1.01,
                bollinger_middle=price,
                bollinger_lower=price * 0.99,
                volatility=volatility,
                gap_factor=random.random() * 0.001
            ))

        return indicators

    def generate_signal(self) -> TradingSignal:
        """生成交易信号"""
        directions = ["BUY", "SELL", "HOLD"]
        direction = random.choice(directions)

        return TradingSignal(
            id=f"signal_{int(time.time())}",
            symbol="XAUUSD",
            direction=direction,
            confidence=0.6 + random.random() * 0.3,
            price=self.base_price + (random.random() - 0.5) * 5,
            stop_loss=self.base_price - 5,
            take_profit=self.base_price + 8,
            reason=f"MACD + RSI信号组合",
            generated_at=datetime.utcnow().isoformat()
        )

    def generate_performance_metrics(self) -> PerformanceMetrics:
        """生成性能指标"""
        self.tick_counter += random.randint(10, 50)

        return PerformanceMetrics(
            tick_counter=self.tick_counter,
            throughput_tps=21340 + random.random() * 1000,
            latency_ms=random.random() * 20 + 10,
            uptime_seconds=int(time.time() - self.start_time),
            last_tick=datetime.utcnow().isoformat()
        )

# ==================== FastAPI应用程序 ====================

app = FastAPI(
    title="Tick Gold API",
    description="量化交易系统后端API",
    version="0.1.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420", "http://localhost:1421"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

data_gen = DataGenerator()

# ==================== REST API端点 ====================

@app.get("/")
async def root():
    return {
        "service": "Tick Gold Backend API",
        "version": "0.1.0",
        "status": "running"
    }

@app.get("/api/auth/token")
async def get_dev_token():
    """获取开发令牌（仅开发环境）"""
    return {
        "token": "dev-token-" + str(int(time.time())),
        "user_id": "dev-user",
        "permissions": ["read", "write", "trade", "admin"],
        "expires_in": 3600
    }

@app.post("/api/tick")
async def send_tick(tick_data: TickData):
    """接收tick数据"""
    print(f"收到Tick数据: {tick_data.symbol} ${tick_data.bid:.2f}")
    return {"status": "success", "message": "Tick数据已接收"}

@app.get("/api/indicators/gold")
async def get_gold_indicators(timeframe: str = "M1", count: int = 100):
    """获取黄金指标数据"""
    indicators = data_gen.generate_indicators(count)

    # 提取各个指标序列
    timestamps = [ind.timestamp for ind in indicators]
    prices = [ind.price for ind in indicators]
    macd = [ind.macd for ind in indicators]
    rsi = [ind.rsi for ind in indicators]
    bollinger_upper = [ind.bollinger_upper for ind in indicators]
    bollinger_middle = [ind.bollinger_middle for ind in indicators]
    bollinger_lower = [ind.bollinger_lower for ind in indicators]

    return {
        "indicators": {
            "timestamps": timestamps,
            "prices": prices,
            "macd": macd,
            "macd_signal": [ind.macd_signal for ind in indicators],
            "rsi": rsi,
            "bollinger_upper": bollinger_upper,
            "bollinger_middle": bollinger_middle,
            "bollinger_lower": bollinger_lower,
            "gold_indicators": {
                "volatility": [ind.volatility for ind in indicators],
                "gap_factor": [ind.gap_factor for ind in indicators]
            }
        }
    }

@app.get("/api/performance/metrics")
async def get_performance_metrics():
    """获取性能指标"""
    metrics = data_gen.generate_performance_metrics()
    return {"metrics": metrics}

@app.get("/api/strategy")
async def get_strategies():
    """获取策略列表"""
    strategies = [
        StrategyDefinition(
            id="scalping_m1",
            name="黄金剥头皮策略",
            description="针对黄金高频交易的剥头皮策略",
            parameters=[
                {"name": "fastperiod", "type": "number", "defaultValue": 12, "min": 5, "max": 50, "step": 1, "description": "MACD快速周期"},
                {"name": "slowperiod", "type": "number", "defaultValue": 26, "min": 15, "max": 100, "step": 1, "description": "MACD慢速周期"},
                {"name": "signalperiod", "type": "number", "defaultValue": 9, "min": 5, "max": 30, "step": 1, "description": "MACD信号周期"},
                {"name": "rsi_period", "type": "number", "defaultValue": 14, "min": 5, "max": 30, "step": 1, "description": "RSI周期"},
                {"name": "rsi_overbought", "type": "number", "defaultValue": 70, "min": 60, "max": 90, "step": 1, "description": "RSI超买阈值"},
                {"name": "rsi_oversold", "type": "number", "defaultValue": 30, "min": 10, "max": 40, "step": 1, "description": "RSI超卖阈值"},
            ],
            timeframe="M1",
            symbol="XAUUSD"
        ),
        StrategyDefinition(
            id="trend_following_m5",
            name="黄金趋势跟踪策略",
            description="基于趋势线突破的黄金中频交易策略",
            parameters=[
                {"name": "trend_period", "type": "number", "defaultValue": 20, "min": 10, "max": 100, "step": 1, "description": "趋势周期"},
                {"name": "breakout_threshold", "type": "number", "defaultValue": 0.5, "min": 0.1, "max": 2.0, "step": 0.1, "description": "突破阈值"},
                {"name": "stop_loss_pips", "type": "number", "defaultValue": 30, "min": 10, "max": 100, "step": 5, "description": "止损点数"},
                {"name": "take_profit_ratio", "type": "number", "defaultValue": 2.0, "min": 1.0, "max": 5.0, "step": 0.5, "description": "止盈比例"},
                {"name": "volume_filter", "type": "boolean", "defaultValue": True, "description": "成交量过滤器"},
            ],
            timeframe="M5",
            symbol="XAUUSD"
        ),
        StrategyDefinition(
            id="mean_reversion_m15",
            name="黄金均值回归策略",
            description="基于布林带和RSI的均值回归策略",
            parameters=[
                {"name": "bollinger_period", "type": "number", "defaultValue": 20, "min": 10, "max": 50, "step": 1, "description": "布林带周期"},
                {"name": "std_dev", "type": "number", "defaultValue": 2.0, "min": 1.0, "max": 3.0, "step": 0.1, "description": "标准差倍数"},
                {"name": "rsi_period", "type": "number", "defaultValue": 14, "min": 7, "max": 30, "step": 1, "description": "RSI周期"},
                {"name": "entry_rsi", "type": "number", "defaultValue": 30, "min": 20, "max": 40, "step": 1, "description": "入场RSI阈值"},
                {"name": "exit_rsi", "type": "number", "defaultValue": 50, "min": 40, "max": 60, "step": 1, "description": "出场RSI阈值"},
            ],
            timeframe="M15",
            symbol="XAUUSD"
        )
    ]

    return {"strategies": strategies}

@app.post("/api/strategy")
async def generate_strategy(symbol: str = "XAUUSD", timeframe: str = "M1", parameters: Dict[str, Any] = {}):
    """生成策略代码"""
    strategy_code = f"""
#!/usr/bin/env python3

# Tick Gold 量化策略 - {symbol} {timeframe}
# 生成时间: {datetime.utcnow().isoformat()}

import talib
import numpy as np

class GoldStrategy:
    def __init__(self):
        self.symbol = "{symbol}"
        self.timeframe = "{timeframe}"

        # 策略参数
        self.parameters = {parameters}

    def calculate_signals(self, data):
        '''计算交易信号'''
        # 技术指标计算
        close_prices = np.array(data['close'])

        # MACD指标
        macd, macd_signal, macd_hist = talib.MACD(
            close_prices,
            fastperiod=self.parameters.get('fastperiod', 12),
            slowperiod=self.parameters.get('slowperiod', 26),
            signalperiod=self.parameters.get('signalperiod', 9)
        )

        # RSI指标
        rsi = talib.RSI(close_prices, self.parameters.get('rsi_period', 14))

        # 布林带
        upper, middle, lower = talib.BBANDS(
            close_prices,
            timeperiod=self.parameters.get('bollinger_period', 20),
            nbdevup=self.parameters.get('std_dev', 2.0),
            nbdevdn=self.parameters.get('std_dev', 2.0)
        )

        # 信号生成逻辑
        signals = []
        latest_price = close_prices[-1]

        # MACD金叉 + RSI超卖 -> 买入信号
        if macd[-1] > macd_signal[-1] and macd[-2] <= macd_signal[-2]:
            if rsi[-1] < self.parameters.get('entry_rsi', 30):
                signals.append({'side': 'BUY', 'confidence': 0.7})

        # 布林带下轨支撑 -> 买入信号
        if latest_price <= lower[-1]:
            signals.append({'side': 'BUY', 'confidence': 0.6})

        # MACD死叉 + RSI超买 -> 卖出信号
        if macd[-1] < macd_signal[-1] and macd[-2] >= macd_signal[-2]:
            if rsi[-1] > 70:
                signals.append({'side': 'SELL', 'confidence': 0.7})

        # 布林带上轨阻力 -> 卖出信号
        if latest_price >= upper[-1]:
            signals.append({'side': 'SELL', 'confidence': 0.6})

        return signals

    def risk_management(self, position_size, current_pnl):
        '''风险管理'''
        max_daily_loss = self.parameters.get('max_daily_loss', 2.0) / 100
        stop_loss_pips = self.parameters.get('stop_loss_pips', 30)

        if current_pnl < -max_daily_loss:
            return 'STOP_TRADING'

        return position_size * 0.1  # 建议仓位大小
"""

    return {
        "strategy": {
            "symbol": symbol,
            "timeframe": timeframe,
            "parameters": parameters,
            "code": strategy_code
        }
    }

@app.get("/api/health")
async def check_health():
    """健康检查"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# ==================== WebSocket端点 ====================

class ConnectionManager:
    """WebSocket连接管理器"""
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"新的WebSocket连接，当前连接数: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"WebSocket断开连接，剩余连接数: {len(self.active_connections)}")

    async def broadcast_tick(self, tick_data: dict):
        """广播tick数据"""
        if self.active_connections:
            message = json.dumps({
                "type": "tick",
                "data": tick_data
            })

            disconnected = []
            for connection in self.active_connections:
                try:
                    await connection.send_text(message)
                except:
                    disconnected.append(connection)

            # 清理断开的连接
            for connection in disconnected:
                self.disconnect(connection)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)

    try:
        while True:
            # 接收客户端消息
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                message = json.loads(data)

                if message.get("type") == "subscribe_ticks":
                    # 开始发送tick数据
                    print(f"客户端订阅tick数据")

            except asyncio.TimeoutError:
                # 定期发送tick数据
                tick = data_gen.generate_tick()
                await websocket.send_text(json.dumps({
                    "type": "tick",
                    "data": tick.dict()
                }))

                await asyncio.sleep(1)  # 每秒发送一次

    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ==================== 数据推送任务 ====================

async def broadcast_ticks():
    """定期广播tick数据"""
    while True:
        if manager.active_connections:
            tick = data_gen.generate_tick()
            await manager.broadcast_tick(tick.dict())

        await asyncio.sleep(1)

# ==================== 应用程序启动 ====================

@app.on_event("startup")
async def startup_event():
    """应用启动时执行"""
    print("Tick Gold后端服务器启动...")
    print(f"API文档: http://localhost:8000/docs")
    print(f"健康检查: http://localhost:8000/api/health")
    print(f"WebSocket: ws://localhost:8000/ws")

    # 启动tick广播任务
    asyncio.create_task(broadcast_ticks())

if __name__ == "__main__":
    uvicorn.run(
        "mock_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )