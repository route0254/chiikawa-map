const ARCHIVE = "data/official-events-archive.json";

export function isCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export function japanToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(now);
}

export function linkIdentity(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.href;
  } catch {
    return value;
  }
}

export function isCommonInformationUrl(value) {
  try {
    const url = new URL(value);
    return url.pathname === "/" ||
      /\/(?:events?|event-calendar|news|info|information|topics|pus)\/(?:index\.html?)?$/.test(url.pathname) ||
      /\/(?:events?|event-calendar|news|info|information|topics|pus)$/.test(url.pathname) ||
      /^(?:www\.)?(?:x\.com|twitter\.com)$/.test(url.hostname) &&
        /^\/[^/]+(?:\/with_replies)?\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

export function endedLinkRecord(record, file, today) {
  return file === ARCHIVE ||
    record.periodType === "limited" && isCalendarDate(record.endDate) && record.endDate < today;
}

export function protectedLinkUrls({ sources = [], candidates = [], collaborations = [] }, today) {
  const pending = candidates.filter(candidate =>
    ["discovered", "verifying", "on_hold", "awaiting_user", "ready"].includes(candidate.state));
  const pendingIds = new Set(pending.flatMap(candidate => candidate.sourceIds));
  const urls = sources.filter(source => source.enabled && (
    source.kind === "official_index" || pendingIds.has(source.id) ||
    source.kind === "series" && /^\/[^/]+\.html?$/.test(new URL(source.url).pathname)
  )).map(source => source.url);
  urls.push(...pending.flatMap(candidate => candidate.evidence.map(evidence => evidence.url)));
  for (const record of collaborations) {
    if (isCalendarDate(record.endDate) && record.endDate < today) continue;
    urls.push(record.sourceUrl, record.officialUrl, record.reservationUrl);
    for (const period of record.periods || []) {
      if (!isCalendarDate(period.endDate) || period.endDate >= today) urls.push(period.sourceUrl);
    }
  }
  return urls.filter(url => typeof url === "string");
}

export function collectLinkCheckTargets(datasets, {
  today = japanToday(), fields, protectedUrls = []
}) {
  if (!isCalendarDate(today)) throw new Error("Link scope requires a valid Japan calendar date");
  const protectedKeys = new Set(protectedUrls.map(linkIdentity));
  const all = new Map();
  let excludedRecords = 0;
  let retainedRecords = 0;
  for (const { file, records } of datasets) {
    for (const record of records) {
      const ended = endedLinkRecord(record, file, today);
      if (ended) excludedRecords++; else retainedRecords++;
      for (const field of fields) {
        const url = record[field];
        if (typeof url !== "string" || !url.trim()) continue;
        const identity = linkIdentity(url);
        if (!all.has(identity)) all.set(identity, { url, references: [] });
        all.get(identity).references.push({
          file, field, spotId: record.id, spotName: record.name, ended, url
        });
      }
    }
  }
  const targets = [];
  const excluded = [];
  let sharedUrls = 0;
  let commonUrls = 0;
  for (const [identity, target] of all) {
    const active = target.references.filter(reference => !reference.ended);
    if (active.length) {
      if (active.length !== target.references.length) sharedUrls++;
      targets.push({ url: active[0].url, references: active });
    } else if (protectedKeys.has(identity) || isCommonInformationUrl(target.url)) {
      commonUrls++;
      targets.push({ url: target.url, references: [{
        file: "common-source", field: "url", spotId: null, spotName: "継続確認する共通情報源"
      }] });
    } else {
      excluded.push(target);
    }
  }
  return {
    targets, excluded,
    summary: {
      today, totalUrls: all.size, retainedUrls: targets.length, excludedUrls: excluded.length,
      retainedRecords, excludedRecords, sharedUrls, commonUrls
    }
  };
}
