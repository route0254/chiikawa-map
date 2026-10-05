import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { validateSchema, isDate, isTimestamp, temporalBounds, beforeStart, sameDayTarget, validateLedgerRelations, calculateLedgerMetrics, operationsQueue } from '../../scripts/lib/operations-ledgers.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const load = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const sourceSchema = load('research/schemas/official-source-ledger.schema.json');
const candidateSchema = load('research/schemas/publication-candidate-ledger.schema.json');
const sourceLedger = sources => ({ $schema: './schemas/official-source-ledger.schema.json', version: 1, sources });
const candidateLedger = candidates => ({ $schema: './schemas/publication-candidate-ledger.schema.json', version: 1, candidates });
const source = overrides => ({
  id: 'official-test', name: '公式告知', url: 'https://example.com/news/', kind: 'official_index', scope: ['official'], cadence: 'morning_evening', enabled: true,
  lastAttemptAt: null, lastSuccessfulAt: null, lastResult: 'not_checked', resultSummary: null, lastFailure: null, note: '巡回記録は未取得。', ...overrides,
});
const candidate = overrides => ({
  id: 'test-event', title: '会場別の公式イベント', kind: 'new_listing', targetKey: 'test-venue-2026-10', sourceIds: ['official-test'],
  officialAnnouncedAt: null, discoveredAt: null, eventStartsAt: null, eventEndsAt: null, releaseAt: null, reservationOpensAt: null, reflectDueAt: null,
  evidence: [{ url: 'https://example.com/announcement/', observedAt: null, summary: '会場別日程を確認する。', recordPath: null }],
  existingMatch: { status: 'unchecked', ids: [], note: null }, listingIds: [], state: 'verifying', priority: 'normal', decision: null,
  nextCheck: '主催者の会場別日程と既存IDを確認する。', recheckDueAt: '2026-10-06', publishedAt: null, ...overrides,
});
const relations = (candidates, sources = [source()], ids = ['published-id']) => validateLedgerRelations(sourceLedger(sources), candidateLedger(candidates), new Set(ids));
const published = overrides => candidate({ state: 'published', existingMatch: { status: 'new', ids: [], note: '会場と期間を照合し新規掲載と確認。' }, listingIds: ['published-id'], nextCheck: null, recheckDueAt: null, ...overrides });

test('ledger schemas require explicit unknowns and reject unknown fields, enums and duplicate references', () => {
  assert.deepEqual(validateSchema(sourceLedger([source()]), sourceSchema), []);
  assert.deepEqual(validateSchema(candidateLedger([candidate()]), candidateSchema), []);
  const missing = candidate(); delete missing.publishedAt;
  assert.match(validateSchema(candidateLedger([missing]), candidateSchema).join('\n'), /publishedAt.*required/);
  for (const bad of [candidate({ state: 'guess' }), candidate({ sourceIds: ['official-test', 'official-test'] }), candidate({ guessedDate: '2026-10-05' }), candidate({ nextCheck: '  ' })]) {
    assert.ok(validateSchema(candidateLedger([bad]), candidateSchema).length > 0);
  }
  for (const url of ['ftp://example.com/a', 'javascript:alert(1)', 'https://user:password@example.com/a', 'not a URL']) {
    assert.ok(validateSchema(sourceLedger([source({ url })]), sourceSchema).length > 0);
  }
});

test('dates and timestamp precision must be real and agree with the schemas', () => {
  assert.equal(isDate('2024-02-29'), true);
  for (const value of ['2026-02-29', '2026-04-31', '2026-1-05', '2026-10-05T00:00:00Z']) assert.equal(isDate(value), false);
  for (const value of ['2026-10-05T01:02:03Z', '2026-10-05T10:02:03.123+09:00']) {
    assert.equal(isTimestamp(value), true);
    assert.deepEqual(validateSchema(sourceLedger([source({ lastAttemptAt: value })]), sourceSchema), []);
    assert.deepEqual(validateSchema(candidateLedger([candidate({ discoveredAt: value })]), candidateSchema), []);
  }
  for (const value of ['2026-02-29T00:00:00Z', '2026-10-05T24:00:00Z', '2026-10-05T01:60:00Z', '2026-10-05T01:02:60Z', '2026-10-05T10:02:03', '2026-10-05T10:02+09:00', '2026-10-05T10:02:03.1234+09:00']) {
    assert.equal(isTimestamp(value), false);
    assert.ok(validateSchema(sourceLedger([source({ lastAttemptAt: value })]), sourceSchema).length > 0);
    assert.ok(validateSchema(candidateLedger([candidate({ discoveredAt: value })]), candidateSchema).length > 0);
  }
});

