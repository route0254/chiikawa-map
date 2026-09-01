export function isDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    String(value || "")
  );
}

export function shouldArchiveEvent(
  event,
  statusAsOf
) {
  return (
    isDateString(event?.endDate) &&
    isDateString(statusAsOf) &&
    event.endDate < statusAsOf
  );
}

export function collectCheckedDates(value) {
  const dates = [];

  function visit(current) {
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }

    if (
      !current ||
      typeof current !== "object"
    ) {
      return;
    }

    Object.entries(current).forEach(
      ([key, entry]) => {
        if (
          /(?:checkedAt|CheckedAt|statusAsOf|updatedAt)$/.test(key) &&
          isDateString(entry)
        ) {
          dates.push(entry);
        } else if (
          entry &&
          typeof entry === "object"
        ) {
          visit(entry);
        }
      }
    );
  }

  visit(value);
  return dates;
}

export function getLatestCheckedDate(
  values,
  fallback = ""
) {
  const dates = values.flatMap(
    collectCheckedDates
  );

  return dates.sort().at(-1) || fallback;
}

export function mergeManagedRecords(
  existingRecords,
  generatedRecords,
  managedIds
) {
  const generatedById = new Map(
    generatedRecords.map(
      record => [record.id, record]
    )
  );
  const merged = [];
  const placedIds = new Set();

  existingRecords.forEach(record => {
    if (!managedIds.has(record.id)) {
      merged.push(record);
      return;
    }

    const replacement =
      generatedById.get(record.id);

    if (replacement) {
      merged.push(replacement);
      placedIds.add(record.id);
    }
  });

  generatedRecords.forEach(record => {
    if (!placedIds.has(record.id)) {
      merged.push(record);
    }
  });

  return merged;
}
