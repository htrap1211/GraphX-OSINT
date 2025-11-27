from app.providers.base import BaseProvider
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class ShodanProvider(BaseProvider):
    """Shodan IP intelligence provider"""
    
    BASE_URL = "https://api.shodan.io"
    
    @property
    def name(self) -> str:
        return "shodan"
    
    async def enrich(self, query: str, entity_type: str) -> Dict[str, Any]:
        """Get Shodan data for IP address"""
        if entity_type != "ip":
            return {"success": False, "error": "Shodan only supports IP lookups"}
        
        if not self.api_key:
            return {"success": False, "error": "Shodan API key required"}
        
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/shodan/host/{query}",
                params={"key": self.api_key}
            )
            response.raise_for_status()
            data = response.json()
            
            # Extract key information
            ports = [item.get("port") for item in data.get("data", [])]
            services = list(set([
                item.get("product", "unknown") 
                for item in data.get("data", []) 
                if item.get("product")
            ]))
            
            vulns = []
            for item in data.get("data", []):
                if "vulns" in item:
                    vulns.extend(item["vulns"].keys())
            
            return {
                "success": True,
                "provider": self.name,
                "ip": query,
                "ports": ports,
                "open_ports_count": len(ports),
                "services": services,
                "vulnerabilities": list(set(vulns)),
                "vuln_count": len(set(vulns)),
                "hostnames": data.get("hostnames", []),
                "domains": data.get("domains", []),
                "org": data.get("org"),
                "isp": data.get("isp"),
                "asn": data.get("asn"),
                "country_code": data.get("country_code"),
                "city": data.get("city"),
                "last_update": data.get("last_update"),
                "tags": data.get("tags", []),
                "os": data.get("os"),
            }
            
        except Exception as e:
            return self._handle_error(e)
