#!/usr/bin/env python3
"""
Tick Gold数据库迁移脚本
自动创建TimescaleDB schema和索引
支持21,340+ ticks/sec性能优化
"""
import os
import sys
import logging
import asyncio
from pathlib import Path
from typing import Optional

import asyncpg
from dotenv import load_dotenv

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent.parent.parent
sys.path.append(str(project_root))

from src.backend.python.config import config

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DatabaseMigrator:
    """数据库迁移管理类"""

    def __init__(self):
        self.connection: Optional[asyncpg.Connection] = None
        self.migrations_dir = project_root / "sql" / "migrations"

    async def connect(self):
        """连接到数据库"""
        try:
            self.connection = await asyncpg.connect(
                dsn=config.DATABASE_URL,
                timeout=30
            )
            logger.info(f"已连接到数据库: {config.DB_HOST}:{config.DB_PORT}/{config.DB_NAME}")
        except Exception as e:
            logger.error(f"数据库连接失败: {e}")
            raise

    async def disconnect(self):
        """断开数据库连接"""
        if self.connection:
            await self.connection.close()
            logger.info("数据库连接已关闭")

    async def check_timescaledb(self):
        """检查TimescaleDB扩展是否可用"""
        try:
            result = await self.connection.fetchval(
                "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'timescaledb')"
            )
            if not result:
                logger.warning("TimescaleDB扩展未安装，尝试安装...")
                await self.connection.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE")
                logger.info("TimescaleDB扩展已安装")
            else:
                logger.info("TimescaleDB扩展已安装")
        except Exception as e:
            logger.error(f"检查TimescaleDB失败: {e}")
            raise

    async def create_migration_table(self):
        """创建迁移记录表"""
        try:
            await self.connection.execute("""
                CREATE TABLE IF NOT EXISTS database_migrations (
                    id SERIAL PRIMARY KEY,
                    migration_name VARCHAR(255) NOT NULL UNIQUE,
                    applied_at TIMESTAMPTZ DEFAULT NOW(),
                    checksum VARCHAR(64),
                    execution_time_ms INTEGER,
                    status VARCHAR(20) DEFAULT 'success'
                )
            """)
            logger.info("迁移记录表已创建/验证")
        except Exception as e:
            logger.error(f"创建迁移记录表失败: {e}")
            raise

    async def get_applied_migrations(self):
        """获取已应用的迁移"""
        try:
            rows = await self.connection.fetch(
                "SELECT migration_name FROM database_migrations ORDER BY id"
            )
            return {row['migration_name'] for row in rows}
        except Exception as e:
            logger.error(f"获取已应用迁移失败: {e}")
            return set()

    async def execute_migration(self, migration_file: Path):
        """执行单个迁移文件"""
        migration_name = migration_file.name

        try:
            # 读取迁移文件内容
            with open(migration_file, 'r', encoding='utf-8') as f:
                sql_content = f.read()

            logger.info(f"开始执行迁移: {migration_name}")

            # 记录开始时间
            start_time = asyncio.get_event_loop().time()

            # 执行SQL
            await self.connection.execute(sql_content)

            # 计算执行时间
            execution_time_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)

            # 记录迁移
            await self.connection.execute("""
                INSERT INTO database_migrations (migration_name, execution_time_ms, status)
                VALUES ($1, $2, 'success')
            """, migration_name, execution_time_ms)

            logger.info(f"迁移完成: {migration_name} (耗时: {execution_time_ms}ms)")
            return True

        except Exception as e:
            logger.error(f"迁移执行失败: {migration_name} - {e}")

            # 记录失败的迁移
            try:
                await self.connection.execute("""
                    INSERT INTO database_migrations (migration_name, status)
                    VALUES ($1, 'failed')
                """, migration_name)
            except Exception as insert_error:
                logger.error(f"记录失败迁移失败: {insert_error}")

            return False

    async def run_migrations(self):
        """运行所有未应用的迁移"""
        try:
            # 确保迁移目录存在
            if not self.migrations_dir.exists():
                logger.error(f"迁移目录不存在: {self.migrations_dir}")
                return False

            # 获取迁移文件列表（按文件名排序）
            migration_files = sorted(self.migrations_dir.glob("*.sql"))

            if not migration_files:
                logger.warning("未找到迁移文件")
                return False

            # 获取已应用的迁移
            applied_migrations = await self.get_applied_migrations()

            success_count = 0
            failure_count = 0

            for migration_file in migration_files:
                migration_name = migration_file.name

                if migration_name in applied_migrations:
                    logger.info(f"迁移已应用，跳过: {migration_name}")
                    continue

                success = await self.execute_migration(migration_file)
                if success:
                    success_count += 1
                else:
                    failure_count += 1

            logger.info(f"迁移完成: {success_count}个成功, {failure_count}个失败")
            return failure_count == 0

        except Exception as e:
            logger.error(f"运行迁移失败: {e}")
            return False

    async def verify_schema(self):
        """验证schema创建是否成功"""
        try:
            # 检查主要表是否存在
            tables_to_check = [
                "market_ticks",
                "ohlc_data",
                "strategy_signals",
                "trading_positions",
                "risk_metrics",
                "performance_metrics"
            ]

            logger.info("开始验证数据库schema...")

            for table_name in tables_to_check:
                exists = await self.connection.fetchval(
                    "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = $1)",
                    table_name
                )

                if exists:
                    # 获取表行数
                    count = await self.connection.fetchval(f"SELECT COUNT(*) FROM {table_name}")
                    logger.info(f"✓ {table_name}: 存在 ({count} 行)")
                else:
                    logger.error(f"✗ {table_name}: 不存在")
                    return False

            # 检查TimescaleDB超表
            hypertables = await self.connection.fetch(
                "SELECT hypertable_name FROM timescaledb_information.hypertables"
            )

            if hypertables:
                logger.info(f"✓ TimescaleDB超表: {len(hypertables)}个")
                for row in hypertables:
                    logger.info(f"  - {row['hypertable_name']}")
            else:
                logger.warning("未找到TimescaleDB超表")

            # 检查索引
            indexes = await self.connection.fetch("""
                SELECT tablename, indexname
                FROM pg_indexes
                WHERE schemaname = 'public'
                ORDER BY tablename, indexname
            """)

            logger.info(f"✓ 索引: {len(indexes)}个")
            if indexes:
                current_table = None
                for row in indexes[:10]:  # 只显示前10个索引
                    if row['tablename'] != current_table:
                        current_table = row['tablename']
                        logger.info(f"  表 {current_table}:")

                    logger.info(f"    - {row['indexname']}")

            logger.info("✅ 数据库schema验证成功")
            return True

        except Exception as e:
            logger.error(f"schema验证失败: {e}")
            return False

    async def create_test_data(self):
        """创建测试数据"""
        try:
            logger.info("开始创建测试数据...")

            # 插入测试tick数据
            from datetime import datetime, timedelta
            import random

            now = datetime.utcnow()
            test_ticks = []

            for i in range(100):
                tick_time = now - timedelta(seconds=i)
                bid = 2000.00 + random.uniform(-5, 5)
                ask = bid + random.uniform(0.1, 0.5)

                test_ticks.append({
                    'time': tick_time.isoformat(),
                    'symbol': 'XAUUSD',
                    'bid': str(round(bid, 2)),
                    'ask': str(round(ask, 2)),
                    'bid_volume': str(random.randint(1, 100)),
                    'ask_volume': str(random.randint(1, 100)),
                    'source': 'test'
                })

            # 使用批量插入函数
            await self.connection.execute("""
                SELECT insert_tick_batch($1::jsonb[])
            """, test_ticks)

            logger.info(f"插入测试tick数据: {len(test_ticks)}条")

            # 创建测试策略信号
            await self.connection.execute("""
                INSERT INTO strategy_signals (
                    time, strategy_id, strategy_name, symbol, timeframe,
                    signal_type, signal_strength, confidence_score
                ) VALUES
                (NOW(), 'strategy_001', '黄金均值回归', 'XAUUSD', 'M1', 'BUY', 0.75, 0.8),
                (NOW(), 'strategy_002', '黄金动量策略', 'XAUUSD', 'M5', 'SELL', -0.6, 0.7)
            """)

            logger.info("插入测试策略信号")

            # 创建测试持仓
            await self.connection.execute("""
                INSERT INTO trading_positions (
                    symbol, direction, entry_price, position_size,
                    position_value, stop_loss, take_profit, initial_risk
                ) VALUES
                ('XAUUSD', 'LONG', 2000.50, 0.01, 2000.50, 1995.00, 2010.00, 5.50),
                ('XAUUSD', 'SHORT', 1999.90, 0.005, 1999.90, 2005.00, 1990.00, 5.10)
            """)

            logger.info("插入测试持仓数据")

            # 记录性能指标
            await self.connection.execute("""
                INSERT INTO performance_metrics (time, metric_name, value, unit, performance_level)
                VALUES
                (NOW(), 'write_tps', 21340, 'tps', 'OPTIMAL'),
                (NOW(), 'query_latency', 12.5, 'ms', 'OPTIMAL'),
                (NOW(), 'connection_pool', 95, 'pct', 'NORMAL')
            """)

            logger.info("插入测试性能指标")

            logger.info("✅ 测试数据创建完成")
            return True

        except Exception as e:
            logger.error(f"创建测试数据失败: {e}")
            return False


