import json
import os
from google import genai
from google.genai import types

SYSTEM_PROMPT = """당신은 유튜브 영상 콘텐츠 전문 편집자입니다.
주어진 자막 원본을 다음 규칙에 따라 정제하고 구조화하세요.

[정제 규칙]
1. 구어체 표현을 자연스러운 문어체로 변환
2. 반복되는 필러 단어 제거 (음..., 어..., 그니까, 뭐 등)
3. 오탈자 및 자동 인식 오류 수정
4. 문맥이 끊긴 부분을 의미 단위로 재구성

[출력 형식 - 반드시 유효한 JSON으로만 응답, 마크다운 코드블록 없이]
{
  "summary": "3~5줄의 핵심 요약",
  "keywords": ["키워드1", "키워드2"],
  "chapters": [
    {
      "timestamp": "00:00",
      "title": "챕터 제목",
      "content": "정제된 내용 (2~4문장)"
    }
  ],
  "full_script": "전체 정제된 스크립트"
}"""

USER_PROMPT_TEMPLATE = """다음은 유튜브 영상의 원본 자막입니다. 위 지침에 따라 처리해주세요.

[영상 제목]: {title}
[원본 자막]:
{transcript}"""

MAX_TOKENS_PER_CHUNK = 5000


def estimate_tokens(text: str) -> int:
    return len(text) // 4


def split_transcript(text: str) -> list[str]:
    import re
    segments = re.split(r"(?=\[\d{2}:\d{2}\])", text)
    chunks, current, count = [], [], 0
    for seg in segments:
        token_count = estimate_tokens(seg)
        if count + token_count > MAX_TOKENS_PER_CHUNK and current:
            chunks.append("\n".join(current))
            current, count = [seg], token_count
        else:
            current.append(seg)
            count += token_count
    if current:
        chunks.append("\n".join(current))
    return chunks


def _call_gemini(title: str, transcript: str) -> dict:
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    prompt = f"{SYSTEM_PROMPT}\n\n{USER_PROMPT_TEMPLATE.format(title=title, transcript=transcript)}"

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.3,
            max_output_tokens=8192,
        )
    )

    raw = response.text.strip()
    # 마크다운 코드블록 제거
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


def refine_transcript(title: str, transcript: str) -> dict:
    if estimate_tokens(transcript) <= MAX_TOKENS_PER_CHUNK:
        return _call_gemini(title, transcript)

    # Map 단계: 청크별 요약
    chunks = split_transcript(transcript)
    chunk_summaries = []
    for i, chunk in enumerate(chunks):
        result = _call_gemini(title, chunk)
        chunk_summaries.append(
            f"[파트 {i+1}/{len(chunks)}]\n요약: {result['summary']}\n스크립트: {result['full_script']}"
        )

    # Reduce 단계: 통합 요약
    combined = "\n\n".join(chunk_summaries)
    return _call_gemini(f"{title} (통합 요약)", combined)
