import os
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Agronomic Intel Platform API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")

    # Data source
    CSV_PATH: str = os.getenv(
        "CSV_PATH",
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "kisumu_pilot_soils.csv"),
    )

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:8086").split(",")

        if origin.strip()
    ]

    ALLOWED_METHODS: List[str] = ["GET", "OPTIONS"]
    ALLOWED_HEADERS: List[str] = ["Content-Type", "Authorization", "X-Requested-With"]

    # Rate limiting (sliding window, in-memory)
    RATE_LIMIT_MAX_REQUESTS: int = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "60"))
    RATE_LIMIT_WINDOW_SECONDS: float = float(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))

    # Security
    MAX_PAYLOAD_BYTES: int = int(os.getenv("MAX_PAYLOAD_BYTES", str(16 * 1024)))  # 16 KB
    TRUSTED_HOSTS: List[str] = [
        host.strip()
        for host in os.getenv("TRUSTED_HOSTS", "*").split(",")
        if host.strip()
    ]

    # The 13 numeric soil metrics exposed for dynamic min/max filtering
    FILTERABLE_METRICS: List[str] = [
        "ph",
        "ec",
        "n_pct",
        "oc_pct",
        "ca",
        "mg",
        "k",
        "p_ppm",
        "fe",
        "zn",
        "mn",
        "cu",
        "cec",
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
