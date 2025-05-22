// src/cli.ts
import { readdirSync, readFileSync, existsSync } from 'fs';
import { dirname, join, extname } from 'path';
import { fileURLToPath } from 'url';
import type { Analyzer, Finding } from './types';

// Compute __dirname for ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Dynamically load analyzer plugins from dist/analyzer
 */
async function loadAnalyzers(): Promise<Analyzer[]> {
  const dir = join(__dirname, 'analyzer');
  const plugins: Analyzer[] = [];

  for (const name of readdirSync(dir)) {
    const jsPath = join(dir, name, 'index.js');
    if (!existsSync(jsPath)) {
      console.warn(`Skipping analyzer ${name}, no index.js found`);
      continue;
    }
    try {
      // Load compiled ESM module via file URL
      const mod = await import(`file://${jsPath}`);
      const analyzer: Analyzer = mod.default;
      if (analyzer?.language) plugins.push(analyzer);
    } catch (err: any) {
      console.warn(`Failed loading analyzer ${name}: ${err.message}`);
    }
  }

  return plugins;
}

async function main(): Promise<void> {
  const analyzers = await loadAnalyzers();
  console.log('Available analyzers:', analyzers.map(a => a.language));

  const files = process.argv.slice(2).filter(f => f.endsWith('.move') || f.endsWith('.sol'));
  if (!files.length) {
    console.error('Usage: node dist/cli.js <file1.move|file2.sol> [...]');
    process.exit(1);
  }

  for (const file of files) {
    const ext = extname(file).slice(1);
    const analyzer = analyzers.find(a => a.language === ext);
    if (!analyzer) {
      console.warn(`No analyzer for .${ext}, skipping ${file}`);
      continue;
    }

    let src: string;
    try {
      src = readFileSync(file, 'utf-8');
    } catch (e: any) {
      console.error(`Failed reading ${file}: ${e.message}`);
      continue;
    }

    console.log(`\n=== ${file} (.${ext}) ===`);
    try {
      const results: Finding[] = await analyzer.analyze(src, file);
      if (!results.length) console.log('No issues found');
      else results.forEach(r => console.log(`- [${r.type}] ${r.file}:${r.line}:${r.col ?? 0} - ${r.message}`));
    } catch (e: any) {
      console.error(`Error analyzing ${file}: ${e.message}`);
    }
  }
}

main().catch(e => { console.error(`Fatal error: ${e.message}`); process.exit(1); });

