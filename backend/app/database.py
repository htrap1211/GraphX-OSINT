from neo4j import GraphDatabase
from app.config import settings
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)


class Neo4jDatabase:
    def __init__(self):
        self.driver = None
    
    def connect(self):
        """Initialize Neo4j connection"""
        try:
            self.driver = GraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_user, settings.neo4j_password)
            )
            logger.info("Connected to Neo4j")
            self._create_constraints()
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {e}")
            raise
    
    def close(self):
        """Close Neo4j connection"""
        if self.driver:
            self.driver.close()
            logger.info("Neo4j connection closed")
    
    def _create_constraints(self):
        """Create unique constraints and indexes"""
        constraints = [
            "CREATE CONSTRAINT email_unique IF NOT EXISTS FOR (e:Email) REQUIRE e.address IS UNIQUE",
            "CREATE CONSTRAINT domain_unique IF NOT EXISTS FOR (d:Domain) REQUIRE d.name IS UNIQUE",
            "CREATE CONSTRAINT ip_unique IF NOT EXISTS FOR (i:IP) REQUIRE i.address IS UNIQUE",
            "CREATE CONSTRAINT breach_unique IF NOT EXISTS FOR (b:Breach) REQUIRE b.name IS UNIQUE",
            "CREATE CONSTRAINT job_unique IF NOT EXISTS FOR (j:ScanJob) REQUIRE j.id IS UNIQUE",
        ]
        
        with self.driver.session() as session:
            for constraint in constraints:
                try:
                    session.run(constraint)
                except Exception as e:
                    logger.debug(f"Constraint already exists or failed: {e}")
    
    def merge_email_node(self, email: str, properties: Dict[str, Any]) -> str:
        """Create or update email node"""
        query = """
        MERGE (e:Email {address: $email})
        ON CREATE SET e.first_seen = timestamp(), e.sources = []
        ON MATCH SET e.last_updated = timestamp()
        SET e += $properties
        RETURN e.address as address
        """
        with self.driver.session() as session:
            result = session.run(query, email=email, properties=properties)
            return result.single()["address"]
    
    def merge_domain_node(self, domain: str, properties: Dict[str, Any]) -> str:
        """Create or update domain node"""
        query = """
        MERGE (d:Domain {name: $domain})
        ON CREATE SET d.first_seen = timestamp(), d.sources = []
        ON MATCH SET d.last_updated = timestamp()
        SET d += $properties
        RETURN d.name as name
        """
        with self.driver.session() as session:
            result = session.run(query, domain=domain, properties=properties)
            return result.single()["name"]
    
    def merge_ip_node(self, ip: str, properties: Dict[str, Any]) -> str:
        """Create or update IP node"""
        query = """
        MERGE (i:IP {address: $ip})
        ON CREATE SET i.first_seen = timestamp(), i.sources = []
        ON MATCH SET i.last_updated = timestamp()
        SET i += $properties
        RETURN i.address as address
        """
        with self.driver.session() as session:
            result = session.run(query, ip=ip, properties=properties)
            return result.single()["address"]
    
    def create_relationship(self, from_label: str, from_key: str, from_value: str,
                          to_label: str, to_key: str, to_value: str,
                          rel_type: str, properties: Dict[str, Any] = None):
        """Create relationship between nodes"""
        properties = properties or {}
        query = f"""
        MATCH (a:{from_label} {{{from_key}: $from_value}})
        MATCH (b:{to_label} {{{to_key}: $to_value}})
        MERGE (a)-[r:{rel_type}]->(b)
        SET r += $properties
        RETURN r
        """
        with self.driver.session() as session:
            session.run(query, from_value=from_value, to_value=to_value, properties=properties)
    
    def get_graph_data(self, job_id: str) -> Dict[str, Any]:
        """Get all nodes and relationships for a job"""
        query = """
        MATCH (j:ScanJob {id: $job_id})-[:SCANNED]->(n)
        OPTIONAL MATCH (n)-[r]-(m)
        RETURN n, collect(DISTINCT r) as relationships, collect(DISTINCT m) as connected
        """
        with self.driver.session() as session:
            result = session.run(query, job_id=job_id)
            nodes = []
            edges = []
            
            for record in result:
                node = record["n"]
                nodes.append({
                    "id": node.element_id,
                    "label": list(node.labels)[0],
                    "properties": dict(node)
                })
                
                for rel in record["relationships"]:
                    if rel:
                        edges.append({
                            "source": rel.start_node.element_id,
                            "target": rel.end_node.element_id,
                            "type": rel.type,
                            "properties": dict(rel)
                        })
            
            return {"nodes": nodes, "edges": edges}


# Global database instance
db = Neo4jDatabase()
