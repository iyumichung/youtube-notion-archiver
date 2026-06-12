const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function subscribeToJob(
  jobId: string,
  onUpdate: (data: Record<string, unknown>) => void,
  onDone: () => void,
  onError: (err: string) => void
): () => void {
  const es = new EventSource(`${API_URL}/api/status/${jobId}`);

  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onUpdate(data);
      if (data.status === "completed" || data.status === "failed") {
        es.close();
        onDone();
      }
    } catch {
      onError("응답 파싱 오류");
      es.close();
    }
  };

  es.onerror = () => {
    onError("서버 연결이 끊겼습니다.");
    es.close();
  };

  return () => es.close();
}
