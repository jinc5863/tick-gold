import os
from typing import Optional
from dotenv import load_dotenv

# 加载环境变量
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', '..', 'config', '.env')
load_dotenv(env_path)

class Config:
    """应用配置类"""

    # 应用信息
    APP_NAME: str = "Tick Gold Quant API"
    APP_VERSION: str = "0.1.0"
    APP_DESCRIPTION: str = "XAUUSD量化交易系统API"

    # 数据库配置
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
    DB_NAME: str = os.getenv("DB_NAME", "tick_gold")
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "postgres")
    DB_TYPE: str = os.getenv("DB_TYPE", "postgresql")

    # 构建数据库URL
    @property
    def DATABASE_URL(self) -> str:
        return f"{self.DB_TYPE}://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    # Redis配置
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_PASSWORD: Optional[str] = os.getenv("REDIS_PASSWORD")
    REDIS_DB: int = 0

    @property
    def REDIS_URL(self) -> str:
        auth = f":{self.REDIS_PASSWORD}@" if self.REDIS_PASSWORD else ""
        return f"redis://{auth}{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    # MT5配置
    MT5_HOST: str = os.getenv("MT5_HOST", "127.0.0.1")
    MT5_PORT: int = int(os.getenv("MT5_PORT", "1611"))
    MT5_LOGIN: str = os.getenv("MT5_LOGIN", "admin")
    MT5_PASSWORD: str = os.getenv("MT5_PASSWORD", "admin")

    # API配置
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    API_DEBUG: bool = os.getenv("API_DEBUG", "false").lower() == "true"

    # 安全配置
    SECRET_KEY: str = os.getenv("SECRET_KEY", "tick_gold_default_secret_key_change_in_production_12345")
    JWT_EXPIRATION: int = int(os.getenv("JWT_EXPIRATION", "3600"))

    # 数据源配置
    DATA_SOURCE: str = os.getenv("DATA_SOURCE", "MT5")
    HISTORICAL_DATA_SOURCE: str = os.getenv("HISTORICAL_DATA_SOURCE", "Dukascopy")

    # 性能配置
    MAX_TICK_RATE: int = int(os.getenv("MAX_TICK_RATE", "21340"))
    TARGET_LATENCY: int = int(os.getenv("TARGET_LATENCY", "50"))

    # 合规配置
    AUDIT_ENABLED: bool = os.getenv("AUDIT_ENABLED", "true").lower() == "true"
    RISK_MONITORING: bool = os.getenv("RISK_MONITORING", "true").lower() == "true"

    # 交易配置
    SYMBOL: str = "XAUUSD"
    TIMEFRAMES: list = ["M1", "M5", "M15", "M30"]
    DEFAULT_TIMEFRAME: str = "M1"
    DATA_PRECISION: int = 5

    # 风险参数
    MAX_DRAWDOWN: float = 0.02  # 2%
    MAX_DAILY_LOSS: float = 0.005  # 0.5%
    POSITION_SIZE: float = 0.01  # 1%
    STOP_LOSS: float = 0.005  # 0.5%
    TAKE_PROFIT: float = 0.01  # 1%
    GAP_RISK: float = 0.01  # 1%
    OVERNIGHT_RISK: float = 0.005  # 0.5%

    # 数据配置
    TICK_BUFFER_SIZE: int = 1000000  # tick数据缓冲区大小
    HISTORICAL_DATA_PERIOD: str = "2y"  # 历史数据保留期

    # 第三方API密钥（示例）
    ALPHA_VANTAGE_KEY: Optional[str] = os.getenv("ALPHA_VANTAGE_KEY")
    FINNHUB_KEY: Optional[str] = os.getenv("FINNHUB_KEY")

    # 日志配置
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "logs/tickgold.log")

    # 回测配置
    BACKTEST_START_DATE: str = "2023-01-01"
    BACKTEST_END_DATE: str = "2023-12-31"
    BACKTEST_INITIAL_CAPITAL: float = 100000.0
    BACKTEST_COMMISSION: float = 0.001


# 创建全局配置实例
config = Config()


def validate_config():
    """验证配置文件"""
    missing_vars = []

    # 检查必需的环境变量
    required_vars = ["DB_HOST", "DB_NAME", "DB_USER", "SECRET_KEY"]

    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)

    if missing_vars:
        print(f"⚠️  警告：以下环境变量未设置：{', '.join(missing_vars)}")
        print("   请检查.env文件或环境变量设置")

    # 验证数据库连接信息
    print(f"✅ 使用数据库：{config.DB_HOST}:{config.DB_PORT}/{config.DB_NAME}")
    print(f"✅ Redis连接：{config.REDIS_HOST}:{config.REDIS_PORT}")
    print(f"✅ MT5连接：{config.MT5_HOST}:{config.MT5_PORT}")
    print(f"✅ API地址：{config.API_HOST}:{config.API_PORT}")

    return len(missing_vars) == 0


if __name__ == "__main__":
    print("🔧 Tick Gold配置检查")
    print("=" * 40)

    if validate_config():
        print("\n✅ 配置验证通过")
    else:
        print("\n⚠️  配置验证失败，请修复上述问题")