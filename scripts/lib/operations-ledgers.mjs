const DAY = 86400000;
const JST = 9 * 3600000;
const OPEN_STATES = new Set(['discovered', 'verifying', 'on_hold', 'awaiting_user', 'ready']);
const FAILURES = new Set(['fetch_failed', 'parse_failed', 'access_limited']);

export function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export function isTimestamp(value) {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  return Boolean(match && isDate(match[1]) && Number(match[2]) < 24 && Number(match[3]) < 60 && Number(match[4]) < 60 && (!match[6] || (Number(match[6]) < 24 && Number(match[7]) < 60)) && Number.isFinite(Date.parse(value)));
}

function httpURL(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password; }
  catch { return false; }
}

// The schema files use this closed subset of JSON Schema. No external packages or fetches.
export function validateSchema(value, schema, root = schema, location = '$') {
  const errors = [];
  const supported = new Set(['$schema', '$id', '$defs', '$ref', 'title', 'description', 'type', 'anyOf', 'const', 'enum', 'properties', 'required', 'additionalProperties', 'items', 'minItems', 'uniqueItems', 'minLength', 'pattern', 'format', 'minimum', 'maximum']);
  const checkDefinition = (rule, at) => {
    for (const key of Object.keys(rule)) if (!supported.has(key)) errors.push(`${at}: unsupported schema keyword ${key}`);
    if (rule.format && !['date', 'date-time', 'uri'].includes(rule.format)) errors.push(`${at}: unsupported schema format ${rule.format}`);
    for (const [key, child] of Object.entries({ ...rule.$defs, ...rule.properties })) checkDefinition(child, `${at}.${key}`);
    if (rule.items) checkDefinition(rule.items, `${at}.items`);
    rule.anyOf?.forEach((child, index) => checkDefinition(child, `${at}.anyOf[${index}]`));
  };
  checkDefinition(schema, 'schema');
  const visit = (item, rule, at) => {
    if (rule.$ref) {
      if (!rule.$ref.startsWith('#/')) { errors.push(`${at}: unsupported schema reference`); return; }
      const referenced = rule.$ref.slice(2).split('/').reduce((obj, key) => obj?.[key.replaceAll('~1', '/').replaceAll('~0', '~')], root);
      if (!referenced) { errors.push(`${at}: missing schema reference`); return; }
      visit(item, referenced, at); return;
    }
    if (rule.anyOf) {
      if (!rule.anyOf.some(option => validateSchema(item, option, root, at).length === 0)) errors.push(`${at}: does not match any allowed shape`);
      return;
    }
    const actual = item === null ? 'null' : Array.isArray(item) ? 'array' : typeof item;
    const types = Array.isArray(rule.type) ? rule.type : rule.type ? [rule.type] : [];
    if (types.length && !types.some(type => type === actual || (type === 'integer' && actual === 'number' && Number.isSafeInteger(item)))) { errors.push(`${at}: expected ${types.join('|')}`); return; }
    if (Object.hasOwn(rule, 'const') && item !== rule.const) errors.push(`${at}: unexpected constant`);
    if (rule.enum && !rule.enum.includes(item)) errors.push(`${at}: unknown value`);
    if (actual === 'object') {
      for (const key of rule.required || []) if (!Object.hasOwn(item, key)) errors.push(`${at}.${key}: required (unknown values must be null)`);
      for (const [key, child] of Object.entries(item)) {
        if (rule.properties?.[key]) visit(child, rule.properties[key], `${at}.${key}`);
        else if (rule.additionalProperties === false) errors.push(`${at}.${key}: unknown field`);
      }
    }
    if (actual === 'array') {
      if (rule.minItems !== undefined && item.length < rule.minItems) errors.push(`${at}: not enough items`);
      if (rule.uniqueItems && new Set(item.map(entry => JSON.stringify(entry))).size !== item.length) errors.push(`${at}: duplicate items`);
      if (rule.items) item.forEach((entry, index) => visit(entry, rule.items, `${at}[${index}]`));
    }
    if (actual === 'string') {
      if (rule.minLength !== undefined && item.length < rule.minLength) errors.push(`${at}: empty string`);
      if (rule.pattern && !new RegExp(rule.pattern, 'u').test(item)) errors.push(`${at}: invalid text`);
      if (rule.format === 'date' && !isDate(item)) errors.push(`${at}: invalid date`);
      if (rule.format === 'date-time' && !isTimestamp(item)) errors.push(`${at}: timestamp needs a real date, seconds and timezone`);
      if (rule.format === 'uri' && !httpURL(item)) errors.push(`${at}: invalid HTTP(S) URL`);
    }
    if (actual === 'number') {
      if (!Number.isFinite(item)) errors.push(`${at}: non-finite number`);
      if (rule.minimum !== undefined && item < rule.minimum) errors.push(`${at}: below minimum`);
      if (rule.maximum !== undefined && item > rule.maximum) errors.push(`${at}: above maximum`);
    }
  };
  visit(value, schema, location);
  return errors;
}

