from app.providers.base import BaseProvider
from typing import Dict, Any
import whois
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class WHOISProvider(BaseProvider):
    """WHOIS lookup provider"""
    
    @property
    def name(self) -> str:
        return "whois"
    
    async def enrich(self, query: str, entity_type: str) -> Dict[str, Any]:
        """Perform WHOIS lookup"""
        if entity_type != "domain":
            return {"success": False, "error": "WHOIS only supports domain lookups"}
        
        try:
            w = whois.whois(query)
            
            # Extract dates
            creation_date = w.creation_date
            if isinstance(creation_date, list):
                creation_date = creation_date[0]
            
            expiration_date = w.expiration_date
            if isinstance(expiration_date, list):
                expiration_date = expiration_date[0]
            
            # Calculate domain age
            domain_age_days = None
            if creation_date:
                domain_age_days = (datetime.now() - creation_date).days
            
            return {
                "success": True,
                "provider": self.name,
                "domain": query,
                "registrar": w.registrar,
                "creation_date": creation_date.isoformat() if creation_date else None,
                "expiration_date": expiration_date.isoformat() if expiration_date else None,
                "domain_age_days": domain_age_days,
                "name_servers": w.name_servers if w.name_servers else [],
                "status": w.status if w.status else [],
                "emails": w.emails if w.emails else [],
                "country": w.country,
                "registrant": w.name,
                "org": w.org,
            }
            
        except Exception as e:
            return self._handle_error(e)
