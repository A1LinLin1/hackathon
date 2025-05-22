// backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createRequire } from 'module';
import { submitMoveScript } from './submit.js';
import { hexToBytes, utf8ToBytes } from './utils.js';

dotenv.config();

// ─── ESM 下计算 __dirname ─────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── 创建 CommonJS require ────────────────────────────────────────────────────
const requireCJS = createRequire(import.meta.url);

// ─── 加载统一多语言分析器 ──────────────────────────────────────────────────────
// 假设你在 dist/parser.js 中导出了 analyze()
const { analyze } = requireCJS(path.join(__dirname, '../dist/parser.js'));

// ─── 加载 Sui.js 的 CJS 构建：JsonRpcProvider ─────────────────────────────────
let JsonRpcProvider;
try {
  const providerPath = requireCJS.resolve(
    '@mysten/sui.js/dist/cjs/providers/json-rpc-provider.js'
  );
  ({ JsonRpcProvider } = requireCJS(providerPath));
} catch (e) {
  console.error('无法加载 @mysten/sui.js 的 CJS 构建，请确保已安装该包');
  process.exit(1);
}

// ─── 初始化 Sui RPC Provider ─────────────────────────────────────────────────
const provider = new JsonRpcProvider(
  process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io'
);
const REPORT_STORE_ID = process.env.REPORT_STORE_ID;

// ─── Express App 配置 ────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

/**
 * POST /api/audit
 * Request body: { language: string, source: string, fileName?: string }
 * Response: { findings, codeHash, summary }
 */
app.post('/api/audit', async (req, res) => {
  const { language, source, fileName } = req.body;
  console.log('>> [Audit] language=', language, 'file=', fileName);
  if (typeof language !== 'string' || typeof source !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid `language` or `source`' });
  }

  try {
    // 调用统一分析器
    console.log('>> [Audit API] about to call analyze()');
    const findings = await analyze(language, source, fileName || 'upload');
    console.log('>> [Audit API] analyze() returned', findings.length, 'findings');

    // 格式化 output
    const summary  = findings.map(f => f.message).join('\n') || '未发现漏洞';
    const codeHash = crypto.createHash('sha256').update(source).digest('hex');

    return res.json({ findings, codeHash, summary });
  } catch (err) {
    console.error('Audit error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err)
    });
  }
});

/**
 * POST /api/submit-report
 * Request body: { codeHash: string, summary: string }
 */
app.post('/api/submit-report', async (req, res) => {
  try {
    const { codeHash, summary } = req.body;
    if (typeof codeHash !== 'string' || typeof summary !== 'string') {
      return res.status(400).json({ error: 'Missing codeHash or summary' });
    }
    const { digest } = await submitMoveScript({
      codeHashBytes: hexToBytes(codeHash),
      summaryBytes:  utf8ToBytes(summary),
    });
    res.json({ digest });
  } catch (err) {
    console.error('Submit-report error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * GET /api/audit/history?address=0x...
 */
app.get('/api/audit/history', async (req, res) => {
  const address = req.query.address;
  if (typeof address !== 'string' || !address.startsWith('0x')) {
    return res.status(400).json({ error: 'Invalid `address` query parameter' });
  }
  if (!REPORT_STORE_ID) {
    return res.status(500).json({ error: 'REPORT_STORE_ID not configured' });
  }

  try {
    const fields = await provider.getDynamicFields({ parentId: REPORT_STORE_ID });
    const history = [];

    for (const field of fields.data) {
      if (field.name === address) {
        const obj = await provider.getObject({
          id: field.objectId,
          options: { showContent: true },
        });
        const content = obj.data?.content.fields;
        history.push({
          timestamp: content.timestamp,
          summary:   Buffer.from(content.summary.fields).toString('utf8'),
        });
      }
    }

    res.json({ history });
  } catch (err) {
    console.error('On-chain history error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ─── 启动服务器 ───────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend listening on http://0.0.0.0:${PORT}`);
});