test('unsupported schema extensions fail instead of silently weakening validation', () => {
  assert.match(validateSchema({}, { type: 'object', $defs: { extension: { type: 'string', maxLength: 3 } } }).join('\n'), /unsupported schema keyword maxLength/);
  assert.match(validateSchema('x', { type: 'string', format: 'email' }).join('\n'), /unsupported schema format email/);
  assert.match(validateSchema('x', { $ref: 'https://example.com/schema' }).join('\n'), /unsupported schema reference/);
});

test('failed fetch or parse retains the earlier successful attempt without claiming success', () => {
  for (const kind of ['fetch_failed', 'parse_failed', 'access_limited']) {
    const failed = source({ lastAttemptAt: '2026-10-05T18:00:00+09:00', lastSuccessfulAt: '2026-10-05T08:00:00+09:00', lastResult: kind, resultSummary: '今回は取得/解析できなかった。', lastFailure: { at: '2026-10-05T09:00:00Z', kind, httpStatus: kind === 'access_limited' ? 403 : null, detail: '公式側の取得結果を確認する。', evidenceUrl: null } });
    assert.deepEqual(validateSchema(sourceLedger([failed]), sourceSchema), []);
    assert.deepEqual(relations([], [failed]).errors, []);
    assert.equal(operationsQueue([failed], [], '2026-10-05T20:00:00+09:00').sources.latestFailure, 1);
    assert.match(relations([], [{ ...failed, lastFailure: null }]).errors.join('\n'), /matching failed attempt/);
    assert.match(relations([], [{ ...failed, lastSuccessfulAt: '2026-10-06T08:00:00+09:00' }]).errors.join('\n'), /later than the last attempt/);
  }
});

test('successful recovery accepts equivalent timezone instants and retains historical failure evidence', () => {
  const recovered = source({ lastAttemptAt: '2026-10-05T18:00:00+09:00', lastSuccessfulAt: '2026-10-05T09:00:00Z', lastResult: 'success', resultSummary: '本文と会場情報を確認。', lastFailure: { at: '2026-10-05T08:00:00+09:00', kind: 'fetch_failed', httpStatus: 503, detail: '朝の一時障害。', evidenceUrl: null } });
  assert.deepEqual(relations([], [recovered]).errors, []);
  assert.match(relations([], [{ ...recovered, lastSuccessfulAt: '2026-10-05T08:59:00Z' }]).errors.join('\n'), /completed attempt time/);
  assert.match(relations([], [source({ lastSuccessfulAt: '2026-10-05T08:00:00+09:00' })]).errors.join('\n'), /not_checked/);
  assert.match(relations([], [{ ...recovered, lastFailure: { ...recovered.lastFailure, at: '2026-10-06T08:00:00+09:00' } }]).errors.join('\n'), /failure is later/);
});

test('information source references and normalized duplicate URLs are checked', () => {
  assert.match(relations([candidate({ sourceIds: ['missing-source'] })]).errors.join('\n'), /unknown source/);
  assert.match(relations([], [source(), source({ id: 'second-source', url: 'https://example.com/news/#latest' })]).errors.join('\n'), /duplicate source URL/);
  assert.match(relations([], [source(), source({ url: 'https://example.com/other/' })]).errors.join('\n'), /duplicate ID/);
});

