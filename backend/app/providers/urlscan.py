from app.providers.base import BaseProvider
from typing import Dict, Any
import logging
import asyncio

logger = logging.getLogger(__name__)


class URLScanProvider(BaseProvider):
    """URLScan.io website analysis provider"""
    
    BASE_URL = "https://urlscan.io/api/v1"
    
    @property
    def name(self) -> str:
        return "urlscan"
    
    async def enrich(self, query: str, entity_type: str) -> Dict[str, Any]:
        """Submit domain for scanning and get results"""
        if entity_type != "domain":
            return {"success": False, "error": "URLScan only supports domain lookups"}
        
        if not self.api_key:
            # Try to search without API key (public results)
            return await self._search_public(query)
        
        try:
            # Submit scan
            headers = {"API-Key": self.api_key}
            submit_response = await self.client.post(
                f"{self.BASE_URL}/scan/",
                headers=headers,
                json={"url": f"https://{query}", "visibility": "public"}
            )
            submit_response.raise_for_status()
            submit_data = submit_response.json()
            
            uuid = submit_data.get("uuid")
            
            # URLScan takes time - try to get results with retries
            result_data = None
            for attempt in range(3):
                await asyncio.sleep(15 if attempt == 0 else 10)  # Wait longer on first attempt
                try:
                    result_response = await self.client.get(
                        f"{self.BASE_URL}/result/{uuid}/",
                        headers=headers
                    )
                    if result_response.status_code == 200:
                        result_data = result_response.json()
                        break
                except:
                    continue
            
            # If scan not ready, return partial data with links
            if not result_data:
                return {
                    "success": True,
                    "provider": self.name,
                    "domain": query,
                    "scan_id": uuid,
                    "screenshot_url": f"https://urlscan.io/screenshots/{uuid}.png",
                    "report_url": f"https://urlscan.io/result/{uuid}/",
                    "status": "processing",
                    "message": "Scan submitted, results will be available shortly"
                }
            
            page = result_data.get("page", {})
            stats = result_data.get("stats", {})
            
            return {
                "success": True,
                "provider": self.name,
                "domain": query,
                "scan_id": uuid,
                "screenshot_url": submit_data.get("screenshotURL"),
                "report_url": f"https://urlscan.io/result/{uuid}/",
                "ip_addresses": page.get("ip", []),
                "asn": page.get("asn"),
                "country": page.get("country"),
                "server": page.get("server"),
                "title": page.get("title"),
                "total_links": stats.get("totalLinks", 0),
                "malicious_score": stats.get("malicious", 0),
                "technologies": [tech.get("name") for tech in result_data.get("meta", {}).get("processors", {}).get("wappa", {}).get("data", [])],
                "certificates": len(result_data.get("lists", {}).get("certificates", [])),
            }
            
        except Exception as e:
            return self._handle_error(e)
    
    async def _search_public(self, query: str) -> Dict[str, Any]:
        """Search public URLScan results"""
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/search/",
                params={"q": f"domain:{query}", "size": 1}
            )
            response.raise_for_status()
            data = response.json()
            
            results = data.get("results", [])
            if not results:
                return {
                    "success": True,
                    "provider": self.name,
                    "domain": query,
                    "found": False,
                    "message": "No public scans found"
                }
            
            latest = results[0]
            page = latest.get("page", {})
            
            # Extract UUID from result URL if available
            result_url = latest.get("result", "")
            uuid = result_url.split("/")[-2] if result_url else None
            web_report_url = f"https://urlscan.io/result/{uuid}/" if uuid else result_url
            
            return {
                "success": True,
                "provider": self.name,
                "domain": query,
                "found": True,
                "scan_date": latest.get("task", {}).get("time"),
                "screenshot_url": latest.get("screenshot"),
                "report_url": web_report_url,
                "ip": page.get("ip"),
                "country": page.get("country"),
                "server": page.get("server"),
                "title": page.get("title"),
            }
            
        except Exception as e:
            return self._handle_error(e)
