// src/components/HistoryPage.tsx
import React, { useEffect, useState } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { getAuditReportsByOwner } from '../api/getReports';
import type { SuiObjectResponse } from '@mysten/sui.js';

interface AuditReportFields {
  timestamp: number;
  file_name: { fields: number[] };
  summary: { fields: number[] };
  code_hash: { fields: number[] };
}

export function HistoryPage() {
  const { account, status } = useWallet();
  const address = account?.address ?? '';
  
  const [reports, setReports] = useState<SuiObjectResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 连接钱包后自动拉取
  useEffect(() => {
    if (status === 'connected' && address) {
      loadHistory(address);
    } else {
      setReports([]);
    }
  }, [status, address]);

  const loadHistory = async (addr: string) => {
    setLoading(true);
    setError(null);
    try {
      const objs = await getAuditReportsByOwner(addr);
      setReports(objs);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // 辅助：把字节数组转成字符串
  const decodeBytes = (bs: number[]) =>
    new TextDecoder().decode(new Uint8Array(bs));

  // 辅助：把字节数组转成十六进制哈希
  const toHex = (bs: number[]) =>
    Array.from(bs).map(b => b.toString(16).padStart(2, '0')).join('');

  return (
    <div className="p-4">
      <h2 className="text-xl mb-4">我的审计报告历史</h2>
      {loading && <p className="text-gray-600">加载中…</p>}
      {error && <div className="text-red-600 mb-4">出错：{error}</div>}

      {!loading && reports.length === 0 && !error && (
        <div className="text-gray-600">暂无上链审计报告</div>
      )}

      {reports.map(obj => {
        const fields = ((obj.data as any).content.fields) as AuditReportFields;
        const timeMs = fields.timestamp * 1000; // 假设 timestamp 单位是秒
        const dateStr = new Date(timeMs).toLocaleString();

        const fileName = decodeBytes(fields.file_name.fields);
        const summaryHash = toHex(fields.summary.fields);
        const codeHash    = toHex(fields.code_hash.fields);
        const objectId    = obj.reference.objectId;

        return (
          <div key={objectId} className="mb-4 p-4 border rounded shadow-sm">
            <div className="flex justify-between text-sm text-gray-500">
              <span>时间：{dateStr}</span>
              <span>对象ID：{objectId}</span>
            </div>
            <div className="mt-2 space-y-1">
              <p><strong>文件名：</strong>{fileName}</p>
              <p><strong>摘要哈希：</strong><code className="break-all">{summaryHash}</code></p>
              <p><strong>代码哈希：</strong><code className="break-all">{codeHash}</code></p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