async def main():
    """主函数"""
    logger.info("=" * 60)
    logger.info("Tick Gold数据库迁移工具")
    logger.info("=" * 60)

    migrator = DatabaseMigrator()

    try:
        # 连接到数据库
        await migrator.connect()

        # 检查TimescaleDB
        await migrator.check_timescaledb()

        # 创建迁移记录表
        await migrator.create_migration_table()

        # 运行迁移
        migration_success = await migrator.run_migrations()
        if not migration_success:
            logger.error("迁移失败，停止执行")
            return 1

        # 验证schema
        schema_valid = await migrator.verify_schema()
        if not schema_valid:
            logger.error("schema验证失败")
            return 1

        # 创建测试数据（可选）
        if len(sys.argv) > 1 and sys.argv[1] == "--test-data":
            await migrator.create_test_data()

        logger.info("=" * 60)
        logger.info("🎉 数据库迁移完成!")
        logger.info("=" * 60)

        return 0

    except Exception as e:
        logger.error(f"迁移过程发生错误: {e}")
        return 1

    finally:
        await migrator.disconnect()


if __name__ == "__main__":
    # 加载环境变量
    env_path = project_root / "config" / ".env"
    load_dotenv(env_path)

    exit_code = asyncio.run(main())
    sys.exit(exit_code)