export interface JobData {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  step: string;
  message: string;
  progress: number;
  resultUrl?: string;
  error?: string;
}

// 서버리스 인스턴스 내 공유 메모리
const jobs: Record<string, JobData> = {};

export function getJob(jobId: string): JobData | undefined {
  return jobs[jobId];
}

export function setJob(jobId: string, data: JobData) {
  jobs[jobId] = data;
}

export function updateJob(jobId: string, patch: Partial<JobData>) {
  if (jobs[jobId]) jobs[jobId] = { ...jobs[jobId], ...patch };
}
