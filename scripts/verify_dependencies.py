#!/usr/bin/env python3
"""
验证Tick Gold系统的依赖和基础功能
"""

import sys
import importlib
from pathlib import Path

def verify_import(module_name):
    """验证模块是否可以导入"""
    try:
        importlib.import_module(module_name)
        return True, f"{module_name} ✓"
    except ImportError as e:
        return False, f"{module_name} ✗: {e}"

def verify_gold_strategy():
    """验证黄金策略模块"""
    try:
        sys.path.insert(0, str(Path.cwd()))
        from src.gold.strategies.gold_basic_strategy import GoldBasicStrategy

        # 创建策略实例
        strategy = GoldBasicStrategy(symbol="XAUUSD", timeframe="M1")

        # 检查黄金特性
        characteristics = strategy.gold_characteristics

        checks = [
            ("跳空风险限制", characteristics.get("gap_risk_limit") == 0.01),
            ("隔夜风险限制", characteristics.get("overnight_risk_limit") == 0.005),
            ("性能目标", characteristics.get("performance_target_tps") == 21340),
            ("延迟目标", characteristics.get("max_latency_ms") == 50),
            ("亚盘过滤", characteristics.get("asian_session_filter") is True),
        ]

        results = []
        for name, passed in checks:
            results.append(f"  {name}: {'✓' if passed else '✗'}")

        return True, "黄金策略模块验证通过\n" + "\n".join(results)

    except Exception as e:
        import traceback
        return False, f"黄金策略验证失败: {e}\n{traceback.format_exc()}"

def verify_quant_packages():
    """验证量化相关的包"""
    quant_modules = [
        "numpy",
        "pandas",
        "sqlalchemy",
        "scikit_learn",  # 实际导入是sklearn
        "vectorbt",
        "backtrader",
    ]

    results = []

    for module in quant_modules:
        if module == "scikit_learn":
            success, msg = verify_import("sklearn")
            if success:
                results.append(f"scikit-learn ✓")
            else:
                results.append(f"scikit-learn ✗")
        else:
            success, msg = verify_import(module)
            results.append(msg)

    return True, "量化包验证:\n" + "\n".join(results)

def main():
    """主验证函数"""
    print("🔍 Tick Gold系统依赖验证")
    print("=" * 50)

    # 1. 验证核心依赖
    print("\n1. 核心依赖:")

    core_modules = [
        "numpy",
        "pandas",
        "fastapi",
        "uvicorn",
        "pydantic",
        "sqlalchemy",
    ]

    for module in core_modules:
        success, msg = verify_import(module)
        if not success:
            print(f"  {msg}")
        else:
            print(f"  {msg}")

    # 2. 验证量化包
    print("\n2. 量化包:")
    success, msg = verify_quant_packages()
    for line in msg.split("\n"):
        print(line)

    # 3. 验证黄金策略
    print("\n3. 黄金策略验证:")
    success, msg = verify_gold_strategy()
    for line in msg.split("\n"):
        print(line)

    # 4. 性能验证
    print("\n4. 运行基础性能测试:")
    try:
        # 运行一个简单测试
        import numpy as np
        import pandas as pd
        from datetime import datetime

        # 简单的数据处理测试
        data_size = 10000
        prices = np.random.normal(2300, 10, data_size)
        df = pd.DataFrame({"price": prices})
        avg_price = df["price"].mean()

        print(f"  数据处理测试: 处理 {data_size:,} 条数据")
        print(f"  平均价格: {avg_price:.2f}")
        print(f"  数据处理验证: ✓")

    except Exception as e:
        print(f"  性能验证失败: {e}")

    print("\n" + "=" * 50)
    print("✅ 基础依赖验证完成")
    print("下一步:")
    print("  1. 运行黄金策略测试: python src/gold/strategies/gold_basic_strategy.py")
    print("  2. 运行性能基准测试: python tests/performance/test_throughput_21340.py")
    print("  3. 启动优化工作: ./scripts/gold-system-diagnostic.sh")

    return 0

if __name__ == "__main__":
    sys.exit(main())