// src/analyzer/rust/index.ts
import type { Analyzer, Finding } from '../../types';
import {
  checkRustOverflow,
  checkRustReentrancy,
  detectRustCallSafety,
  checkRustAccessControl,
  checkRustLogicDefect,
  checkRustRandomnessMisuse,
  checkRustFreezeBypass,
} from '../../detectors/index.js';
import { Parser } from 'web-tree-sitter';
import RustLang from 'tree-sitter-rust';

const rustAnalyzer: Analyzer = {
  language: 'rs',
  async analyze(source: string, filePath: string): Promise<Finding[]> {
    await Parser.init();
    const parser = new Parser();
    parser.setLanguage(RustLang);
    const tree = parser.parse(source);

    const findings: Finding[] = [];
    findings.push(...await checkRustOverflow(tree, filePath));
    findings.push(...await checkRustReentrancy(tree, filePath));
    findings.push(...await detectRustCallSafety(tree, filePath));
    findings.push(...await checkRustAccessControl(tree, filePath));
    findings.push(...await checkRustLogicDefect(tree, filePath));
    findings.push(...await checkRustRandomnessMisuse(tree, filePath));
    findings.push(...await checkRustFreezeBypass(tree, filePath));

    return findings;
  },
};

export default rustAnalyzer;

