import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { setJob, updateJob } from "@/lib/jobStore";

async function processJob(
  jobId: string,
  url: string,
  notionToken: string,
  databaseId: string
) {
  try {
    updateJob(jobId, { step: "fetching", message: "영상 정보를 가져오는 중...", progress: 10, status: "processing" });
    const videoId = extractVideoId(url);
    if (!videoId) throw new Error("유효하지 않은 YouTube URL입니다.");
    const videoInfo = await fetchVideoInfo(videoId);

    updateJob(jobId, { step: "extracting", message: "자막을 추출하는 중...", progress: 30 });
    const transcript = await fetchTranscript(videoId);

    updateJob(jobId, { step: "refining", message: "AI로 내용을 정제하는 중... (약 30~60초 소요)", progress: 55 });
    const refined = await refineWithGemini(videoInfo.title, transcript);

    updateJob(jobId, { step: "saving", message: "Notion에 저장하는 중...", progress: 85 });
    const notionUrl = await saveToNotion(notionToken, databaseId, videoInfo, refined);

    updateJob(jobId, { step: "done", message: "저장 완료!", progress: 100, status: "completed", resultUrl: notionUrl });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    updateJob(jobId, { step: "error", message: msg, progress: 0, status: "failed", error: msg });
  }
}

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

async function fetchVideoInfo(videoId: string) {
  const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
  if (!res.ok) throw new Error("영상 정보를 가져올 수 없습니다.");
  const data = await res.json();
  return {
    videoId,
    title: data.title || "제목 없음",
    channel: data.author_name || "알 수 없음",
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  };
}

async function fetchTranscript(videoId: string): Promise<string> {
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8", "User-Agent": "Mozilla/5.0" },
  });
  const html = await res.text();
  const match = html.match(/"captionTracks":(\[.*?\])/);
  if (!match) throw new Error("이 영상은 자막을 지원하지 않습니다.");

  const tracks = JSON.parse(match[1]);
  const preferred = tracks.find((t: { languageCode: string }) => t.languageCode === "ko")
    || tracks.find((t: { languageCode: string }) => t.languageCode === "en")
    || tracks[0];
  if (!preferred?.baseUrl) throw new Error("사용 가능한 자막이 없습니다.");

  const xmlRes = await fetch(preferred.baseUrl);
  const xml = await xmlRes.text();
  const lines = [...xml.matchAll(/<text start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g)];
  return lines.map((m) => {
    const start = parseFloat(m[1]);
    const mm = Math.floor(start / 60).toString().padStart(2, "0");
    const ss = Math.floor(start % 60).toString().padStart(2, "0");
    const text = m[2].replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/<[^>]+>/g, "");
    return `[${mm}:${ss}] ${text}`;
  }).join("\n");
}

async function refineWithGemini(title: string, transcript: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");

  const prompt = `당신은 유튜브 영상 콘텐츠 전문 편집자입니다. 주어진 자막을 정제하고 구조화하세요.

[정제 규칙]
1. 구어체를 문어체로 변환
2. 필러 단어 제거 (음..., 어..., 그니까 등)
3. 오탈자 및 인식 오류 수정

[출력 형식 - 유효한 JSON만 응답, 코드블록 없이]
{"summary":"3~5줄 핵심 요약","keywords":["키워드1","키워드2"],"chapters":[{"timestamp":"00:00","title":"챕터 제목","content":"내용"}],"full_script":"전체 정제 스크립트"}

[영상 제목]: ${title}
[원본 자막]:
${transcript.slice(0, 8000)}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3 } }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Gemini 오류: ${err.error?.message || res.statusText}`);
  }
  const data = await res.json();
  let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  if (raw.includes("```")) raw = raw.split("```")[1]?.replace(/^json/, "").trim() || raw;
  return JSON.parse(raw);
}

async function saveToNotion(
  token: string,
  databaseId: string,
  videoInfo: { title: string; url: string; channel: string; thumbnailUrl: string },
  data: { summary: string; keywords: string[]; chapters: { timestamp: string; title: string; content: string }[]; full_script: string }
) {
  const payload = {
    parent: { database_id: databaseId },
    cover: { type: "external", external: { url: videoInfo.thumbnailUrl } },
    properties: {
      Title: { title: [{ type: "text", text: { content: videoInfo.title } }] },
      "YouTube URL": { url: videoInfo.url },
      Channel: { rich_text: [{ type: "text", text: { content: videoInfo.channel } }] },
      Date: { date: { start: new Date().toISOString().slice(0, 10) } },
      Keywords: { rich_text: [{ type: "text", text: { content: data.keywords?.join(", ") || "" } }] },
      Summary: { rich_text: [{ type: "text", text: { content: (data.summary || "").slice(0, 2000) } }] },
    },
    children: [
      { object: "block", type: "heading_2", heading_2: { rich_text: [{ type: "text", text: { content: "📌 핵심 요약" } }] } },
      { object: "block", type: "callout", callout: { rich_text: [{ type: "text", text: { content: (data.summary || "").slice(0, 2000) } }], icon: { emoji: "💡" }, color: "blue_background" } },
      { object: "block", type: "heading_2", heading_2: { rich_text: [{ type: "text", text: { content: "⏱️ 챕터별 내용" } }] } },
      ...(data.chapters || []).slice(0, 10).map((ch) => ({
        object: "block", type: "toggle",
        toggle: {
          rich_text: [{ type: "text", text: { content: `${ch.timestamp}  ${ch.title}` } }],
          children: [{ object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: ch.content } }] } }],
        },
      })),
      { object: "block", type: "heading_2", heading_2: { rich_text: [{ type: "text", text: { content: "📝 전체 스크립트" } }] } },
      { object: "block", type: "toggle", toggle: { rich_text: [{ type: "text", text: { content: "전체 스크립트 펼치기" } }], children: [{ object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: (data.full_script || "").slice(0, 2000) } }] } }] } },
    ],
  };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Notion-Version": "2022-06-28" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Notion API 오류 (${res.status}): ${err.message}`);
  }
  return (await res.json()).url || "";
}

export async function POST(req: NextRequest) {
  const { url, notion_config } = await req.json();
  const videoId = extractVideoId(url);
  if (!videoId) return NextResponse.json({ error: "유효하지 않은 YouTube URL" }, { status: 400 });

  const jobId = randomUUID();
  setJob(jobId, { jobId, status: "pending", step: "pending", message: "분석 대기 중...", progress: 0 });
  processJob(jobId, url, notion_config.token, notion_config.database_id);

  return NextResponse.json({ job_id: jobId });
}
