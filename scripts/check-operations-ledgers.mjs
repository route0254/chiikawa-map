import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSchema, validateLedgerRelations, calculateLedgerMetrics, operationsQueue } from './lib/operations-ledgers.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const options = { sources: 'research/official-source-ledger.json', candidates: 'research/publication-candidate-ledger.json', now: new Date().toISOString(), json: false };
for (const arg of process.argv.slice(2)) {
  if (arg === '--json') options.json = true;
  else if (/^--(sources|candidates|now)=/.test(arg)) { const index = arg.indexOf('='); options[arg.slice(2, index)] = arg.slice(index + 1); }
  else throw new Error(`Unknown argument: ${arg}`);
}
const load = async file => JSON.parse(await readFile(resolve(root, file), 'utf8'));
const sourceLedger = await load(options.sources);
const candidateLedger = await load(options.candidates);
const sourceSchema = await load('research/schemas/official-source-ledger.schema.json');
const candidateSchema = await load('research/schemas/publication-candidate-ledger.schema.json');
let errors = [...validateSchema(sourceLedger, sourceSchema), ...validateSchema(candidateLedger, candidateSchema)];
let warnings = [];
if (errors.length === 0) {
  const dataFiles = ['data/official-spots.json', 'data/official-events-archive.json', 'data/nagano-spots.json', 'data/community-spots.json', 'data/collaborations-current.json', 'data/collaborations-archive.json'];
  const rows = await Promise.all(dataFiles.map(load));
  const knownIds = new Set(rows.flat().map(row => row.id));
  ({ errors, warnings } = validateLedgerRelations(sourceLedger, candidateLedger, knownIds));
  for (const candidate of candidateLedger.candidates) for (const evidence of candidate.evidence) {
    if (evidence.recordPath === null) continue;
    const target = resolve(root, evidence.recordPath);
    const within = relative(root, target);
    if (!/^(research|docs)\//.test(evidence.recordPath) || evidence.recordPath.includes('\\') || evidence.recordPath.split('/').some(part => part === '..' || part === '.') || within.startsWith('..') || isAbsolute(within)) {
      errors.push(`candidate ${candidate.id}: evidence recordPath must be a repository-relative research/docs file`); continue;
    }
    try { if (!(await stat(target)).isFile()) throw new Error(); }
    catch { errors.push(`candidate ${candidate.id}: evidence record is missing: ${evidence.recordPath}`); }
  }
}
const report = {
  valid: errors.length === 0, errors, warnings,
  coverageNotice: 'Schema/CI success does not establish new-information coverage. Unknown dates remain null.',
};
if (report.valid) {
  report.queue = operationsQueue(sourceLedger.sources, candidateLedger.candidates, options.now);
  report.metrics = calculateLedgerMetrics(candidateLedger.candidates, options.now);
}
if (options.json) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`運用台帳: ${sourceLedger.sources?.length ?? '?'}情報源 / ${candidateLedger.candidates?.length ?? '?'}候補`);
  for (const error of errors) console.error(`ERROR: ${error}`);
  for (const warning of warnings) console.warn(`確認事項: ${warning}`);
  if (report.valid) {
    console.log(`巡回記録なし: ${report.queue.sources.withoutRecordedAttempt} / 最新取得失敗: ${report.queue.sources.latestFailure} / 保留・作業中: ${report.queue.pending.length}`);
    const metric = report.metrics.preStartPublication;
    console.log(`開催前掲載率（既知の${metric.known}件のみ）: ${metric.rate === null ? '不明' : `${(metric.rate * 100).toFixed(1)}%`} / 比較不明: ${metric.unknown}件`);
    console.log('詳細指標・期限一覧は --json で確認できます。');
  }
  console.log('検査成功は新着情報の網羅を保証しません。');
}
process.exitCode = report.valid ? 0 : 1;
