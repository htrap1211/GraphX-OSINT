from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Neo4j
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "osintpassword"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # API Keys
    hibp_api_key: Optional[str] = None
    hunter_api_key: Optional[str] = None
    shodan_api_key: Optional[str] = None
    virustotal_api_key: Optional[str] = None
    urlscan_api_key: Optional[str] = None
    alienvault_api_key: Optional[str] = None
    leakcheck_api_key: Optional[str] = None
    
    # Security
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # App
    environment: str = "development"
    debug: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
