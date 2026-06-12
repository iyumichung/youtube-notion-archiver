const API_BASE = "/api";

export async function startAnalysis(url: string, token: string, databaseId: string) {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, notion_config: { token, database_id: databaseId } }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "분석 시작 실패");
  }
  return res.json() as Promise<{ job_id: string }>;
}

export async function getJobStatus(jobId: string) {
  const res = await fetch(`${API_BASE}/status/${jobId}`);
  if (!res.ok) throw new Error("상태 조회 실패");
  return res.json();
}

export async function testNotionConnection(token: string, databaseId: string) {
  const res = await fetch(`${API_BASE}/notion/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, database_id: databaseId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "연결 테스트 실패");
  }
  return res.json();
}