test('ready and published work must resolve duplicate checks and preserve matched listing IDs', () => {
  const matched = candidate({ state: 'ready', existingMatch: { status: 'matched', ids: ['published-id'], note: '同じ会場・開催回の既存IDを使用する。' }, listingIds: ['published-id'] });
  assert.deepEqual(relations([matched]).errors, []);
  assert.match(relations([{ ...matched, listingIds: ['replacement-id'] }]).errors.join('\n'), /reuse the matched IDs/);
  assert.match(relations([{ ...matched, existingMatch: { status: 'ambiguous', ids: ['published-id'], note: '同名の別会場があり未解決。' } }]).errors.join('\n'), /resolve existing IDs/);
  assert.match(relations([candidate({ state: 'ready', existingMatch: { status: 'new', ids: [], note: '新規と判断。' }, listingIds: ['published-id'] })]).errors.join('\n'), /new ID already exists/);
  assert.match(relations([published({ listingIds: ['missing-id'] })]).errors.join('\n'), /published ID is missing/);
  assert.match(relations([{ ...matched, publishedAt: '2026-10-05' }]).errors.join('\n'), /only published records/);
});

test('one announcement can have separate venues while duplicate targets or proposed new IDs fail', () => {
  const a = candidate({ id: 'venue-a', targetKey: 'venue-a-2026-10' });
  const b = candidate({ id: 'venue-b', targetKey: 'venue-b-2026-10' });
  assert.deepEqual(relations([a, b]).errors, []);
  assert.match(relations([a, { ...b, targetKey: a.targetKey }]).errors.join('\n'), /duplicate pending target/);
  const newMatch = { status: 'new', ids: [], note: '公開済み会場と重ならない。' };
  assert.match(relations([{ ...a, state: 'ready', existingMatch: newMatch, listingIds: ['new-venue'] }, { ...b, state: 'ready', existingMatch: newMatch, listingIds: ['new-venue'] }]).errors.join('\n'), /proposed new ID is already used/);
});

test('holds retain actionable next checks and signal missing deadlines and individual consultation', () => {
  const hold = candidate({ state: 'on_hold', priority: 'high', decision: '公式画像と本文の会場表記が矛盾する。', recheckDueAt: null });
  const result = relations([hold]);
  assert.deepEqual(result.errors, []);
  assert.match(result.warnings.join('\n'), /recheck deadline is unknown/);
  assert.match(result.warnings.join('\n'), /individual consultation with the publication owner/);
  assert.equal(operationsQueue([source()], [hold], '2026-10-05T20:00:00+09:00').pending[0].needsIndividualConsultation, true);
  assert.match(relations([{ ...hold, decision: null, nextCheck: null }]).errors.join('\n'), /hold reason is required/);
  assert.match(relations([{ ...hold, decision: null, nextCheck: null }]).errors.join('\n'), /concrete next check/);
});

test('date-only comparisons keep the whole Japan day and cannot invent same-day ordering', () => {
  const bounds = temporalBounds('2026-10-05');
  assert.equal(new Date(bounds.earliest).toISOString(), '2026-10-04T15:00:00.000Z');
  assert.equal(new Date(bounds.latest).toISOString(), '2026-10-05T14:59:59.999Z');
  assert.equal(bounds.precise, false);
  assert.equal(beforeStart('2026-10-04', '2026-10-05'), 'before');
  assert.equal(beforeStart('2026-10-06', '2026-10-05'), 'not_before');
  assert.equal(beforeStart('2026-10-05', '2026-10-05'), 'unknown');
  assert.equal(beforeStart('2026-10-05T18:00:00+09:00', '2026-10-05'), 'unknown');
  assert.equal(beforeStart('2026-10-05T09:00:00Z', '2026-10-05T18:00:00+09:00'), 'not_before');
  assert.equal(beforeStart(null, '2026-10-05'), 'unknown');
  assert.match(relations([candidate({ eventStartsAt: '2026-10-06', eventEndsAt: '2026-10-05' })]).errors.join('\n'), /ends before it starts/);
});

