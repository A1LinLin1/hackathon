// src/api/getReports.ts
import { client, PACKAGE_ID } from '../suiClient';
import type { OwnedObject, SuiObjectData } from '@mysten/sui/client';

function bytesToHex(arr: number[]): string {
  return '0x' + arr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function bytesToUtf8(arr: number[]): string {
  try {
    return new TextDecoder().decode(new Uint8Array(arr));
  } catch {
    return '';
  }
}

export interface Report {
  id: string;
  timestamp: number;    // UNIX 秒
  fileName: string;
  codeHash: string;
  summary: string;
}

export async function getAuditReportsByOwner(owner: string): Promise<Report[]> {
  const resp = await client.getOwnedObjects({
    owner,
    filter: { StructType: `${PACKAGE_ID}::ReportStore::AuditReport` },
    options: { showContent: true },
  });
  console.log('⛏️ raw ownedObjects:', resp.data);

  return resp.data.map((obj: OwnedObject) => {
    const d = obj.data as SuiObjectData;
    const raw = (d.content as any).fields ?? (d.content as any).data?.fields;
    if (!raw) throw new Error(`No fields in ${d.objectId}`);

    // Move 端是纯 u64/bytes[] 储存
    const tsRaw       = raw.timestamp as string;    // Sui 会把 u64 当 string 返回
    const fileArr     = raw.file_name as number[];
    const hashArr     = raw.code_hash as number[];
    const summaryArr  = raw.result_summary as number[];

    return {
      id:        d.objectId,
      timestamp: Number(tsRaw),
      fileName:  bytesToUtf8(fileArr),
      codeHash:  bytesToHex(hashArr),
      summary:   bytesToUtf8(summaryArr),
    };
  });
}

