#!/usr/bin/env python3
"""
模拟 XAUUSD Tick 数据生成器

生成 3 个月的 XAUUSD tick 数据，用于测试清洗流程。

使用方法:
    python scripts/generate_simulated_ticks.py
"""
import os
import sys
import csv
from datetime import datetime, timedelta
import random
import math

# 路径设置
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def generate_gbm_price(start_price: float, volatility: float, dt: float) -> float:
    """
    几何布朗运动生成价格

    Args:
        start_price: 起始价格
        volatility: 年化波动率
        dt: 时间步长（秒）
    """
    # 使用正态分布随机增量
    drift = 0.0  # 无漂移（随机游走）
    random_shock = random.gauss(0, 1)

    # 离散时间的GBM公式
    dt_years = dt / (365 * 24 * 3600)  # 转换为年
    price_change = start_price * (
        drift * dt_years +
        volatility * math.sqrt(dt_years) * random_shock
    )

    return start_price + price_change


def generate_spread() -> float:
    """生成买卖价差（模拟真实点差）"""
    # XAUUSD 典型点差 5-30 点
    base_spread = random.uniform(5, 30)
    # 添加随机波动
    return base_spread + random.uniform(-2, 2)


def generate_volume() -> tuple[float, float]:
    """生成买卖量"""
    # 典型成交量
    bid_vol = random.uniform(0.1, 5.0)
    ask_vol = random.uniform(0.1, 5.0)
    return round(bid_vol, 2), round(ask_vol, 2)


def generate_simulated_ticks(
    start_date: datetime,
    end_date: datetime,
    start_price: float = 2000.0,
    output_file: str = "simulated_ticks.csv"
):
    """
    生成模拟 tick 数据

    Args:
        start_date: 开始时间
        end_date: 结束时间
        start_price: 起始价格（XAUUSD 约 2000）
        output_file: 输出文件路径
    """
    print(f"📊 开始生成模拟 Tick 数据...")
    print(f"   时间范围: {start_date} ~ {end_date}")
    print(f"   起始价格: ${start_price}")

    # 黄金年化波动率（约 15-20%）
    volatility = 0.18

    # 每秒生成 1-5 个 tick
    tick_rate = random.randint(1, 5)

    current_price = start_price
    tick_count = 0
    written_count = 0

    # 计算总秒数
    total_seconds = int((end_date - start_date).total_seconds())

    current_time = start_date

    with open(output_file, 'w', newline='') as f:
        writer = csv.writer(f)

        # 写入表头
        writer.writerow([
            'timestamp', 'symbol', 'bid', 'ask',
            'bid_volume', 'ask_volume'
        ])

        # 进度报告
        last_progress = 0

        while current_time < end_date:
            # 生成价格
            price_change = generate_gbm_price(current_price, volatility, 1)
            current_price = max(price_change, start_price * 0.5)  # 防止价格变为负数
            current_price = min(current_price, start_price * 1.5)  # 限制波动范围

            # 生成价差和成交量
            spread = generate_spread()
            bid = current_price
            ask = current_price + spread / 100  # 转换为实际价格
            bid_vol, ask_vol = generate_volume()

            # 写入 tick
            writer.writerow([
                current_time.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3],
                'XAUUSD',
                round(bid, 5),
                round(ask, 5),
                bid_vol,
                ask_vol
            ])
            written_count += 1
            tick_count += 1

            # 随机跳到下一秒（1-5 个 tick）
            tick_rate = random.randint(1, 5)
            for _ in range(tick_rate):
                current_time += timedelta(seconds=1)
                if current_time >= end_date:
                    break

            # 进度报告
            progress = int((current_time - start_date).total_seconds() / total_seconds * 100)
            if progress >= last_progress + 10:
                print(f"   进度: {progress}% ({written_count:,} ticks written)")
                last_progress = progress

    print(f"\n✅ 生成完成!")
    print(f"   总 tick 数: {written_count:,}")
    print(f"   文件大小: {os.path.getsize(output_file) / 1024 / 1024:.2f} MB")
    print(f"   保存至: {output_file}")

    return written_count


def main():
    """主函数"""
    # 生成 3 个月的模拟数据
    end_date = datetime.now()
    start_date = end_date - timedelta(days=90)  # 3 个月

    output_dir = "/tmp/tickgold"
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, f"XAUUSD_simulated_3months.csv")

    # XAUUSD 当前价格约 2000
    start_price = 2000.0

    generate_simulated_ticks(
        start_date=start_date,
        end_date=end_date,
        start_price=start_price,
        output_file=output_file
    )


if __name__ == "__main__":
    main()