test('metrics count known pre-start successes and already-started unpublished work without mixing history', () => {
  const rows = [
    published({ id: 'before', publishedAt: '2026-10-04', eventStartsAt: '2026-10-05' }),
    published({ id: 'late', publishedAt: '2026-10-06', eventStartsAt: '2026-10-05' }),
    published({ id: 'same-day', publishedAt: '2026-10-05', eventStartsAt: '2026-10-05' }),
    candidate({ id: 'unpublished-late', eventStartsAt: '2026-10-05' }),
    candidate({ id: 'unpublished-future', eventStartsAt: '2026-10-07' }),
    published({ id: 'history', kind: 'history_import', publishedAt: '2026-10-04', eventStartsAt: '2026-10-05' }),
    published({ id: 'reservation', kind: 'reservation_update', publishedAt: '2026-10-04', eventStartsAt: '2026-10-05' }),
    candidate({ id: 'rejected', state: 'rejected', decision: '対象外。', nextCheck: null, eventStartsAt: '2026-10-05' }),
  ];
  assert.deepEqual(calculateLedgerMetrics(rows, '2026-10-06T10:00:00+09:00').preStartPublication, { eligible: 5, known: 3, before: 1, notBefore: 2, unpublishedAfterStart: 1, unknown: 2, rate: 1 / 3 });
  assert.equal(calculateLedgerMetrics([], '2026-10-06T10:00:00+09:00').preStartPublication.rate, null);
});

test('delay metrics separate exact hours, known calendar days, unknowns and reversed dates', () => {
  const rows = [
    published({ officialAnnouncedAt: '2026-10-02', discoveredAt: null, publishedAt: '2026-10-05' }),
    published({ officialAnnouncedAt: '2026-10-02T23:00:00+09:00', discoveredAt: '2026-10-02T15:00:00Z', publishedAt: '2026-10-03T01:00:00+09:00' }),
    published({ officialAnnouncedAt: '2026-10-06', discoveredAt: '2026-10-05', publishedAt: '2026-10-05' }),
  ];
  const metrics = calculateLedgerMetrics(rows);
  assert.deepEqual(metrics.announcedToDiscovered.elapsedHours, { samples: 1, mean: 1, min: 1, max: 1 });
  assert.equal(metrics.announcedToDiscovered.unknownPairs, 1);
  assert.equal(metrics.announcedToDiscovered.negativeOrderPairs, 1);
  assert.equal(metrics.announcedToPublished.elapsedHours.samples, 1);
  assert.equal(metrics.announcedToPublished.elapsedHours.mean, 2);
  assert.equal(metrics.announcedToPublished.japanCalendarDays.mean, 2);
  assert.equal(metrics.announcedToPublished.japanCalendarDays.samples, 2);
  const unknown = calculateLedgerMetrics([published({ publishedAt: null })]);
  assert.deepEqual(unknown.discoveredToPublished.elapsedHours, { samples: 0, mean: null, min: null, max: null });
});

test('same-day targets use the documented seven-day and 72-hour boundaries without guessed dates', () => {
  const short = candidate({ discoveredAt: '2026-10-05', eventStartsAt: '2026-10-10', eventEndsAt: '2026-10-16' });
  assert.deepEqual(sameDayTarget(short), { targetDate: '2026-10-05', reasons: ['event_up_to_7_calendar_days'] });
  assert.equal(sameDayTarget({ ...short, eventEndsAt: '2026-10-17' }).targetDate, null);
  assert.equal(sameDayTarget({ ...short, discoveredAt: null }).targetDate, null);
  assert.equal(sameDayTarget({ ...short, kind: 'history_import' }).targetDate, null);
  const near = candidate({ discoveredAt: '2026-10-05T08:00:00+09:00', reservationOpensAt: '2026-10-08T08:00:00+09:00' });
  assert.deepEqual(sameDayTarget(near), { targetDate: '2026-10-05', reasons: ['reservation_within_72_hours'] });
  assert.equal(sameDayTarget({ ...near, reservationOpensAt: '2026-10-08T08:00:01+09:00' }).targetDate, null);
  assert.equal(sameDayTarget({ ...near, reservationOpensAt: '2026-10-05T07:59:59+09:00' }).targetDate, null);
  assert.equal(sameDayTarget({ ...near, discoveredAt: '2026-10-05', reservationOpensAt: '2026-10-08' }).targetDate, null);
  assert.match(relations([short]).warnings.join('\n'), /same-day publication target is 2026-10-05/);
  assert.ok(!relations([{ ...short, reflectDueAt: '2026-10-05' }]).warnings.some(warning => warning.includes('same-day')));
});

