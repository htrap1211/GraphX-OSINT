from app.providers.base import BaseProvider
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class VirusTotalProvider(BaseProvider):
    """VirusTotal threat intelligence provider"""
    
    BASE_URL = "https://www.virustotal.com/api/v3"
    
    @property
    def name(self) -> str:
        return "virustotal"
    
    async def enrich(self, query: str, entity_type: str) -> Dict[str, Any]:
        """Get VirusTotal data for domain or IP"""
        if entity_type not in ["domain", "ip"]:
            return {"success": False, "error": "VirusTotal supports domain and IP lookups"}
        
        if not self.api_key:
            return {"success": False, "error": "VirusTotal API key required"}
        
        try:
            headers = {"x-apikey": self.api_key}
            
            if entity_type == "domain":
                response = await self.client.get(
                    f"{self.BASE_URL}/domains/{query}",
                    headers=headers
                )
            else:  # ip
                response = await self.client.get(
                    f"{self.BASE_URL}/ip_addresses/{query}",
                    headers=headers
                )
            
            response.raise_for_status()
            data = response.json()
            
            attributes = data.get("data", {}).get("attributes", {})
            stats = attributes.get("last_analysis_stats", {})
            
            # Calculate reputation score
            total = sum(stats.values())
            malicious = stats.get("malicious", 0)
            suspicious = stats.get("suspicious", 0)
            reputation_score = 100 - ((malicious + suspicious) / max(total, 1) * 100) if total > 0 else 50
            
            result = {
                "success": True,
                "provider": self.name,
                "query": query,
                "entity_type": entity_type,
                "reputation_score": round(reputation_score, 2),
                "malicious_count": malicious,
                "suspicious_count": suspicious,
                "harmless_count": stats.get("harmless", 0),
                "undetected_count": stats.get("undetected", 0),
                "total_engines": total,
                "categories": attributes.get("categories", {}),
                "last_analysis_date": attributes.get("last_analysis_date"),
            }
            
            # Domain-specific data
            if entity_type == "domain":
                result.update({
                    "registrar": attributes.get("registrar"),
                    "creation_date": attributes.get("creation_date"),
                    "last_update_date": attributes.get("last_update_date"),
                    "popularity_rank": attributes.get("popularity_ranks", {}),
                })
            
            # IP-specific data
            if entity_type == "ip":
                result.update({
                    "asn": attributes.get("asn"),
                    "as_owner": attributes.get("as_owner"),
                    "country": attributes.get("country"),
                    "network": attributes.get("network"),
                })
            
            return result
            
        except Exception as e:
            return self._handle_error(e)
