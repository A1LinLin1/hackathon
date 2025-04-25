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

// —— 辅助函数：把非负整数做 LEB128 编码 —— 
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

// —— 辅助函数：给一个 Uint8Array 加上长度前缀，做成 BCS vector<u8> —— 
function bcsEncodeVectorU8(bytes: Uint8Array): Uint8Array {
  const prefix = encodeULEB128(bytes.length);
  const buf = new Uint8Array(prefix.length + bytes.length);
  buf.set(prefix, 0);
  buf.set(bytes, prefix.length);
  return buf;
}

// —— 辅助函数：hex 字符串 → Uint8Array —— 
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substr(i, 2), 16);
  }
  return bytes;
}

export function SubmitReportButton() {
  const wallet = useWallet();
  const [file, setFile] = useState<File | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [codeHash, setCodeHash] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'auditing' | 'submitting' | 'done' | 'error'>('idle');
  const [txDigest, setTxDigest] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setFindings([]);
    setCodeHash('');
    setTxDigest(null);
    setStatus('idle');
  };

  const handleSubmit = async () => {
    if (!file) {
      alert('请先选择 .move 源码文件');
      return;
    }
    if (wallet.status !== 'connected' || !wallet.account) {
      alert('请先连接钱包');
      return;
    }

    try {
      // —— 1. 静态审计 —— 
      setStatus('auditing');
      const source = await file.text();
      const auditRes = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      });
      if (!auditRes.ok) throw new Error(`审计接口返回 ${auditRes.status}`);
      const { findings: fRes, codeHash: hash, summary } = await auditRes.json() as {
        findings: Finding[];
        codeHash: string;
        summary: string;
      };
      setFindings(fRes);
      setCodeHash(hash);

      // —— 2. 构造旧版 Transaction 并 BCS 编码参数 —— 
      setStatus('submitting');
      const tx = new Transaction();
      const hashBytes    = hexToBytes(hash);
      const hashBcs      = bcsEncodeVectorU8(hashBytes);
      const summaryBytes = new TextEncoder().encode(summary);
      const summaryBcs   = bcsEncodeVectorU8(summaryBytes);

      tx.moveCall({
        target: `${PACKAGE_ID}::ReportStore::submit`,
        arguments: [
          tx.pure(hashBcs),     // 传入完整 BCS bytes
          tx.pure(summaryBcs),  // 传入完整 BCS bytes
        ],
      });

      // —— 3. 用钱包发送（dry‐run 自动预算 + 签名执行），并固定预算 —— 
      const result = await wallet.signAndExecuteTransaction({
        transaction: tx,
        options: { showEffects: true },
        gasBudget: 50_000,
      });

      setTxDigest(result.digest);
      setStatus('done');
    } catch (e) {
      console.error('提交出错:', e);
      setStatus('error');
    }
  };

  return (
    <div className="p-4 border rounded space-y-3">
      <input
        type="file"
        accept=".move"
        onChange={handleFileChange}
        disabled={status === 'auditing' || status === 'submitting'}
      />
      <button
        onClick={handleSubmit}
        disabled={!file || wallet.status !== 'connected' || ['auditing','submitting'].includes(status)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {status === 'auditing'
          ? '静态审计中…'
          : status === 'submitting'
          ? '上链提交中…'
          : '提交审计报告'}
      </button>

      {status === 'error' && <p className="text-red-500 text-sm">发生错误，请查看控制台。</p>}

      {findings.length > 0 && (
        <div>
          <h4 className="font-semibold">静态审计告警：</h4>
          <ul className="list-disc ml-5 text-sm">
            {findings.map((f, i) => (
              <li key={i}>[行{f.line}, 列{f.col}] {f.category}: {f.message}</li>
            ))}
          </ul>
          <p className="mt-2 text-sm"><strong>代码哈希：</strong> {codeHash}</p>
        </div>
      )}

      {status === 'done' && txDigest && (
        <p className="mt-2 text-sm text-green-600">提交成功 🎉 Tx 摘要：{txDigest}</p>
      )}
    </div>
  );
}
