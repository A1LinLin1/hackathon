// src/detectors/overflow.ts
import type { Finding } from '../types';
import { parse, visit } from 'solidity-parser-antlr';
import type ParserTS from 'web-tree-sitter';
import GoLang from 'tree-sitter-go';
import RustLang from 'tree-sitter-rust';

/**
 * Move 溢出检测：检测源码中直接使用 + - * 未使用 overflow 包
 */
export function checkMoveOverflow(source: string, file: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split(/\r?\n/);
  lines.forEach((l, idx) => {
    if (/[+\-*]/.test(l) && !/overflow_add|overflow_sub|overflow_mul/.test(l)) {
      findings.push({
        file,
        line: idx + 1,
        col: 1,
        message: '可能的整数溢出：在 Move 中直接使用 + - *，建议使用 overflow_{add,sub,mul} 包',
        type: 'Overflow',
      });
    }
  });
  return findings;
}

/**
 * Solidity 溢出检测：检测所有 + - * 操作，报告未放在 unchecked{} 或未使用 SafeMath 的位置
 */
export function checkSolidityOverflow(source: string, file: string): Finding[] {
  let ast: any;
  try {
    ast = parse(source, { tolerant: true, loc: true });
  } catch {
    return [{ file, line: 0, col: 0, message: 'Solidity 解析失败，无法进行溢出检测', type: 'Overflow' }];
  }
  const findings: Finding[] = [];
  visit(ast, {
    BinaryOperation(node: any) {
      if (['+', '-', '*'].includes(node.operator)) {
        // 判断是否在 unchecked block
        let inUnchecked = false;
        let parent = (node as any).parent;
        while (parent) {
          if (parent.type === 'UncheckedBlock') { inUnchecked = true; break; }
          parent = parent.parent;
        }
        if (!inUnchecked) {
          findings.push({
            file,
            line: node.loc.start.line,
            col: node.loc.start.column + 1,
            message: `可能的整数溢出：${node.operator} 操作未放在 unchecked 或未使用 SafeMath`,
            type: 'Overflow',
          });
        }
      }
    },
  });
  return findings;
}

/**
 * Vyper 溢出检测：Vyper 默认检查溢出，除非使用 @unchecked 装饰或 unchecked: 语法
 */
export function checkVyperOverflow(source: string, file: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split(/\r?\n/);
  lines.forEach((l, idx) => {
    if (/unchecked:/.test(l) || /@unchecked/.test(l)) {
      findings.push({
        file,
        line: idx + 1,
        col: l.indexOf('unchecked') + 1,
        message: '检测到 unchecked 语句，Vyper 默认开启溢出检查，使用 unchecked 可能绕过检查',
        type: 'Overflow',
      });
    }
  });
  return findings;
}

/**
 * Go 溢出检测：Go 默认整型是 wrapping，检测 + - * 操作
 */
export async function checkGoOverflow(tree: ParserTS.Tree, file: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const cursor = tree.walk();
  do {
    const node = cursor.currentNode;
    if (node.type === 'binary_expression') {
      const op = node.childForFieldName('operator')?.text;
      if (op === '+' || op === '-' || op === '*') {
        findings.push({
          file,
          line: node.startPosition.row + 1,
          col: node.startPosition.column + 1,
          message: `可能的整数溢出：Go 中 \`${op}\` 操作不会自动检测溢出`,
          type: 'Overflow',
        });
      }
    }
  } while (cursor.gotoNextSibling());
  return findings;
}

/**
 * Rust 溢出检测：release 模式整型 wrapping，建议使用 checked_add 等
 */
export async function checkRustOverflow(tree: ParserTS.Tree, file: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const cursor = tree.walk();
  do {
    const node = cursor.currentNode;
    if (node.type === 'binary_expression') {
      const opNode = node.childForFieldName('operator');
      if (opNode && ['+', '-', '*'].includes(opNode.text)) {
        findings.push({
          file,
          line: node.startPosition.row + 1,
          col: node.startPosition.column + 1,
          message: `可能的整数溢出：Rust release 模式下 \`${opNode.text}\` 会 wrapping，建议使用 \`checked_${opNode.text === '+' ? 'add' : opNode.text === '-' ? 'sub' : 'mul'}\``,
          type: 'Overflow',
        });
      }
    }
  } while (cursor.gotoNextSibling());
  return findings;
}

