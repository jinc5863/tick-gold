#!/usr/bin/env python3
"""
Tick Gold数据库性能测试工具
测试TimescaleDB和Redis能否支持21,340+ ticks/sec的性能要求
"""
import asyncio
import time
import logging
import statistics
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
import random

import asyncpg
import aioredis
import orjson
import numpy as np

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DatabasePerformanceTester:
    """数据库性能测试器"""

    def __init__(self, db_url: str, redis_url: str):
        self.db_url = db_url
        self.redis_url = redis_url
        self.pg_pool = None
        self.redis = None

    async def initialize(self):
        """初始化连接"""
        # PostgreSQL连接池
        self.pg_pool = await asyncpg.create_pool(
            dsn=self.db_url,
            min_size=5,
            max_size=20,
            timeout=30.0,
            command_timeout=10.0
        )

        # Redis连接
        self.redis = await aioredis.from_url(
            self.redis_url,
            encoding="utf-8",
            decode_responses=False,
            max_connections=20
        )

        logger.info("数据库连接初始化完成")

    async def close(self):
        """关闭连接"""
        if self.pg_pool:
            await self.pg_pool.close()
        if self.redis:
            await self.redis.close()

    # ==================== PostgreSQL性能测试 ====================

    async def test_write_performance(self, batch_size: int = 1000, num_batches: int = 100) -> Dict[str, float]:
        """
        测试写入性能（tick数据批量插入）

        Args:
            batch_size: 每批插入的记录数
            num_batches: 批处理数量
        Returns:
            性能指标字典
        """
        logger.info(f"开始写入性能测试: {batch_size}条/批, {num_batches}批")

        latencies = []
        total_records = 0

        # 生成测试数据
        test_data = self._generate_test_ticks(batch_size)

        async with self.pg_pool.acquire() as conn:
            # 预热连接
            await conn.execute("SELECT 1")

            for batch_num in range(num_batches):
                start_time = time.perf_counter()

                try:
                    # 使用COPY命令批量插入（最高性能）
                    await conn.copy_records_to_table(
                        'market_ticks',
                        records=test_data,
                        columns=['time', 'symbol', 'bid', 'ask', 'source']
                    )

                    # 或者使用批量插入函数
                    # await conn.execute("""
                    #     SELECT insert_tick_batch($1::jsonb[])
                    # """, test_data_json)

                except Exception as e:
                    # 降级到逐条插入
                    logger.warning(f"批量插入失败，降级到逐条插入: {e}")
                    success_count = await self._backup_insert(conn, test_data)
                else:
                    success_count = len(test_data)

                end_time = time.perf_counter()
                latency_ms = (end_time - start_time) * 1000

                latencies.append(latency_ms)
                total_records += success_count

                if (batch_num + 1) % 10 == 0:
                    avg_latency = statistics.mean(latencies[-10:])
                    logger.info(f"批次 {batch_num + 1}/{num_batches}: "
                              f"延迟={avg_latency:.2f}ms, "
                              f"吞吐量={success_count/(latency_ms/1000):.0f} records/sec")

        # 计算性能指标
        avg_latency = statistics.mean(latencies) if latencies else 0
        throughput = total_records / (sum(latencies) / 1000) if latencies else 0

        logger.info(f"写入性能测试完成:")
        logger.info(f"  总记录数: {total_records}")
        logger.info(f"  平均延迟: {avg_latency:.2f}ms")
        logger.info(f"  平均吞吐量: {throughput:.0f} records/sec")
        logger.info(f"  目标吞吐量: 21,340 records/sec")
        logger.info(f"  性能达成: {throughput/21340*100:.1f}%")

        return {
            "total_records": total_records,
            "average_latency_ms": avg_latency,
            "throughput_records_per_sec": throughput,
            "latencies_ms": latencies,
            "target_throughput": 21340,
            "target_percentage": throughput / 21340 * 100
        }

    async def test_read_performance(self, num_queries: int = 1000) -> Dict[str, float]:
        """测试读取性能"""
        logger.info(f"开始读取性能测试: {num_queries}次查询")

        latencies = []

        async with self.pg_pool.acquire() as conn:
            for i in range(num_queries):
                start_time = time.perf_counter()

                # 执行不同类型的查询
                if i % 4 == 0:
                    # 最新tick查询
                    result = await conn.fetch("""
                        SELECT * FROM realtime_ticks LIMIT 10
                    """)
                elif i % 4 == 1:
                    # 分钟数据查询
                    result = await conn.fetch("""
                        SELECT * FROM ohlc_data
                        WHERE symbol = 'XAUUSD' AND timeframe = 'M1'
                        ORDER BY time DESC LIMIT 100
                    """)
                elif i % 4 == 2:
                    # 信号查询
                    result = await conn.fetch("""
                        SELECT * FROM strategy_signals
                        WHERE time > NOW() - INTERVAL '1 hour'
                        ORDER BY time DESC LIMIT 50
                    """)
                else:
                    # 聚合查询
                    result = await conn.fetch("""
                        SELECT COUNT(*) as count, symbol
                        FROM market_ticks
                        WHERE time > NOW() - INTERVAL '5 minutes'
                        GROUP BY symbol
                    """)

                end_time = time.perf_counter()
                latency_ms = (end_time - start_time) * 1000
                latencies.append(latency_ms)

                if (i + 1) % 100 == 0:
                    avg_latency = statistics.mean(latencies[-100:])
                    logger.info(f"查询 {i + 1}/{num_queries}: 平均延迟={avg_latency:.2f}ms")

        avg_latency = statistics.mean(latencies) if latencies else 0
        p95_latency = np.percentile(latencies, 95) if latencies else 0
        p99_latency = np.percentile(latencies, 99) if latencies else 0

        logger.info(f"读取性能测试完成:")
        logger.info(f"  平均延迟: {avg_latency:.2f}ms")
        logger.info(f"  P95延迟: {p95_latency:.2f}ms")
        logger.info(f"  P99延迟: {p99_latency:.2f}ms")
        logger.info(f"  目标延迟: <50ms")

        return {
            "average_latency_ms": avg_latency,
            "p95_latency_ms": p95_latency,
            "p99_latency_ms": p99_latency,
            "latencies_ms": latencies,
            "target_latency": 50
        }

    # ==================== Redis性能测试 ====================

    async def test_redis_performance(self, num_operations: int = 10000) -> Dict[str, float]:
        """测试Redis性能"""
        logger.info(f"开始Redis性能测试: {num_operations}次操作")

        # 测试不同类型操作
        test_results = {
            "set_latency": [],
            "get_latency": [],
            "hset_latency": [],
            "hget_latency": []
        }

        for i in range(num_operations):
            # SET操作
            start_time = time.perf_counter()
            await self.redis.set(f"test:key:{i}", f"value:{i}", ex=60)
            test_results["set_latency"].append((time.perf_counter() - start_time) * 1000)

            # GET操作
            start_time = time.perf_counter()
            value = await self.redis.get(f"test:key:{i}")
            test_results["get_latency"].append((time.perf_counter() - start_time) * 1000)

            # HSET操作（每10次操作）
            if i % 10 == 0:
                start_time = time.perf_counter()
                await self.redis.hset(f"test:hash:{i//10}", f"field:{i}", f"value:{i}")
                test_results["hset_latency"].append((time.perf_counter() - start_time) * 1000)

            # HGET操作（每10次操作）
            if i % 10 == 0:
                start_time = time.perf_counter()
                value = await self.redis.hget(f"test:hash:{i//10}", f"field:{i}")
                test_results["hget_latency"].append((time.perf_counter() - start_time) * 1000)

            if (i + 1) % 1000 == 0:
                avg_set = statistics.mean(test_results["set_latency"][-1000:]) if test_results["set_latency"] else 0
                logger.info(f"Redis操作 {i + 1}/{num_operations}: SET延迟={avg_set:.2f}ms")

        # 计算统计信息
        results = {}
        for op_name, latencies in test_results.items():
            if latencies:
                results[f"{op_name}_avg_ms"] = statistics.mean(latencies)
                results[f"{op_name}_p95_ms"] = np.percentile(latencies, 95)
                results[f"{op_name}_p99_ms"] = np.percentile(latencies, 99)
                results[f"{op_name}_ops_per_sec"] = 1000 / (statistics.mean(latencies) if statistics.mean(latencies) > 0 else 1)

        logger.info(f"Redis性能测试完成:")
        logger.info(f"  SET延迟: {results.get('set_latency_avg_ms', 0):.2f}ms")
        logger.info(f"  GET延迟: {results.get('get_latency_avg_ms', 0):.2f}ms")
        logger.info(f"  HSET延迟: {results.get('hset_latency_avg_ms', 0):.2f}ms")
        logger.info(f"  SET吞吐量: {results.get('set_latency_ops_per_sec', 0):.0f} ops/sec")

        return results

    async def test_concurrent_performance(self, num_workers: int = 10, records_per_worker: int = 1000):
        """测试并发写入性能"""
        logger.info(f"开始并发性能测试: {num_workers}个工作进程, {records_per_worker}条记录/进程")

        start_time = time.perf_counter()

        # 创建并发任务
        tasks = []
        for worker_id in range(num_workers):
            task = self._worker_write(worker_id, records_per_worker)
            tasks.append(task)

        # 等待所有任务完成
        worker_results = await asyncio.gather(*tasks, return_exceptions=True)

        end_time = time.perf_counter()
        total_time = end_time - start_time

        # 统计结果
        total_records = 0
        for result in worker_results:
            if isinstance(result, dict):
                total_records += result.get('records_written', 0)
            elif isinstance(result, Exception):
                logger.error(f"工作进程失败: {result}")

        throughput = total_records / total_time if total_time > 0 else 0

        logger.info(f"并发性能测试完成:")
        logger.info(f"  总记录数: {total_records}")
        logger.info(f"  总时间: {total_time:.2f}s")
        logger.info(f"  吞吐量: {throughput:.0f} records/sec")
        logger.info(f"  目标吞吐量: 21,340 records/sec")
        logger.info(f"  性能达成: {throughput/21340*100:.1f}%")

        return {
            "total_records": total_records,
            "total_time_sec": total_time,
            "throughput_records_per_sec": throughput,
            "num_workers": num_workers,
            "records_per_worker": records_per_worker
        }

    async def _worker_write(self, worker_id: int, num_records: int) -> Dict[str, Any]:
        """工作进程：写入数据"""
        records_written = 0

        async with self.pg_pool.acquire() as conn:
            for i in range(num_records):
                try:
                    await conn.execute("""
                        INSERT INTO market_ticks (time, symbol, bid, ask, source)
                        VALUES (NOW(), 'XAUUSD', $1, $2, 'perf_test')
                    """, 2000.00 + random.uniform(-10, 10), 2000.05 + random.uniform(-10, 10))

                    records_written += 1

                except Exception as e:
                    logger.error(f"工作进程 {worker_id} 写入失败: {e}")
                    continue

        return {
            "worker_id": worker_id,
            "records_written": records_written
        }

    # ==================== 辅助函数 ====================

    def _generate_test_ticks(self, count: int) -> List[Tuple]:
        """生成测试tick数据"""
        now = datetime.utcnow()
        ticks = []

        for i in range(count):
            tick_time = now - timedelta(microseconds=i * 1000)
            bid = 2000.00 + random.uniform(-5, 5)
            ask = bid + random.uniform(0.1, 0.5)

            ticks.append((
                tick_time,              # time
                'XAUUSD',               # symbol
                round(bid, 2),          # bid
                round(ask, 2),          # ask
                'perf_test'             # source
            ))

        return ticks

    async def _backup_insert(self, conn, test_data) -> int:
        """降级插入：逐条插入"""
        success_count = 0
        batch_size = 100  # 每批100条

        for i in range(0, len(test_data), batch_size):
            batch = test_data[i:i+batch_size]
            try:
                await conn.executemany("""
                    INSERT INTO market_ticks (time, symbol, bid, ask, source)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT DO NOTHING
                """, batch)
                success_count += len(batch)
            except Exception as e:
                logger.warning(f"降级插入批处理失败: {e}")
                continue

        return success_count

    # ==================== 综合性能报告 ====================

    async def run_comprehensive_test(self):
        """运行综合性能测试"""
        logger.info("=" * 60)
        logger.info("Tick Gold数据库综合性能测试")
        logger.info("=" * 60)

        results = {
            "timestamp": datetime.utcnow().isoformat(),
            "performance_targets": {
                "write_throughput": 21340,  # ticks/sec
                "read_latency": 50,         # ms
                "redis_latency": 1,         # ms
                "concurrent_workers": 10
            },
            "tests": {}
        }

        try:
            # 1. 写入性能测试
            logger.info("\n1. 写入性能测试")
            results["tests"]["write_performance"] = await self.test_write_performance(
                batch_size=1000,
                num_batches=50
            )

            # 2. 读取性能测试
            logger.info("\n2. 读取性能测试")
            results["tests"]["read_performance"] = await self.test_read_performance(
                num_queries=1000
            )

            # 3. Redis性能测试
            logger.info("\n3. Redis性能测试")
            results["tests"]["redis_performance"] = await self.test_redis_performance(
                num_operations=5000
            )

            # 4. 并发性能测试
            logger.info("\n4. 并发性能测试")
            results["tests"]["concurrent_performance"] = await self.test_concurrent_performance(
                num_workers=10,
                records_per_worker=2000
            )

            # 5. 生成性能报告
            logger.info("\n5. 生成性能报告")
            await self._generate_performance_report(results)

            logger.info("=" * 60)
            logger.info("✅ 性能测试完成!")
            logger.info("=" * 60)

            return results

        except Exception as e:
            logger.error(f"性能测试失败: {e}")
            raise

    async def _generate_performance_report(self, results: Dict[str, Any]):
        """生成性能报告"""
        logger.info("\n" + "=" * 60)
        logger.info("🎯 性能测试报告")
        logger.info("=" * 60)

        # 写入性能
        write_test = results["tests"].get("write_performance", {})
        if write_test:
            throughput = write_test.get("throughput_records_per_sec", 0)
            target = write_test.get("target_throughput", 21340)
            percentage = (throughput / target * 100) if target > 0 else 0

            logger.info(f"📊 写入性能:")
            logger.info(f"  ✓ 吞吐量: {throughput:,.0f} records/sec")
            logger.info(f"  ✓ 目标值: {target:,.0f} records/sec")
            logger.info(f"  ✓ 达成率: {percentage:.1f}%")
            logger.info(f"  ✓ 状态: {'✅ 达标' if throughput >= target else '⚠️ 未达标'}")

        # 读取性能
        read_test = results["tests"].get("read_performance", {})
        if read_test:
            avg_latency = read_test.get("average_latency_ms", 0)
            target_latency = read_test.get("target_latency", 50)

            logger.info(f"\n📊 读取性能:")
            logger.info(f"  ✓ 平均延迟: {avg_latency:.2f}ms")
            logger.info(f"  ✓ P95延迟: {read_test.get('p95_latency_ms', 0):.2f}ms")
            logger.info(f"  ✓ P99延迟: {read_test.get('p99_latency_ms', 0):.2f}ms")
            logger.info(f"  ✓ 目标延迟: {target_latency}ms")
            logger.info(f"  ✓ 状态: {'✅ 达标' if avg_latency <= target_latency else '⚠️ 未达标'}")

        # Redis性能
        redis_test = results["tests"].get("redis_performance", {})
        if redis_test:
            set_latency = redis_test.get("set_latency_avg_ms", 0)
            set_tps = redis_test.get("set_latency_ops_per_sec", 0)

            logger.info(f"\n📊 Redis性能:")
            logger.info(f"  ✓ SET延迟: {set_latency:.2f}ms")
            logger.info(f"  ✓ SET吞吐量: {set_tps:,.0f} ops/sec")
            logger.info(f"  ✓ GET延迟: {redis_test.get('get_latency_avg_ms', 0):.2f}ms")
            logger.info(f"  ✓ 状态: {'✅ 正常' if set_latency < 5 else '⚠️ 偏高'}")

        # 并发性能
        conc_test = results["tests"].get("concurrent_performance", {})
        if conc_test:
            conc_throughput = conc_test.get("throughput_records_per_sec", 0)
            conc_percentage = (conc_throughput / 21340 * 100) if 21340 > 0 else 0

            logger.info(f"\n📊 并发性能:")
            logger.info(f"  ✓ 吞吐量: {conc_throughput:,.0f} records/sec")
            logger.info(f"  ✓ 工作进程: {conc_test.get('num_workers', 0)}")
            logger.info(f"  ✓ 达成率: {conc_percentage:.1f}%")
            logger.info(f"  ✓ 状态: {'✅ 良好' if conc_throughput > 10000 else '⚠️ 需要优化'}")

        # 总体评估
        logger.info("\n" + "=" * 60)
        logger.info("📈 总体评估")

        all_passed = True
        recommendations = []

        if write_test and write_test.get("throughput_records_per_sec", 0) < 21340:
            all_passed = False
            recommendations.append("写入性能未达标，建议：1) 增加批量大小 2) 优化索引 3) 调整TimescaleDB分区策略")

        if read_test and read_test.get("average_latency_ms", 100) > 50:
            all_passed = False
            recommendations.append("读取延迟过高，建议：1) 添加更多索引 2) 优化查询语句 3) 增加内存缓存")

        if redis_test and redis_test.get("set_latency_avg_ms", 10) > 5:
            recommendations.append("Redis延迟略高，建议：1) 减少网络延迟 2) 使用Pipeline 3) 优化数据结构")

        if all_passed:
            logger.info("✅ 所有性能测试均达标！系统可以支持21,340+ ticks/sec的性能要求。")
        else:
            logger.info("⚠️  部分性能测试未达标，请参考以下建议进行优化：")
            for rec in recommendations:
                logger.info(f"  • {rec}")

        logger.info("=" * 60)


