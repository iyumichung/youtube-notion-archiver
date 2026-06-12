"use client";
import { useAppStore } from "@/stores/useAppStore";

export default function HistoryTable() {
  const { history } = useAppStore();

  if (history.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-700 mb-4">📚 분석 히스토리</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 font-medium">영상 제목</th>
              <th className="pb-2 font-medium w-28">날짜</th>
              <th className="pb-2 font-medium w-20 text-center">Notion</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.jobId} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-2.5 pr-4">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-800 hover:text-indigo-600 truncate block max-w-xs"
                    title={item.title}
                  >
                    {item.title}
                  </a>
                </td>
                <td className="py-2.5 text-gray-400 text-xs">{item.processedAt.slice(0, 10)}</td>
                <td className="py-2.5 text-center">
                  <a
                    href={item.notionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-500 hover:text-indigo-700 text-base"
                    title="Notion에서 보기"
                  >
                    ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
