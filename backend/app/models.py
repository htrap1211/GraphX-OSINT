from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


class EntityType(str, Enum):
    EMAIL = "email"
    DOMAIN = "domain"
    IP = "ip"


class LookupRequest(BaseModel):
    query: str = Field(..., description="Email, domain, or IP to investigate")
    entity_type: EntityType
    depth: int = Field(default=1, ge=1, le=3, description="Enrichment depth")
    sources: Optional[List[str]] = Field(default=None, description="Specific sources to use")
    api_keys: Optional[Dict[str, str]] = Field(default=None, description="API keys for providers")


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    PARTIAL = "partial"
    FAILED = "failed"


class ScanJob(BaseModel):
    id: str
    query: str
    entity_type: EntityType
    status: JobStatus
    created_at: datetime
    completed_at: Optional[datetime] = None
    total_tasks: int = 0
    completed_tasks: int = 0
    errors: List[str] = []


class GraphNode(BaseModel):
    id: str
    label: str
    properties: Dict[str, Any]


class GraphEdge(BaseModel):
    source: str
    target: str
    type: str
    properties: Dict[str, Any] = {}


class GraphData(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class EntityDetail(BaseModel):
    id: str
    type: str
    properties: Dict[str, Any]
    relationships: List[Dict[str, Any]]
    risk_score: Optional[float] = None
