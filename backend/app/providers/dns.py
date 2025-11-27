from app.providers.base import BaseProvider
from typing import Dict, Any
import dns.resolver
import logging

logger = logging.getLogger(__name__)


class DNSProvider(BaseProvider):
    """DNS resolution provider"""
    
    @property
    def name(self) -> str:
        return "dns"
    
    async def enrich(self, query: str, entity_type: str) -> Dict[str, Any]:
        """Resolve DNS records"""
        if entity_type != "domain":
            return {"success": False, "error": "DNS only supports domain lookups"}
        
        try:
            resolver = dns.resolver.Resolver()
            results = {
                "success": True,
                "provider": self.name,
                "domain": query,
                "records": {}
            }
            
            # A records (IPv4)
            try:
                a_records = resolver.resolve(query, 'A')
                results["records"]["A"] = [str(r) for r in a_records]
            except:
                results["records"]["A"] = []
            
            # AAAA records (IPv6)
            try:
                aaaa_records = resolver.resolve(query, 'AAAA')
                results["records"]["AAAA"] = [str(r) for r in aaaa_records]
            except:
                results["records"]["AAAA"] = []
            
            # MX records
            try:
                mx_records = resolver.resolve(query, 'MX')
                results["records"]["MX"] = [
                    {"priority": r.preference, "exchange": str(r.exchange)}
                    for r in mx_records
                ]
            except:
                results["records"]["MX"] = []
            
            # NS records
            try:
                ns_records = resolver.resolve(query, 'NS')
                results["records"]["NS"] = [str(r) for r in ns_records]
            except:
                results["records"]["NS"] = []
            
            # TXT records
            try:
                txt_records = resolver.resolve(query, 'TXT')
                results["records"]["TXT"] = [str(r) for r in txt_records]
            except:
                results["records"]["TXT"] = []
            
            return results
            
        except Exception as e:
            return self._handle_error(e)
