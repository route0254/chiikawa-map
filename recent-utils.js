(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RecentAdditions = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const NEW_DAYS = 14;
  function japanToday(now = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(now).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  function validDate(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  }
  function isNew(addedAt, today = japanToday()) {
    if (!validDate(addedAt) || !validDate(today)) return false;
    const age = (Date.parse(today) - Date.parse(addedAt)) / 86400000;
    return age >= 0 && age < NEW_DAYS;
  }
  function selectRecent(spots, dates, today = japanToday()) {
    return spots.filter(spot => isNew(dates[spot.id], today) &&
      (!spot.endDate || spot.endDate >= today))
      .sort((a, b) => dates[b.id].localeCompare(dates[a.id]) || a.id.localeCompare(b.id));
  }
  function isHistoricalCollaboration(record, today = japanToday()) {
    return ["ended", "past", "cancelled"].includes(record.status) ||
      (record.periods?.length > 0 && record.periods.every(period => period.endDate && period.endDate < today));
  }
  function isRecentCollaboration(record, dates, today = japanToday()) {
    return isNew(dates[record.id], today) && !isHistoricalCollaboration(record, today);
  }
  return { NEW_DAYS, japanToday, validDate, isNew, selectRecent, isRecentCollaboration, isHistoricalCollaboration };
});
