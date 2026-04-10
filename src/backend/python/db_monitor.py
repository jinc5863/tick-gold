#!/usr/bin/env python3
"""
Tick Gold数据库监控脚本
实时监控数据库健康状态和性能指标
"""
import asyncio
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import statistics

import asyncpg
import aioredis

from .config import config

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DatabaseMonitor:
    """数据库监控器"""

    def __init__(self):
        self.db_pool: Optional[asyncpg.Pool] = None
        self.redis: Optional[aioredis.Redis] = None
        self.metrics_buffer = []

    async def initialize(self):
        """初始化监控器连接"""
        try:
            # PostgreSQL连接池
            self.db_pool = await asyncpg.create_pool(
                dsn=config.DATABASE_URL,
                min_size=2,
                max_size=5,
                timeout=10.0,
                command_timeout=5.0
            )

            # Redis连接
            self.redis = await aioredis.from_url(
                config.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                max_connections=5
            )

            logger.info("数据库监控器初始化完成")
            return True
        except Exception as e:
            logger.error(f"监控器初始化失败: {e}")
            return False

    async def close(self):
        """关闭监控器连接"""
        if self.db_pool:
            await self.db_pool.close()
        if self.redis:
            await self.redis.close()

    async def check_postgres_health(self) -> Dict[str, Any]:
        """检查PostgreSQL健康状态"""
        health = {
            "status": "unhealthy",
            "checks": {},
            "metrics": {},
            "timestamp": datetime.utcnow().isoformat()
        }

        try:
            async with self.db_pool.acquire() as conn:
                # 1. 基本连接检查
                start_time = time.perf_counter()
                result = await conn.fetchval("SELECT 1")
                latency = (time.perf_counter() - start_time) * 1000  # ms

                health["checks"]["connection"] = result == 1
                health["metrics"]["connection_latency_ms"] = latency

                # 2. 数据库大小检查
                db_size_bytes = await conn.fetchval("""
                    SELECT pg_database_size($1)
                """, config.DB_NAME)

                health["metrics"]["database_size_bytes"] = db_size_bytes
                health["metrics"]["database_size_human"] = self._format_bytes(db_size_bytes)

                # 3. 活跃连接数
                active_connections = await conn.fetchval("""
                    SELECT COUNT(*) FROM pg_stat_activity
                    WHERE datname = $1
                """, config.DB_NAME)

                health["metrics"]["active_connections"] = active_connections

                # 4. 检查主要表是否存在
                tables_to_check = [
                    "market_ticks", "ohlc_data", "strategy_signals",
                    "trading_positions", "risk_metrics", "performance_metrics"
                ]

                tables_status = {}
                for table in tables_to_check:
                    exists = await conn.fetchval("""
                        SELECT EXISTS(
                            SELECT 1 FROM information_schema.tables
                            WHERE table_name = $1
                        )
                    """, table)
                    tables_status[table] = bool(exists)

                health["checks"]["tables_exist"] = tables_status

                # 5. TimescaleDB特定检查
                hypertables = await conn.fetchval("""
                    SELECT COUNT(*) FROM timescaledb_information.hypertables
                """)

                health["metrics"]["hypertables_count"] = hypertables

                # 6. tick数据统计（最近1分钟）
                recent_ticks = await conn.fetchval("""
                    SELECT COUNT(*)
                    FROM market_ticks
                    WHERE time > NOW() - INTERVAL '1 minute'
                """) or 0

                health["metrics"]["ticks_last_minute"] = recent_ticks

                # 7. 检查是否有锁定问题
                locks_count = await conn.fetchval("""
                    SELECT COUNT(*) FROM pg_locks
                """) or 0

                health["metrics"]["active_locks"] = locks_count

                # 8. 更新健康状态
                all_checks_passed = all([
                    health["checks"]["connection"],
                    all(tables_status.values()),
                    hypertables > 0,
                    latency < 100  # 连接延迟小于100ms
                ])

                health["status"] = "healthy" if all_checks_passed else "unhealthy"

            logger.debug(f"PostgreSQL健康检查: {health['status']}")
            return health

        except Exception as e:
            logger.error(f"PostgreSQL健康检查失败: {e}")
            health["error"] = str(e)
            return health

    async def check_redis_health(self) -> Dict[str, Any]:
        """检查Redis健康状态"""
        health = {
            "status": "unhealthy",
            "checks": {},
            "metrics": {},
            "timestamp": datetime.utcnow().isoformat()
        }

        try:
            # 1. 基本连接检查
            start_time = time.perf_counter()
            await self.redis.ping()
            latency = (time.perf_counter() - start_time) * 1000  # ms

            health["checks"]["connection"] = True
            health["metrics"]["connection_latency_ms"] = latency

            # 2. 获取Redis信息
            info = await self.redis.info()

            # 3. 内存使用情况
            used_memory = int(info.get('used_memory', 0))
            max_memory = int(info.get('maxmemory', 0))

            health["metrics"]["used_memory_bytes"] = used_memory
            health["metrics"]["used_memory_human"] = self._format_bytes(used_memory)

            if max_memory > 0:
                memory_ratio = used_memory / max_memory
                health["metrics"]["memory_usage_percent"] = memory_ratio * 100
            else:
                health["metrics"]["memory_usage_percent"] = 0

            # 4. 连接数
            health["metrics"]["connected_clients"] = int(info.get('connected_clients', 0))

            # 5. 命中率（如果可用）
            keyspace_hits = int(info.get('keyspace_hits', 0))
            keyspace_misses = int(info.get('keyspace_misses', 0))

            total_commands = keyspace_hits + keyspace_misses
            if total_commands > 0:
                hit_rate = keyspace_hits / total_commands * 100
            else:
                hit_rate = 0

            health["metrics"]["cache_hit_rate_percent"] = hit_rate

            # 6. 检查是否有慢查询
            health["metrics"]["total_commands_processed"] = int(info.get('total_commands_processed', 0))

            # 7. 检查Redis键数量（我们关心的键）
            our_keys_count = await self.redis.dbsize()
            health["metrics"]["total_keys"] = our_keys_count

            # 8. 更新健康状态
            memory_ok = max_memory == 0 or (used_memory / max_memory < 0.9)  # 使用率低于90%
            latency_ok = latency < 10  # 延迟小于10ms

            all_checks_passed = health["checks"]["connection"] and memory_ok and latency_ok
            health["status"] = "healthy" if all_checks_passed else "unhealthy"

            logger.debug(f"Redis健康检查: {health['status']}, 内存使用: {health['metrics']['used_memory_human']}")
            return health

        except Exception as e:
            logger.error(f"Redis健康检查失败: {e}")
            health["error"] = str(e)
            return health

    async def check_write_performance(self) -> Dict[str, Any]:
        """检查写入性能"""
        performance = {
            "test_type": "write_performance",
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": {},
            "status": "unknown"
        }

        try:
            async with self.db_pool.acquire() as conn:
                # 测试批量写入性能
                batch_size = 1000
                test_ticks = []

                now = datetime.utcnow()
                for i in range(batch_size):
                    test_ticks.append({
                        'time': (now - timedelta(microseconds=i * 1000)).isoformat(),
                        'symbol': 'XAUUSD',
                        'bid': 2000.00 + (i % 10),
                        'ask': 2000.05 + (i % 10),
                        'source': 'monitor_test'
                    })

                # 转换为COPY格式
                records = [
                    (
                        tick['time'],
                        tick['symbol'],
                        tick['bid'],
                        tick['ask'],
                        tick['source']
                    ) for tick in test_ticks
                ]

                # 执行写入测试
                start_time = time.perf_counter()

                await conn.copy_records_to_table(
                    'market_ticks',
                    records=records,
                    columns=['time', 'symbol', 'bid', 'ask', 'source']
                )

                elapsed_time = time.perf_counter() - start_time

                # 计算性能指标
                throughput = batch_size / elapsed_time  # records/sec
                latency_per_record = (elapsed_time / batch_size) * 1000  # ms

                performance["metrics"] = {
                    "batch_size": batch_size,
                    "elapsed_time_sec": elapsed_time,
                    "throughput_records_per_sec": throughput,
                    "average_latency_ms_per_record": latency_per_record,
                    "target_throughput": 21340,
                    "target_percentage": (throughput / 21340) * 100
                }

                # 判断性能状态
                if throughput >= 21340:
                    performance["status"] = "optimal"
                elif throughput >= 15000:
                    performance["status"] = "acceptable"
                else:
                    performance["status"] = "degraded"

                # 清理测试数据
                await conn.execute("""
                    DELETE FROM market_ticks
                    WHERE source = 'monitor_test'
                    AND time > NOW() - INTERVAL '1 minute'
                """)

                logger.info(f"写入性能测试: {throughput:.0f} records/sec, 状态: {performance['status']}")
                return performance

        except Exception as e:
            logger.error(f"写入性能测试失败: {e}")
            performance["error"] = str(e)
            performance["status"] = "failed"
            return performance

    async def check_read_performance(self) -> Dict[str, Any]:
        """检查读取性能"""
        performance = {
            "test_type": "read_performance",
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": {},
            "status": "unknown"
        }

        try:
            latencies = []

            async with self.db_pool.acquire() as conn:
                # 测试不同类型查询的延迟
                queries = [
                    ("最新tick查询", "SELECT * FROM realtime_ticks LIMIT 10"),
                    ("OHLC数据查询", "SELECT * FROM ohlc_data WHERE symbol = 'XAUUSD' AND timeframe = 'M1' ORDER BY time DESC LIMIT 100"),
                    ("策略信号查询", "SELECT * FROM strategy_signals WHERE time > NOW() - INTERVAL '1 hour' ORDER BY time DESC LIMIT 50"),
                    ("聚合查询", "SELECT COUNT(*) as count, symbol FROM market_ticks WHERE time > NOW() - INTERVAL '5 minutes' GROUP BY symbol")
                ]

                for query_name, query_sql in queries:
                    for _ in range(10):  # 每个查询执行10次
                        start_time = time.perf_counter()
                        await conn.fetch(query_sql)
                        latency = (time.perf_counter() - start_time) * 1000
                        latencies.append(latency)

                # 计算统计信息
                if latencies:
                    avg_latency = statistics.mean(latencies)
                    p95_latency = sorted(latencies)[int(len(latencies) * 0.95)]
                    p99_latency = sorted(latencies)[int(len(latencies) * 0.99)]

                    performance["metrics"] = {
                        "average_latency_ms": avg_latency,
                        "p95_latency_ms": p95_latency,
                        "p99_latency_ms": p99_latency,
                        "samples_count": len(latencies),
                        "target_latency": 50,
                        "target_percentage": (avg_latency / 50) * 100 if avg_latency > 0 else 0
                    }

                    # 判断性能状态
                    if avg_latency <= 50:
                        performance["status"] = "optimal"
                    elif avg_latency <= 100:
                        performance["status"] = "acceptable"
                    else:
                        performance["status"] = "degraded"

                    logger.info(f"读取性能测试: 平均延迟={avg_latency:.2f}ms, 状态: {performance['status']}")
                else:
                    performance["error"] = "没有延迟数据"
                    performance["status"] = "failed"

            return performance

        except Exception as e:
            logger.error(f"读取性能测试失败: {e}")
            performance["error"] = str(e)
            performance["status"] = "failed"
            return performance

    async def collect_metrics(self) -> Dict[str, Any]:
        """收集所有监控指标"""
        metrics = {
            "timestamp": datetime.utcnow().isoformat(),
            "postgres": await self.check_postgres_health(),
            "redis": await self.check_redis_health(),
            "write_performance": await self.check_write_performance(),
            "read_performance": await self.check_read_performance(),
            "summary": {}
        }

        # 生成摘要
        summary = {
            "overall_status": "healthy",
            "issues": [],
            "performance_rating": 0
        }

        # 检查各个组件状态
        components = {
            "PostgreSQL": metrics["postgres"]["status"],
            "Redis": metrics["redis"]["status"],
            "写入性能": metrics["write_performance"]["status"],
            "读取性能": metrics["read_performance"]["status"]
        }

        # 计算整体状态
        unhealthy_count = sum(1 for status in components.values() if status not in ["healthy", "optimal"])
        if unhealthy_count == 0:
            summary["overall_status"] = "healthy"
        elif unhealthy_count <= 1:
            summary["overall_status"] = "warning"
        else:
            summary["overall_status"] = "unhealthy"

        # 收集问题
        for component, status in components.items():
            if status not in ["healthy", "optimal"]:
                summary["issues"].append(f"{component}: {status}")

        # 计算性能评级（0-100）
        write_throughput = metrics["write_performance"]["metrics"].get("throughput_records_per_sec", 0)
        read_latency = metrics["read_performance"]["metrics"].get("average_latency_ms", 100)

        write_score = min(100, (write_throughput / 21340) * 100)  # 基于目标吞吐量
        read_score = max(0, 100 - max(0, read_latency - 50) * 2)  # 基于目标延迟

        performance_rating = (write_score + read_score) / 2
        summary["performance_rating"] = round(performance_rating, 1)

        metrics["summary"] = summary

        # 记录摘要日志
        logger.info(f"数据库监控摘要: 状态={summary['overall_status']}, "
                  f"性能评级={summary['performance_rating']}, "
                  f"问题数量={len(summary['issues'])}")

        return metrics

    async def run_continuous_monitoring(self, interval_seconds: int = 60):
        """运行持续监控"""
        logger.info(f"开始持续监控，间隔: {interval_seconds}秒")

        try:
            while True:
                try:
                    metrics = await self.collect_metrics()

                    # 存储到性能指标表
                    await self.store_metrics_to_db(metrics)

                    # 存储到Redis缓存
                    await self.store_metrics_to_redis(metrics)

                    # 检查是否需要告警
                    await self.check_alerts(metrics)

                    # 记录到日志（如果状态不是健康）
                    if metrics["summary"]["overall_status"] != "healthy":
                        logger.warning(f"监控发现异常: {metrics['summary']['issues']}")

                except Exception as e:
                    logger.error(f"监控循环失败: {e}")

                # 等待下一个监控周期
                await asyncio.sleep(interval_seconds)

        except asyncio.CancelledError:
            logger.info("监控被取消")
        except Exception as e:
            logger.error(f"持续监控失败: {e}")

    async def store_metrics_to_db(self, metrics: Dict[str, Any]):
        """存储指标到数据库"""
        try:
            async with self.db_pool.acquire() as conn:
                # 存储整体状态
                await conn.execute("""
                    INSERT INTO performance_metrics (
                        time, metric_name, value, unit, performance_level, context
                    ) VALUES
                    ($1, 'overall_status_score', $2, 'points', $3, 'database_health'),
                    ($4, 'write_throughput_current', $5, 'tps', $6, 'performance_test'),
                    ($7, 'read_latency_current', $8, 'ms', $9, 'performance_test'),
                    ($10, 'postgres_connections', $11, 'count', 'NORMAL', 'connection_status'),
                    ($12, 'redis_memory_usage', $13, 'percent', 'NORMAL', 'memory_status')
                """,
                metrics["timestamp"],
                metrics["summary"]["performance_rating"],
                "OPTIMAL" if metrics["summary"]["performance_rating"] >= 80 else "DEGRADED",
                metrics["timestamp"],
                metrics["write_performance"]["metrics"].get("throughput_records_per_sec", 0),
                "OPTIMAL" if metrics["write_performance"]["status"] == "optimal" else "DEGRADED",
                metrics["timestamp"],
                metrics["read_performance"]["metrics"].get("average_latency_ms", 0),
                "OPTIMAL" if metrics["read_performance"]["status"] == "optimal" else "DEGRADED",
                metrics["timestamp"],
                metrics["postgres"]["metrics"].get("active_connections", 0),
                metrics["timestamp"],
                metrics["redis"]["metrics"].get("memory_usage_percent", 0)
                )

        except Exception as e:
            logger.error(f"存储指标到数据库失败: {e}")

    async def store_metrics_to_redis(self, metrics: Dict[str, Any]):
        """存储指标到Redis缓存"""
        try:
            # 存储最新指标
            metrics_json = self._dict_to_json(metrics)
            await self.redis.setex(
                "monitor:latest:metrics",
                300,  # 5分钟过期
                metrics_json
            )

            # 存储摘要
            summary_json = self._dict_to_json(metrics["summary"])
            await self.redis.setex(
                "monitor:summary:latest",
                300,
                summary_json
            )

            # 添加时间序列
            timestamp = datetime.utcnow().isoformat()[:19]
            await self.redis.zadd(
                "monitor:timeseries:overall_score",
                {timestamp: metrics["summary"]["performance_rating"]}
            )

            # 保留最近24小时的记录
            cutoff_time = (datetime.utcnow() - timedelta(hours=24)).isoformat()[:19]
            await self.redis.zremrangebyscore(
                "monitor:timeseries:overall_score",
                "-inf",
                cutoff_time
            )

        except Exception as e:
            logger.error(f"存储指标到Redis失败: {e}")

    async def check_alerts(self, metrics: Dict[str, Any]):
        """检查是否需要触发告警"""
        try:
            alerts = []

            # 检查PostgreSQL状态
            if metrics["postgres"]["status"] != "healthy":
                alerts.append({
                    "type": "postgres_unhealthy",
                    "severity": "critical",
                    "message": f"PostgreSQL状态异常: {metrics['postgres'].get('error', '未知错误')}",
                    "timestamp": metrics["timestamp"]
                })

            # 检查Redis状态
            if metrics["redis"]["status"] != "healthy":
                alerts.append({
                    "type": "redis_unhealthy",
                    "severity": "critical",
                    "message": f"Redis状态异常: {metrics['redis'].get('error', '未知错误')}",
                    "timestamp": metrics["timestamp"]
                })

            # 检查写入性能
            write_throughput = metrics["write_performance"]["metrics"].get("throughput_records_per_sec", 0)
            if write_throughput < 10000:  # 低于10k ticks/sec
                alerts.append({
                    "type": "write_performance_degraded",
                    "severity": "warning",
                    "message": f"写入性能下降: {write_throughput:.0f} ticks/sec (目标: 21,340)",
                    "timestamp": metrics["timestamp"]
                })

            # 检查读取性能
            read_latency = metrics["read_performance"]["metrics"].get("average_latency_ms", 0)
            if read_latency > 100:  # 延迟超过100ms
                alerts.append({
                    "type": "read_performance_degraded",
                    "severity": "warning",
                    "message": f"读取延迟过高: {read_latency:.1f}ms (目标: <50ms)",
                    "timestamp": metrics["timestamp"]
                })

            # 检查Redis内存
            redis_memory_percent = metrics["redis"]["metrics"].get("memory_usage_percent", 0)
            if redis_memory_percent > 80:  # 内存使用率超过80%
                alerts.append({
                    "type": "redis_memory_high",
                    "severity": "warning",
                    "message": f"Redis内存使用率高: {redis_memory_percent:.1f}%",
                    "timestamp": metrics["timestamp"]
                })

            # 如果有告警，存储到数据库
            if alerts:
                await self.store_alerts_to_db(alerts)
                logger.warning(f"发现 {len(alerts)} 个告警")

        except Exception as e:
            logger.error(f"告警检查失败: {e}")

    async def store_alerts_to_db(self, alerts: List[Dict[str, Any]]):
        """存储告警到数据库"""
        try:
            async with self.db_pool.acquire() as conn:
                for alert in alerts:
                    await conn.execute("""
                        INSERT INTO risk_metrics (
                            time, metric_type, value, risk_level, alert_triggered, alert_message
                        ) VALUES ($1, $2, $3, $4, $5, $6)
                    """,
                    alert["timestamp"],
                    alert["type"],
                    1.0 if alert["severity"] == "critical" else 0.5,
                    alert["severity"].upper(),
                    True,
                    alert["message"]
                    )

        except Exception as e:
            logger.error(f"存储告警到数据库失败: {e}")

    # ==================== 辅助函数 ====================

    def _format_bytes(self, bytes_value: int) -> str:
        """格式化字节大小"""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if bytes_value < 1024.0:
                return f"{bytes_value:.2f} {unit}"
            bytes_value /= 1024.0
        return f"{bytes_value:.2f} PB"

    def _dict_to_json(self, data: Dict) -> str:
        """字典转JSON字符串"""
        import json
        return json.dumps(data, default=str)

    def _json_to_dict(self, json_str: str) -> Dict:
        """JSON字符串转字典"""
        import json
        return json.loads(json_str)


