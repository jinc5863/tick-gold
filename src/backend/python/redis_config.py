"""
Tick Gold Redis缓存配置
专为黄金量化交易优化的缓存策略，支持高频数据访问
"""

from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timedelta
import logging
import orjson

from .config import config
from .database import db_manager

logger = logging.getLogger(__name__)


class RedisCacheManager:
    """Redis缓存管理器"""

    # Redis键前缀
    PREFIX_TICK = "tick"
    PREFIX_OHLC = "ohlc"
    PREFIX_SIGNAL = "signal"
    PREFIX_POSITION = "position"
    PREFIX_RISK = "risk"
    PREFIX_PERFORMANCE = "perf"
    PREFIX_SESSION = "session"
    PREFIX_CONFIG = "config"

    def __init__(self):
        self.redis = None

    async def initialize(self):
        """初始化Redis连接"""
        self.redis = await db_manager.acquire_redis().__aenter__()

    async def close(self):
        """关闭Redis连接"""
        if self.redis:
            await self.redis.close()

    # ==================== 实时tick数据缓存 ====================

    async def cache_realtime_tick(self, symbol: str, tick_data: Dict[str, Any]):
        """
        缓存实时tick数据

        Args:
            symbol: 交易品种（如XAUUSD）
            tick_data: tick数据字典
        """
        try:
            key = f"{self.PREFIX_TICK}:realtime:{symbol}"
            cache_data = {
                **tick_data,
                'cached_at': datetime.utcnow().isoformat()
            }

            # 序列化并存储
            data_json = orjson.dumps(cache_data)
            await self.redis.setex(key, 5, data_json)  # 5秒过期，保持最新

            # 更新最后价格
            await self.redis.hset(
                f"{self.PREFIX_TICK}:latest:{symbol}",
                mapping={
                    'bid': str(tick_data.get('bid', 0)),
                    'ask': str(tick_data.get('ask', 0)),
                    'time': tick_data.get('time', ''),
                    'volume': str(tick_data.get('volume', 0)),
                    'spread': str(tick_data.get('spread', 0))
                }
            )

            logger.debug(f"缓存实时tick: {symbol} {tick_data.get('bid')}/{tick_data.get('ask')}")

        except Exception as e:
            logger.error(f"缓存实时tick失败: {e}")

    async def get_realtime_tick(self, symbol: str) -> Optional[Dict[str, Any]]:
        """获取缓存的实时tick数据"""
        try:
            key = f"{self.PREFIX_TICK}:realtime:{symbol}"
            data_json = await self.redis.get(key)

            if data_json:
                data = orjson.loads(data_json)

                # 检查是否过期（超过5秒）
                cached_at = datetime.fromisoformat(data.get('cached_at', '2000-01-01'))
                age = datetime.utcnow() - cached_at

                if age.total_seconds() < 5:
                    return data

            # 如果实时tick不存在或过期，返回最后价格
            return await self.get_last_price(symbol)

        except Exception as e:
            logger.error(f"获取实时tick失败: {e}")
            return None

    async def get_last_price(self, symbol: str) -> Optional[Dict[str, Any]]:
        """获取最后价格"""
        try:
            key = f"{self.PREFIX_TICK}:latest:{symbol}"
            data = await self.redis.hgetall(key)

            if data:
                return {
                    'bid': float(data.get('bid', 0)),
                    'ask': float(data.get('ask', 0)),
                    'time': data.get('time', ''),
                    'volume': int(data.get('volume', 0)),
                    'spread': float(data.get('spread', 0)),
                    'source': 'redis_cache'
                }
        except Exception as e:
            logger.error(f"获取最后价格失败: {e}")

        return None

    async def cache_tick_buffer(self, symbol: str, ticks: List[Dict[str, Any]]):
        """缓存tick缓冲区"""
        try:
            key = f"{self.PREFIX_TICK}:buffer:{symbol}"

            # 只保留最近1000个tick
            buffer_data = ticks[-1000:] if len(ticks) > 1000 else ticks
            buffer_data = [{
                **tick,
                'cached_at': datetime.utcnow().isoformat()
            } for tick in buffer_data]

            data_json = orjson.dumps(buffer_data)
            await self.redis.setex(key, 60, data_json)  # 60秒过期

            logger.debug(f"缓存tick缓冲区: {symbol} {len(buffer_data)}条")

        except Exception as e:
            logger.error(f"缓存tick缓冲区失败: {e}")

    # ==================== OHLC数据缓存 ====================

    async def cache_ohlc_data(
        self,
        symbol: str,
        timeframe: str,
        ohlc_data: List[Dict[str, Any]],
        cache_minutes: int = 5
    ):
        """缓存OHLC数据"""
        try:
            key = f"{self.PREFIX_OHLC}:{symbol}:{timeframe}"

            data_json = orjson.dumps(ohlc_data)
            await self.redis.setex(key, cache_minutes * 60, data_json)

            # 更新元数据
            metadata_key = f"{self.PREFIX_OHLC}:metadata:{symbol}:{timeframe}"
            if ohlc_data:
                latest_bar = ohlc_data[-1]
                await self.redis.hset(
                    metadata_key,
                    mapping={
                        'last_update': datetime.utcnow().isoformat(),
                        'count': str(len(ohlc_data)),
                        'latest_time': latest_bar.get('time', ''),
                        'latest_close': str(latest_bar.get('close', 0))
                    }
                )

            logger.debug(f"缓存OHLC数据: {symbol} {timeframe} {len(ohlc_data)}条")

        except Exception as e:
            logger.error(f"缓存OHLC数据失败: {e}")

    async def get_cached_ohlc(
        self,
        symbol: str,
        timeframe: str
    ) -> Optional[List[Dict[str, Any]]]:
        """获取缓存的OHLC数据"""
        try:
            key = f"{self.PREFIX_OHLC}:{symbol}:{timeframe}"
            data_json = await self.redis.get(key)

            if data_json:
                return orjson.loads(data_json)

        except Exception as e:
            logger.error(f"获取缓存的OHLC数据失败: {e}")

        return None

    # ==================== 策略信号缓存 ====================

    async def cache_strategy_signal(self, signal_data: Dict[str, Any]):
        """缓存策略信号"""
        try:
            strategy_id = signal_data.get('strategy_id', 'unknown')
            signal_time = signal_data.get('time', datetime.utcnow().isoformat()[:19])

            # 单个信号缓存
            signal_key = f"{self.PREFIX_SIGNAL}:latest:{strategy_id}"
            data_json = orjson.dumps(signal_data)
            await self.redis.setex(signal_key, 300, data_json)  # 5分钟

            # 添加到信号列表
            list_key = f"{self.PREFIX_SIGNAL}:history:{strategy_id}"
            await self.redis.lpush(list_key, data_json)
            await self.redis.ltrim(list_key, 0, 99)  # 保留最近100个信号
            await self.redis.expire(list_key, 3600)  # 1小时过期

            logger.debug(f"缓存策略信号: {strategy_id} {signal_time}")

        except Exception as e:
            logger.error(f"缓存策略信号失败: {e}")

    async def get_latest_signal(self, strategy_id: str) -> Optional[Dict[str, Any]]:
        """获取最新策略信号"""
        try:
            key = f"{self.PREFIX_SIGNAL}:latest:{strategy_id}"
            data_json = await self.redis.get(key)

            if data_json:
                return orjson.loads(data_json)

        except Exception as e:
            logger.error(f"获取最新策略信号失败: {e}")

        return None

    async def get_signal_history(
        self,
        strategy_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """获取信号历史"""
        try:
            key = f"{self.PREFIX_SIGNAL}:history:{strategy_id}"
            data_list = await self.redis.lrange(key, 0, limit - 1)

            signals = []
            for data_json in data_list:
                try:
                    signal = orjson.loads(data_json)
                    signals.append(signal)
                except Exception:
                    continue

            return signals

        except Exception as e:
            logger.error(f"获取信号历史失败: {e}")
            return []

    # ==================== 持仓管理缓存 ====================

    async def cache_open_positions(self, positions: List[Dict[str, Any]]):
        """缓存开仓持仓"""
        try:
            key = f"{self.PREFIX_POSITION}:open"

            data_json = orjson.dumps(positions)
            await self.redis.setex(key, 30, data_json)  # 30秒

            # 更新每个持仓的独立缓存
            for position in positions:
                position_id = position.get('position_id')
                if position_id:
                    position_key = f"{self.PREFIX_POSITION}:open:{position_id}"
                    await self.redis.setex(position_key, 60, orjson.dumps(position))

            logger.debug(f"缓存开仓持仓: {len(positions)}个")

        except Exception as e:
            logger.error(f"缓存持仓失败: {e}")

    async def get_cached_open_positions(self) -> List[Dict[str, Any]]:
        """获取缓存的持仓"""
        try:
            key = f"{self.PREFIX_POSITION}:open"
            data_json = await self.redis.get(key)

            if data_json:
                return orjson.loads(data_json)

        except Exception as e:
            logger.error(f"获取缓存的持仓失败: {e}")

        return []

    # ==================== 风险管理缓存 ====================

    async def cache_risk_metrics(self, metrics: Dict[str, Any]):
        """缓存风险指标"""
        try:
            key = f"{self.PREFIX_RISK}:latest"

            # 添加时间戳
            metrics['cached_at'] = datetime.utcnow().isoformat()
            data_json = orjson.dumps(metrics)

            await self.redis.setex(key, 10, data_json)  # 10秒，高频更新

            # 高风险警告特殊处理
            if metrics.get('risk_level') in ['HIGH', 'CRITICAL']:
                alert_key = f"{self.PREFIX_RISK}:alerts:active"
                await self.redis.sadd(alert_key, key)
                await self.redis.expire(alert_key, 3600)  # 1小时

            logger.debug(f"缓存风险指标: {metrics.get('risk_level', 'UNKNOWN')}")

        except Exception as e:
            logger.error(f"缓存风险指标失败: {e}")

    async def get_cached_risk_metrics(self) -> Optional[Dict[str, Any]]:
        """获取缓存的指标"""
        try:
            key = f"{self.PREFIX_RISK}:latest"
            data_json = await self.redis.get(key)

            if data_json:
                return orjson.loads(data_json)

        except Exception as e:
            logger.error(f"获取缓存的指标失败: {e}")

        return None

    # ==================== 黄金特定风险缓存 ====================

    async def cache_gold_risks(self, symbol: str, risk_data: Dict[str, Any]):
        """缓存黄金特定风险"""
        try:
            key = f"{self.PREFIX_RISK}:gold:{symbol}"

            risk_data['last_check'] = datetime.utcnow().isoformat()
            data_json = orjson.dumps(risk_data)

            # 高风险级别缓存时间更短
            if risk_data.get('gap_breach_threshold') or risk_data.get('overnight_breach'):
                expire_seconds = 5
            else:
                expire_seconds = 30

            await self.redis.setex(key, expire_seconds, data_json)

            logger.debug(f"缓存黄金风险: {symbol} gap={risk_data.get('gap_breach_threshold')}")

        except Exception as e:
            logger.error(f"缓存黄金风险失败: {e}")

    async def get_cached_gold_risks(self, symbol: str) -> Optional[Dict[str, Any]]:
        """获取缓存的黄金风险"""
        try:
            key = f"{self.PREFIX_RISK}:gold:{symbol}"
            data_json = await self.redis.get(key)

            if data_json:
                return orjson.loads(data_json)

        except Exception as e:
            logger.error(f"获取缓存的黄金风险失败: {e}")

        return None

    # ==================== 性能监控缓存 ====================

    async def cache_performance_metrics(self, metrics: Dict[str, float]):
        """缓存性能指标"""
        try:
            timestamp = datetime.utcnow().isoformat()[:19]

            for metric_name, value in metrics.items():
                # 存储最新值
                latest_key = f"{self.PREFIX_PERFORMANCE}:latest:{metric_name}"
                await self.redis.setex(latest_key, 60, str(value))

                # 添加到时间序列
                timeseries_key = f"{self.PREFIX_PERFORMANCE}:timeseries:{metric_name}"
                await self.redis.zadd(
                    timeseries_key,
                    {timestamp: value}
                )

                # 保留最近1小时的数据
                old_cutoff = (datetime.utcnow() - timedelta(hours=1)).isoformat()[:19]
                await self.redis.zremrangebyscore(timeseries_key, '-inf', old_cutoff)

            logger.debug(f"缓存性能指标: {len(metrics)}个")

        except Exception as e:
            logger.error(f"缓存性能指标失败: {e}")

    async def get_latest_performance(self, metric_name: str) -> Optional[float]:
        """获取最新性能指标"""
        try:
            key = f"{self.PREFIX_PERFORMANCE}:latest:{metric_name}"
            value_str = await self.redis.get(key)

            if value_str:
                return float(value_str)

        except Exception as e:
            logger.error(f"获取性能指标失败: {e}")

        return None

    # ==================== 会话状态缓存 ====================

    async def cache_user_session(
        self,
        session_id: str,
        user_data: Dict[str, Any],
        expire_minutes: int = 30
    ):
        """缓存用户会话"""
        try:
            key = f"{self.PREFIX_SESSION}:{session_id}"

            user_data['last_activity'] = datetime.utcnow().isoformat()
            data_json = orjson.dumps(user_data)

            await self.redis.setex(key, expire_minutes * 60, data_json)

            logger.debug(f"缓存用户会话: {session_id}")

        except Exception as e:
            logger.error(f"缓存用户会话失败: {e}")

    async def get_user_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """获取用户会话"""
        try:
            key = f"{self.PREFIX_SESSION}:{session_id}"
            data_json = await self.redis.get(key)

            if data_json:
                return orjson.loads(data_json)

        except Exception as e:
            logger.error(f"获取用户会话失败: {e}")

        return None

    # ==================== 配置缓存 ====================

    async def cache_trading_config(
        self,
        user_id: str,
        config_data: Dict[str, Any]
    ):
        """缓存交易配置"""
        try:
            key = f"{self.PREFIX_CONFIG}:trading:{user_id}"

            config_data['updated_at'] = datetime.utcnow().isoformat()
            data_json = orjson.dumps(config_data)

            await self.redis.setex(key, 3600, data_json)  # 1小时

            logger.debug(f"缓存交易配置: {user_id}")

        except Exception as e:
            logger.error(f"缓存交易配置失败: {e}")

    async def get_cached_trading_config(
        self,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """获取缓存的交易配置"""
        try:
            key = f"{self.PREFIX_CONFIG}:trading:{user_id}"
            data_json = await self.redis.get(key)

            if data_json:
                return orjson.loads(data_json)

        except Exception as e:
            logger.error(f"获取缓存的交易配置失败: {e}")

        return None

    # ==================== Redis健康检查 ====================

    async def health_check(self) -> Dict[str, bool]:
        """Redis健康检查"""
        health = {
            "connected": False,
            "ping": False,
            "memory_ok": False,
            "info": {}
        }

        try:
            # 测试连接
            await self.redis.ping()
            health["ping"] = True

            # 获取Redis信息
            info_str = await self.redis.info()
            health["info"] = info_str

            # 检查内存使用
            used_memory = int(info_str.get('used_memory', 0))
            max_memory = int(info_str.get('maxmemory', 0))

            if max_memory > 0:
                memory_ratio = used_memory / max_memory
                health["memory_ok"] = memory_ratio < 0.8  # 内存使用率低于80%
            else:
                health["memory_ok"] = True

            health["connected"] = health["ping"] and health["memory_ok"]

            logger.info(f"Redis健康检查: 连接={health['connected']}, 内存使用率={used_memory}/{max_memory}")

        except Exception as e:
            logger.error(f"Redis健康检查失败: {e}")

        return health

    # ==================== 清理过期缓存 ====================

    async def cleanup_old_cache(self):
        """清理过期缓存"""
        try:
            # 不需要手动清理，Redis会自动处理过期键
            # 但可以清理一些自定义的过期数据结构
            pass

        except Exception as e:
            logger.error(f"清理过期缓存失败: {e}")

    # ==================== 缓存统计 ====================

    async def get_cache_stats(self) -> Dict[str, any]:
        """获取缓存统计信息"""
        try:
            stats = {
                "keys_count": 0,
                "memory_usage_bytes": 0,
                "hits": 0,
                "misses": 0
            }

            # 获取键数量（只统计我们的前缀）
            keys = await self.redis.keys(f"{self.PREFIX_TICK}:*")
            stats["keys_count"] = len(keys)

            # 获取内存使用信息
            info = await self.redis.info()
            stats["memory_usage_bytes"] = int(info.get('used_memory', 0))

            return stats

        except Exception as e:
            logger.error(f"获取缓存统计失败: {e}")
            return {}


# ==================== 全局缓存管理器 ====================

cache_manager = RedisCacheManager()


async def init_cache():
    """初始化缓存管理器"""
    await cache_manager.initialize()


async def close_cache():
    """关闭缓存管理器"""
    await cache_manager.close()