export function temporalBounds(value) {
  if (isTimestamp(value)) return { earliest: Date.parse(value), latest: Date.parse(value), precise: true };
  if (isDate(value)) { const earliest = Date.parse(`${value}T00:00:00Z`) - JST; return { earliest, latest: earliest + DAY - 1, precise: false }; }
  return null;
}

function japanDay(value) {
  const bounds = temporalBounds(value);
  return bounds ? new Date(bounds.earliest + JST).toISOString().slice(0, 10) : null;
}

export function beforeStart(publishedAt, startsAt) {
  const published = temporalBounds(publishedAt), start = temporalBounds(startsAt);
  if (!published || !start) return 'unknown';
  if (published.latest < start.earliest) return 'before';
  if (published.earliest >= start.latest) return 'not_before';
  return 'unknown';
}

export function sameDayTarget(candidate) {
  const discovered = temporalBounds(candidate.discoveredAt);
  if (!discovered || candidate.kind === 'history_import') return { targetDate: null, reasons: [] };
  const reasons = [];
  const start = temporalBounds(candidate.eventStartsAt), end = temporalBounds(candidate.eventEndsAt);
  if (start && end) {
    const days = (Date.parse(japanDay(candidate.eventEndsAt)) - Date.parse(japanDay(candidate.eventStartsAt))) / DAY + 1;
    if (days >= 1 && days <= 7) reasons.push('event_up_to_7_calendar_days');
  }
  const reservation = temporalBounds(candidate.reservationOpensAt);
  // Confirm the whole possible window, without treating an unknown clock time as midnight.
  if (reservation && reservation.latest - discovered.earliest <= 72 * 3600000 && reservation.latest >= discovered.earliest) reasons.push('reservation_within_72_hours');
  return { targetDate: reasons.length ? japanDay(candidate.discoveredAt) : null, reasons };
}