# ==================== 命令行接口 ====================

async def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="Tick Gold数据库监控工具")
    parser.add_argument("--health", action="store_true", help="运行健康检查")
    parser.add_argument("--performance", action="store_true", help="运行性能测试")
    parser.add_argument("--continuous", action="store_true", help="运行持续监控")
    parser.add_argument("--interval", type=int, default=60, help="监控间隔秒数")
    parser.add_argument("--output", type=str, help="输出JSON文件路径")

    args = parser.parse_args()

    monitor = DatabaseMonitor()

    try:
        if not await monitor.initialize():
            print("❌ 监控器初始化失败")
            return 1

        if args.health:
            print("🔍 运行健康检查...")
            postgres_health = await monitor.check_postgres_health()
            redis_health = await monitor.check_redis_health()

            print(f"PostgreSQL状态: {postgres_health['status']}")
            print(f"Redis状态: {redis_health['status']}")

            if args.output:
                import json
                with open(args.output, 'w') as f:
                    json.dump({
                        "postgres": postgres_health,
                        "redis": redis_health
                    }, f, indent=2, default=str)
                print(f"结果已保存到: {args.output}")

        elif args.performance:
            print("⚡ 运行性能测试...")
            write_perf = await monitor.check_write_performance()
            read_perf = await monitor.check_read_performance()

            print(f"写入性能: {write_perf['status']} "
                  f"({write_perf['metrics'].get('throughput_records_per_sec', 0):.0f} ticks/sec)")
            print(f"读取性能: {read_perf['status']} "
                  f"({read_perf['metrics'].get('average_latency_ms', 0):.2f}ms)")

            if args.output:
                import json
                with open(args.output, 'w') as f:
                    json.dump({
                        "write_performance": write_perf,
                        "read_performance": read_perf
                    }, f, indent=2, default=str)
                print(f"结果已保存到: {args.output}")

        elif args.continuous:
            print(f"🔔 开始持续监控，间隔: {args.interval}秒")
            print("按 Ctrl+C 停止监控")
            await monitor.run_continuous_monitoring(args.interval)

        else:
            print("📊 运行完整监控...")
            metrics = await monitor.collect_metrics()

            print(f"整体状态: {metrics['summary']['overall_status']}")
            print(f"性能评级: {metrics['summary']['performance_rating']}/100")

            if metrics['summary']['issues']:
                print("发现的问题:")
                for issue in metrics['summary']['issues']:
                    print(f"  • {issue}")

            if args.output:
                import json
                with open(args.output, 'w') as f:
                    json.dump(metrics, f, indent=2, default=str)
                print(f"完整结果已保存到: {args.output}")

        return 0

    except KeyboardInterrupt:
        print("\n🛑 监控被用户中断")
        return 0
    except Exception as e:
        print(f"❌ 监控失败: {e}")
        return 1
    finally:
        await monitor.close()


if __name__ == "__main__":
    import sys
    exit_code = asyncio.run(main())
    sys.exit(exit_code)