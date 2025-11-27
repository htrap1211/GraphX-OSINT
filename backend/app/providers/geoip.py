from app.providers.base import BaseProvider
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class GeoIPProvider(BaseProvider):
    """GeoIP and ASN lookup using ip-api.com (free tier)"""
    
    BASE_URL = "http://ip-api.com/json"
    
    @property
    def name(self) -> str:
        return "geoip"
    
    async def enrich(self, query: str, entity_type: str) -> Dict[str, Any]:
        """Get geolocation and ASN info for IP"""
        if entity_type != "ip":
            return {"success": False, "error": "GeoIP only supports IP lookups"}
        
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/{query}",
                params={"fields": "status,country,countryCode,region,city,isp,org,as,asname,mobile,proxy,hosting"}
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") == "fail":
                return {"success": False, "error": data.get("message", "Lookup failed")}
            
            return {
                "success": True,
                "provider": self.name,
                "ip": query,
                "country": data.get("country"),
                "country_code": data.get("countryCode"),
                "region": data.get("region"),
                "city": data.get("city"),
                "isp": data.get("isp"),
                "org": data.get("org"),
                "asn": data.get("as"),
                "asn_name": data.get("asname"),
                "is_mobile": data.get("mobile", False),
                "is_proxy": data.get("proxy", False),
                "is_hosting": data.get("hosting", False)
            }
            
        except Exception as e:
            return self._handle_error(e)