export function validateLedgerRelations(sources, candidates, knownListingIds) {
  const errors = [], warnings = [];
  const sourceIds = new Set(), sourceURLs = new Set(), candidateIds = new Set(), activeIdentities = new Map(), proposedIds = new Map();
  for (const source of sources.sources) {
    const at = `source ${source.id}`;
    if (sourceIds.has(source.id)) errors.push(`${at}: duplicate ID`);
    sourceIds.add(source.id);
    const url = new URL(source.url); url.hash = '';
    if (sourceURLs.has(url.href)) errors.push(`${at}: duplicate source URL`);
    sourceURLs.add(url.href);
    if (source.lastResult === 'not_checked') {
      if (source.lastAttemptAt !== null || source.lastSuccessfulAt !== null || source.lastFailure !== null || source.resultSummary !== null) errors.push(`${at}: not_checked must not claim an attempt or success`);
    } else if (!source.lastAttemptAt || !source.resultSummary) errors.push(`${at}: attempted result needs time and summary`);
    if (source.lastResult === 'success' && (!source.lastSuccessfulAt || Date.parse(source.lastSuccessfulAt) !== Date.parse(source.lastAttemptAt))) errors.push(`${at}: success must record the completed attempt time`);
    if (source.lastSuccessfulAt && source.lastAttemptAt && Date.parse(source.lastSuccessfulAt) > Date.parse(source.lastAttemptAt)) errors.push(`${at}: successful time is later than the last attempt`);
    if (FAILURES.has(source.lastResult) && (!source.lastFailure || source.lastFailure.kind !== source.lastResult || Date.parse(source.lastFailure.at) !== Date.parse(source.lastAttemptAt))) errors.push(`${at}: failure must retain the matching failed attempt`);
    if (source.lastFailure && source.lastAttemptAt && Date.parse(source.lastFailure.at) > Date.parse(source.lastAttemptAt)) errors.push(`${at}: failure is later than the last attempt`);
  }
  for (const candidate of candidates.candidates) {
    const at = `candidate ${candidate.id}`;
    if (candidateIds.has(candidate.id)) errors.push(`${at}: duplicate ID`);
    candidateIds.add(candidate.id);
    for (const id of candidate.sourceIds) if (!sourceIds.has(id)) errors.push(`${at}: unknown source ${id}`);
    const start = temporalBounds(candidate.eventStartsAt), end = temporalBounds(candidate.eventEndsAt);
    if (start && end && end.latest < start.earliest) errors.push(`${at}: event ends before it starts`);
    if (candidate.publishedAt !== null && candidate.state !== 'published') errors.push(`${at}: only published records may claim a publication date`);
    if (OPEN_STATES.has(candidate.state) && !candidate.nextCheck) errors.push(`${at}: pending work needs a concrete next check`);
    if (['on_hold', 'awaiting_user', 'rejected'].includes(candidate.state) && !candidate.decision) errors.push(`${at}: decision or hold reason is required`);
    if (OPEN_STATES.has(candidate.state) && candidate.recheckDueAt === null) warnings.push(`${at}: recheck deadline is unknown; assign it during the next scheduled review`);
    const match = candidate.existingMatch;
    for (const id of match.ids) if (!knownListingIds.has(id)) errors.push(`${at}: matched ID is not in published data: ${id}`);
    if (match.status === 'matched' && (match.ids.length === 0 || !match.note)) errors.push(`${at}: matched work needs existing IDs and comparison evidence`);
    if (match.status === 'new' && (match.ids.length > 0 || !match.note)) errors.push(`${at}: new work must document the duplicate check without claiming an existing match`);
    if (['ready', 'published'].includes(candidate.state)) {
      if (!['new', 'matched'].includes(match.status) || candidate.listingIds.length === 0) errors.push(`${at}: resolve existing IDs before ready/publication`);
      if (match.status === 'matched' && candidate.listingIds.some(id => !match.ids.includes(id))) errors.push(`${at}: update must reuse the matched IDs`);
      for (const id of candidate.listingIds) {
        if (candidate.state === 'published' && !knownListingIds.has(id)) errors.push(`${at}: published ID is missing: ${id}`);
        if (candidate.state === 'ready' && match.status === 'new' && knownListingIds.has(id)) errors.push(`${at}: new ID already exists: ${id}`);
      }
    }
    if (OPEN_STATES.has(candidate.state)) {
      const target = sameDayTarget(candidate);
      if (target.targetDate && (candidate.reflectDueAt === null || japanDay(candidate.reflectDueAt) > target.targetDate)) warnings.push(`${at}: same-day publication target is ${target.targetDate}; record or review the reflection deadline`);
      if (match.status === 'new') for (const id of candidate.listingIds) {
        if (proposedIds.has(id)) errors.push(`${at}: proposed new ID is already used by ${proposedIds.get(id)}: ${id}`);
        proposedIds.set(id, candidate.id);
      }
      // A source may announce multiple venues; URL alone is not an occurrence identity.
      const identity = JSON.stringify([candidate.kind, candidate.targetKey, candidate.eventStartsAt, candidate.releaseAt, candidate.reservationOpensAt]);
      if (activeIdentities.has(identity)) errors.push(`${at}: duplicate pending target (${activeIdentities.get(identity)})`);
      activeIdentities.set(identity, candidate.id);
      if (candidate.priority === 'high' && ['on_hold', 'awaiting_user'].includes(candidate.state)) warnings.push(`${at}: important hold needs individual consultation with the publication owner`);
    }
  }
  return { errors, warnings };
}

