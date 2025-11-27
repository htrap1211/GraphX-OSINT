from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import httpx
import logging

logger = logging.getLogger(__name__)


class BaseProvider(ABC):
    """Base class for OSINT providers"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.client = httpx.AsyncClient(timeout=30.0)
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name"""
        pass
    
    @abstractmethod
    async def enrich(self, query: str, entity_type: str) -> Dict[str, Any]:
        """Enrich entity with OSINT data"""
        pass
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
    
    def _handle_error(self, error: Exception) -> Dict[str, Any]:
        """Standard error handling"""
        logger.error(f"{self.name} error: {error}")
        return {
            "success": False,
            "error": str(error),
            "provider": self.name
        }
