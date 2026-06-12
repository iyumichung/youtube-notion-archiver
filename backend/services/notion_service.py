import requests
from datetime import datetime, timezone


NOTION_API_BASE = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"


def _headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
    }


def test_connection(token: str, database_id: str) -> bool:
    url = f"{NOTION_API_BASE}/databases/{database_id}"
    resp = requests.get(url, headers=_headers(token), timeout=10)
    resp.raise_for_status()
    return True


def _build_blocks(data: dict) -> list:
    blocks = [
        # 핵심 요약
        {"object": "block", "type": "heading_2",
         "heading_2": {"rich_text": [{"type": "text", "text": {"content": "📌 핵심 요약"}}]}},
        {"object": "block", "type": "callout",
         "callout": {
             "rich_text": [{"type": "text", "text": {"content": data["summary"]}}],
             "icon": {"emoji": "💡"},
             "color": "blue_background"
         }},
        # 키워드
        {"object": "block", "type": "heading_2",
         "heading_2": {"rich_text": [{"type": "text", "text": {"content": "🏷️ 키워드"}}]}},
        {"object": "block", "type": "paragraph",
         "paragraph": {"rich_text": [{"type": "text", "text": {
             "content": " · ".join(f"#{kw}" for kw in data["keywords"])
         }}]}},
        # 챕터
        {"object": "block", "type": "heading_2",
         "heading_2": {"rich_text": [{"type": "text", "text": {"content": "⏱️ 챕터별 내용"}}]}},
        *[{
            "object": "block", "type": "toggle",
            "toggle": {
                "rich_text": [{"type": "text", "text": {
                    "content": f"{ch['timestamp']}  {ch['title']}"
                }}],
                "children": [{
                    "object": "block", "type": "paragraph",
                    "paragraph": {"rich_text": [{"type": "text", "text": {"content": ch["content"]}}]}
                }]
            }
        } for ch in data.get("chapters", [])],
        # 전체 스크립트
        {"object": "block", "type": "heading_2",
         "heading_2": {"rich_text": [{"type": "text", "text": {"content": "📝 정제된 전체 스크립트"}}]}},
        {"object": "block", "type": "toggle",
         "toggle": {
             "rich_text": [{"type": "text", "text": {"content": "전체 스크립트 펼치기"}}],
             "children": [{
                 "object": "block", "type": "paragraph",
                 "paragraph": {"rich_text": [{"type": "text", "text": {
                     # Notion 블록당 2000자 제한
                     "content": data["full_script"][:2000]
                 }}]}
             }]
         }},
    ]
    return blocks


def create_page(token: str, database_id: str, video_info: dict, data: dict) -> str:
    """Notion 페이지 생성 후 URL 반환"""
    url = f"{NOTION_API_BASE}/pages"

    now = datetime.now(timezone.utc).isoformat()

    payload = {
        "parent": {"database_id": database_id},
        "icon": {"type": "emoji", "emoji": "📺"},
        "cover": {
            "type": "external",
            "external": {"url": video_info["thumbnail_url"]}
        },
        "properties": {
            "Title": {
                "title": [{"type": "text", "text": {"content": video_info["title"]}}]
            },
            "YouTube URL": {"url": video_info["url"]},
            "Channel": {"rich_text": [{"type": "text", "text": {"content": video_info["channel"]}}]},
            "Date": {"date": {"start": now[:10]}},
            "Keywords": {"rich_text": [{"type": "text", "text": {
                "content": ", ".join(data.get("keywords", []))
            }}]},
            "Summary": {"rich_text": [{"type": "text", "text": {
                "content": data["summary"][:2000]
            }}]},
        },
        "children": _build_blocks(data),
    }

    resp = requests.post(url, headers=_headers(token), json=payload, timeout=30)
    if not resp.ok:
        raise ValueError(f"Notion API 오류 ({resp.status_code}): {resp.json().get('message', resp.text)}")
    return resp.json().get("url", "")
