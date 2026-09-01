import {
  shouldArchiveEvent
} from "./data-utils.mjs";


function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] =
    value.split("-").map(Number);
  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}


export function getArchiveCandidates(
  records,
  today
) {
  if (!isCalendarDate(today)) {
    throw new Error(
      `基準日は YYYY-MM-DD 形式で指定してください: ${today}`
    );
  }

  return records.filter(
    record =>
      record.periodType === "limited" &&
      shouldArchiveEvent(
        record,
        today
      )
  );
}


export function findTimeSensitiveText(record) {
  const patterns = [
    "開催される",
    "開催中",
    "開催予定",
    "販売中",
    "実施中"
  ];
  const fields = [
    "description",
    "entryNote",
    "hoursText",
    "closedDaysText"
  ];

  return fields.flatMap(field => {
    const value = record[field];

    if (typeof value !== "string") {
      return [];
    }

    return patterns
      .filter(pattern => value.includes(pattern))
      .map(pattern => ({
        field,
        pattern
      }));
  });
}


export function prepareArchiveMove(
  currentRecords,
  archiveRecords,
  {
    ids,
    today
  }
) {
  const candidates =
    getArchiveCandidates(
      currentRecords,
      today
    );
  const requestedIds =
    [...new Set(ids || [])];

  if (!requestedIds.length) {
    throw new Error(
      "移動するIDを1件以上指定してください"
    );
  }

  if (
    requestedIds.length !==
    (ids || []).length
  ) {
    throw new Error(
      "--ids に同じIDが複数含まれています"
    );
  }

  const currentById = new Map(
    currentRecords.map(
      record => [record.id, record]
    )
  );
  const archiveIds = new Set(
    archiveRecords.map(
      record => record.id
    )
  );
  const candidateIds = new Set(
    candidates.map(
      record => record.id
    )
  );
  const unknownIds = requestedIds.filter(
    id => !currentById.has(id)
  );
  const duplicateIds = requestedIds.filter(
    id => archiveIds.has(id)
  );
  const ineligibleIds = requestedIds.filter(
    id =>
      currentById.has(id) &&
      !candidateIds.has(id)
  );

  if (unknownIds.length) {
    throw new Error(
      `現在JSONにないIDです: ${unknownIds.join(", ")}`
    );
  }

  if (duplicateIds.length) {
    throw new Error(
      `過去JSONに同じIDがあります: ${duplicateIds.join(", ")}`
    );
  }

  if (ineligibleIds.length) {
    throw new Error(
      `終了日を過ぎた期間限定データではありません: ${ineligibleIds.join(", ")}`
    );
  }

  const requestedIdSet =
    new Set(requestedIds);
  const moved = currentRecords
    .filter(record =>
      requestedIdSet.has(record.id)
    )
    .map(record => ({
      ...record,
      eventStatus:
        record.eventStatus ||
        "held"
    }));
  const current = currentRecords.filter(
    record =>
      !requestedIdSet.has(record.id)
  );
  const archive = [
    ...archiveRecords,
    ...moved
  ];

  return {
    current,
    archive,
    moved,
    warnings: moved.flatMap(record =>
      findTimeSensitiveText(record)
        .map(match => ({
          id: record.id,
          ...match
        }))
    )
  };
}
