from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from app.models import LookupRequest, ScanJob, JobStatus, GraphData, EntityType
from app.models_extended import NoteCreate, Note, TagCreate, TagRemove, EntityTags, PREDEFINED_TAGS
from app.database import db
from app.workers.enrichment import enrich_entity
from app.config import settings
from app.services.report_generator import report_generator
from typing import Optional
import uuid
import json
import asyncio
from datetime import datetime
import logging
import io

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="OSINT Intelligence Graph Explorer API",
    description="OSINT enrichment and graph visualization platform",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for demo
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize database connection"""
    db.connect()
    logger.info("Application started")


@app.on_event("shutdown")
async def shutdown_event():
    """Close database connection"""
    db.close()
    logger.info("Application shutdown")


@app.get("/")
async def root():
    """Health check"""
    return {
        "status": "online",
        "service": "OSINT Intelligence Graph Explorer",
        "version": "1.0.0"
    }


@app.post("/api/lookup", response_model=ScanJob)
async def create_lookup(request: LookupRequest, background_tasks: BackgroundTasks):
    """
    Start a new OSINT lookup job
    """
    job_id = str(uuid.uuid4())
    
    # Sanitize input - extract clean domain/email/IP from various formats
    query = request.query.strip()
    
    # Remove protocol (http://, https://, ftp://, etc.)
    if "://" in query:
        query = query.split("://", 1)[1]
    
    # Remove www. prefix
    if query.startswith("www."):
        query = query[4:]
    
    # Remove path, query params, and fragments (keep only domain/IP)
    if request.entity_type == EntityType.DOMAIN or request.entity_type == EntityType.IP:
        # Split on first occurrence of /, ?, or #
        for separator in ['/', '?', '#']:
            if separator in query:
                query = query.split(separator)[0]
    
    # Remove trailing dots and slashes
    query = query.rstrip("./")
    
    # Remove port numbers for domain lookups (e.g., google.com:443 -> google.com)
    if request.entity_type == EntityType.DOMAIN and ':' in query:
        # But preserve IPv6 addresses
        if not query.startswith('['):
            query = query.split(':')[0]
    
    # Create job in database
    with db.driver.session() as session:
        cypher_query = """
            CREATE (j:ScanJob {
                id: $job_id,
                query: $search_query,
                entity_type: $entity_type,
                status: $status,
                created_at: timestamp()
            })
        """
        session.run(
            cypher_query,
            job_id=job_id,
            search_query=query,
            entity_type=request.entity_type.value,
            status=JobStatus.PENDING.value
        )
    
    # Queue enrichment task with sanitized query and API keys
    enrich_entity.delay(job_id, query, request.entity_type.value, request.api_keys or {})
    
    return ScanJob(
        id=job_id,
        query=query,
        entity_type=request.entity_type,
        status=JobStatus.PENDING,
        created_at=datetime.now()
    )


@app.get("/api/job/{job_id}", response_model=ScanJob)
async def get_job(job_id: str):
    """
    Get job status and details
    """
    with db.driver.session() as session:
        cypher_query = """
            MATCH (j:ScanJob {id: $job_id})
            RETURN j
        """
        result = session.run(cypher_query, job_id=job_id)
        
        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail="Job not found")
        
        job = record["j"]
        return ScanJob(
            id=job["id"],
            query=job["query"],
            entity_type=job["entity_type"],
            status=job.get("status", "pending"),
            created_at=datetime.fromtimestamp(job["created_at"] / 1000),
            completed_at=datetime.fromtimestamp(job["completed_at"] / 1000) if job.get("completed_at") else None
        )


@app.get("/api/graph/{job_id}", response_model=GraphData)
async def get_graph(job_id: str):
    """
    Get graph data for a job
    """
    try:
        graph_data = db.get_graph_data(job_id)
        return GraphData(**graph_data)
    except Exception as e:
        logger.error(f"Failed to get graph data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/jobs")
async def list_jobs(limit: int = 20):
    """
    List recent scan jobs
    """
    with db.driver.session() as session:
        cypher_query = """
            MATCH (j:ScanJob)
            RETURN j
            ORDER BY j.created_at DESC
            LIMIT $limit
        """
        result = session.run(cypher_query, limit=limit)
        
        jobs = []
        for record in result:
            job = record["j"]
            jobs.append({
                "id": job["id"],
                "query": job["query"],
                "entity_type": job["entity_type"],
                "status": job.get("status", "pending"),
                "created_at": datetime.fromtimestamp(job["created_at"] / 1000).isoformat()
            })
        
        return {"jobs": jobs}


@app.get("/api/entity/{entity_type}/{entity_id}")
async def get_entity(entity_type: str, entity_id: str):
    """
    Get detailed entity information
    """
    label_map = {
        "email": "Email",
        "domain": "Domain",
        "ip": "IP",
        "breach": "Breach",
        "organization": "Organization"
    }
    
    label = label_map.get(entity_type.lower())
    if not label:
        raise HTTPException(status_code=400, detail="Invalid entity type")
    
    key_map = {
        "Email": "address",
        "Domain": "name",
        "IP": "address",
        "Breach": "name",
        "Organization": "name"
    }
    
    key = key_map[label]
    
    with db.driver.session() as session:
        cypher_query = f"""
            MATCH (e:{label} {{{key}: $entity_id}})
            OPTIONAL MATCH (e)-[r]-(connected)
            RETURN e, collect({{
                type: type(r),
                direction: CASE WHEN startNode(r) = e THEN 'outgoing' ELSE 'incoming' END,
                node: connected
            }}) as relationships
        """
        result = session.run(cypher_query, entity_id=entity_id)
        
        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail="Entity not found")
        
        entity = record["e"]
        relationships = record["relationships"]
        
        return {
            "id": entity_id,
            "type": label,
            "properties": dict(entity),
            "relationships": [r for r in relationships if r["node"] is not None]
        }


@app.get("/api/search")
async def search_entities(q: str, entity_type: str = None):
    """
    Search for entities in the graph
    """
    if entity_type:
        label_map = {"email": "Email", "domain": "Domain", "ip": "IP"}
        label = label_map.get(entity_type.lower(), "Email")
        cypher_query = f"""
            MATCH (e:{label})
            WHERE toLower(toString(e)) CONTAINS toLower($q)
            RETURN e
            LIMIT 50
        """
    else:
        cypher_query = """
            MATCH (e)
            WHERE toLower(toString(e)) CONTAINS toLower($q)
            RETURN e, labels(e) as labels
            LIMIT 50
        """
    
    with db.driver.session() as session:
        result = session.run(cypher_query, q=q)
        entities = []
        for record in result:
            entity = record["e"]
            entities.append({
                "type": list(entity.labels)[0],
                "properties": dict(entity)
            })
        
        return {"results": entities}


@app.delete("/api/job/{job_id}")
async def delete_job(job_id: str):
    """
    Delete a scan job and its associated data
    """
    with db.driver.session() as session:
        cypher_query = """
            MATCH (j:ScanJob {id: $job_id})
            OPTIONAL MATCH (j)-[r]-()
            DELETE r, j
        """
        session.run(cypher_query, job_id=job_id)
    
    return {"success": True, "message": "Job deleted"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)



# ============================================
# NOTES & TAGS ENDPOINTS
# ============================================

@app.post("/api/notes", response_model=Note)
async def create_note(note: NoteCreate):
    """Add a note to an entity"""
    note_id = str(uuid.uuid4())
    
    with db.driver.session() as session:
        # Get entity label
        label_map = {"email": "Email", "domain": "Domain", "ip": "IP"}
        label = label_map.get(note.entity_type)
        if not label:
            raise HTTPException(status_code=400, detail="Invalid entity type")
        
        # Create note node and relationship
        cypher_query = f"""
            MATCH (e:{label})
            WHERE elementId(e) = $entity_id OR 
                  (e.address = $entity_id) OR 
                  (e.name = $entity_id)
            CREATE (n:Note {{
                id: $note_id,
                content: $content,
                created_at: timestamp()
            }})
            CREATE (e)-[:HAS_NOTE]->(n)
            RETURN n
        """
        result = session.run(
            cypher_query,
            entity_id=note.entity_id,
            note_id=note_id,
            content=note.content
        )
        
        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail="Entity not found")
        
        note_node = record["n"]
        return Note(
            id=note_node["id"],
            entity_id=note.entity_id,
            entity_type=note.entity_type,
            content=note_node["content"],
            created_at=datetime.fromtimestamp(note_node["created_at"] / 1000)
        )


@app.get("/api/notes/{entity_id}")
async def get_notes(entity_id: str):
    """Get all notes for an entity"""
    with db.driver.session() as session:
        cypher_query = """
            MATCH (e)-[:HAS_NOTE]->(n:Note)
            WHERE elementId(e) = $entity_id OR 
                  e.address = $entity_id OR 
                  e.name = $entity_id
            RETURN n
            ORDER BY n.created_at DESC
        """
        result = session.run(cypher_query, entity_id=entity_id)
        
        notes = []
        for record in result:
            note_node = record["n"]
            notes.append({
                "id": note_node["id"],
                "content": note_node["content"],
                "created_at": datetime.fromtimestamp(note_node["created_at"] / 1000).isoformat()
            })
        
        return {"notes": notes}


@app.delete("/api/notes/{note_id}")
async def delete_note(note_id: str):
    """Delete a note"""
    with db.driver.session() as session:
        cypher_query = """
            MATCH (n:Note {id: $note_id})
            DETACH DELETE n
        """
        session.run(cypher_query, note_id=note_id)
        return {"success": True}


@app.post("/api/tags")
async def add_tag(tag_data: TagCreate):
    """Add a tag to an entity"""
    with db.driver.session() as session:
        label_map = {"email": "Email", "domain": "Domain", "ip": "IP"}
        label = label_map.get(tag_data.entity_type)
        if not label:
            raise HTTPException(status_code=400, detail="Invalid entity type")
        
        cypher_query = f"""
            MATCH (e:{label})
            WHERE elementId(e) = $entity_id OR 
                  e.address = $entity_id OR 
                  e.name = $entity_id
            SET e.tags = CASE 
                WHEN e.tags IS NULL THEN [$tag]
                WHEN NOT $tag IN e.tags THEN e.tags + $tag
                ELSE e.tags
            END
            RETURN e.tags as tags
        """
        result = session.run(
            cypher_query,
            entity_id=tag_data.entity_id,
            tag=tag_data.tag
        )
        
        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail="Entity not found")
        
        return {"tags": record["tags"]}


@app.delete("/api/tags")
async def remove_tag(tag_data: TagRemove):
    """Remove a tag from an entity"""
    with db.driver.session() as session:
        label_map = {"email": "Email", "domain": "Domain", "ip": "IP"}
        label = label_map.get(tag_data.entity_type)
        if not label:
            raise HTTPException(status_code=400, detail="Invalid entity type")
        
        cypher_query = f"""
            MATCH (e:{label})
            WHERE elementId(e) = $entity_id OR 
                  e.address = $entity_id OR 
                  e.name = $entity_id
            SET e.tags = [tag IN e.tags WHERE tag <> $tag]
            RETURN e.tags as tags
        """
        result = session.run(
            cypher_query,
            entity_id=tag_data.entity_id,
            tag=tag_data.tag
        )
        
        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail="Entity not found")
        
        return {"tags": record["tags"]}


@app.get("/api/tags/predefined")
async def get_predefined_tags():
    """Get list of predefined tags"""
    return {"tags": PREDEFINED_TAGS}


@app.get("/api/tags/{entity_id}")
async def get_entity_tags(entity_id: str):
    """Get tags for an entity"""
    with db.driver.session() as session:
        cypher_query = """
            MATCH (e)
            WHERE elementId(e) = $entity_id OR 
                  e.address = $entity_id OR 
                  e.name = $entity_id
            RETURN COALESCE(e.tags, []) as tags
        """
        result = session.run(cypher_query, entity_id=entity_id)
        
        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail="Entity not found")
        
        return {"tags": record["tags"]}



# ============================================
# PIVOT ACTIONS ENDPOINT
# ============================================

@app.post("/api/pivot/{entity_type}/{entity_id}")
async def pivot_entity(entity_type: str, entity_id: str, pivot_type: str, depth: int = 1):
    """
    Pivot/expand from an entity to discover related entities
    
    Pivot types:
    - related_domains: Find domains related to this entity
    - related_ips: Find IPs related to this entity
    - related_emails: Find emails related to this entity
    - hosted_by_same_ip: Find other domains on same IP
    - same_registrar: Find domains with same registrar
    - same_asn: Find IPs in same ASN
    """
    with db.driver.session() as session:
        # Map entity types to labels
        label_map = {"email": "Email", "domain": "Domain", "ip": "IP"}
        label = label_map.get(entity_type)
        if not label:
            raise HTTPException(status_code=400, detail="Invalid entity type")
        
        # Build pivot query based on type
        if pivot_type == "related_domains":
            # Find domains connected to this entity
            cypher_query = f"""
                MATCH (e:{label})-[r]-(d:Domain)
                WHERE elementId(e) = $entity_id OR 
                      e.address = $entity_id OR 
                      e.name = $entity_id
                RETURN DISTINCT d, type(r) as rel_type
                LIMIT 50
            """
        
        elif pivot_type == "related_ips":
            # Find IPs connected to this entity
            cypher_query = f"""
                MATCH (e:{label})-[r]-(i:IP)
                WHERE elementId(e) = $entity_id OR 
                      e.address = $entity_id OR 
                      e.name = $entity_id
                RETURN DISTINCT i, type(r) as rel_type
                LIMIT 50
            """
        
        elif pivot_type == "related_emails":
            # Find emails connected to this entity
            cypher_query = f"""
                MATCH (e:{label})-[r]-(em:Email)
                WHERE elementId(e) = $entity_id OR 
                      e.address = $entity_id OR 
                      e.name = $entity_id
                RETURN DISTINCT em, type(r) as rel_type
                LIMIT 50
            """
        
        elif pivot_type == "hosted_by_same_ip":
            # Find other domains hosted on same IP
            if entity_type != "domain":
                raise HTTPException(status_code=400, detail="This pivot only works for domains")
            
            cypher_query = """
                MATCH (d1:Domain)-[:RESOLVES_TO]->(i:IP)<-[:RESOLVES_TO]-(d2:Domain)
                WHERE (elementId(d1) = $entity_id OR d1.name = $entity_id)
                  AND d1 <> d2
                RETURN DISTINCT d2, 'RESOLVES_TO' as rel_type
                LIMIT 50
            """
        
        elif pivot_type == "same_registrar":
            # Find domains with same registrar
            if entity_type != "domain":
                raise HTTPException(status_code=400, detail="This pivot only works for domains")
            
            cypher_query = """
                MATCH (d1:Domain)-[:REGISTERED_WITH]->(o:Organization)<-[:REGISTERED_WITH]-(d2:Domain)
                WHERE (elementId(d1) = $entity_id OR d1.name = $entity_id)
                  AND d1 <> d2
                RETURN DISTINCT d2, 'REGISTERED_WITH' as rel_type
                LIMIT 50
            """
        
        elif pivot_type == "same_asn":
            # Find IPs in same ASN
            if entity_type != "ip":
                raise HTTPException(status_code=400, detail="This pivot only works for IPs")
            
            cypher_query = """
                MATCH (i1:IP)-[:HOSTED_BY]->(o:Organization)<-[:HOSTED_BY]-(i2:IP)
                WHERE (elementId(i1) = $entity_id OR i1.address = $entity_id)
                  AND i1 <> i2
                RETURN DISTINCT i2, 'HOSTED_BY' as rel_type
                LIMIT 50
            """
        
        else:
            raise HTTPException(status_code=400, detail="Invalid pivot type")
        
        # Execute query
        result = session.run(cypher_query, entity_id=entity_id)
        
        # Collect results
        entities = []
        for record in result:
            entity_node = record[0]
            rel_type = record.get("rel_type", "RELATED")
            
            entities.append({
                "id": entity_node.element_id,
                "label": list(entity_node.labels)[0],
                "properties": dict(entity_node),
                "relationship": rel_type
            })
        
        return {
            "success": True,
            "pivot_type": pivot_type,
            "entity_count": len(entities),
            "entities": entities
        }



# ============================================
# CASE MANAGEMENT ENDPOINTS
# ============================================

from app.models_cases import (
    CaseCreate, CaseUpdate, Case, CaseStatus, CasePriority,
    CaseAddEntity, CaseAddJob
)

@app.post("/api/cases", response_model=Case)
async def create_case(case_data: CaseCreate):
    """Create a new investigation case"""
    case_id = str(uuid.uuid4())
    
    with db.driver.session() as session:
        cypher_query = """
            CREATE (c:Case {
                id: $case_id,
                title: $title,
                description: $description,
                status: $status,
                priority: $priority,
                tags: $tags,
                created_at: timestamp(),
                updated_at: timestamp()
            })
            RETURN c
        """
        result = session.run(
            cypher_query,
            case_id=case_id,
            title=case_data.title,
            description=case_data.description,
            status=CaseStatus.OPEN.value,
            priority=case_data.priority.value,
            tags=case_data.tags
        )
        
        record = result.single()
        case_node = record["c"]
        
        return Case(
            id=case_node["id"],
            title=case_node["title"],
            description=case_node.get("description"),
            status=case_node["status"],
            priority=case_node["priority"],
            tags=case_node.get("tags", []),
            created_at=datetime.fromtimestamp(case_node["created_at"] / 1000),
            updated_at=datetime.fromtimestamp(case_node["updated_at"] / 1000),
            entity_count=0,
            job_count=0
        )


@app.get("/api/cases")
async def list_cases(status: Optional[str] = None, limit: int = 50):
    """List all cases"""
    with db.driver.session() as session:
        if status:
            cypher_query = """
                MATCH (c:Case {status: $status})
                OPTIONAL MATCH (c)-[:CONTAINS]->(e)
                OPTIONAL MATCH (c)-[:HAS_JOB]->(j:ScanJob)
                WITH c, count(DISTINCT e) as entity_count, count(DISTINCT j) as job_count
                RETURN c, entity_count, job_count
                ORDER BY c.updated_at DESC
                LIMIT $limit
            """
            result = session.run(cypher_query, status=status, limit=limit)
        else:
            cypher_query = """
                MATCH (c:Case)
                OPTIONAL MATCH (c)-[:CONTAINS]->(e)
                OPTIONAL MATCH (c)-[:HAS_JOB]->(j:ScanJob)
                WITH c, count(DISTINCT e) as entity_count, count(DISTINCT j) as job_count
                RETURN c, entity_count, job_count
                ORDER BY c.updated_at DESC
                LIMIT $limit
            """
            result = session.run(cypher_query, limit=limit)
        
        cases = []
        for record in result:
            case_node = record["c"]
            cases.append({
                "id": case_node["id"],
                "title": case_node["title"],
                "description": case_node.get("description"),
                "status": case_node["status"],
                "priority": case_node["priority"],
                "tags": case_node.get("tags", []),
                "created_at": datetime.fromtimestamp(case_node["created_at"] / 1000).isoformat(),
                "updated_at": datetime.fromtimestamp(case_node["updated_at"] / 1000).isoformat(),
                "entity_count": record["entity_count"],
                "job_count": record["job_count"]
            })
        
        return {"cases": cases}


@app.get("/api/cases/{case_id}", response_model=Case)
async def get_case(case_id: str):
    """Get case details"""
    with db.driver.session() as session:
        cypher_query = """
            MATCH (c:Case {id: $case_id})
            OPTIONAL MATCH (c)-[:CONTAINS]->(e)
            OPTIONAL MATCH (c)-[:HAS_JOB]->(j:ScanJob)
            WITH c, count(DISTINCT e) as entity_count, count(DISTINCT j) as job_count
            RETURN c, entity_count, job_count
        """
        result = session.run(cypher_query, case_id=case_id)
        
        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail="Case not found")
        
        case_node = record["c"]
        return Case(
            id=case_node["id"],
            title=case_node["title"],
            description=case_node.get("description"),
            status=case_node["status"],
            priority=case_node["priority"],
            tags=case_node.get("tags", []),
            created_at=datetime.fromtimestamp(case_node["created_at"] / 1000),
            updated_at=datetime.fromtimestamp(case_node["updated_at"] / 1000),
            entity_count=record["entity_count"],
            job_count=record["job_count"]
        )


@app.patch("/api/cases/{case_id}")
async def update_case(case_id: str, case_update: CaseUpdate):
    """Update case details"""
    with db.driver.session() as session:
        # Build SET clause dynamically
        updates = []
        params = {"case_id": case_id, "updated_at": datetime.now().timestamp() * 1000}
        
        if case_update.title is not None:
            updates.append("c.title = $title")
            params["title"] = case_update.title
        if case_update.description is not None:
            updates.append("c.description = $description")
            params["description"] = case_update.description
        if case_update.status is not None:
            updates.append("c.status = $status")
            params["status"] = case_update.status.value
        if case_update.priority is not None:
            updates.append("c.priority = $priority")
            params["priority"] = case_update.priority.value
        if case_update.tags is not None:
            updates.append("c.tags = $tags")
            params["tags"] = case_update.tags
        
        updates.append("c.updated_at = $updated_at")
        
        cypher_query = f"""
            MATCH (c:Case {{id: $case_id}})
            SET {', '.join(updates)}
            RETURN c
        """
        
        result = session.run(cypher_query, **params)
        record = result.single()
        
        if not record:
            raise HTTPException(status_code=404, detail="Case not found")
        
        return {"success": True}


@app.delete("/api/cases/{case_id}")
async def delete_case(case_id: str):
    """Delete a case"""
    with db.driver.session() as session:
        cypher_query = """
            MATCH (c:Case {id: $case_id})
            DETACH DELETE c
        """
        session.run(cypher_query, case_id=case_id)
        return {"success": True}


@app.post("/api/cases/{case_id}/entities")
async def add_entity_to_case(case_id: str, entity_data: CaseAddEntity):
    """Add an entity to a case"""
    with db.driver.session() as session:
        label_map = {"email": "Email", "domain": "Domain", "ip": "IP"}
        label = label_map.get(entity_data.entity_type)
        if not label:
            raise HTTPException(status_code=400, detail="Invalid entity type")
        
        cypher_query = f"""
            MATCH (c:Case {{id: $case_id}})
            MATCH (e:{label})
            WHERE elementId(e) = $entity_id OR 
                  e.address = $entity_id OR 
                  e.name = $entity_id
            MERGE (c)-[:CONTAINS]->(e)
            SET c.updated_at = timestamp()
            RETURN c, e
        """
        
        result = session.run(
            cypher_query,
            case_id=case_id,
            entity_id=entity_data.entity_id
        )
        
        if not result.single():
            raise HTTPException(status_code=404, detail="Case or entity not found")
        
        return {"success": True}


@app.post("/api/cases/{case_id}/jobs")
async def add_job_to_case(case_id: str, job_data: CaseAddJob):
    """Add a scan job to a case"""
    with db.driver.session() as session:
        cypher_query = """
            MATCH (c:Case {id: $case_id})
            MATCH (j:ScanJob {id: $job_id})
            MERGE (c)-[:HAS_JOB]->(j)
            SET c.updated_at = timestamp()
            RETURN c, j
        """
        
        result = session.run(
            cypher_query,
            case_id=case_id,
            job_id=job_data.job_id
        )
        
        if not result.single():
            raise HTTPException(status_code=404, detail="Case or job not found")
        
        return {"success": True}


@app.get("/api/cases/{case_id}/entities")
async def get_case_entities(case_id: str):
    """Get all entities in a case"""
    with db.driver.session() as session:
        cypher_query = """
            MATCH (c:Case {id: $case_id})-[:CONTAINS]->(e)
            RETURN e, labels(e)[0] as entity_type
        """
        result = session.run(cypher_query, case_id=case_id)
        
        entities = []
        for record in result:
            entity_node = record["e"]
            entities.append({
                "id": entity_node.element_id,
                "type": record["entity_type"],
                "properties": dict(entity_node)
            })
        
        return {"entities": entities}


@app.delete("/api/cases/{case_id}/entities/{entity_id}")
async def remove_entity_from_case(case_id: str, entity_id: str):
    """Remove an entity from a case"""
    with db.driver.session() as session:
        cypher_query = """
            MATCH (c:Case {id: $case_id})-[r:CONTAINS]->(e)
            WHERE elementId(e) = $entity_id OR 
                  e.address = $entity_id OR 
                  e.name = $entity_id
            DELETE r
            SET c.updated_at = timestamp()
            RETURN count(r) as deleted
        """
        result = session.run(cypher_query, case_id=case_id, entity_id=entity_id)
        record = result.single()
        
        if record and record["deleted"] > 0:
            return {"success": True, "message": "Entity removed from case"}
        else:
            raise HTTPException(status_code=404, detail="Entity not found in case")


@app.get("/api/cases/{case_id}/stats")
async def get_case_stats(case_id: str):
    """Get detailed statistics for a case"""
    with db.driver.session() as session:
        cypher_query = """
            MATCH (c:Case {id: $case_id})
            OPTIONAL MATCH (c)-[:CONTAINS]->(e)
            WITH c, collect(DISTINCT e) as entities
            RETURN c,
                   size(entities) as total_entities,
                   size([e IN entities WHERE labels(e)[0] = 'Email']) as email_count,
                   size([e IN entities WHERE labels(e)[0] = 'Domain']) as domain_count,
                   size([e IN entities WHERE labels(e)[0] = 'IP']) as ip_count,
                   size([e IN entities WHERE e.risk_level = 'HIGH']) as high_risk_count,
                   size([e IN entities WHERE e.risk_level = 'MEDIUM']) as medium_risk_count,
                   size([e IN entities WHERE e.risk_level = 'LOW']) as low_risk_count,
                   [e IN entities WHERE e.risk_score IS NOT NULL | e.risk_score] as risk_scores
        """
        result = session.run(cypher_query, case_id=case_id)
        record = result.single()
        
        if not record:
            raise HTTPException(status_code=404, detail="Case not found")
        
        risk_scores = record["risk_scores"]
        avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0
        
        return {
            "total_entities": record["total_entities"],
            "entity_breakdown": {
                "emails": record["email_count"],
                "domains": record["domain_count"],
                "ips": record["ip_count"]
            },
            "risk_breakdown": {
                "high": record["high_risk_count"],
                "medium": record["medium_risk_count"],
                "low": record["low_risk_count"]
            },
            "average_risk_score": round(avg_risk, 2)
        }


@app.get("/api/cases/{case_id}/report")
async def generate_case_report(case_id: str):
    """Generate PDF report for a case"""
    try:
        # Get case data
        with db.driver.session() as session:
            case_query = """
                MATCH (c:Case {id: $case_id})
                OPTIONAL MATCH (c)-[:CONTAINS]->(e)
                OPTIONAL MATCH (c)-[:HAS_JOB]->(j:ScanJob)
                WITH c, count(DISTINCT e) as entity_count, count(DISTINCT j) as job_count
                RETURN c, entity_count, job_count
            """
            result = session.run(case_query, case_id=case_id)
            record = result.single()
            
            if not record:
                raise HTTPException(status_code=404, detail="Case not found")
            
            case_node = record["c"]
            case_data = {
                "id": case_node["id"],
                "title": case_node["title"],
                "description": case_node.get("description"),
                "status": case_node["status"],
                "priority": case_node["priority"],
                "tags": case_node.get("tags", []),
                "created_at": datetime.fromtimestamp(case_node["created_at"] / 1000).isoformat(),
                "updated_at": datetime.fromtimestamp(case_node["updated_at"] / 1000).isoformat(),
                "entity_count": record["entity_count"],
                "job_count": record["job_count"]
            }
        
        # Get entities
        with db.driver.session() as session:
            entities_query = """
                MATCH (c:Case {id: $case_id})-[:CONTAINS]->(e)
                RETURN e, labels(e)[0] as entity_type
            """
            result = session.run(entities_query, case_id=case_id)
            
            entities = []
            for record in result:
                entity_node = record["e"]
                entities.append({
                    "id": entity_node.element_id,
                    "type": record["entity_type"],
                    "properties": dict(entity_node)
                })
        
        # Get statistics
        stats_response = await get_case_stats(case_id)
        
        # Generate PDF
        pdf_content = report_generator.generate_case_report(case_data, entities, stats_response)
        
        # Return PDF
        filename = f"case-{case_data['title'].replace(' ', '-').lower()}-{datetime.now().strftime('%Y%m%d')}.pdf"
        
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")
