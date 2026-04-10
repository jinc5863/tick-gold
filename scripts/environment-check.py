#!/usr/bin/env python3
"""
Python环境检查脚本
验证Tick Gold项目所需的所有依赖
"""

import sys
import importlib
import os
from pathlib import Path

def check_package(package_name, min_version=None):
    """检查Python包是否可用"""
    try:
        module = importlib.import_module(package_name)
        version = getattr(module, '__version__', getattr(module, 'version', '未知'))

        if min_version:
            from packaging import version as pkg_version
            if pkg_version.parse(str(version)) >= pkg_version.parse(min_version):
                return True, f"{package_name} {version} (满足最低要求 {min_version})"
            else:
                return False, f"{package_name} {version} (需要 ≥{min_version})"
        else:
            return True, f"{package_name} {version}"

    except ImportError:
        return False, f"{package_name} 未安装"
    except Exception as e:
        return False, f"{package_name} 检查失败: {e}"

def check_gold_strategy():
    """检查黄金策略实现"""
    try:
        sys.path.insert(0, str(Path.cwd()))
        from src.gold.strategies.gold_basic_strategy import GoldBasicStrategy

        # 测试策略基础功能
        strategy = GoldBasicStrategy(symbol="XAUUSD", timeframe="M1")

        # 测试跳空风险
        gap_triggered, gap_percent, _ = strategy.check_gap_risk(1010, 1000)

        # 测试亚盘时段
        from datetime import datetime
        asian_time = datetime(2026, 4, 8, 2, 0, 0)
        non_asian_time = datetime(2026, 4, 8, 12, 0, 0)

        is_asian = strategy.is_asian_trading_hour(asian_time)
        is_non_asian = strategy.is_asian_trading_hour(non_asian_time)

        # 测试隔夜风险
        overnight_risk = strategy.calculate_overnight_risk(
            position_size=100000,
            current_volatility=0.02,
            hours_until_close=8
        )

        tests_passed = [
            gap_triggered == True,
            abs(gap_percent - 0.01) < 0.00001,
            is_asian == True,
            is_non_asian == False,
            "risk_ratio" in overnight_risk
        ]

        if all(tests_passed):
            return True, "黄金策略所有基础功能正常"
        else:
            failed_tests = [i for i, passed in enumerate(tests_passed) if not passed]
            return False, f"黄金策略测试失败: 项目 {failed_tests}"

    except Exception as e:
        import traceback
        return False, f"黄金策略检查失败: {e}\n{traceback.format_exc()}"

def check_project_structure():
    """检查项目结构"""
    required_paths = [
        "src/src",
        "src/backend",
        "src/gold/strategies",
        "config",
        "tests",
        "tests/unit",
        "tests/performance"
    ]

    required_files = [
        "config/app_config.json",
        "src/backend/requirements.txt",
        "src/package.json"
    ]

    missing_dirs = []
    missing_files = []

    for path in required_paths:
        if not os.path.exists(path):
            missing_dirs.append(path)

    for file in required_files:
        if not os.path.exists(file):
            missing_files.append(file)

    return missing_dirs, missing_files

def main():
    """主检查函数"""
    print("🔍 Tick Gold项目环境检查")
    print("=" * 50)

    # 1. 检查Python版本
    print(f"Python版本: {sys.version}")

    # 2. 检查关键包
    print("\n📦 检查关键依赖包:")

    packages = [
        ("numpy", "1.21.0"),
        ("pandas", "1.3.0"),
        ("fastapi", "0.68.0"),
        ("pydantic", "1.8.0"),
        ("sqlalchemy", "1.4.0"),
        ("redis", "4.0.0"),
        ("zmq", "22.0.0"),  # pyzmq
        ("ta_lib", None),   # TA-Lib
    ]

    package_results = []
    for package_name, min_version in packages:
        success, message = check_package(package_name, min_version)
        package_results.append((success, message))

        status = "✅" if success else "❌"
        print(f"  {status} {message}")

    # 3. 检查量化相关包
    print("\n📊 检查量化相关包:")

    quant_packages = [
        ("backtrader", None),
        ("scikit_learn", "0.24.0"),  # scikit-learn
        ("talib", None),  # TA-Lib
        ("vectorbt", None),
    ]

    for package_name, min_version in quant_packages:
        success, message = check_package(package_name, min_version)
        status = "✅" if success else "⚠️ "
        print(f"  {status} {message}")

    # 4. 检查项目结构
    print("\n📁 检查项目结构:")
    missing_dirs, missing_files = check_project_structure()

    if missing_dirs:
        print(f"  ❌ 缺失目录: {', '.join(missing_dirs)}")
    else:
        print("  ✅ 所有目录存在")

    if missing_files:
        print(f"  ❌ 缺失文件: {', '.join(missing_files)}")
    else:
        print("  ✅ 所有关键文件存在")

    # 5. 检查黄金策略
    print("\n🏦 检查黄金交易策略:")
    success, message = check_gold_strategy()

    status = "✅" if success else "❌"
    print(f"  {status} {message}")

    # 6. 总结
    print("\n" + "=" * 50)
    print("📋 检查总结:")

    total_packages = len(packages) + len(quant_packages)
    successful_packages = sum(1 for success, _ in package_results if success)

    print(f"  依赖包: {successful_packages}/{total_packages}")
    print(f"  项目结构: {'完整' if not missing_dirs and not missing_files else '不完整'}")
    print(f"  黄金策略: {'正常' if success else '有问题'}")

    # 总体建议
    print("\n💡 建议:")

    if missing_dirs or missing_files:
        print("  1. 创建缺失的目录和文件")

    if any(not success for success, _ in package_results):
        print("  2. 安装缺失的Python包")
        print(f"    运行: pip install -r src/backend/requirements.txt")

    if not success:  # gold strategy check failed
        print("  3. 修复黄金策略实现")

    print("  4. 运行测试: python -m pytest tests/unit/")
    print("  5. 系统诊断: ./scripts/gold-system-diagnostic.sh")

    return (
        all(success for success, _ in package_results) and
        not missing_dirs and
        not missing_files and
        success
    )

if __name__ == "__main__":
    try:
        all_passed = main()
        sys.exit(0 if all_passed else 1)
    except Exception as e:
        print(f"❌ 检查过程出错: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)