"use client";
import { useState } from "react";

const YT_PATTERN = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/;

interface Props {
  onSubmit: (url: string) => void;
  loading: boolean;
  notionConfigured: boolean;
}

export default function UrlInput({ onSubmit, loading, notionConfigured }: Props) {
  const [url, setUrl] = useState("");
  const isValid = YT_PATTERN.test(url.trim());
  const canSubmit = isValid && notionConfigured && !loading;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <p className="text-sm font-medium text-gray-500 mb-3">🔗 YouTube URL을 입력하세요</p>
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="url"
            placeholder="https://youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canSubmit && onSubmit(url.trim())}
            className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all ${
              url.length > 0
                ? isValid
                  ? "border-green-400 focus:ring-green-300"
                  : "border-red-400 focus:ring-red-300"
                : "border-gray-200 focus:ring-indigo-300"
            }`}
          />
          {url.length > 0 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg">
              {isValid ? "✅" : "❌"}
            </span>
          )}
        </div>
        <button
          onClick={() => onSubmit(url.trim())}
          disabled={!canSubmit}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 whitespace-nowrap"
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span> 분석 중...
            </>
          ) : (
            "🚀 분석 시작"
          )}
        </button>
      </div>
      {!notionConfigured && (
        <p className="text-xs text-amber-600 mt-2">⚠️ 우측 상단의 ⚙️ 설정에서 Notion API Key를 먼저 입력해주세요.</p>
      )}
      {url.length > 0 && !isValid && (
        <p className="text-xs text-red-500 mt-2">유효한 YouTube URL을 입력해주세요.</p>
      )}
    </div>
  );
}
