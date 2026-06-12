"use client";
import { JobStatus } from "@/stores/useAppStore";

const STEPS = [
  { key: "fetching",   label: "영상 정보 수집",  icon: "🔍" },
  { key: "extracting", label: "자막 추출",        icon: "📄" },
  { key: "refining",   label: "AI 분석",          icon: "🤖" },
  { key: "saving",     label: "Notion 저장",      icon: "📝" },
];

function getStepIndex(step: string) {
  return STEPS.findIndex((s) => s.key === step);
}

interface Props {
  job: JobStatus;
  onOpenNotion: () => void;
  onReset: () => void;
}

export default function ProgressTracker({ job, onOpenNotion, onReset }: Props) {
  const currentIdx = getStepIndex(job.step);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700">분석 진행 상황</h3>
        {job.status === "completed" && (
          <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">완료</span>
        )}
        {job.status === "failed" && (
          <span className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full font-medium">실패</span>
        )}
      </div>

      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => {
          const done = job.status === "completed" || i < currentIdx;
          const active = i === currentIdx && job.status === "processing";
          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  done ? "bg-green-500 text-white" : active ? "bg-indigo-600 text-white ring-4 ring-indigo-100" : "bg-gray-100 text-gray-400"
                }`}>
                  {done ? "✓" : step.icon}
                </div>
                <span className={`text-xs mt-1 text-center ${done || active ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 mb-4 ${done ? "bg-green-400" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* 프로그레스 바 */}
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${job.progress}%` }}
        />
      </div>

      {/* 상태 메시지 */}
      <p className={`text-sm ${job.status === "failed" ? "text-red-500" : "text-gray-600"}`}>
        {job.status === "processing" && <span className="animate-pulse">⏳ </span>}
        {job.message}
      </p>

      {/* 완료 버튼 */}
      {job.status === "completed" && job.resultUrl && (
        <div className="flex gap-3 mt-1">
          <a
            href={job.resultUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-indigo-600 text-white text-center py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition-all"
          >
            📋 Notion에서 보기
          </a>
          <button
            onClick={onReset}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-all"
          >
            새 영상 분석
          </button>
        </div>
      )}

      {job.status === "failed" && (
        <button
          onClick={onReset}
          className="w-full border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-all"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
