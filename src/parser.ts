// src/parser.ts
import type { Finding } from './types';
import { analyze } from './analyzer/index.js';

/**
 * 审计 Move 源码
 */
export async function auditSource(
  source: string,
  filePath: string
): Promise<Finding[]> {
  return analyze('move', source, filePath);
}

/**
 * 审计 Solidity 源码
 */
export async function analyzeSolidity(
  source: string,
  filePath: string
): Promise<Finding[]> {
  return analyze('solidity', source, filePath);
}

/**
 * 审计 Vyper 源码
 */
export async function analyzeVyper(
  source: string,
  filePath: string
): Promise<Finding[]> {
  return analyze('vyper', source, filePath);
}

/**
 * 审计 Go 源码
 */
export async function analyzeGo(
  source: string,
  filePath: string
): Promise<Finding[]> {
  return analyze('go', source, filePath);
}

/**
 * 审计 Rust 源码
 */
export async function analyzeRust(
  source: string,
  filePath: string
): Promise<Finding[]> {
  return analyze('rs', source, filePath);
}

export type { Finding };

