import asyncio
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
import json

from models.schemas import AnalyzeRequest, NotionTestRequest
from services import youtube_service, llm_service, notion_service

router = APIRouter()

# 메모리 내 작업 상태 저장소 (프로덕션에선 Redis 등 사용)
_jobs: dict[str, dict] = {}


def _update_job(job_id: str, step: str, message: str, progress: int,
                status: str = "processing", result_url: str | None = None, error: str | None = None):
    _jobs[job_id] = {
        "job_id": job_id,
        "status": status,
        "step": step,
        "message": message,
        "progress": progress,
        "result_url": result_url,
        "error": error,
    }


async def _process_job(job_id: str, request: AnalyzeRequest):
    try:
        # 1단계: 영상 정보 가져오기
        _update_job(job_id, "fetching", "영상 정보를 가져오는 중...", 10)
        video_id = youtube_service.extract_video_id(request.url)
        if not video_id:
            raise ValueError("유효하지 않은 YouTube URL입니다.")
        video_info = await youtube_service.fetch_video_info(video_id)
        video_info["processed_at"] = datetime.now(timezone.utc).isoformat()

        # 2단계: 자막 추출
        _update_job(job_id, "extracting", "자막을 추출하는 중...", 30)
        await asyncio.sleep(0)  # 이벤트 루프에 제어권 반환
        raw_transcript = youtube_service.fetch_transcript(video_id)
        transcript_text = youtube_service.preprocess_transcript(raw_transcript)

        # 3단계: LLM 정제
        _update_job(job_id, "refining", "AI로 내용을 정제하는 중... (약 30~60초 소요)", 55)
        await asyncio.sleep(0)
        refined = await asyncio.to_thread(
            llm_service.refine_transcript, video_info["title"], transcript_text
        )

        # 4단계: Notion 저장
        _update_job(job_id, "saving", "Notion에 저장하는 중...", 85)
        await asyncio.sleep(0)
        notion_url = await asyncio.to_thread(
            notion_service.create_page,
            request.notion_config.token,
            request.notion_config.database_id,
            video_info,
            refined,
        )

        _update_job(job_id, "done", "저장 완료!", 100,
                    status="completed", result_url=notion_url)

    except Exception as e:
        _update_job(job_id, "error", str(e), 0, status="failed", error=str(e))


@router.post("/analyze")
async def start_analysis(request: AnalyzeRequest, background_tasks: BackgroundTasks):
    video_id = youtube_service.extract_video_id(request.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="유효하지 않은 YouTube URL입니다.")

    job_id = str(uuid.uuid4())
    _update_job(job_id, "pending", "분석 대기 중...", 0, status="pending")
    background_tasks.add_task(_process_job, job_id, request)
    return {"job_id": job_id}


@router.get("/status/{job_id}")
async def stream_status(job_id: str):
    async def event_generator():
        prev_progress = -1
        timeout_count = 0
        while True:
            job = _jobs.get(job_id)
            if not job:
                yield f"data: {json.dumps({'error': 'job not found'})}\n\n"
                break

            if job["progress"] != prev_progress:
                prev_progress = job["progress"]
                timeout_count = 0
                yield f"data: {json.dumps(job)}\n\n"

            if job["status"] in ("completed", "failed"):
                break

            timeout_count += 1
            if timeout_count > 600:  # 10분 타임아웃
                break

            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/result/{job_id}")
async def get_result(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")
    return job


@router.post("/notion/test")
async def test_notion(request: NotionTestRequest):
    try:
        notion_service.test_connection(request.token, request.database_id)
        return {"success": True, "message": "Notion 연결 성공!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Notion 연결 실패: {str(e)}")
