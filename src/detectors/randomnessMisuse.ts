// src/detectors/randomnessMisuse.ts

import type { Finding } from '../types';
import type ParserTS from 'web-tree-sitter';
import { parse, visit } from 'solidity-parser-antlr';
import GoLang from 'tree-sitter-go';
import RustLang from 'tree-sitter-rust';

/**
 * Move 随机性滥用检测：
 * - 检测使用 TransactionContext::random 或 TxContext::block_timestamp 作为随机源
 * - 检测基于 hash(timestamp) 或 hash(sender + timestamp) 等易受操控的伪随机生成
 */
export function detectMoveRandomnessMisuse(source: string, file: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split(/\r?\n/);

  // 常见不安全随机源
  const reTxRandom = /TransactionContext::random\s*\(/;
  const reTimestampHash = /hash\s*\(\s*(?:signer\s*\|\|\s*)?TransactionContext::block_timestamp/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    if (reTxRandom.test(line)) {
      m = line.match(reTxRandom)!;
      findings.push({
        file,
        line: i + 1,
        col: (m.index ?? 0) + 1,
        message: `Move 中使用 TransactionContext::random() 作为随机源，可能易被预测或操控`,
        type: 'RandomnessMisuse',
      });
    }
    if (reTimestampHash.test(line)) {
      m = line.match(reTimestampHash)!;
      findings.push({
        file,
        line: i + 1,
        col: (m.index ?? 0) + 1,
        message: `Move 中使用 hash(timestamp${line.includes('signer') ? ' + signer' : ''}) 生成随机，安全性较差`,
        type: 'RandomnessMisuse',
      });
    }
  }

  return findings;
}

/**
 * Solidity 随机性滥用检测：
 * - 检测直接使用 block.timestamp, block.number, blockhash 作为随机源
 * - 检测 keccak256(abi.encodePacked(...)) 包含上述易操控字段
 */
export function detectSolidityRandomnessMisuse(source: string, file: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split(/\r?\n/);

  const reBlock = /\b(block\.timestamp|block\.number|blockhash\s*\()/;
  const reKeccak = /keccak256\s*\(\s*abi\.encodePacked\s*\([^)]*(?:block\.timestamp|block\.number|msg\.sender)[^)]*\)\s*\)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    if (reBlock.test(line)) {
      m = line.match(reBlock)!;
      findings.push({
        file,
        line: i + 1,
        col: (m.index ?? 0) + 1,
        message: `Solidity 中使用 ${m[1]} 作为随机源，可能被矿工操控`,
        type: 'RandomnessMisuse',
      });
    }
    if (reKeccak.test(line)) {
      m = line.match(reKeccak)!;
      findings.push({
        file,
        line: i + 1,
        col: (m.index ?? 0) + 1,
        message: `Solidity 中用 keccak256(abi.encodePacked(...${m[0].includes('block.timestamp') ? 'block.timestamp' : 'msg.sender'}...)) 生成随机，存在可操控风险`,
        type: 'RandomnessMisuse',
      });
    }
  }

  return findings;
}

/**
 * Vyper 随机性滥用检测：
 * - 检测使用 block.timestamp, block.number 作为随机输入
 * - 检测用 sha3 / keccak256 包含易操控字段
 */
export function detectVyperRandomnessMisuse(source: string, file: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split(/\r?\n/);

  const reBlock = /\b(block\.timestamp|block\.number)\b/;
  const reSha3 = /sha3\s*\(\s*(?:block\.timestamp|msg\.sender)[^)]*\)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    if (reBlock.test(line)) {
      m = line.match(reBlock)!;
      findings.push({
        file,
        line: i + 1,
        col: (m.index ?? 0) + 1,
        message: `Vyper 中使用 ${m[1]} 作为随机源，可能被矿工或前端操控`,
        type: 'RandomnessMisuse',
      });
    }
    if (reSha3.test(line)) {
      m = line.match(reSha3)!;
      findings.push({
        file,
        line: i + 1,
        col: (m.index ?? 0) + 1,
        message: `Vyper 中用 sha3(...) 生成随机，包含易操控字段，安全性不足`,
        type: 'RandomnessMisuse',
      });
    }
  }

  return findings;
}

/**
 * Go 随机性滥用检测：
 * - 检测使用 math/rand 而非 crypto/rand
 * - 检测调用 rand.Seed(…) 使用固定种子
 */
export async function checkGoRandomnessMisuse(tree: ParserTS.Tree, file: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const cursor = tree.walk();

  do {
    const node = cursor.currentNode;
    // import math/rand
    if (node.type === 'import_spec' && node.text.includes('"math/rand"')) {
      findings.push({
        file,
        line: node.startPosition.row + 1,
        col: node.startPosition.column + 1,
        message: `Go 中导入了 math/rand，建议使用 crypto/rand 以获得加密安全的随机性`,
        type: 'RandomnessMisuse',
      });
    }
    // rand.Seed(...)
    if (node.type === 'call_expression' && node.text.includes('rand.Seed')) {
      findings.push({
        file,
        line: node.startPosition.row + 1,
        col: node.startPosition.column + 1,
        message: `Go 中调用 rand.Seed(...) 初始化随机，若使用固定种子则随机可预测`,
        type: 'RandomnessMisuse',
      });
    }
  } while (cursor.gotoNextSibling());

  return findings;
}

/**
 * Rust 随机性滥用检测：
 * - 检测使用 rand::thread_rng 或 StdRng::seed_from_u64 固定种子
 * - 建议使用 rand::rngs::OsRng 获取更安全的随机
 */
export async function checkRustRandomnessMisuse(tree: ParserTS.Tree, file: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const cursor = tree.walk();

  do {
    const node = cursor.currentNode;
    // thread_rng()
    if (node.type === 'call_expression' && node.text.includes('thread_rng')) {
      findings.push({
        file,
        line: node.startPosition.row + 1,
        col: node.startPosition.column + 1,
        message: `Rust 中使用 rand::thread_rng()，该 RNG 非加密安全，建议使用 OsRng`,
        type: 'RandomnessMisuse',
      });
    }
    // seed_from_u64()
    if (node.type === 'method_call_expression' && node.text.includes('seed_from_u64')) {
      findings.push({
        file,
        line: node.startPosition.row + 1,
        col: node.startPosition.column + 1,
        message: `Rust 中使用 StdRng::seed_from_u64(...) 固定种子，随机可预测`,
        type: 'RandomnessMisuse',
      });
    }
  } while (cursor.gotoNextSibling());

  return findings;
}

