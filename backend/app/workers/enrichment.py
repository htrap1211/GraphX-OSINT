from app.celery_app import celery_app
from app.database import db
from app.config import settings
from app.providers.hibp import HIBPProvider
from app.providers.leakcheck import LeakCheckProvider
from app.providers.dns import DNSProvider
from app.providers.whois import WHOISProvider
from app.providers.hunter import HunterProvider
from app.providers.geoip import GeoIPProvider
from app.providers.shodan import ShodanProvider
from app.providers.virustotal import VirusTotalProvider
from app.providers.urlscan import URLScanProvider
from app.providers.alienvault import AlienVaultProvider
from app.services.risk_engine import risk_engine
import asyncio
import logging

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="enrich_entity")
def enrich_entity(self, job_id: str, query: str, entity_type: str, api_keys: dict = None):
    """Main enrichment task"""
    try:
        # Run async enrichment
        result = asyncio.run(_enrich_entity_async(job_id, query, entity_type, api_keys or {}))
        return result
    except Exception as e:
        logger.error(f"Enrichment failed for {query}: {e}")
        return {"success": False, "error": str(e)}


async def _enrich_entity_async(job_id: str, query: str, entity_type: str, api_keys: dict):
    """Async enrichment logic"""
    db.connect()
    
    try:
        # Create scan job node
        with db.driver.session() as session:
            cypher_query = """
                MERGE (j:ScanJob {id: $job_id})
                SET j.search_query = $search_query, j.entity_type = $entity_type, 
                    j.status = 'running', j.started_at = timestamp()
            """
            session.run(cypher_query, job_id=job_id, search_query=query, entity_type=entity_type)
        
        # Initialize providers with API keys from request or fallback to settings
        providers = []
        
        if entity_type == "email":
            # Use HIBP if key is available
            hibp_key = api_keys.get("hibp") or settings.hibp_api_key
            if hibp_key:
                providers.append(HIBPProvider(hibp_key))
            hunter_key = api_keys.get("hunter") or settings.hunter_api_key
            providers.append(HunterProvider(hunter_key))
            # Create email node
            db.merge_email_node(query, {"address": query})
            db.create_relationship("ScanJob", "id", job_id, "Email", "address", query, "SCANNED", {})
            
        elif entity_type == "domain":
            providers.append(DNSProvider())
            providers.append(WHOISProvider())
            hunter_key = api_keys.get("hunter") or settings.hunter_api_key
            providers.append(HunterProvider(hunter_key))
            vt_key = api_keys.get("virustotal") or settings.virustotal_api_key
            providers.append(VirusTotalProvider(vt_key))
            urlscan_key = api_keys.get("urlscan") or settings.urlscan_api_key
            providers.append(URLScanProvider(urlscan_key))
            alienvault_key = api_keys.get("alienvault") or settings.alienvault_api_key
            providers.append(AlienVaultProvider(alienvault_key))
            # Create domain node
            db.merge_domain_node(query, {"name": query})
            db.create_relationship("ScanJob", "id", job_id, "Domain", "name", query, "SCANNED", {})
            
        elif entity_type == "ip":
            providers.append(GeoIPProvider())
            shodan_key = api_keys.get("shodan") or settings.shodan_api_key
            providers.append(ShodanProvider(shodan_key))
            vt_key = api_keys.get("virustotal") or settings.virustotal_api_key
            providers.append(VirusTotalProvider(vt_key))
            alienvault_key = api_keys.get("alienvault") or settings.alienvault_api_key
            providers.append(AlienVaultProvider(alienvault_key))
            # Create IP node
            db.merge_ip_node(query, {"address": query})
            db.create_relationship("ScanJob", "id", job_id, "IP", "address", query, "SCANNED", {})
        
        # Run all providers
        results = []
        for provider in providers:
            try:
                logger.info(f"Running provider: {provider.name} for {query}")
                result = await provider.enrich(query, entity_type)
                results.append(result)
                logger.info(f"Provider {provider.name} result: {result.get('success', False)}")
                
                # Process results and create graph nodes
                await _process_provider_result(query, entity_type, result)
                
            except Exception as e:
                logger.error(f"Provider {provider.name} failed: {e}", exc_info=True)
            finally:
                await provider.close()
        
        # Calculate risk score after all enrichments complete
        await _calculate_risk_score(query, entity_type)
        
        # Update job status
        with db.driver.session() as session:
            cypher_query = """
                MATCH (j:ScanJob {id: $job_id})
                SET j.status = 'completed', j.completed_at = timestamp()
            """
            session.run(cypher_query, job_id=job_id)
        
        return {"success": True, "results": results}
        
    finally:
        db.close()


