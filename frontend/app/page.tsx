"use client";
import { useCallback } from "react";
import { useAppStore, JobStatus } from "@/stores/useAppStore";
import { startAnalysis } from "@/lib/api";
import { subscribeToJob } from "@/lib/sse";
import UrlInput from "./components/UrlInput";
import ProgressTracker from "./components/ProgressTracker";
import HistoryTable from "./components/HistoryTable";
import SettingsPanel from "./components/SettingsPanel";

export default function Home() {
  const {
    notionConfig,
    setSettingsOpen,
    currentJob,
    setCurrentJob,
    clearCurrentJob,
    addHistory,
  } = useAppStore();

  const isConfigured = !!(notionConfig.token && notionConfig.databaseId);
  const isLoading = !!(currentJob && currentJob.status !== "completed" && currentJob.status !== "failed");

  const handleAnalyze = useCallback(async (url: string) => {
    if (!isConfigured) return;

    // 초기 상태 설정
    setCurrentJob({
      jobId: "",
      status: "pending",
      step: "pending",
      message: "분석을 시작합니다...",
      progress: 0,
    });

    try {
      const { job_id } = await startAnalysis(url, notionConfig.token, notionConfig.databaseId);

      // SSE로 진행 상황 구독
      subscribeToJob(
        job_id,
        (data) => {
          const job = data as JobStatus & { result_url?: string };
          setCurrentJob({
            jobId: job_id,
            status: job.status as JobStatus["status"],
            step: job.step,
            message: job.message,
            progress: job.progress,
            resultUrl: job.result_url,
            error: job.error,
          });
        },
        () => {
          // 완료 시 히스토리 추가
          const finalJob = useAppStore.getState().currentJob;
          if (finalJob?.status === "completed" && finalJob.resultUrl) {
            addHistory({
              jobId: job_id,
              title: url,
              url,
              notionUrl: finalJob.resultUrl,
              processedAt: new Date().toISOString(),
            });
          }
        },
        (err) => {
          setCurrentJob({
            jobId: job_id,
            status: "failed",
            step: "error",
            message: err,
            progress: 0,
            error: err,
          });
        }
      );
    } catch (e: unknown) {
      setCurrentJob({
        jobId: "",
        status: "failed",
        step: "error",
        message: e instanceof Error ? e.message : "알 수 없는 오류",
        progress: 0,
        error: e instanceof Error ? e.message : "알 수 없는 오류",
      });
    }
  }, [isConfigured, notionConfig, setCurrentJob, addHistory]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📺</span>
            <div>
              <h1 className="font-bold text-gray-900 text-base leading-tight">YouTube → Notion</h1>
              <p className="text-xs text-gray-400">자막 자동 분석 & 저장</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConfigured ? "bg-green-400" : "bg-amber-400"}`} />
            <span className="text-xs text-gray-500">{isConfigured ? "Notion 연결됨" : "Notion 미연결"}</span>
            <button
              onClick={() => setSettingsOpen(true)}
              className="ml-2 p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-all text-lg"
              title="설정"
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      {/* 메인 */}
      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-5">
        <UrlInput
          onSubmit={handleAnalyze}
          loading={isLoading}
          notionConfigured={isConfigured}
        />

        {currentJob && (
          <ProgressTracker
            job={currentJob}
            onOpenNotion={() => currentJob.resultUrl && window.open(currentJob.resultUrl, "_blank")}
            onReset={clearCurrentJob}
          />
        )}

        <HistoryTable />

        {/* 빈 상태 안내 */}
        {!currentJob && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🎬</p>
            <p className="text-sm">YouTube 영상 URL을 입력하면<br />자막을 분석하고 Notion에 저장해드립니다.</p>
          </div>
        )}
      </main>

      {/* 설정 패널 */}
      <SettingsPanel />
    </div>
  );
}
