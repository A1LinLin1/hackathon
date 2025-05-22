// src/types/index.ts

export interface Finding {
  file: string;
  line: number;
  col?: number;        // 保留 detectors 里原有的 col 信息
  type: string;
  message: string;
  suggestion?: string;
}

export interface Analyzer {
  language: string;
  analyze(source: string, filePath: string): Promise<Finding[]>;
}

