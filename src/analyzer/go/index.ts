// src/analyzer/go/index.ts
import type { Analyzer, Finding } from '../../types';
import {
  checkGoOverflow,
  checkGoReentrancy,
  detectGoCallSafety,
  checkGoAccessControl,
  checkGoLogicDefect,             // 单数
  checkGoRandomnessMisuse,        // 单数
  checkGoFreezeBypass,            // 单数
} from '../../detectors/index.js';
import { Parser } from 'web-tree-sitter';
import GoLang from 'tree-sitter-go';

const goAnalyzer: Analyzer = {
  language: 'go',
  async analyze(source: string, filePath: string): Promise<Finding[]> {
    await Parser.init();
    const p = new Parser();
    p.setLanguage(GoLang);
    const tree = p.parse(source);

    const findings: Finding[] = [];
    findings.push(...await checkGoOverflow(tree, filePath));
    findings.push(...await checkGoReentrancy(tree, filePath));
    findings.push(...await detectGoCallSafety(tree, filePath));
    findings.push(...await checkGoAccessControl(tree, filePath));
    findings.push(...await checkGoLogicDefect(tree, filePath));          // await + tree
    findings.push(...await checkGoRandomnessMisuse(tree, filePath));     // await + tree
    findings.push(...await checkGoFreezeBypass(tree, filePath));         // await + tree
    return findings;
  },
};

export default goAnalyzer;

