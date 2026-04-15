"""Configuration management for Tick Gold Backend."""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings."""

    # App
    APP_NAME: str = "Tick Gold"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database - MUST be set via environment variables
    DATABASE_URL: str = ""
    DATABASE_URL_SYNC: str = ""

    # Redis - MUST be set via environment variables
    REDIS_URL: str = ""

    # TimescaleDB
    TIMESERIES_BUCKET_INTERVAL: str = "1 day"

    # Risk Parameters
    GAP_RISK: float = 0.01
    OVERNIGHT_RISK: float = 0.005
    MAX_DRAWDOWN: float = 0.02
    POSITION_SIZE: float = 1.0

    # Security
    SECRET_KEY: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
