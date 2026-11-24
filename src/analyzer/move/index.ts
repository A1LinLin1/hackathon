// src/analyzer/move/index.ts
import type { Analyzer, Finding } from '../../types';
import {
  checkMoveOverflow,
  checkMoveReentrancy,
  detectMoveCallSafety,
  checkMoveAccessControl,
  detectMoveLogicDefect,
  detectMoveRandomnessMisuse,
  detectMoveFreezeBypass,
} from '../../detectors/index.js';

const moveAnalyzer: Analyzer = {
  language: 'move',
  async analyze(source: string, filePath: string): Promise<Finding[]> {
    return [
      ...checkMoveOverflow(source, filePath),
      ...checkMoveReentrancy(source, filePath),
      ...detectMoveCallSafety(source, filePath),
      ...checkMoveAccessControl(source, filePath),
      ...detectMoveLogicDefect(source, filePath),
      ...detectMoveRandomnessMisuse(source, filePath),
      ...detectMoveFreezeBypass(source, filePath),
    ];
  },
};

export default moveAnalyzer;

