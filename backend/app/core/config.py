from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Digital Air Purifier Monitoring System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-satpayev-wind-2026-very-secure-jwt-key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    # Default to SQLite if Postgres is not configured locally, allowing zero-friction startup
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./purifier.db"
    )
    
    # MQTT
    MQTT_BROKER_HOST: str = os.getenv("MQTT_BROKER_HOST", "localhost")
    MQTT_BROKER_PORT: int = int(os.getenv("MQTT_BROKER_PORT", "1883"))
    MQTT_USERNAME: str = os.getenv("MQTT_USERNAME", "")
    MQTT_PASSWORD: str = os.getenv("MQTT_PASSWORD", "")
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # System settings
    OFFLINE_TIMEOUT_SECONDS: int = 30  # If no telemetry for 30s -> OFFLINE
    DEFAULT_FILTER_MAX_HOURS: float = 720.0  # 30 days continuous
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost",
        "http://localhost:80",
        "*"
    ]

    model_config = SettingsConfigDict(case_sensitive=True)

settings = Settings()
