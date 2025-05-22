// src/types/analyzer.ts
export interface Finding {
  file: string;
  line: number;
  type: string;
  message: string;
  suggestion?: string;
}
export interface Analyzer {
  language: string;
  analyze(source: string, filePath: string): Promise<Finding[]>;
}

