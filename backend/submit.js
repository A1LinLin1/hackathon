// backend/submit.js

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction }               from '@mysten/sui/transactions';
import { Ed25519Keypair }            from '@mysten/sui/keypairs/ed25519';
import { fromB64 }                   from '@mysten/bcs';       // 解析 Base64 私钥
import dotenv                        from 'dotenv';
import { hexToBytes, utf8ToBytes }   from './utils.js';

dotenv.config();

// 初始化 Sui 客户端 & Keypair
const client     = new SuiClient({ url: getFullnodeUrl('testnet') });
const keypair    = Ed25519Keypair.fromSecretKey(fromB64(process.env.SUI_PRIVATE_KEY));
const PACKAGE_ID = process.env.PACKAGE_ID;  
// 例如："0xf8ef5aa78daa393b1d58301c7924d85074c0656d269ba92b17d0d03c5dce684d"

/**
 * 用 LEB128 给一个非负整数编码长度前缀
 */
function encodeULEB128(n) {
  const out = [];
  do {
    let byte = n & 0x7f;
    n >>>= 7;
    if (n !== 0) byte |= 0x80;
    out.push(byte);
  } while (n !== 0);
  return new Uint8Array(out);
}

/**
 * BCS-encode 一个 Move vector<u8>：先 LEB128-length，再拼原始字节
 */
function bcsEncodeVectorU8(bytes) {
  const lenPrefix = encodeULEB128(bytes.length);
  const out = new Uint8Array(lenPrefix.length + bytes.length);
  out.set(lenPrefix, 0);
  out.set(bytes, lenPrefix.length);
  return out;
}

/**
 * 提交审计报告到链上
 * @param {{ codeHashBytes: Uint8Array; summaryBytes: Uint8Array }}
 * @returns {Promise<{ digest: string }>}
 */
export async function submitMoveScript({ codeHashBytes, summaryBytes }) {
  // 1) 手动 BCS 编码 vector<u8>
  const codeHashBcs = bcsEncodeVectorU8(codeHashBytes);
  const summaryBcs  = bcsEncodeVectorU8(summaryBytes);

  // 2) 构造旧版 Transaction
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::ReportStore::submit`,
    arguments: [
      // 旧版 pure：只有一个参数时，视作“已序列化 BCS bytes”
      tx.pure(codeHashBcs),
      tx.pure(summaryBcs),
    ],
  });

  // 3) 签名并执行
  const result = await client.signAndExecuteTransaction({
    signer:      keypair,
    transaction: tx,
    options:     { showEffects: true },
  });

  // 4) 返回交易哈希
  return { digest: result.digest };
}
