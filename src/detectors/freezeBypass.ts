// src/detectors/freezeBypass.ts

import type { Finding } from '../types';
import type ParserTS from 'web-tree-sitter';
import GoLang from 'tree-sitter-go';
import RustLang from 'tree-sitter-rust';
import { parse, visit } from 'solidity-parser-antlr';

/**
 * Move freeze bypass 检测：
 * - borrow_global_mut<T>(…) 直接可变借用全局资源
 * - borrow_global<…>().borrow_mut() 迂回绕过
 */
export function detectMoveFreezeBypass(source: string, file: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split(/\r?\n/);

  const reDirect = /borrow_global_mut\s*<\s*([\w:]+)\s*>\s*\(/;
  const reIndirect = /borrow_global\s*<\s*([\w:]+)\s*>\s*\(\s*.*\s*\)\s*\.borrow_mut\s*\(/;

  for (let i = 0; i < lines.length; i++) {
    let m = lines[i].match(reDirect);
    if (m) {
      findings.push({
        file,
        line: i + 1,
        col: (m.index ?? 0) + 1,
        message: `Move 调用 borrow_global_mut<${m[1]}> 可变借用全局资源，可能绕过 freeze 保护`,
        type: 'FreezeBypass',
      });
      continue;
    }
    m = lines[i].match(reIndirect);
    if (m) {
      findings.push({
        file,
        line: i + 1,
        col: (m.index ?? 0) + 1,
        message: `Move 先 borrow_global<${m[1]}> 后 borrow_mut()，可能绕过 freeze 保护`,
        type: 'FreezeBypass',
      });
    }
  }

  return findings;
}

/**
 * Solidity freeze bypass 检测：
 * - 检查是否使用低级调用（delegatecall, call）
 *   这些调用可能绕过函数修饰器（如 whenNotFrozen）
 */
export function detectSolidityFreezeBypass(source: string, file: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split(/\r?\n/);

  const re = /\.(delegatecall|call)\s*\(/;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (m) {
      findings.push({
        file,
        line: i + 1,
        col: (m.index ?? 0) + 1,
        message: `Solidity 使用低级调用 .${m[1]}()，可能绕过 freeze 检查（如 whenNotFrozen）`,
        type: 'FreezeBypass',
      });
    }
  }

  return findings;
}

/**
 * Vyper freeze bypass 检测：
 * - raw_call / send 等底层接口，可能跳过自定义的 frozen 检查
 */
export function detectVyperFreezeBypass(source: string, file: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split(/\r?\n/);

  const re = /\b(raw_call|send)\s*\(/;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (m) {
      findings.push({
        file,
        line: i + 1,
        col: (m.index ?? 0) + 1,
        message: `Vyper 使用底层接口 ${m[1]}()，可能跳过 frozen flag 的检查`,
        type: 'FreezeBypass',
      });
    }
  }

  return findings;
}

/**
 * Go freeze bypass 检测：
 * - 匹配 BypassFreeze()、自定义跳过冻结的函数调用
 */
export async function checkGoFreezeBypass(tree: ParserTS.Tree, file: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const cursor = tree.walk();

  do {
    const node = cursor.currentNode;
    if (node.type === 'call_expression') {
      const fn = node.firstChild;
      if (fn?.text === 'BypassFreeze') {
        findings.push({
          file,
          line: fn.startPosition.row + 1,
          col: fn.startPosition.column + 1,
          message: `Go 调用了 BypassFreeze()，可能绕过 freeze 机制`,
          type: 'FreezeBypass',
        });
      }
    }
  } while (cursor.gotoNextSibling());

  return findings;
}

/**
 * Rust freeze bypass 检测：
 * - 匹配 unsafe 块或 get_unchecked_mut() 等不安全操作
 */
export async function checkRustFreezeBypass(tree: ParserTS.Tree, file: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const cursor = tree.walk();

  do {
    const node = cursor.currentNode;
    if (node.type === 'unsafe_block') {
      findings.push({
        file,
        line: node.startPosition.row + 1,
        col: node.startPosition.column + 1,
        message: `Rust 使用 unsafe 块，可能绕过 borrow 检查或 freeze 保护`,
        type: 'FreezeBypass',
      });
    } else if (node.type === 'call_expression' && /get_unchecked_mut/.test(node.text)) {
      findings.push({
        file,
        line: node.startPosition.row + 1,
        col: node.startPosition.column + 1,
        message: `Rust 调用了 get_unchecked_mut()，可能绕过 freeze/安全检查`,
        type: 'FreezeBypass',
      });
    }
  } while (cursor.gotoNextSibling());

  return findings;
}

