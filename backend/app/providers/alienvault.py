from app.providers.base import BaseProvider
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class AlienVaultProvider(BaseProvider):
    """AlienVault OTX (Open Threat Exchange) provider"""
    
    BASE_URL = "https://otx.alienvault.com/api/v1"
    
    @property
    def name(self) -> str:
        return "alienvault"
    
    async def enrich(self, query: str, entity_type: str) -> Dict[str, Any]:
        """Get threat intelligence from AlienVault OTX"""
        if entity_type not in ["domain", "ip"]:
            return {"success": False, "error": "AlienVault supports domain and IP lookups"}
        
        try:
            headers = {}
            if self.api_key:
                headers["X-OTX-API-KEY"] = self.api_key
            
            if entity_type == "domain":
                endpoint = f"indicators/domain/{query}/general"
            else:  # ip
                endpoint = f"indicators/IPv4/{query}/general"
            
            response = await self.client.get(
                f"{self.BASE_URL}/{endpoint}",
                headers=headers
            )
            response.raise_for_status()
            data = response.json()
            
            # Get reputation/pulse count
            pulse_info = data.get("pulse_info", {})
            pulses = pulse_info.get("pulses", [])
            
            # Extract threat indicators
            threat_tags = []
            threat_families = []
            for pulse in pulses:
                # Tags - ensure they're strings
                tags = pulse.get("tags", [])
                for tag in tags:
                    if isinstance(tag, str) and tag not in threat_tags:
                        threat_tags.append(tag)
                
                # Malware families - handle both strings and dicts
                families = pulse.get("malware_families", [])
                for family in families:
                    if isinstance(family, str) and family not in threat_families:
                        threat_families.append(family)
                    elif isinstance(family, dict) and family.get("display_name"):
                        name = family["display_name"]
                        if name not in threat_families:
                            threat_families.append(name)
            
            # Calculate threat score more intelligently
            pulse_count = pulse_info.get("count", 0)
            
            # Base score from pulse count (logarithmic scale)
            if pulse_count == 0:
                threat_score = 0
            elif pulse_count <= 5:
                threat_score = pulse_count * 5  # 0-25
            elif pulse_count <= 20:
                threat_score = 25 + (pulse_count - 5) * 2  # 25-55
            else:
                threat_score = 55 + min((pulse_count - 20), 45)  # 55-100
            
            # Reduce score if whitelisted
            if data.get("whitelisted", False):
                threat_score = max(0, threat_score - 50)
            
            # Increase score if malware families detected
            if threat_families:
                threat_score = min(100, threat_score + len(threat_families) * 10)
            
            result = {
                "success": True,
                "provider": self.name,
                "query": query,
                "entity_type": entity_type,
                "pulse_count": pulse_count,
                "threat_score": int(threat_score),
                "tags": threat_tags[:10],
                "malware_families": threat_families,
                "whitelisted": data.get("whitelisted", False),
            }
            
            # Domain-specific
            if entity_type == "domain":
                result.update({
                    "alexa_rank": data.get("alexa"),
                })
            
            # IP-specific
            if entity_type == "ip":
                result.update({
                    "asn": data.get("asn"),
                    "country_code": data.get("country_code"),
                    "city": data.get("city"),
                })
            
            return result
            
        except Exception as e:
            return self._handle_error(e)
