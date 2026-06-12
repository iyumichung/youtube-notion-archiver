from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime


class NotionConfig(BaseModel):
    token: str
    database_id: str


class AnalyzeRequest(BaseModel):
    url: str
    notion_config: NotionConfig


class NotionTestRequest(BaseModel):
    token: str
    database_id: str


class ChapterItem(BaseModel):
    timestamp: str
    title: str
    content: str


class RefinedResult(BaseModel):
    summary: str
    keywords: list[str]
    chapters: list[ChapterItem]
    full_script: str


class VideoInfo(BaseModel):
    video_id: str
    title: str
    channel: str
    url: str
    thumbnail_url: str
    duration: str
    processed_at: str


class JobStatus(BaseModel):
    job_id: str
    status: str  # pending | processing | completed | failed
    step: str    # fetching | extracting | refining | saving | done
    message: str
    progress: int  # 0~100
    result_url: Optional[str] = None
    error: Optional[str] = None


class JobEvent(BaseModel):
    event: str
    data: dict
