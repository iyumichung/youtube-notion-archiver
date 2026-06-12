"use client";
import { useState } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { testNotionConnection } from "@/lib/api";

export default function SettingsPanel() {
  const { notionConfig, setNotionConfig, isSettingsOpen, setSettingsOpen } = useAppStore();
  const [token, setToken] = useState(notionConfig.token);
  const [databaseId, setDatabaseId] = useState(notionConfig.databaseId);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  if (!isSettingsOpen) return null;

  const handleSave = () => {
    setNotionConfig({ token, databaseId });
    setSettingsOpen(false);
  };

  const handleTest = async () => {
    if (!token || !databaseId) {
      setTestResult({ ok: false, msg: "API Key와 Database ID를 입력해주세요." });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      await testNotionConnection(token, databaseId);
      setTestResult({ ok: true, msg: "연결 성공!" });
    } catch (e: unknown) {
      setTestResult({ ok: false, msg: e instanceof Error ? e.message : "연결 실패" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* 배경 오버레이 */}
      <div className="flex-1 bg-black/30" onClick={() => setSettingsOpen(false)} />
      {/* 패널 */}
      <div className="w-80 bg-white shadow-2xl flex flex-col p-6 gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">⚙️ Notion 연동 설정</h2>
          <button onClick={() => setSettingsOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Notion API Key</label>
          <input
            type="password"
            placeholder="secret_xxxxxxxxxxxx"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <p className="text-xs text-gray-400">Notion → Settings → My connections → Develop or manage integrations</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Database ID</label>
          <input
            type="text"
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={databaseId}
            onChange={(e) => setDatabaseId(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <p className="text-xs text-gray-400">데이터베이스 URL에서 복사 (32자리 ID)</p>
        </div>

        {testResult && (
          <p className={`text-sm font-medium ${testResult.ok ? "text-green-600" : "text-red-500"}`}>
            {testResult.ok ? "✅" : "❌"} {testResult.msg}
          </p>
        )}

        <div className="flex gap-2 mt-2">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex-1 border border-indigo-500 text-indigo-600 rounded-lg py-2 text-sm font-medium hover:bg-indigo-50 disabled:opacity-50"
          >
            {testing ? "테스트 중..." : "연결 테스트"}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700"
          >
            저장
          </button>
        </div>

        <div className="mt-auto pt-4 border-t">
          <p className="text-xs text-gray-400">
            입력한 정보는 브라우저 LocalStorage에만 저장되며 외부로 전송되지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
