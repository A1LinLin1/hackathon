import { useEffect, useState } from 'react';

export interface Report {
  objectId:    string;
  version:     string;
  codeHash:    string;
  resultSummary: string;
}

export default function AuditReportTable() {
  const [reports, setReports]     = useState<Report[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);

  const fetchReports = async (cursor?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    const res = await fetch(`/get-reports?${params.toString()}`);
    const data = await res.json() as { reports: Report[]; nextCursor?: string };
    setReports(prev => cursor ? [...prev, ...data.reports] : data.reports);
    setNextCursor(data.nextCursor || null);
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, []);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">AuditReport 列表</h2>
      <table className="min-w-full table-auto border-collapse mb-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 border">Object ID</th>
            <th className="px-4 py-2 border">Version</th>
            <th className="px-4 py-2 border">Code Hash</th>
            <th className="px-4 py-2 border">Result Summary</th>
          </tr>
        </thead>
        <tbody>
          {reports.map(r => (
            <tr key={r.objectId} className="hover:bg-gray-50">
              <td className="px-4 py-2 border break-all">{r.objectId}</td>
              <td className="px-4 py-2 border">{r.version}</td>
              <td className="px-4 py-2 border font-mono text-sm break-all">{r.codeHash}</td>
              <td className="px-4 py-2 border">{r.resultSummary}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {nextCursor && (
        <button
          onClick={() => fetchReports(nextCursor)}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {loading ? '加载中…' : '加载更多'}
        </button>
      )}
      {!loading && !nextCursor && reports.length === 0 && (
        <p className="text-gray-600">暂无报告</p>
      )}
    </div>
  );
}

