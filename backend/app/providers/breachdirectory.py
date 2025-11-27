from app.providers.base import BaseProvider
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class BreachDirectoryProvider(BaseProvider):
    """BreachDirectory.org - Completely free breach checker"""
    
    BASE_URL = "https://breachdirectory.p.rapidapi.com"
    
    @property
    def name(self) -> str:
        return "breachdirectory"
    
    async def enrich(self, query: str, entity_type: str) -> Dict[str, Any]:
        """Check if email/username has been breached"""
        if entity_type not in ["email"]:
            return {"success": False, "error": "BreachDirectory supports email lookups"}
        
        try:
            # BreachDirectory via RapidAPI (free tier available)
            # Alternative: Use their direct API if available
            
            # For now, use a simple approach - check their public search
            # Note: This is a placeholder - you'd need to implement actual API call
            # based on their current API structure
            
            response = await self.client.get(
                "https://breachdirectory.org/api/search",
                params={"term": query}
            )
            
            if response.status_code == 404:
                return {
                    "success": True,
                    "provider": self.name,
                    "query": query,
                    "found": False,
                    "breach_count": 0
                }
            
            response.raise_for_status()
            data = response.json()
            
            # Parse results
            results = data.get("results", [])
            sources = list(set([r.get("source") for r in results if r.get("source")]))
            
            return {
                "success": True,
                "provider": self.name,
                "query": query,
                "found": len(results) > 0,
                "breach_count": len(sources),
                "sources": sources,
                "total_records": len(results)
            }
            
        except Exception as e:
            return self._handle_error(e)
