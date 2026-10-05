function normalize(value) {
  return String(value || "").normalize("NFKC").replace(/[\s（）()・.,，．-]/g, "").toLowerCase();
}

function seriesPrefix(id) {
  return String(id || "").match(/^nagano-(?:market-popup|aquarium|exhibition)-/)?.[0];
}

function findExisting(event, records) {
  const prefix = seriesPrefix(event.id);
  const matches = records.filter(record =>
    prefix && seriesPrefix(record.id) === prefix && (
      record.id === event.id || (
        record.sourceUrl === event.sourceUrl && record.startDate === event.startDate &&
        (prefix !== "nagano-aquarium-" || normalize(record.venueName || record.name.replace(/^ナガノの水族館\s*/, "")) === normalize(event.venueName))
      )
    )
  );
  if (new Set(matches.map(record => record.id)).size > 1) {
    throw new Error(`既存イベントの照合が曖昧です: ${event.id}`);
  }
  return matches[0];
}

function sourceEventFromPublished(record, venueName) {
  const event = {
    id: record.id, name: record.name, startDate: record.startDate, endDate: record.endDate,
    venueName, address: record.address, sourceUrl: record.sourceUrl,
    lat: record.lat, lng: record.lng, hoursText: record.hoursText,
    entryNote: record.entryNote, defaultEntryType: record.defaultEntryType
  };
  if (record.hoursCheckedAt === record.entryInfoCheckedAt) event.checkedAt = record.hoursCheckedAt;
  if (record.eventStatus) event.eventStatus = record.eventStatus;
  return event;
}

// 公式URLと開始日で同じ開催を照合する。別の開催年や曖昧な複数IDは名寄せしない。
export function reconcileNaganoEvent(event, sourceEvents, publishedRecords) {
  const sourceEvent = findExisting(event, sourceEvents);
  const published = findExisting(event, publishedRecords);
  if (sourceEvent && published && sourceEvent.id !== published.id) {
    throw new Error(`原本と公開データのIDが一致しません: ${sourceEvent.id} / ${published.id}`);
  }
  const existing = sourceEvent || (published && sourceEventFromPublished(published, event.venueName));
  if (!existing) return { ...event };

  const result = { ...existing, ...event, id: existing.id };
  // 同じ開催の詳細住所を、空欄や短い一般住所で上書きしない。
  const addressText = value => String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim();
  const incomingAddress = addressText(event.address);
  const knownAddress = addressText(existing.address);
  const detailSuffix = knownAddress.slice(incomingAddress.length);
  if (!incomingAddress || knownAddress === incomingAddress ||
      (knownAddress.startsWith(incomingAddress) && /^[\s(]/.test(detailSuffix))) {
    result.address = existing.address;
  }
  if (event.hoursText === undefined) result.hoursText = existing.hoursText;
  if (result.address !== existing.address) {
    delete result.lat;
    delete result.lng;
  }
  return result;
}
