// src/analyzer/solidity/index.ts
import type { Analyzer, Finding } from '../../types';
import {
  checkSolidityOverflow,
  checkSolidityReentrancy,
  detectSolidityCallSafety,
  checkSolidityAccessControl,
  detectSolidityLogicDefect,
  detectSolidityRandomnessMisuse,
  detectSolidityFreezeBypass,
} from '../../detectors/index.js';

const solidityAnalyzer: Analyzer = {
  language: 'solidity',
  async analyze(source: string, filePath: string): Promise<Finding[]> {
    console.log(`→ [Solidity] start analyze ${filePath}`);

    const findings: Finding[] = [];

    console.log('  - running overflow');
    findings.push(...checkSolidityOverflow(source, filePath));
    console.log('    overflow total=', findings.length);

    console.log('  - running reentrancy');
    findings.push(...checkSolidityReentrancy(source, filePath));
    console.log('    reentrancy total=', findings.length);

    console.log('  - running callSafety');
    findings.push(...detectSolidityCallSafety(source, filePath));
    console.log('    callSafety total=', findings.length);

    console.log('  - running accessControl');
    findings.push(...checkSolidityAccessControl(source, filePath));
    console.log('    accessControl total=', findings.length);

    console.log('  - running logicDefects');
    findings.push(...detectSolidityLogicDefect(source, filePath));
    console.log('    logicDefects total=', findings.length);

    console.log('  - running randomnessMisuse');
    findings.push(...detectSolidityRandomnessMisuse(source, filePath));
    console.log('    randomnessMisuse total=', findings.length);

    console.log('  - running freezeBypass');
    findings.push(...detectSolidityFreezeBypass(source, filePath));
    console.log('    freezeBypass total=', findings.length);

    return findings;
  },
};

export default solidityAnalyzer;

