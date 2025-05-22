// src/analyzer/move/index.ts
import type { Analyzer, Finding } from '../../types';
import { auditSource } from '../../parser.js';

const moveAnalyzer: Analyzer = {
  language: 'move',
  async analyze(source: string, filePath: string): Promise<Finding[]> {
    return auditSource(source, filePath);
  },
};

export default moveAnalyzer;

