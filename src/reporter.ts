// src/reporter.ts
import type { Finding } from './types';

export function formatFindings(fs: Finding[]): string {
  return fs
    .map(f => `[${f.file}:${f.line}:${f.col ?? 0}] ${f.type} - ${f.message}`)
    .join('\n');
}

