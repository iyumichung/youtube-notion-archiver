# YouTube → Notion Archiver 설치 및 실행 가이드

## 필수 설치 도구

- [Node.js 20+](https://nodejs.org/) — 프론트엔드 실행
- [Python 3.11+](https://www.python.org/) — 백엔드 실행
- [Anthropic API Key](https://console.anthropic.com/) — Claude AI 사용

---

## 1단계: 백엔드 설정

```bash
cd youtube-notion-archiver/backend

# 가상환경 생성 및 활성화
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

# 패키지 설치
pip install -r requirements.txt

# 환경변수 설정
copy .env.example .env         # Windows
# cp .env.example .env         # Mac/Linux
```

`.env` 파일을 열고 Anthropic API Key 입력:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxx
```

백엔드 서버 실행:
```bash
uvicorn main:app --reload --port 8000
```

→ http://localhost:8000/docs 에서 API 문서 확인 가능

---

## 2단계: 프론트엔드 설정

```bash
cd youtube-notion-archiver/frontend

# 패키지 설치
npm install

# 환경변수 설정
copy .env.local.example .env.local    # Windows
# cp .env.local.example .env.local   # Mac/Linux

# 개발 서버 실행
npm run dev
```

→ http://localhost:3000 에서 앱 확인

---

## 3단계: Notion 설정

1. [Notion Integrations](https://www.notion.so/my-integrations) 접속
2. **New integration** 생성 → API Key 복사
3. 저장할 Notion 데이터베이스 페이지 접속
4. **...** 메뉴 → **Connections** → 생성한 Integration 연결
5. 데이터베이스 URL에서 ID 복사:
   ```
   https://notion.so/username/[여기가-DATABASE-ID]?v=...
   ```

6. 앱 상단의 ⚙️ 설정에서 API Key와 Database ID 입력 후 저장

---

## 4단계: Notion 데이터베이스 속성 설정

데이터베이스에 아래 속성들을 추가해주세요:

| 속성명      | 타입       |
|------------|------------|
| 제목        | Title      |
| 유튜브 URL  | URL        |
| 채널명      | Text       |
| 처리 날짜   | Date       |
| 키워드 태그  | Text       |
| 요약        | Text       |

---

## 사용법

1. 앱 접속 (http://localhost:3000)
2. ⚙️ 설정에서 Notion 연결 설정
3. YouTube URL 입력
4. 🚀 분석 시작 클릭
5. 완료 후 📋 Notion에서 보기 클릭

---

## 프로젝트 구조

```
youtube-notion-archiver/
├── backend/
│   ├── main.py                  # FastAPI 앱 진입점
│   ├── requirements.txt
│   ├── .env.example
│   ├── models/schemas.py        # Pydantic 모델
│   ├── routers/analyze.py       # API 엔드포인트
│   └── services/
│       ├── youtube_service.py   # 자막 추출
│       ├── llm_service.py       # Claude API (정제/요약)
│       └── notion_service.py    # Notion API
└── frontend/
    ├── app/
    │   ├── page.tsx             # 메인 페이지
    │   ├── layout.tsx
    │   └── components/
    │       ├── UrlInput.tsx
    │       ├── ProgressTracker.tsx
    │       ├── HistoryTable.tsx
    │       └── SettingsPanel.tsx
    ├── lib/
    │   ├── api.ts               # 백엔드 API 클라이언트
    │   └── sse.ts               # SSE 진행 상태 구독
    └── stores/useAppStore.ts    # Zustand 전역 상태
```
