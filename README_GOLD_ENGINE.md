# Tick Gold 黄金专用量化策略引擎

[中文] | [English](#tick-gold-gold-specific-quantitative-strategy-engine-english)

## 概述

专门针对XAUUSD黄金交易对设计的量化策略引擎，集成了黄金特有的交易特性、风险控制和性能优化。

## 核心特性

### 1. 黄金交易专用特性
- **跳空风险检测**: 1% gap_risk 限制 (超过1%跳空自动暂停交易)
- **隔夜风险管理**: 0.5% overnight_risk 限制 (仓位规模动态调整)
- **亚盘时段过滤**: UTC时间19:00-08:00时段自动调整策略参数
- **黄金波动率指标**: 自适应黄金价格行为特征的专用波动率计算
- **多时间框架协同**: M1/M5/M15/M30四周期协同策略

### 2. 严格的风险控制
- **最大回撤**: 2% (max_drawdown=0.02)
- **每日最大损失**: 0.5% (max_daily_loss=0.005)
- **头寸规模限制**: 1% (position_size=0.01)
- **实时风险监控**: 动态风险评估和预警

### 3. 高性能设计
- **处理能力**: 21,340+ ticks/sec (ULTRA性能认证目标)
- **延迟目标**: <50ms关键路径
- **数据质量**: 98.7%+监管级标准
- **内存效率**: 百万tick数据缓冲区实时分析

## 架构

```
tick-gold/src/
├── gold/                           # 黄金专用模块
│   ├── engine.py                  # 量化引擎主控制器
│   ├── strategies/                # 策略模块
│   │   ├── gold_strategies.py     # 基础黄金策略
│   │   ├── gold_volatility_engine.py  # 波动率引擎核心
│   │   └── gold_basic_strategy.py # 基础策略实现
│   ├── data/                      # 数据处理
│   │   └── gold_data.py           # 黄金数据处理器
│   └── execution/                 # 执行模块
│       └── gold_execution.py      # 交易执行器
├── config_manager.py              # 配置管理器
└── backend/python/
    └── gold_api.py                # FastAPI接口
```

## 快速开始

### 1. 环境设置

```bash
# 克隆项目
git clone <repository-url>

# 安装Python依赖
cd tick-gold
pip install -r requirements.txt  # 或根据项目结构安装

# 创建虚拟环境（可选）
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows
```

### 2. 运行演示

```bash
# 运行完整演示
python examples/gold_engine_demo.py

# 输出示例：
# ================================================
#       Tick Gold - XAUUSD黄金专用量化策略引擎演示
# ================================================
# 功能特性:
#  1. 黄金波动率自适应指标
#  2. 跳空风险检测（1% gap_risk）
#  3. 隔夜风险管理（0.5% overnight_risk）
#  4. 亚盘时段过滤（时区调整）
#  5. M1/M5/M15/M30多时间框架策略
#  6. 21,340+ ticks/sec性能目标
# ================================================
```

### 3. 启动API服务

```bash
# 启动黄金量化引擎API
cd src/backend/python
python -m uvicorn gold_api:app --reload --host 0.0.0.0 --port 8001

# API将在 http://localhost:8001 可用
# 文档: http://localhost:8001/docs
```

## API接口

| 端点 | 方法 | 描述 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/api/gold/status` | GET | 获取引擎状态 |
| `/api/gold/process-tick` | POST | 处理tick数据 |
| `/api/gold/strategy` | GET/POST | 获取/设置策略 |
| `/api/gold/performance` | GET | 获取性能报告 |
| `/api/gold/risk` | GET/PUT | 获取/更新风险参数 |
| `/api/gold/signals` | GET | 获取最新交易信号 |
| `/api/gold/statistics` | GET | 获取黄金交易统计数据 |
| `/api/gold/config` | GET | 获取引擎配置 |
| `/api/gold/timeframes/data` | GET | 获取时间框架数据 |

## 详细使用说明

### 1. 初始化引擎

```python
from gold.engine import GoldQuantEngine

# 初始化引擎
engine = GoldQuantEngine()

# 设置黄金专用策略
engine.set_strategy(
    strategy_name='gold_specific',
    timeframe='M1',
    parameters={
        'min_volatility': 0.001,
        'max_gap': 0.0005,
        'asian_session_adjustment': 0.7
    }
)

# 获取引擎状态
status = engine.get_engine_status()
```

### 2. 处理tick数据

```python
import asyncio

async def process_tick(tick_data):
    result = await engine.process_tick(tick_data)
    
    if result['status'] == 'success':
        signals = result.get('signals', {})
        combined_signal = signals.get('combined_signal', {})
        
        if combined_signal.get('signal', 0) != 0:
            direction = '买入' if combined_signal['signal'] > 0 else '卖出'
            confidence = combined_signal['confidence']
            print(f"信号: {direction}, 置信度: {confidence:.2f}")
            
            # 检查跳空风险
            gap_info = result.get('gap_risk', {})
            if not gap_info.get('exceeded', False):
                # 执行交易逻辑...
                pass

# 模拟tick数据
tick_data = {
    'timestamp': '2026-04-08T10:30:00Z',
    'bid': 2350.50,
    'ask': 2350.55,
    'volume': 100
}

asyncio.run(process_tick(tick_data))
```

### 3. 风险控制示例

```python
from gold.strategies.gold_volatility_engine import GoldVolatilityEngine

# 初始化波动率引擎
vol_engine = GoldVolatilityEngine()

# 1. 跳空风险检查
current_price = 2350.50
prev_close = 2325.25  # 1.08%跳空
exceeded, percent, info = vol_engine.detect_gap_risk(current_price, prev_close)

if exceeded:
    print(f"跳空风险超限: {percent:.2%} > 1%")
    print(f"执行动作: {info['action']}")
    # 自动暂停新交易，调整现有头寸

# 2. 隔夜风险评估
position_size = 100000  # 10万美元
current_volatility = 0.02  # 2%
risk, risk_info = vol_engine.calculate_overnight_risk(position_size, current_volatility)

if risk_info['risk_ratio'] > 0.8:
    print(f"隔夜风险预警: {risk_info['risk_ratio']:.1%}")
    # 考虑减少头寸或增加对冲

# 3. 动态头寸规模计算
account_size = 100000
signal_strength = 0.8
position_size = vol_engine.calculate_dynamic_position_size(
    account_size, current_volatility, signal_strength
)
print(f"计算头寸规模: ${position_size:.2f}")
```

### 4. 多时间框架策略

```python
import pandas as pd

# 准备多时间框架数据
timeframe_data = {
    'M1': m1_df,  # M1数据（DataFrame格式）
    'M5': m5_df,  # M5数据
    'M15': m15_df, # M15数据
    'M30': m30_df  # M30数据
}

# 生成多时间框架信号
signals = vol_engine.generate_multi_timeframe_signals(timeframe_data)

# 分析信号
combined_signal = signals['combined_signal']
print(f"综合信号: {combined_signal['signal']}")
print(f"置信度: {combined_signal['confidence']:.2f}")
print(f"贡献时间框架: {combined_signal['contributing_timeframes']}")

# 查看各时间框架详细信号
for timeframe, timeframe_signal in signals['timeframe_signals'].items():
    if timeframe_signal['signal'] != 0:
        print(f"{timeframe}: 信号={timeframe_signal['signal']}, "
              f"置信度={timeframe_signal['confidence']:.2f}, "
              f"波动率={timeframe_signal['indicators'].get('gold_volatility', 0):.4%}")
```

### 5. 亚盘时段过滤

```python
# 检查亚盘时段
from datetime import datetime
import pytz

timestamp = datetime.now(pytz.UTC)
is_asian = vol_engine.is_asian_trading_hour(pd.Timestamp(timestamp))

if is_asian:
    print("当前为亚盘时段，策略参数将自动调整")
    
    # 获取原始策略参数
    strategy_params = {
        'position_size': 0.01,
        'stop_loss': 0.005,
        'take_profit': 0.01,
        'risk_multiplier': 1.0
    }
    
    # 自动调整参数
    adjusted_params = vol_engine.adjust_strategy_for_asian_session(
        strategy_params, pd.Timestamp(timestamp)
    )
    
    print(f"亚盘调整后: 头寸规模={adjusted_params['position_size']:.2%}, "
          f"风险乘数={adjusted_params['risk_multiplier']:.1f}")
```

## 配置

### 主要配置文件

1. **app_config.json** (主要应用配置)
   ```json
   {
     "risk": {
       "max_drawdown": 0.02,
       "max_daily_loss": 0.005,
       "position_size": 0.01,
       "stop_loss": 0.005,
       "take_profit": 0.01,
       "gap_risk": 0.01,
       "overnight_risk": 0.005
     },
     "performance": {
       "target_throughput": 100000,
       "target_latency": 50,
       "compression_ratio": 10
     }
   }
   ```

2. **环境变量** (.env文件)
   ```bash
   # 数据库连接
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=tick_gold
   
   # Redis缓存
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=RedisPassword123
   
   # API配置
   API_HOST=0.0.0.0
   API_PORT=8001
   API_DEBUG=true
   ```

### 配置管理器使用

```python
from config_manager import ConfigManager

# 加载配置
config_manager = ConfigManager()
config = config_manager.load_config()

# 获取风险参数
risk_params = config_manager.get_risk_params()
print(f"跳空风险限制: {risk_params.get('gap_risk', 0.01):.1%}")

# 获取黄金专用参数
gold_params = config_manager.get_gold_params()

# 更新配置
config_manager.update_config({
    'risk': {
        'gap_risk': 0.008,  # 更新为0.8%
        'position_size': 0.015  # 更新为1.5%
    }
})
```

## 测试

### 运行单元测试

```bash
# 运行黄金引擎测试
pytest tests/unit/test_gold_volatility_engine.py -v

# 测试覆盖率
pytest tests/unit/test_gold_volatility_engine.py --cov=src/gold --cov-report=html

# 运行所有黄金相关测试
pytest tests/unit/ -k "gold" -v
```

### 主要测试内容

1. **黄金波动率指标测试**
   - 验证跳空风险检测准确性
   - 测试隔夜风险管理逻辑
   - 验证多时间框架信号生成

2. **风险控制测试**
   - 1%跳空风险限制验证
   - 0.5%隔夜风险限制测试
   - 亚盘时段过滤功能验证

3. **性能测试**
   - 吞吐量测试 (21,340+ ticks/sec)
   - 延迟测试 (<50ms关键路径)
   - 内存使用测试

## 集成指南

### 1. 集成到现有交易系统

```python
class TradingSystem:
    def __init__(self):
        # 初始化黄金量化引擎
        self.gold_engine = GoldQuantEngine()
        self.gold_engine.set_strategy('gold_specific', 'M1')
        
    async def on_tick(self, tick_data):
        # 处理tick数据
        result = await self.gold_engine.process_tick(tick_data)
        
        if result['status'] == 'success':
            # 执行交易决策
            signals = result.get('signals', {})
            execution_result = result.get('execution_result')
            
            if execution_result:
                await self.execute_trade(execution_result)
                
            # 更新风险监测
            self.update_risk_monitoring(result)
```

### 2. API集成示例

```python
import requests

# 检查API健康状态
response = requests.get('http://localhost:8001/health')
health_status = response.json()

# 获取引擎状态
response = requests.get('http://localhost:8001/api/gold/status')
engine_status = response.json()

# 处理tick数据
tick_data = {
    'timestamp': '2026-04-08T10:30:00Z',
    'bid': 2350.50,
    'ask': 2350.55,
    'volume': 100
}

response = requests.post('http://localhost:8001/api/gold/process-tick', 
                        json=tick_data)
result = response.json()
```

### 3. 前端集成建议

```javascript
// React示例
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function GoldTradingDashboard() {
  const [engineStatus, setEngineStatus] = useState(null);
  const [signals, setSignals] = useState([]);
  
  // 定时获取引擎状态
  useEffect(() => {
    const interval = setInterval(() => {
      axios.get('/api/gold/status')
        .then(response => setEngineStatus(response.data))
        .catch(error => console.error('获取状态失败:', error));
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  // 获取最新信号
  const fetchLatestSignals = async () => {
    try {
      const response = await axios.get('/api/gold/signals');
      setSignals(response.data.timeframe_signals);
    } catch (error) {
      console.error('获取信号失败:', error);
    }
  };
  
  // 渲染仪表板...
}
```

## 故障排除

### 常见问题

1. **导入错误**
   ```bash
   # 确保Python路径正确
   export PYTHONPATH=/path/to/tick-gold/src:$PYTHONPATH
   
   # 检查依赖安装
   pip install -r requirements.txt
   ```

2. **配置加载失败**
   - 检查 `config/app_config.json` 文件是否存在
   - 验证JSON格式是否正确
   - 确保有读取权限

3. **性能不达标**
   - 检查数据缓冲区大小
   - 验证多时间框架数据转换效率
   - 分析计算密集部分性能

4. **API服务无法启动**
   - 检查端口占用: `lsof -i :8001`
   - 验证依赖: `pip list | grep fastapi`
   - 查看日志: 检查日志文件或终端输出

### 调试建议

```python
# 启用详细日志
import logging
logging.basicConfig(level=logging.DEBUG)

# 性能分析
import cProfile
profiler = cProfile.Profile()
profiler.enable()

# ...运行代码...

profiler.disable()
profiler.print_stats(sort='time')
```

## 扩展开发

### 添加新策略

1. 在 `src/gold/strategies/` 目录下创建新策略文件
2. 继承或实现黄金策略接口
3. 集成黄金专用特性（跳空检测、亚盘过滤等）
4. 添加测试用例
5. 更新API接口

### 自定义指标

```python
class CustomGoldIndicator:
    """自定义黄金指标"""
    
    def calculate(self, prices: pd.Series, **kwargs):
        # 实现指标计算逻辑
        # 确保包含黄金特性处理
        pass
    
    def integrate_with_engine(self, engine: GoldVolatilityEngine):
        # 集成到现有引擎
        pass
```

### 贡献指南

1. 遵循项目编码规范
2. 添加详细的文档和注释
3. 提供完整的测试用例
4. 确保性能符合要求（21,340+ ticks/sec）
5. 提交前运行 `pytest` 确保测试通过

## 性能调优

### 关键性能指标

1. **吞吐量优化**
   - 异步处理tick数据
   - 批量数据更新
   - 缓存常用计算结果

2. **延迟优化**
   - 减少不必要的计算
   - 优化数据访问模式
   - 使用高效的数据结构

3. **内存优化**
   - 定期清理历史数据
   - 使用适当的数据类型
   - 监控内存使用情况

### 性能监控

```python
# 性能监控示例
async def monitor_performance(engine):
    while True:
        performance = engine.volatility_engine.evaluate_performance()
        
        # 检查关键指标
        if performance['throughput_ratio'] < 0.8:
            logging.warning(f"吞吐量低于目标: {performance['throughput_ratio']:.1%}")
            
        if performance['latency_ratio'] > 1.2:
            logging.warning(f"延迟高于目标: {performance['latency_ratio']:.1%}")
            
        # 记录性能数据
        log_performance_metrics(performance)
        
        await asyncio.sleep(60)  # 每60秒检查一次
```

## 许可证

本项目基于MIT许可证开源 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 支持

如有问题或建议，请：
1. 查看项目文档
2. 提交Issue
3. 参与讨论

---

**项目目标**: 提供专业级的XAUUSD黄金量化交易解决方案
**性能认证**: ULTRA 21,340+ ticks/sec
**最后更新**: 2026-04-08
**版本**: 1.0.0

# Tick Gold Gold-Specific Quantitative Strategy Engine (English)

## Overview

A quantitative strategy engine specifically designed for the XAUUSD gold trading pair, integrating gold-specific trading characteristics, risk controls, and performance optimizations.

## Core Features

### 1. Gold Trading Specific Features
- **Gap Risk Detection**: 1% gap_risk limit (automatically pauses trading when gap exceeds 1%)
- **Overnight Risk Management**: 0.5% overnight_risk limit (dynamic position size adjustment)
- **Asian Session Filtering**: Automatic strategy parameter adjustment during UTC 19:00-08:00
- **Gold Volatility Indicators**: Adaptive volatility calculations for gold price behavior
- **Multi-Timeframe Synchronization**: M1/M5/M15/M30 four-period coordinated strategies

### 2. Strict Risk Control
- **Maximum Drawdown**: 2% (max_drawdown=0.02)
- **Maximum Daily Loss**: 0.5% (max_daily_loss=0.005)
- **Position Size Limit**: 1% (position_size=0.01)
- **Real-Time Risk Monitoring**: Dynamic risk assessment and alerts

### 3. High-Performance Design
- **Processing Capability**: 21,340+ ticks/sec (ULTRA performance certification target)
- **Latency Target**: <50ms critical path
- **Data Quality**: 98.7%+ regulatory-grade standard
- **Memory Efficiency**: Real-time analysis with million-tick data buffer

## Quick Start

```bash
# Run demonstration
python examples/gold_engine_demo.py

# Start API service
cd src/backend/python
python -m uvicorn gold_api:app --reload --host 0.0.0.0 --port 8001
```

For detailed documentation in English, please refer to the codebase or request additional documentation.