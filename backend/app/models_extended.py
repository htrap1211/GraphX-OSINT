"""
Extended models for notes, tags, and annotations
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class NoteCreate(BaseModel):
    entity_id: str
    entity_type: str  # email, domain, ip
    content: str = Field(..., min_length=1, max_length=5000)


class Note(BaseModel):
    id: str
    entity_id: str
    entity_type: str
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class TagCreate(BaseModel):
    entity_id: str
    entity_type: str
    tag: str = Field(..., min_length=1, max_length=50)


class TagRemove(BaseModel):
    entity_id: str
    entity_type: str
    tag: str


class EntityTags(BaseModel):
    entity_id: str
    entity_type: str
    tags: List[str]


# Predefined tag options
PREDEFINED_TAGS = [
    "malicious",
    "suspicious",
    "benign",
    "to_review",
    "infrastructure",
    "phishing",
    "malware",
    "c2",
    "botnet",
    "legitimate",
    "false_positive"
]
