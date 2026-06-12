const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function startAnalysis(url: string, token: string, databaseId: string) {
  const res = await fetch(`${API_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      notion_config: { token, database_id: databaseId },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "분석 시작 실패");
  }
  return res.json() as Promise<{ job_id: string }>;
}

export async function testNotionConnection(token: string, databaseId: string) {
  const res = await fetch(`${API_URL}/api/notion/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, database_id: databaseId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "연결 테스트 실패");
  }
  return res.json();
}