test('overdue status honors Japan date-only deadlines, unknowns and resolved work', () => {
  const pending = candidate({ reflectDueAt: '2026-10-05', recheckDueAt: null });
  const evening = operationsQueue([source()], [pending, published()], '2026-10-05T23:59:59+09:00');
  assert.equal(evening.pending.length, 1);
  assert.equal(evening.pending[0].reflectOverdue, false);
  assert.equal(evening.pending[0].recheckOverdue, null);
  assert.equal(evening.sources.withoutRecordedAttempt, 1);
  assert.equal(operationsQueue([], [pending], '2026-10-06T00:00:00+09:00').pending[0].reflectOverdue, true);
  assert.throws(() => operationsQueue([], [], '2026-10-05'), /timestamp/);
});

const runCLI = args => spawnSync(process.execPath, [join(root, 'scripts/check-operations-ledgers.mjs'), '--json', '--now=2026-10-05T10:00:00+09:00', ...args], { cwd: root, encoding: 'utf8', timeout: 20000, maxBuffer: 2 * 1024 * 1024 });
const digest = file => createHash('sha256').update(readFileSync(join(root, file))).digest('hex');

test('repository ledger CLI succeeds without changing research or published data', () => {
  const files = ['research/official-source-ledger.json', 'research/publication-candidate-ledger.json', 'data/official-spots.json', 'data/official-events-archive.json', 'data/added-dates.json'];
  const before = files.map(digest);
  const result = runCLI([]);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.valid, true);
  assert.deepEqual(report.errors, []);
  assert.match(report.coverageNotice, /does not establish.*coverage/);
  assert.ok(report.queue.sources.registered > 0);
  assert.deepEqual(files.map(digest), before);
});

test('invalid ledger CLI exits nonzero and checks evidence paths before reporting metrics', () => {
  const folder = realpathSync(mkdtempSync(join(tmpdir(), 'chiikawa-operations-test-')));
  const candidateFile = join(folder, 'candidates.json');
  const sourceId = load('research/official-source-ledger.json').sources[0].id;
  try {
    for (const recordPath of ['research/../package.json', 'research/../../outside.json', 'research/nonexistent-evidence-file.json']) {
      const row = candidate({ sourceIds: [sourceId], evidence: [{ url: 'https://example.com/announcement/', observedAt: null, summary: '検査用根拠。', recordPath }] });
      writeFileSync(candidateFile, JSON.stringify(candidateLedger([row])));
      const before = readFileSync(candidateFile, 'utf8');
      const result = runCLI([`--candidates=${candidateFile}`]);
      assert.equal(result.status, 1, result.stderr);
      const report = JSON.parse(result.stdout);
      assert.equal(report.valid, false);
      assert.match(report.errors.join('\n'), /evidence record/);
      assert.equal(Object.hasOwn(report, 'metrics'), false);
      assert.equal(readFileSync(candidateFile, 'utf8'), before);
    }
    writeFileSync(candidateFile, JSON.stringify(candidateLedger([candidate({ sourceIds: [sourceId], discoveredAt: '2026-02-29' })])));
    assert.equal(runCLI([`--candidates=${candidateFile}`]).status, 1);
  } finally {
    const temporaryRoot = realpathSync(tmpdir());
    assert.ok(resolve(folder).startsWith(resolve(temporaryRoot) + sep), 'cleanup must remain inside the temporary directory');
    rmSync(folder, { recursive: true, force: true });
  }
});
