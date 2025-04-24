import React, { useState } from 'react';

export function SubmitReportButton() {
  const [file, setFile] = useState<File | null>(null);
  const [findings, setFindings] = useState<
    Array<{ line: number; col: number; message: string; category: string }>
  >([]);
  const [codeHash, setCodeHash] = useState<string>('');
  const [digest, setDigest] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  // 选择 .move 文件
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setFindings([]);
      setDigest('');
      setStatus('');
    }
  };

  // 执行审计 + 链上提交
  const handleSubmit = async () => {
    if (!file) {
      alert('请先选择一个 .move 源码文件');
      return;
    }

    // 1. 读取源码
    const source = await file.text();
    setStatus('静态审计中…');

    // 2. 调用后端审计
    const auditRes = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source })
    });
    if (!auditRes.ok) {
      setStatus('静态审计失败');
      return;
    }
    const auditJson = await auditRes.json() as {
      findings: typeof findings;
      codeHash: string;
      summary: string;
    };
    setFindings(auditJson.findings);
    setCodeHash(auditJson.codeHash);

    // 3. 调用后端提交报告
    setStatus('上链提交中…');
    const submitRes = await fetch('/api/submit-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codeHash: auditJson.codeHash,
        summary: auditJson.summary
      })
    });
    if (!submitRes.ok) {
      const err = await submitRes.json();
      setStatus(`提交失败：${err.error || submitRes.statusText}`);
      return;
    }
    const { digest: txDigest } = await submitRes.json() as { digest: string };
    setDigest(txDigest);
    setStatus('提交成功 🎉');
  };

  return (
    <div className="p-4 border rounded space-y-3">
      <input type="file" accept=".move" onChange={handleFileChange} />
      <button
        onClick={handleSubmit}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        提交审计报告
      </button>

      {status && <p className="text-sm">{status}</p>}

      {findings.length > 0 && (
        <div>
          <h4 className="font-semibold">审计告警：</h4>
          <ul className="list-disc ml-5 text-sm">
            {findings.map((f, i) => (
              <li key={i}>
                [行{f.line}, 列{f.col}] {f.category}: {f.message}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm">
            <strong>代码哈希：</strong> {codeHash}
          </p>
        </div>
      )}

      {digest && (
        <p className="mt-2 text-sm">
          <strong>交易已提交，TxDigest：</strong> {digest}
        </p>
      )}
    </div>
  );
}

