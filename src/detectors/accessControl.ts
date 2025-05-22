// src/detectors/accessControl.ts

import type { Finding } from '../types';
import { parse, visit  } from 'solidity-parser-antlr';
import type ParserTS from 'web-tree-sitter';
import GoLang from 'tree-sitter-go';
import RustLang from 'tree-sitter-rust';

/**
 * Move 访问控制检测：
 * 检查 public entry 函数是否对 signer 做了校验 (assert signer == owner)
 */
export function checkMoveAccessControl(source: string, file: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split(/\r?\n/);

  // 简单匹配 public(entry) 声明
  lines.forEach((line, idx) => {
    const m = line.match(/public\s*\(\s*entry\s*\)\s*fun\s+([A-Za-z0-9_]+)/);
    if (m) {
      // 向下看几行是否出现 assert signer 或 has_role
      const snippet = lines.slice(idx + 1, idx + 5).join(' ');
      if (!/assert\s*\(\s*signer\s*==/.test(snippet) && !/has_role/.test(snippet)) {
        findings.push({
          file,
          line: idx + 1,
          col: (m.index ?? 0) + 1,
          message: `Move 函数 ${m[1]} 没有对 signer 进行校验，可能缺少访问控制`,
          type: 'AccessControl',
        });
      }
    }
  });

  return findings;
}

/**
 * Solidity 访问控制检测：
 * 检查 public/external 函数是否用了 onlyOwner、onlyRole、require(msg.sender == owner)
 */
export function checkSolidityAccessControl(source: string, file: string): Finding[] {
  let ast: any;
  try {
    ast = parse(source, { tolerant: true, loc: true });
  } catch {
    return [{ file, line: 0, col: 0, message: 'Solidity 解析失败，无法进行访问控制检测', type: 'AccessControl' }];
  }
  const findings: Finding[] = [];
  visit(ast, {
    FunctionDefinition(node: any) {
      if (['public', 'external'].includes(node.visibility)) {
        // 检查修饰器或函数体内的 require
        const hasModifier = (node.modifiers || []).some((m: any) =>
          /onlyOwner|onlyRole/.test(m.name)
        );
        let hasRequire = false;
        visit(node, {
          FunctionCall(n: any) {
            if (n.expression.type === 'Identifier' && n.expression.name === 'require') {
              hasRequire = true;
            }
          }
        } as any);
        if (!hasModifier && !hasRequire) {
          findings.push({
            file,
            line: node.loc.start.line,
            col: node.loc.start.column + 1,
            message: `函数 ${node.name || '<anonymous>'} 缺少访问控制（no onlyOwner/require）`,
            type: 'AccessControl',
          });
        }
      }
    }
  } as any);
  return findings;
}

/**
 * Vyper 访问控制检测：
 * 检查 public 函数是否在最前面做了 assert msg.sender == self.owner
 */
export function checkVyperAccessControl(source: string, file: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (/def\s+[A-Za-z0-9_]+\([^)]*\)\s*->/.test(line) || /def\s+[A-Za-z0-9_]+\([^)]*\)\s*:/.test(line)) {
      // 函数定义，检查下一行是否 assert msg.sender == self.owner
      const next = (lines[idx + 1] || '').trim();
      if (!next.startsWith('assert msg.sender == self.owner')) {
        const fn = line.match(/def\s+([A-Za-z0-9_]+)/)?.[1] || '<fn>';
        findings.push({
          file,
          line: idx + 1,
          col: 1,
          message: `Vyper 函数 ${fn} 缺少访问控制：assert msg.sender == self.owner`,
          type: 'AccessControl',
        });
      }
    }
  });
  return findings;
}

/**
 * Go 访问控制检测：
 * 检查 HTTP handler 函数前是否有 auth 校验（示例匹配 Handler 中是否调用 authenticate）
 */
export async function checkGoAccessControl(tree: ParserTS.Tree, file: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const cursor = tree.walk();
  do {
    const node = cursor.currentNode;
    if (node.type === 'function_declaration') {
      const nameNode = node.childForFieldName('name');
      const paramsNode = node.childForFieldName('parameters');
      // 假设 HTTP handler 函数签名包含 http.ResponseWriter
      if (paramsNode?.text.includes('ResponseWriter')) {
        const bodyNode = node.childForFieldName('body');
        const text = bodyNode?.text || '';
        if (!/authenticate\(/.test(text) && !/AuthMiddleware/.test(text)) {
          findings.push({
            file,
            line: nameNode?.startPosition.row! + 1,
            col: nameNode?.startPosition.column! + 1,
            message: `Go Handler ${nameNode?.text} 未进行身份认证`,
            type: 'AccessControl',
          });
        }
      }
    }
  } while (cursor.gotoNextSibling());
  return findings;
}

/**
 * Rust 访问控制检测：
 * 检查 web 端函数是否使用 #[guard] 或手动校验 user.is_admin()
 */
export async function checkRustAccessControl(tree: ParserTS.Tree, file: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const cursor = tree.walk();
  do {
    const node = cursor.currentNode;
    // 匹配函数属性 macro
    if (node.type === 'attribute_item') {
      const pathNode = node.childForFieldName('path');
      if (pathNode?.text === 'get' || pathNode?.text === 'post') {
        // 跟踪到下一个 function_item
        const func = node.nextNamedSibling;
        const body = func?.childForFieldName('body')?.text || '';
        if (!/guard::/.test(body) && !/is_admin\(\)/.test(body)) {
          findings.push({
            file,
            line: node.startPosition.row + 1,
            col: node.startPosition.column + 1,
            message: `Rust Web 函数 ${func?.childForFieldName('name')?.text} 缺少访问控制`,
            type: 'AccessControl',
          });
        }
      }
    }
  } while (cursor.gotoNextSibling());
  return findings;
}