async def _process_provider_result(query: str, entity_type: str, result: dict):
    """Process provider result and create graph relationships"""
    if not result.get("success"):
        return
    
    provider = result.get("provider")
    
    # LeakCheck - create breach nodes
    if provider == "leakcheck" and result.get("found"):
        for source in result.get("sources", []):
            if source:
                with db.driver.session() as session:
                    cypher_query = """
                        MERGE (b:Breach {name: $name})
                        SET b.source = 'LeakCheck',
                            b.last_seen = timestamp()
                    """
                    session.run(cypher_query, name=source)
                
                db.create_relationship("Email", "address", query, "Breach", "name", source, "EXPOSED_IN", {})
    
    # HIBP - create breach nodes
    elif provider == "haveibeenpwned" and result.get("breaches"):
        for breach in result["breaches"]:
            breach_name = breach.get("Name")
            if breach_name:
                with db.driver.session() as session:
                    cypher_query = """
                        MERGE (b:Breach {name: $name})
                        SET b.title = $title, b.domain = $domain, 
                            b.breach_date = $breach_date, b.added_date = $added_date,
                            b.pwn_count = $pwn_count, b.data_classes = $data_classes
                    """
                    session.run(
                        cypher_query,
                        name=breach_name,
                        title=breach.get("Title"),
                        domain=breach.get("Domain"),
                        breach_date=breach.get("BreachDate"),
                        added_date=breach.get("AddedDate"),
                        pwn_count=breach.get("PwnCount"),
                        data_classes=breach.get("DataClasses", [])
                    )
                
                db.create_relationship("Email", "address", query, "Breach", "name", breach_name, "EXPOSED_IN", {})
    
    # DNS - create IP nodes and relationships
    elif provider == "dns" and result.get("records"):
        a_records = result["records"].get("A", [])
        for ip in a_records:
            db.merge_ip_node(ip, {"address": ip})
            db.create_relationship("Domain", "name", query, "IP", "address", ip, "RESOLVES_TO", {})
    
    # WHOIS - create organization/person nodes
    elif provider == "whois":
        registrar = result.get("registrar")
        if registrar:
            with db.driver.session() as session:
                cypher_query = """
                    MERGE (o:Organization {name: $name})
                    SET o.type = 'registrar'
                """
                session.run(cypher_query, name=registrar)
            db.create_relationship("Domain", "name", query, "Organization", "name", registrar, "REGISTERED_WITH", {})
    
    # Hunter - create email nodes from domain search
    elif provider == "hunter" and result.get("emails"):
        for email in result["emails"]:
            db.merge_email_node(email, {"address": email})
            db.create_relationship("Domain", "name", query, "Email", "address", email, "HAS_EMAIL", {})
    
    # Hunter - email verification data
    elif provider == "hunter" and entity_type == "email":
        if result.get("score") is not None or result.get("status"):
            with db.driver.session() as session:
                cypher_query = """
                    MATCH (e:Email {address: $email})
                    SET e.score = $score,
                        e.status = $status,
                        e.result = $result
                """
                session.run(
                    cypher_query,
                    email=query,
                    score=result.get("score"),
                    status=result.get("status"),
                    result=result.get("result")
                )
    
    # GeoIP - update IP node and create organization node for ASN
    elif provider == "geoip":
        # Update IP node with GeoIP data
        with db.driver.session() as session:
            cypher_query = """
                MATCH (i:IP {address: $ip})
                SET i.country = $country,
                    i.country_code = $country_code,
                    i.region = $region,
                    i.city = $city,
                    i.isp = $isp,
                    i.asn = $asn,
                    i.asn_name = $asn_name,
                    i.is_mobile = $is_mobile,
                    i.is_proxy = $is_proxy,
                    i.is_hosting = $is_hosting
            """
            session.run(
                cypher_query,
                ip=query,
                country=result.get("country"),
                country_code=result.get("country_code"),
                region=result.get("region"),
                city=result.get("city"),
                isp=result.get("isp"),
                asn=result.get("asn"),
                asn_name=result.get("asn_name"),
                is_mobile=result.get("is_mobile", False),
                is_proxy=result.get("is_proxy", False),
                is_hosting=result.get("is_hosting", False)
            )
        
        # Create organization node for ASN
        org = result.get("org")
        if org:
            with db.driver.session() as session:
                cypher_query = """
                    MERGE (o:Organization {name: $name})
                    SET o.type = 'hosting', o.asn = $asn, o.country = $country
                """
                session.run(cypher_query, name=org, asn=result.get("asn"), country=result.get("country"))
            db.create_relationship("IP", "address", query, "Organization", "name", org, "HOSTED_BY", {})
    
    # Shodan - create service nodes and vulnerability indicators
    elif provider == "shodan":
        # Update IP node with Shodan data
        if result.get("ports"):
            with db.driver.session() as session:
                cypher_query = """
                    MATCH (i:IP {address: $ip})
                    SET i.open_ports = $ports,
                        i.services = $services,
                        i.vulnerabilities = $vulns,
                        i.shodan_tags = $tags,
                        i.os = $os
                """
                session.run(
                    cypher_query,
                    ip=query,
                    ports=result.get("ports", []),
                    services=result.get("services", []),
                    vulns=result.get("vulnerabilities", []),
                    tags=result.get("tags", []),
                    os=result.get("os")
                )
        
        # Create nodes for discovered domains
        for domain in result.get("domains", [])[:5]:  # Limit to 5
            db.merge_domain_node(domain, {"name": domain})
            db.create_relationship("IP", "address", query, "Domain", "name", domain, "HOSTS", {})
    
    # VirusTotal - update reputation scores
    elif provider == "virustotal":
        if entity_type == "domain":
            with db.driver.session() as session:
                cypher_query = """
                    MATCH (d:Domain {name: $domain})
                    SET d.vt_reputation = $reputation,
                        d.vt_malicious = $malicious,
                        d.vt_suspicious = $suspicious,
                        d.vt_categories = $categories
                """
                session.run(
                    cypher_query,
                    domain=query,
                    reputation=result.get("reputation_score"),
                    malicious=result.get("malicious_count"),
                    suspicious=result.get("suspicious_count"),
                    categories=list(result.get("categories", {}).values())
                )
        elif entity_type == "ip":
            with db.driver.session() as session:
                cypher_query = """
                    MATCH (i:IP {address: $ip})
                    SET i.vt_reputation = $reputation,
                        i.vt_malicious = $malicious,
                        i.vt_suspicious = $suspicious
                """
                session.run(
                    cypher_query,
                    ip=query,
                    reputation=result.get("reputation_score"),
                    malicious=result.get("malicious_count"),
                    suspicious=result.get("suspicious_count")
                )
    
    # URLScan - add screenshot and technologies
    elif provider == "urlscan":
        if result.get("found", True):
            with db.driver.session() as session:
                # Filter out None values from arrays (Neo4j doesn't allow null in collections)
                technologies = [t for t in result.get("technologies", []) if t is not None]
                
                cypher_query = """
                    MATCH (d:Domain {name: $domain})
                    SET d.urlscan_screenshot = $screenshot,
                        d.urlscan_report = $report,
                        d.technologies = $technologies,
                        d.malicious_score = $malicious
                """
                session.run(
                    cypher_query,
                    domain=query,
                    screenshot=result.get("screenshot_url"),
                    report=result.get("report_url"),
                    technologies=technologies,
                    malicious=result.get("malicious_score", 0)
                )
    
    # AlienVault - add threat intelligence
    elif provider == "alienvault":
        threat_score = result.get("threat_score", 0)
        # Store data even if threat_score is 0 to show the check was performed
        # Filter out None values from arrays (Neo4j doesn't allow null in collections)
        tags = [t for t in result.get("tags", []) if t is not None]
        malware = [m for m in result.get("malware_families", []) if m is not None]
        
        if entity_type == "domain":
                with db.driver.session() as session:
                    cypher_query = """
                        MATCH (d:Domain {name: $domain})
                        SET d.otx_threat_score = $threat_score,
                            d.otx_pulse_count = $pulse_count,
                            d.otx_tags = $tags,
                            d.otx_malware = $malware
                    """
                    session.run(
                        cypher_query,
                        domain=query,
                        threat_score=threat_score,
                        pulse_count=result.get("pulse_count"),
                        tags=tags,
                        malware=malware
                    )
        elif entity_type == "ip":
                with db.driver.session() as session:
                    cypher_query = """
                        MATCH (i:IP {address: $ip})
                        SET i.otx_threat_score = $threat_score,
                            i.otx_pulse_count = $pulse_count,
                            i.otx_tags = $tags,
                            i.otx_malware = $malware
                    """
                    session.run(
                        cypher_query,
                        ip=query,
                        threat_score=threat_score,
                        pulse_count=result.get("pulse_count"),
                        tags=tags,
                        malware=malware
                    )


