"""
Case Management Models
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class CaseStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    CLOSED = "closed"
    ARCHIVED = "archived"


class CasePriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class CaseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    priority: CasePriority = CasePriority.MEDIUM
    tags: List[str] = []


class CaseUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[CaseStatus] = None
    priority: Optional[CasePriority] = None
    tags: Optional[List[str]] = None


class Case(BaseModel):
    id: str
    title: str
    description: Optional[str]
    status: CaseStatus
    priority: CasePriority
    tags: List[str]
    created_at: datetime
    updated_at: datetime
    entity_count: int = 0
    job_count: int = 0


class CaseAddEntity(BaseModel):
    entity_id: str
    entity_type: str  # email, domain, ip


class CaseAddJob(BaseModel):
    job_id: str
