from app.providers.base import BaseProvider
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class HIBPProvider(BaseProvider):
    """Have I Been Pwned provider"""
    
    BASE_URL = "https://haveibeenpwned.com/api/v3"
    
    @property
    def name(self) -> str:
        return "haveibeenpwned"
    
    async def enrich(self, query: str, entity_type: str) -> Dict[str, Any]:
        """Check if email has been breached"""
        if entity_type != "email":
            return {"success": False, "error": "HIBP only supports email lookups"}
        
        try:
            headers = {}
            if self.api_key:
                headers["hibp-api-key"] = self.api_key
            
            # Get breaches
            response = await self.client.get(
                f"{self.BASE_URL}/breachedaccount/{query}",
                headers=headers
            )
            
            if response.status_code == 404:
                return {
                    "success": True,
                    "provider": self.name,
                    "breaches": [],
                    "breach_count": 0
                }
            
            response.raise_for_status()
            breaches = response.json()
            
            return {
                "success": True,
                "provider": self.name,
                "breaches": breaches,
                "breach_count": len(breaches),
                "data_classes": list(set(
                    dc for breach in breaches 
                    for dc in breach.get("DataClasses", [])
                ))
            }
            
        except Exception as e:
            return self._handle_error(e)
