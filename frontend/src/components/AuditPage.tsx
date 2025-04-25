// src/pages/AuditPage.tsx
import React, { useEffect, useState } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { client, PACKAGE_ID } from '../suiClient';
import { SubmitReportButton } from '../components/SubmitReportButton';

interface Report {
  id: string;
  version: number;
  codeHash: string;
  summary: string;
}

function bytesToHex(bytes: number[] | Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function AuditPage() {
  const wallet = useWallet();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    if (wallet.status !== 'connected') {
      setReports([]);
      return;
    }
    setLoading(true);
    try {
      const owned = await client.getOwnedObjects({
        owner: wallet.account.address,
        filter: { StructType: `${PACKAGE_ID}::ReportStore::AuditReport` },
      });
      const objs = Array.isArray(owned.data) ? owned.data : [];
      if (objs.length === 0) {
        setReports([]);
        return;
      }

      const respList = await client.multiGetObjects({
        ids: objs.map((o) => o.objectId),
        options: { showContent: true },
      });

      const list = respList
        .map((resp) => {
          const data = resp.data;
          if (data?.content && 'fields' in data.content && data.content.fields) {
            const f = data.content.fields;
            const raw = f.code_hash;
            const hexCode = Array.isArray(raw) ? bytesToHex(raw) : raw;
            return {
              id: data.objectId,
              version: data.version,
              codeHash: hexCode,
              summary: f.result_summary,
            };
          }
          return null;
        })
        .filter((r): r is Report => r !== null);

      setReports(list);
    } catch (e) {
      console.error('fetchReports failed:', e);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [wallet.status]);

  return (
    <div>
      <SubmitReportButton />
      {loading ? (
        <p>加载中…</p>
      ) : reports.length === 0 ? (
        <p>暂无报告</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Object ID</th>
              <th>Version</th>
              <th>Code Hash</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.version}</td>
                <td>{r.codeHash}</td>
                <td>{r.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}