function statistics(values) {
  return { samples: values.length, mean: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null, min: values.length ? Math.min(...values) : null, max: values.length ? Math.max(...values) : null };
}

function delays(candidates, from, to) {
  const hours = [], days = [];
  let unknown = 0, negativeOrder = 0;
  for (const candidate of candidates) {
    const a = temporalBounds(candidate[from]), b = temporalBounds(candidate[to]);
    if (!a || !b) { unknown++; continue; }
    if (b.latest < a.earliest) { negativeOrder++; continue; }
    const calendarDays = (Date.parse(japanDay(candidate[to])) - Date.parse(japanDay(candidate[from]))) / DAY;
    days.push(calendarDays);
    if (a.precise && b.precise) hours.push((b.earliest - a.earliest) / 3600000);
  }
  return { elapsedHours: statistics(hours), japanCalendarDays: statistics(days), unknownPairs: unknown, negativeOrderPairs: negativeOrder, pairsWithoutExactHours: candidates.length - hours.length };
}

export function calculateLedgerMetrics(candidates, now = null) {
  const published = candidates.filter(candidate => candidate.state === 'published');
  const eligible = candidates.filter(candidate => candidate.kind === 'new_listing' && candidate.state !== 'rejected');
  const current = temporalBounds(now);
  let unpublishedAfterStart = 0;
  const comparisons = eligible.map(candidate => {
    if (candidate.state === 'published') return beforeStart(candidate.publishedAt, candidate.eventStartsAt);
    const start = temporalBounds(candidate.eventStartsAt);
    if (current && start && current.earliest > start.latest) { unpublishedAfterStart++; return 'not_before'; }
    return 'unknown';
  });
  const before = comparisons.filter(value => value === 'before').length, notBefore = comparisons.filter(value => value === 'not_before').length;
  return {
    scope: 'Only recorded candidates and known dates; not a measure of all new announcements',
    preStartPublication: { eligible: eligible.length, known: before + notBefore, before, notBefore, unpublishedAfterStart, unknown: comparisons.length - before - notBefore, rate: before + notBefore ? before / (before + notBefore) : null },
    announcedToDiscovered: delays(candidates, 'officialAnnouncedAt', 'discoveredAt'),
    discoveredToPublished: delays(published, 'discoveredAt', 'publishedAt'),
    announcedToPublished: delays(published, 'officialAnnouncedAt', 'publishedAt'),
  };
}

export function operationsQueue(sources, candidates, now) {
  if (!isTimestamp(now)) throw new Error('--now must be a timestamp with seconds and timezone');
  const time = Date.parse(now);
  const isOverdue = value => { const bounds = temporalBounds(value); return bounds ? time > bounds.latest : null; };
  return {
    sources: { registered: sources.length, enabled: sources.filter(s => s.enabled).length, withoutRecordedAttempt: sources.filter(s => s.lastResult === 'not_checked').length, latestSuccess: sources.filter(s => s.lastResult === 'success').length, latestFailure: sources.filter(s => FAILURES.has(s.lastResult)).length },
    pending: candidates.filter(candidate => OPEN_STATES.has(candidate.state)).map(candidate => ({
      id: candidate.id, state: candidate.state, priority: candidate.priority,
      reflectDueAt: candidate.reflectDueAt, reflectOverdue: isOverdue(candidate.reflectDueAt),
      nextCheck: candidate.nextCheck, recheckDueAt: candidate.recheckDueAt, recheckOverdue: isOverdue(candidate.recheckDueAt),
      sameDayTarget: sameDayTarget(candidate),
      needsIndividualConsultation: candidate.state === 'awaiting_user' || (candidate.priority === 'high' && candidate.state === 'on_hold'),
    })),
  };
}