async def _calculate_risk_score(query: str, entity_type: str):
    """Calculate and store risk score for an entity"""
    try:
        # Get entity properties from Neo4j
        with db.driver.session() as session:
            if entity_type == "email":
                cypher_query = "MATCH (e:Email {address: $entity_value}) RETURN e"
                label = "Email"
                id_field = "address"
            elif entity_type == "domain":
                cypher_query = "MATCH (d:Domain {name: $entity_value}) RETURN d"
                label = "Domain"
                id_field = "name"
            elif entity_type == "ip":
                cypher_query = "MATCH (i:IP {address: $entity_value}) RETURN i"
                label = "IP"
                id_field = "address"
            else:
                return
            
            result = session.run(cypher_query, entity_value=query)
            record = result.single()
            
            if not record:
                logger.warning(f"Entity not found for risk calculation: {query}")
                return
            
            entity = record[0]
            properties = dict(entity)
            
            # Calculate risk using risk engine
            risk_result = risk_engine.calculate_risk(entity_type, properties)
            
            # Store risk score in Neo4j
            update_query = f"""
                MATCH (n:{label} {{{id_field}: $entity_value}})
                SET n.risk_score = $score,
                    n.risk_level = $level,
                    n.risk_reasons = $reasons
            """
            session.run(
                update_query,
                entity_value=query,
                score=risk_result["score"],
                level=risk_result["level"],
                reasons=risk_result["reasons"]
            )
            
            logger.info(f"Risk calculated for {query}: {risk_result['level']} ({risk_result['score']})")
            
    except Exception as e:
        logger.error(f"Risk calculation failed for {query}: {e}")
