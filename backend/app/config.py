from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://healthcare:healthcare@localhost:5432/healthcare"
    frontend_origin: str = "http://localhost:5173"
    seed_on_startup: bool = True
    run_migrations: bool = True
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
