"""
Test OSINT providers without requiring Neo4j/Redis
"""
import asyncio
from app.providers.dns import DNSProvider
from app.providers.whois import WHOISProvider
from app.providers.geoip import GeoIPProvider


async def test_dns():
    print("\n🔍 Testing DNS Provider...")
    provider = DNSProvider()
    result = await provider.enrich("github.com", "domain")
    print(f"✅ DNS Result: {result}")
    await provider.close()


async def test_whois():
    print("\n🔍 Testing WHOIS Provider...")
    provider = WHOISProvider()
    result = await provider.enrich("github.com", "domain")
    print(f"✅ WHOIS Result: {result}")
    await provider.close()


async def test_geoip():
    print("\n🔍 Testing GeoIP Provider...")
    provider = GeoIPProvider()
    result = await provider.enrich("8.8.8.8", "ip")
    print(f"✅ GeoIP Result: {result}")
    await provider.close()


async def main():
    print("=" * 60)
    print("OSINT Provider Test Suite")
    print("=" * 60)
    
    await test_dns()
    await test_whois()
    await test_geoip()
    
    print("\n" + "=" * 60)
    print("✅ All tests completed!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
