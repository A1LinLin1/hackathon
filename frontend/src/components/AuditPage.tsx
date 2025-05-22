// src/components/AuditPage.tsx
import React, { useEffect, useState } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { getAuditReportsByOwner, Report } from '../api/getReports';
import { SubmitReportButton } from './SubmitReportButton';

export function AuditPage() {
  const wallet = useWallet();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 过滤相关 state
  const [fileFilter, setFileFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // 分页相关 state
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // 拉取审计报告列表
  const fetchReports = async () => {
    if (wallet.status !== 'connected' || !wallet.account?.address) {
      setReports([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      console.log('🔍 Fetch reports for', wallet.account.address);
      const list = await getAuditReportsByOwner(wallet.account.address);
      console.log('📄 Received reports:', list);
      setReports(list);
      setPage(1); // 重置到第一页
    } catch (e: any) {
      console.error('❌ fetchReports error', e);
      setError(e.message || '拉取审计报告失败');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  // 提交成功后刷新
  const handleSuccess = () => {
    fetchReports();
    setTimeout(fetchReports, 5000);
  };

  useEffect(() => {
    fetchReports();
  }, [wallet.status, wallet.account?.address]);

  // 根据文件名和时间区间过滤
  const filtered = reports.filter(r => {
    const matchFile =
      fileFilter === '' || r.fileName.toLowerCase().includes(fileFilter.toLowerCase());
    const ts = r.timestamp * 1000;
    const afterFrom = fromDate === '' || ts >= new Date(fromDate).getTime();
    const beforeTo = toDate === '' || ts <= new Date(toDate).getTime() + 86399999;
    return matchFile && afterFrom && beforeTo;
  });

  // 分页计算
  const pageCount = Math.ceil(filtered.length / pageSize);
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="p-4 space-y-4">
      {/* 提交审计报告 */}
      <SubmitReportButton onSuccess={handleSuccess} />

      {/* 列表头 & 刷新 & 过滤控件 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">我的审计报告</h2>
        <button
          onClick={fetchReports}
          className="text-sm text-blue-600 hover:underline"
        >
          刷新列表
        </button>
        <input
          type="text"
          placeholder="按文件名搜索"
          value={fileFilter}
          onChange={e => setFileFilter(e.target.value)}
          className="border px-2 py-1 rounded w-1/4"
        />
        <div className="flex items-center space-x-2">
          <label className="text-sm">从</label>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm">到</label>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </div>
      </div>

      {/* 错误提示 */}
      {error && <p className="text-red-500">错误：{error}</p>}

      {/* 列表 或 加载/空 */}
      {loading ? (
        <p>加载中…</p>
      ) : filtered.length === 0 ? (
        <p>暂无符合条件的报告</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2">Object ID</th>
                <th className="px-4 py-2">时间</th>
                <th className="px-4 py-2">文件名</th>
                <th className="px-4 py-2">代码哈希</th>
                <th className="px-4 py-2">摘要</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map(r => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono break-all">{r.id}</td>
                  <td className="px-4 py-2">
                    {new Date(r.timestamp * 1000).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 break-all">{r.fileName}</td>
                  <td className="px-4 py-2 font-mono break-all">{r.codeHash}</td>
                  <td className="px-4 py-2">{r.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 分页控制 */}
          <div className="flex justify-center items-center space-x-4 py-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              上一页
            </button>
            <span>
              第 {page} / {pageCount} 页
            </span>
            <button
              onClick={() => setPage(p => Math.min(pageCount, p + 1))}
              disabled={page === pageCount}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