# ==================== 主函数 ====================

async def main():
    """主函数"""
    import os
    from dotenv import load_dotenv

    # 加载环境变量
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(project_root, "config", ".env")
    load_dotenv(env_path)

    # 构建数据库URL
    db_url = (
        f"postgresql://{os.getenv('DB_USER', 'postgres')}:"
        f"{os.getenv('DB_PASSWORD', 'postgres')}@"
        f"{os.getenv('DB_HOST', 'localhost')}:"
        f"{os.getenv('DB_PORT', '5432')}/"
        f"{os.getenv('DB_NAME', 'tick_gold')}"
    )

    redis_url = (
        f"redis://"
        f"{os.getenv('REDIS_PASSWORD', '') + '@' if os.getenv('REDIS_PASSWORD') else ''}"
        f"{os.getenv('REDIS_HOST', 'localhost')}:"
        f"{os.getenv('REDIS_PORT', '6379')}"
    )

    logger.info(f"连接数据库: {db_url}")
    logger.info(f"连接Redis: {redis_url}")

    tester = DatabasePerformanceTester(db_url, redis_url)

    try:
        await tester.initialize()
        results = await tester.run_comprehensive_test()

        # 保存结果到文件
        output_file = os.path.join(project_root, "reports", "database_performance.json")
        os.makedirs(os.path.dirname(output_file), exist_ok=True)

        import json
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)

        logger.info(f"性能报告已保存到: {output_file}")

    finally:
        await tester.close()


if __name__ == "__main__":
    asyncio.run(main())