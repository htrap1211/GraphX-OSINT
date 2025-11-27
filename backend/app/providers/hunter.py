from app.providers.base import BaseProvider
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class HunterProvider(BaseProvider):
    """Hunter.io email verification and domain search"""
    
    BASE_URL = "https://api.hunter.io/v2"
    
    @property
    def name(self) -> str:
        return "hunter"
    
    async def enrich(self, query: str, entity_type: str) -> Dict[str, Any]:
        """Verify email or search domain"""
        if not self.api_key:
            return {"success": False, "error": "Hunter API key required"}
        
        try:
            if entity_type == "email":
                return await self._verify_email(query)
            elif entity_type == "domain":
                return await self._domain_search(query)
            else:
                return {"success": False, "error": "Hunter supports email and domain only"}
                
        except Exception as e:
            return self._handle_error(e)
    
    async def _verify_email(self, email: str) -> Dict[str, Any]:
        """Verify email address"""
        response = await self.client.get(
            f"{self.BASE_URL}/email-verifier",
            params={"email": email, "api_key": self.api_key}
        )
        response.raise_for_status()
        data = response.json()
        
        return {
            "success": True,
            "provider": self.name,
            "email": email,
            "status": data["data"]["status"],
            "score": data["data"]["score"],
            "result": data["data"]["result"],
            "sources": data["data"].get("sources", [])
        }
    
    async def _domain_search(self, domain: str) -> Dict[str, Any]:
        """Search emails for domain"""
        response = await self.client.get(
            f"{self.BASE_URL}/domain-search",
            params={"domain": domain, "api_key": self.api_key, "limit": 10}
        )
        response.raise_for_status()
        data = response.json()
        
        emails = data["data"].get("emails", [])
        
        return {
            "success": True,
            "provider": self.name,
            "domain": domain,
            "emails": [e["value"] for e in emails],
            "email_count": len(emails),
            "organization": data["data"].get("organization"),
            "pattern": data["data"].get("pattern")
        }
