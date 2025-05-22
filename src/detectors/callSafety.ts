// src/detectors/callSafety.ts
import type { Finding } from '../types';

/** Move 调用安全检测（原有逻辑） */
export function detectMoveCallSafety(source: string, filePath: string): Finding[] {
  const issues: Finding[] = [];
  const lines = source.split(/\r?\n/);
  const callRe = /(0x[0-9A-Fa-f]+::[A-Za-z_][\w]*::[A-Za-z_][\w]*)\s*\(/;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(callRe);
    if (m) {
      const fnCall = m[1];
      const ctx = lines.slice(Math.max(0, i - 2), i + 1).join(' ');
      if (!/if\s*\(.*signer/.test(ctx) && !/has_role/.test(ctx)) {
        issues.push({ file: filePath, line: i + 1, col: (m.index||0)+1,
          message: `调用 ${fnCall} 前缺少访问控制检查。`, type: 'CallSafety' });
      }
    }
  }
  return issues;
}

/** Solidity 调用安全检测：检查外部合约调用前是否有 access control（示例） */
export function detectSolidityCallSafety(ast: any, filePath: string): Finding[] {
  const { visit } = require('solidity-parser-antlr');
  const issues: Finding[] = [];
  visit(ast, {
    FunctionCall(node: any) {
      if (node.expression.type === 'MemberAccess' &&
          node.expression.memberName !== 'require') {
        // 这里只是示例，你可以检查函数前是否有 onlyOwner 修饰器、require(msg.sender==owner) 等
        issues.push({
          file: filePath,
          line: node.loc.start.line,
          col: node.loc.start.column + 1,
          message: `函数 ${node.expression.memberName} 调用前，建议做访问控制检查`,
          type: 'CallSafety',
        });
      }
    }
  });
  return issues;
}

/** Vyper 调用安全检测（示例，用简单文本匹配） */
export function detectVyperCallSafety(source: string, filePath: string): Finding[] {
  const issues: Finding[] = [];
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (/some_external_call\(/.test(lines[i])) {
      // 这里假设 external calls 都写作 some_external_call()
      // 检查前一行是否有 assert msg.sender == self.owner
      const prev = lines[i-1] || '';
      if (!/assert\s+msg\.sender == self\.owner/.test(prev)) {
        issues.push({
          file: filePath, line: i+1, col: 1,
          message: `Vyper 调用前缺少访问控制：assert msg.sender==self.owner`,
          type: 'CallSafety'
        });
      }
    }
  }
  return issues;
}

/** Go 调用安全检测（示例，只检查 http 调用前是否有 auth） */
export function detectGoCallSafety(tree: any, filePath: string): Finding[] {
  const issues: Finding[] = [];
  const cursor = tree.walk();
  do {
    const node = cursor.currentNode;
    if (node.type === 'CallExpression') {
      const fn = node.firstChild;
      if (fn?.type === 'SelectorExpression' &&
          fn.text.includes('DoRequest')) {
        // 假设 DoRequest 是外部调用
        issues.push({
          file: filePath,
          line: node.startPosition.row + 1,
          col: node.startPosition.column + 1,
          message: 'Go 调用前请做好身份校验（如检查 context 或 token）',
          type: 'CallSafety'
        });
      }
    }
  } while (cursor.gotoNextSibling());
  return issues;
}

/** Rust 调用安全检测（示例） */
export function detectRustCallSafety(tree: any, filePath: string): Finding[] {
  const issues: Finding[] = [];
  const cursor = tree.walk();
  do {
    const node = cursor.currentNode;
    if (node.type === 'call_expression') {
      const fn = node.childForFieldName('function');
      if (fn?.text === 'external_call') {
        issues.push({
          file: filePath,
          line: node.startPosition.row + 1,
          col: node.startPosition.column + 1,
          message: 'Rust 调用前请验证调用者身份',
          type: 'CallSafety'
        });
      }
    }
  } while (cursor.gotoNextSibling());
  return issues;
}

