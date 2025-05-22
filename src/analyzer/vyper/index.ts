// src/analyzer/vyper/index.ts
import type { Analyzer, Finding } from '../../types';
import {
  // 七大规则模块都在 detectors/index.ts 里统一导出
  checkVyperOverflow,
  checkVyperReentrancy,
  detectVyperCallSafety,
  checkVyperAccessControl,
  detectVyperLogicDefect,
  detectVyperRandomnessMisuse,
  detectVyperFreezeBypass,
} from '../../detectors/index.js';

const vyperAnalyzer: Analyzer = {
  language: 'vyper',
  async analyze(source: string, filePath: string): Promise<Finding[]> {
    const findings: Finding[] = [];

    // 1. 溢出
    findings.push(...checkVyperOverflow(source, filePath));
    // 2. 重入
    findings.push(...checkVyperReentrancy(source, filePath));
    // 3. 调用安全
    findings.push(...detectVyperCallSafety(source, filePath));
    // 4. 访问控制
    findings.push(...checkVyperAccessControl(source, filePath));
    // 5. 逻辑缺陷
    findings.push(...detectVyperLogicDefect(source, filePath));
    // 6. 随机性误用
    findings.push(...detectVyperRandomnessMisuse(source, filePath));
    // 7. 冻结绕过
    findings.push(...detectVyperFreezeBypass(source, filePath));

    return findings;
  },
};

export default vyperAnalyzer;

