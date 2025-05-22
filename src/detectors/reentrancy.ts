// src/detectors/reentrancy.ts

import type { Finding } from '../types';
import { parse, visit } from 'solidity-parser-antlr';
import type ParserTS from 'web-tree-sitter';
import GoLang from 'tree-sitter-go';
import RustLang from 'tree-sitter-rust';

/**
 * Move 重入检测：检测先转账再更新状态的模式
 */
export function checkMoveReentrancy(source: string, file: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (/send\(/.test(lines[i])) {
      // 在 move 并不常用 send，但示例展示思路
      // 检查后续行是否有状态更新
      const rest = lines.slice(i + 1, i + 4).join(' ');
      if (/\w+\s*=\s*\w+/.test(rest)) {
        findings.push({
          file,
          line: i + 1,
          col: lines[i].indexOf('send') + 1,
          message: '可能的重入：先执行 send，再后续更新状态。',
          type: 'Reentrancy',
        });
      }
    }
  }
  return findings;
}

/**
 * Solidity 重入检测：检测未使用 mutex 或先转账再更新状态的模式
 */
export function checkSolidityReentrancy(source: string, file: string): Finding[] {
  let ast: any;
  try {
    ast = parse(source, { tolerant: true, loc: true });
  } catch {
    return [{ file, line: 0, col: 0, message: 'Solidity 解析失败，无法进行重入检测', type: 'Reentrancy' }];
  }
  const findings: Finding[] = [];
  visit(ast, {
    FunctionDefinition(node: any) {
      let hasCall = false, hasStateWrite = false;
      visit(node, {
        FunctionCall(n: any) {
          // 例：调用外部合约
          if (n.expression.type === 'MemberAccess' &&
             (/\./.test(n.expression.expression.name) || n.expression.expression.type === 'MemberAccess')) {
            hasCall = true;
          }
        },
        Assignment(n: any) {
          hasStateWrite = true;
        }
      } as any);
      if (hasCall && hasStateWrite) {
        findings.push({
          file,
          line: node.loc.start.line,
          col: node.loc.start.column + 1,
          message: `可能的重入漏洞：函数 ${node.name || '<anonymous>'} 先调用外部再写状态`,
          type: 'Reentrancy',
        });
      }
    }
  } as any);
  return findings;
}

/**
 * Vyper 重入检测：示例匹配 send/transfer 后紧跟状态写
 */
export function checkVyperReentrancy(source: string, file: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (/send\(/.test(lines[i]) || /transfer\(/.test(lines[i])) {
      const next = lines[i + 1] || '';
      if (/\w+\s*=\s*\w+/.test(next)) {
        findings.push({
          file,
          line: i + 1,
          col: lines[i].search(/send|transfer/) + 1,
          message: '可能的重入：先执行 send/transfer，再后续更新状态。',
          type: 'Reentrancy',
        });
      }
    }
  }
  return findings;
}

/**
 * Go 重入检测：Go 里通过锁 (sync.Mutex) 防止重入，这里示例检测是否缺少锁
 */
export async function checkGoReentrancy(tree: ParserTS.Tree, file: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  // 简单示例：如果函数内出现对外部 HTTP 调用，但未检测到 mutex.Lock，报告可能重入
  const cursor = tree.walk();
  do {
    const node = cursor.currentNode;
    if (node.type === 'function_declaration') {
      const fnBody = node.childForFieldName('body');
      const text = fnBody?.text || '';
      if (/http\.Get|client\./.test(text) && !/Lock\(\)/.test(text)) {
        findings.push({
          file,
          line: node.startPosition.row + 1,
          col: node.startPosition.column + 1,
          message: 'Go 函数中存在外部调用且未使用 Mutex 锁，可能发生重入（并发）问题。',
          type: 'Reentrancy',
        });
      }
    }
  } while (cursor.gotoNextSibling());
  return findings;
}

/**
 * Rust 重入检测：Rust 通常使用 &mut self 防止多重可变借用，这里示例检测是否在 async fn 中调用外部 without .await
 */
export async function checkRustReentrancy(tree: ParserTS.Tree, file: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const cursor = tree.walk();
  do {
    const node = cursor.currentNode;
    if (node.type === 'function_item') {
      const isAsync = node.childForFieldName('async') !== null;
      if (isAsync) {
        // 查找 call_expression 且不在 .await 之后
        let foundCall = false;
        node.descendantsOfType('call_expression').forEach((call: any) => {
          if (!call.text.includes('.await')) {
            foundCall = true;
          }
        });
        if (foundCall) {
          findings.push({
            file,
            line: node.startPosition.row + 1,
            col: node.startPosition.column + 1,
            message: 'async 函数中存在外部调用且未使用 .await，可能导致并发问题。',
            type: 'Reentrancy',
          });
        }
      }
    }
  } while (cursor.gotoNextSibling());
  return findings;
}

