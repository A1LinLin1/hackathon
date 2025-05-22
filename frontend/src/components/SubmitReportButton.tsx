// src/components/SubmitReportButton.tsx
import React, { useState, ChangeEvent } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID } from '../suiClient';

interface Finding {
  line: number;
  col: number;
  message: string;
  category: string;
}

// LEB128 编码
function encodeULEB128(n: number): Uint8Array {
  const out: number[] = [];
  do {
    let byte = n & 0x7f;
    n >>>= 7;
    if (n !== 0) byte |= 0x80;
    out.push(byte);
  } while (n !== 0);
  return Uint8Array.from(out);
}

// BCS vector<u8> 编码
function bcsEncodeVectorU8(bytes: Uint8Array): Uint8Array {
  const prefix = encodeULEB128(bytes.length);
  const buf = new Uint8Array(prefix.length + bytes.length);
  buf.set(prefix, 0);
  buf.set(bytes, prefix.length);
  return buf;
}

// hex 字符串 → Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substr(i, 2), 16);
  }
  return bytes;
}

export function SubmitReportButton({ onSuccess }: { onSuccess: () => void }) {
  const wallet = useWallet();
  const [file, setFile] = useState<File | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [codeHash, setCodeHash] = useState<string>('');
  const [status, setStatus] = useState<'idle'|'auditing'|'submitting'|'done'|'error'>('idle');
  const [txDigest, setTxDigest] = useState<string|null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setFindings([]);
    setCodeHash('');
    setTxDigest(null);
    setStatus('idle');
  };

  const handleSubmit = async () => {
    if (!file) {
      alert('请先选择 .move、.sol、.rs、.go 或 .vy 源码文件');
      return;
    }
    if (wallet.status !== 'connected' || !wallet.account) {
      alert('请先连接钱包');
      return;
    }

    try {
      // 1. 静态审计
      setStatus('auditing');
      const source = await file.text();
      const auditRes = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, filename: file.name }),
      });
      if (!auditRes.ok) throw new Error(`审计接口返回 ${auditRes.status}`);
      const { findings: fRes, codeHash: hash, summary } = await auditRes.json() as {
        findings: Finding[];
        codeHash: string;
        summary: string;
      };
      setFindings(fRes);
      setCodeHash(hash);

// —— 2. 构造旧版 Transaction + BCS 编码参数 ——  
setStatus('submitting');
const tx = new Transaction();

// ① BCS 序列化 u64
function bcsEncodeU64(n: number): Uint8Array {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigUint64(0, BigInt(n), true);
  return buf;
}
const tsNumber = Math.floor(Date.now() / 1000);
const tsBytes  = bcsEncodeU64(tsNumber);

// ② BCS 序列化 vector<u8>
const fnBytes   = bcsEncodeVectorU8(new TextEncoder().encode(file.name));
const hashBytes = bcsEncodeVectorU8(hexToBytes(codeHash));
const sumBytes  = bcsEncodeVectorU8(new TextEncoder().encode(summary));

tx.moveCall({
  target: `${PACKAGE_ID}::ReportStore::submit`,
  arguments: [
    tx.pure(tsBytes),    // u64
    tx.pure(fnBytes),    // vector<u8>
    tx.pure(hashBytes),  // vector<u8>
    tx.pure(sumBytes),   // vector<u8>
  ],
});

      // 3. 上链执行
      const result = await wallet.signAndExecuteTransaction({
        transaction: tx,
        options:     { showEffects: true },
        gasBudget:   50_000,
      });

      setTxDigest(result.digest);
      setStatus('done');
      setTimeout(onSuccess, 4000);
    } catch (e) {
      console.error('提交出错:', e);
      setStatus('error');
    }
  };

  // 按 category 分组
  const grouped = findings.reduce<Record<string, Finding[]>>((acc, f) => {
    acc[f.category] = (acc[f.category] || []).concat(f);
    return acc;
  }, {});

  return (
    <div className="p-4 border rounded space-y-3">
      <input
        type="file"
        accept=".move,.sol,.rs,.go,.vy"
        onChange={handleFileChange}
        disabled={status==='auditing'||status==='submitting'}
        className="file:bg-blue-400 file:text-white file:px-4 file:py-2 file:rounded file:border-0 file:cursor-pointer hover:file:bg-blue-500 disabled:file:bg-gray-300 disabled:cursor-not-allowed"
      />
      <button
        onClick={handleSubmit}
        disabled={!file||wallet.status!=='connected'||status==='auditing'||status==='submitting'}
        className="px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-500 disabled:opacity-50"
      >
        {status==='auditing'  ? '静态审计中…'
         :status==='submitting'? '上链提交中…'
         :'提交审计报告'}
      </button>

      {status==='error' && <p className="text-red-500 text-sm">发生错误，请查看控制台。</p>}

      {findings.length > 0 && (
        <div>
          <h4 className="font-semibold">静态审计告警（共 {findings.length} 条）：</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto text-sm">
            {Object.entries(grouped).map(([cat, items]) => (
              <details key={cat} className="border rounded p-2">
                <summary>{cat} ({items.length} 条)</summary>
                <ul className="list-disc ml-5 mt-1">
                  {items.map((f,i) => <li key={i}>[行{f.line}, 列{f.col}] {f.message}</li>)}
                </ul>
              </details>
            ))}
          </div>
          <p className="mt-2 text-sm"><strong>代码哈希：</strong> {codeHash}</p>
        </div>
      )}

      {status==='done' && txDigest && (
        <p className="mt-2 text-sm text-green-600">提交成功 🎉 Tx 摘要：{txDigest}</p>
      )}
    </div>
  );
}
