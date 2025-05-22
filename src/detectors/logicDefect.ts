// src/detectors/logicDefect.ts

import type { Finding } from '../types';
import type ParserTS from 'web-tree-sitter';
import { parse, visit } from 'solidity-parser-antlr';
import GoLang from 'tree-sitter-go';
import RustLang from 'tree-sitter-rust';

/**
 * Move 逻辑缺陷检测：
 * - detect assert(false) 或 abort() 导致不可达逻辑
 * - detect 无限循环（while(true) / loop {}）
 */
export function detectMoveLogicDefect(source: string, file: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split(/\r?\n/);
  const reAssertFalse = /assert\s*\(\s*false\s*\)/;
  const reAbort = /\babort\s*\(/;
  const reInfiniteLoop = /\bwhile\s*\(\s*true\s*\)|\bloop\s*{/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (reAssertFalse.test(line)) {
      findings.push({
        file,
        line: i + 1,
        col: (line.search(reAssertFalse) ?? 0) + 1,
        message: `Move 中检测到 assert(false)，可能导致逻辑不可达`,
        type: 'LogicDefect',
      });
    }
    if (reAbort.test(line)) {
      findings.push({
        file,
        line: i + 1,
        col: (line.search(reAbort) ?? 0) + 1,
        message: `Move 中调用 abort()，请确认是否为预期逻辑`,
        type: 'LogicDefect',
      });
    }
    if (reInfiniteLoop.test(line)) {
      findings.push({
        file,
        line: i + 1,
        col: (line.search(reInfiniteLoop) ?? 0) + 1,
        message: `Move 中检测到无限循环，可能导致逻辑无法退出`,
        type: 'LogicDefect',
      });
    }
  }

  return findings;
}

/**
 * Solidity 逻辑缺陷检测：
 * - detect empty if blocks: if (...) { }
 * - detect TODO/FIXME 注释暗示未完成逻辑
 */
export function detectSolidityLogicDefect(source: string, file: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split(/\r?\n/);
  const reEmptyIf = /if\s*\([^)]*\)\s*{\s*}/;
  const reTodo = /\/\/\s*(TODO|FIXME)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    if (reEmptyIf.test(line)) {
      m = line.match(reEmptyIf)!;
      findings.push({
        file,
        line: i + 1,
        col: (m.index ?? 0) + 1,
        message: `Solidity 中检测到空的 if 语句块，可能遗漏逻辑`,
        type: 'LogicDefect',
      });
    }
    if (reTodo.test(line)) {
      m = line.match(reTodo)!;
      findings.push({
        file,
        line: i + 1,
        col: (m.index ?? 0) + 1,
        message: `Solidity 中存在 TODO/FIXME 注释，可能存在未实现逻辑`,
        type: 'LogicDefect',
      });
    }
  }

  return findings;
}

/**
 * Vyper 逻辑缺陷检测：
 * - detect assert False
 * - detect empty function bodies (def ...: pass)
 */
export function detectVyperLogicDefect(source: string, file: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split(/\r?\n/);
  const reAssertFalse = /assert\s+False/;
  const reEmptyDef = /def\s+[A-Za-z_][A-Za-z0-9_]*\(.*\)\s*:\s*pass/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    if (reAssertFalse.test(line)) {
      m = line.match(reAssertFalse)!;
      findings.push({
        file,
        line: i + 1,
        col: (m.index ?? 0) + 1,
        message: `Vyper 中检测到 assert False，可能导致逻辑不可达`,
        type: 'LogicDefect',
      });
    }
    if (reEmptyDef.test(line)) {
      m = line.match(reEmptyDef)!;
      findings.push({
        file,
        line: i + 1,
        col: (m.index ?? 0) + 1,
        message: `Vyper 中函数体只有 pass，可能遗漏实际逻辑`,
        type: 'LogicDefect',
      });
    }
  }

  return findings;
}

/**
 * Go 逻辑缺陷检测：
 * - detect 忽略 err（if err != nil {} 空体 或者 没有处理）
 */
export async function checkGoLogicDefect(tree: ParserTS.Tree, file: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const cursor = tree.walk();

  do {
    const node = cursor.currentNode;
    if (node.type === 'if_statement') {
      const cond = node.childForFieldName('condition')?.text || '';
      const body = node.childForFieldName('consequence')?.text.trim() || '';
      if (/err\s*!=\s*nil/.test(cond) && /^\{\s*\}$/.test(body)) {
        findings.push({
          file,
          line: node.startPosition.row + 1,
          col: node.startPosition.column + 1,
          message: `Go 中 if err != nil 后未处理错误，逻辑可能遗漏`,
          type: 'LogicDefect',
        });
      }
    }
  } while (cursor.gotoNextSibling());

  return findings;
}

/**
 * Rust 逻辑缺陷检测：
 * - detect unwrap()/expect() 导致 panic
 * - detect TODO/FIXME 注释
 */
export async function checkRustLogicDefect(tree: ParserTS.Tree, file: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const cursor = tree.walk();

  do {
    const node = cursor.currentNode;
    // unwrap/expect 调用
    if (node.type === 'method_call_expression') {
      const text = node.text;
      if (/\.(unwrap|expect)\s*\(/.test(text)) {
        findings.push({
          file,
          line: node.startPosition.row + 1,
          col: node.startPosition.column + 1,
          message: `Rust 调用了 ${text.match(/\.(unwrap|expect)/)![0]}，可能导致 panic`,
          type: 'LogicDefect',
        });
      }
    }
    // TODO/FIXME 注释
    if (node.type === 'line_comment' && /TODO|FIXME/.test(node.text)) {
      findings.push({
        file,
        line: node.startPosition.row + 1,
        col: node.startPosition.column + 1,
        message: `Rust 中存在 TODO/FIXME 注释，可能存在未完成逻辑`,
        type: 'LogicDefect',
      });
    }
  } while (cursor.gotoNextSibling());

  return findings;
}

