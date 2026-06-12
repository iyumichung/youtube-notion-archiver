import { getJobStatus } from "./api";

export function subscribeToJob(
  jobId: string,
  onUpdate: (data: Record<string, unknown>) => void,
  onDone: () => void,
  onError: (err: string) => void
): () => void {
  let stopped = false;

  async function poll() {
    while (!stopped) {
      try {
        const data = await getJobStatus(jobId);
        onUpdate(data);
        if (data.status === "completed" || data.status === "failed") {
          onDone();
          return;
        }
      } catch {
        onError("상태 확인 중 오류가 발생했습니다.");
        return;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  poll();
  return () => { stopped = true; };
}
