#!/usr/bin/env python3
"""
Tick Gold量化交易系统后端启动脚本
"""

import os
import sys
import uvicorn
from config import config, validate_config

def main():
    """主函数：启动FastAPI服务"""

    print("🚀 Tick Gold量化交易系统后端")
    print("=" * 50)

    # 验证配置
    if not validate_config():
        print("❌ 配置验证失败，启动中止")
        sys.exit(1)

    print(f"\n📊 系统信息：")
    print(f"   - 应用名称：{config.APP_NAME}")
    print(f"   - 版本：{config.APP_VERSION}")
    print(f"   - 交易品种：{config.SYMBOL}")
    print(f"   - 支持周期：{', '.join(config.TIMEFRAMES)}")
    print(f"   - 目标吞吐量：{config.MAX_TICK_RATE} ticks/sec")
    print(f"   - 目标延迟：{config.TARGET_LATENCY} ms")

    print(f"\n🌐 网络配置：")
    print(f"   - API地址：{config.API_HOST}:{config.API_PORT}")
    print(f"   - 调试模式：{'启用' if config.API_DEBUG else '禁用'}")

    print(f"\n💾 数据源：")
    print(f"   - 实时数据源：{config.DATA_SOURCE}")
    print(f"   - 历史数据源：{config.HISTORICAL_DATA_SOURCE}")

    print(f"\n🛡️  风控配置：")
    print(f"   - 最大回撤：{config.MAX_DRAWDOWN * 100:.1f}%")
    print(f"   - 最大日亏损：{config.MAX_DAILY_LOSS * 100:.1f}%")
    print(f"   - 单仓上限：{config.POSITION_SIZE * 100:.1f}%")

    print(f"\n🔧 启动参数：")
    print(f"   - 工作进程：1")
    print(f"   - 超时时长：60s")
    print(f"   - 日志级别：{config.LOG_LEVEL}")

    print("\n" + "=" * 50)
    print("正在启动服务...")

    # 启动FastAPI服务
    uvicorn.run(
        "main:app",
        host=config.API_HOST,
        port=config.API_PORT,
        reload=config.API_DEBUG,
        log_level=config.LOG_LEVEL.lower(),
        access_log=True,
        timeout_keep_alive=60,
    )

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 服务已停止")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ 启动失败：{e}")
        sys.exit(1)