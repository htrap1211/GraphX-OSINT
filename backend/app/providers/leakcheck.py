from app.providers.base import BaseProvider
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class LeakCheckProvider(BaseProvider):
    """LeakCheck.io breach data provider - Free alternative to HIBP"""
    
    BASE_URL = "https://leakcheck.io/api/public"
    
    @property
    def name(self) -> str:
        return "leakcheck"
    
    async def enrich(self, query: str, entity_type: str) -> Dict[str, Any]:
        """Check if email has been in data breaches"""
        if entity_type != "email":
            return {"success": False, "error": "LeakCheck only supports email lookups"}
        
        try:
            # LeakCheck public API (no key needed for basic search)
            response = await self.client.get(
                f"{self.BASE_URL}",
                params={"check": query}
            )
            
            if response.status_code == 404:
                return {
                    "success": True,
                    "provider": self.name,
                    "email": query,
                    "found": False,
                    "sources": [],
                    "breach_count": 0
                }
            
            response.raise_for_status()
            data = response.json()
            
            # Parse response
            if data.get("success") and data.get("found"):
                sources = data.get("sources", [])
                
                return {
                    "success": True,
                    "provider": self.name,
                    "email": query,
                    "found": True,
                    "sources": sources,
                    "breach_count": len(sources),
                    "message": f"Found in {len(sources)} breaches"
                }
            else:
                return {
                    "success": True,
                    "provider": self.name,
                    "email": query,
                    "found": False,
                    "sources": [],
                    "breach_count": 0
                }
            
        except Exception as e:
            # If public API fails, try with API key if available
            if self.api_key:
                return await self._check_with_key(query)
            return self._handle_error(e)
    
    async def _check_with_key(self, email: str) -> Dict[str, Any]:
        """Check with API key for more detailed results"""
        try:
            headers = {"X-API-Key": self.api_key}
            response = await self.client.get(
                "https://leakcheck.io/api/v2/query",
                headers=headers,
                params={"query": email, "type": "email"}
            )
            response.raise_for_status()
            data = response.json()
            
            if not data.get("success"):
                return {
                    "success": True,
                    "provider": self.name,
                    "email": email,
                    "found": False,
                    "breach_count": 0
                }
            
            results = data.get("result", [])
            sources = list(set([r.get("source") for r in results if r.get("source")]))
            
            return {
                "success": True,
                "provider": self.name,
                "email": email,
                "found": len(results) > 0,
                "breach_count": len(sources),
                "sources": sources,
                "total_entries": len(results),
                "breaches": [
                    {
                        "name": r.get("source"),
                        "line": r.get("line"),
                        "fields": r.get("fields", [])
                    }
                    for r in results[:10]  # Limit to 10 for performance
                ]
            }
            
        except Exception as e:
            return self._handle_error(e)
