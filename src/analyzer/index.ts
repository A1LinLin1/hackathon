// src/analyzer/index.ts
import type { Analyzer, Finding } from '../types';
import moveAnalyzer from './move/index.js';
import solidityAnalyzer from './solidity/index.js';
import vyperAnalyzer from './vyper/index.js';
import goAnalyzer from './go/index.js';
import rustAnalyzer from './rust/index.js';

const analyzers: Record<string, Analyzer> = {
  move:     moveAnalyzer,
  sol: solidityAnalyzer,
  vy:    vyperAnalyzer,
  go:       goAnalyzer,
  rs:       rustAnalyzer,
};

export async function analyze(
  language: string,
  source: string,
  filePath: string
): Promise<Finding[]> {
  const analyzer = analyzers[language];
  if (!analyzer) {
    throw new Error(`Unsupported language: ${language}`);
  }
  return analyzer.analyze(source, filePath);
}

export const supportedLanguages = Object.keys(analyzers);

export type { Analyzer, Finding } from '../types';

