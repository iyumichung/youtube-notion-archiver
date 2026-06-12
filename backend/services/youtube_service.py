import re
import httpx
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound

_api = YouTubeTranscriptApi()


def extract_video_id(url: str) -> str | None:
    patterns = [
        r"(?:v=|youtu\.be/)([A-Za-z0-9_-]{11})",
        r"(?:embed/)([A-Za-z0-9_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


async def fetch_video_info(video_id: str) -> dict:
    url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    return {
        "video_id": video_id,
        "title": data.get("title", "제목 없음"),
        "channel": data.get("author_name", "알 수 없음"),
        "url": f"https://www.youtube.com/watch?v={video_id}",
        "thumbnail_url": data.get("thumbnail_url", f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"),
        "duration": "알 수 없음",
    }


def fetch_transcript(video_id: str) -> list[dict]:
    """
    자막 추출 (youtube-transcript-api v1.x 방식)
    1순위: 수동 자막 (ko → en)
    2순위: 자동 생성 자막 (ko → en)
    """
    preferred_langs = ["ko", "en"]

    # 1순위: 수동 자막 직접 시도
    try:
        fetched = _api.fetch(video_id, languages=preferred_langs)
        return [{"text": s.text, "start": s.start, "duration": s.duration} for s in fetched]
    except NoTranscriptFound:
        pass
    except Exception:
        pass

    # 2순위: transcript list를 통한 자동 생성 자막
    try:
        tl = _api.list(video_id)
        for lang in preferred_langs:
            try:
                t = tl.find_generated_transcript([lang])
                fetched = t.fetch()
                return [{"text": s.text, "start": s.start, "duration": s.duration} for s in fetched]
            except Exception:
                continue
        # 어떤 언어든 첫 번째 자막 사용
        for t in tl:
            fetched = t.fetch()
            return [{"text": s.text, "start": s.start, "duration": s.duration} for s in fetched]
    except TranscriptsDisabled:
        raise ValueError("이 영상은 자막이 비활성화되어 있습니다.")
    except Exception as e:
        raise ValueError(f"자막을 가져올 수 없습니다: {str(e)}")

    raise ValueError("사용 가능한 자막이 없습니다.")


def preprocess_transcript(raw: list[dict]) -> str:
    segments = []
    for item in raw:
        start = item.get("start", 0)
        mm = int(start // 60)
        ss = int(start % 60)
        segments.append(f"[{mm:02d}:{ss:02d}] {item['text']}")
    return "\n".join(segments)
