(function attachJournalExportUtils(globalScope) {
  "use strict";

  function escapeIcsText(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }

  function toIcsDate(value) {
    return String(value || "")
      .replace(/-/g, "");
  }

  function sanitizeIcsUri(value) {
    return String(value || "")
      .replace(/[\r\n]/g, "");
  }

  function addOneDay(value) {
    const match =
      /^(\d{4})-(\d{2})-(\d{2})$/.exec(
        String(value || "")
      );

    if (!match) {
      return value;
    }

    return new Date(
      Date.UTC(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]) + 1
      )
    ).toISOString().slice(0, 10);
  }

  function toUtcTimestamp(value) {
    const date =
      value instanceof Date
        ? value
        : new Date(value || Date.now());
    const validDate =
      Number.isNaN(date.getTime())
        ? new Date()
        : date;

    return validDate
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  }

  function foldIcsLine(line) {
    const encoder =
      new TextEncoder();
    const rows = [];
    let row = "";
    let bytes = 0;

    Array.from(line).forEach(
      character => {
        const characterBytes =
          encoder.encode(character)
            .length;
        const limit =
          rows.length ? 74 : 75;

        if (
          row &&
          bytes + characterBytes > limit
        ) {
          rows.push(row);
          row = " " + character;
          bytes =
            1 + characterBytes;
          return;
        }

        row += character;
        bytes += characterBytes;
      }
    );

    rows.push(row);
    return rows.join("\r\n");
  }

  function buildCalendar(lines) {
    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//chiikatsu-map.com//Chiikatsu Map//JA",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      ...lines,
      "END:VCALENDAR"
    ]
      .map(foldIcsLine)
      .join("\r\n") +
      "\r\n";
  }

  function createEventCalendar({
    spot,
    selectedDate,
    pageUrl,
    generatedAt
  }) {
    const hasEnd =
      Boolean(spot?.endDate);
    const startDate =
      hasEnd && spot.startDate
        ? spot.startDate
        : selectedDate ||
          spot?.startDate;
    const endDate =
      hasEnd
        ? addOneDay(spot.endDate)
        : addOneDay(startDate);

    if (!startDate || !endDate) {
      throw new Error(
        "カレンダーに登録する日付がありません。"
      );
    }

    const period =
      spot.startDate
        ? spot.startDate +
          "〜" +
          (spot.endDate || "終了日未定")
        : "日程は公式情報をご確認ください";
    const description = [
      period,
      spot.sourceUrl ||
        spot.officialUrl ||
        ""
    ].filter(Boolean).join("\n");
    const uidSource =
      String(spot.id || spot.name || "event")
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .slice(0, 100);

    return buildCalendar([
      "BEGIN:VEVENT",
      "UID:" +
        uidSource +
        "-" +
        toIcsDate(startDate) +
        "@chiikatsu-map.com",
      "DTSTAMP:" +
        toUtcTimestamp(generatedAt),
      "DTSTART;VALUE=DATE:" +
        toIcsDate(startDate),
      "DTEND;VALUE=DATE:" +
        toIcsDate(endDate),
      "SUMMARY:" +
        escapeIcsText(spot.name),
      "LOCATION:" +
        escapeIcsText(spot.address),
      "DESCRIPTION:" +
        escapeIcsText(description),
      "URL:" +
        sanitizeIcsUri(pageUrl),
      "END:VEVENT"
    ]);
  }

  function createPlanCalendar({
    spots,
    date,
    pageUrl,
    generatedAt
  }) {
    if (!date || !spots?.length) {
      throw new Error(
        "カレンダーに登録するプランがありません。"
      );
    }

    const description =
      spots.map(
        (spot, index) =>
          (index + 1) +
          ". " +
          spot.name +
          (spot.address
            ? "（" + spot.address + "）"
            : "")
      ).join("\n");
    const uidSource =
      spots.map(spot => spot.id)
        .join("-")
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .slice(0, 100) ||
      "plan";

    return buildCalendar([
      "BEGIN:VEVENT",
      "UID:plan-" +
        toIcsDate(date) +
        "-" +
        uidSource +
        "@chiikatsu-map.com",
      "DTSTAMP:" +
        toUtcTimestamp(generatedAt),
      "DTSTART;VALUE=DATE:" +
        toIcsDate(date),
      "DTEND;VALUE=DATE:" +
        toIcsDate(addOneDay(date)),
      "SUMMARY:" +
        escapeIcsText(
          "ちい活プラン（" +
          spots.length +
          "スポット）"
        ),
      "LOCATION:" +
        escapeIcsText(
          spots[0].address
        ),
      "DESCRIPTION:" +
        escapeIcsText(description),
      "URL:" +
        sanitizeIcsUri(pageUrl),
      "END:VEVENT"
    ]);
  }

  const api = {
    addOneDay,
    createEventCalendar,
    createPlanCalendar,
    escapeIcsText
  };

  if (
    typeof module !== "undefined" &&
    module.exports
  ) {
    module.exports = api;
  } else {
    globalScope.ChiikatsuJournalExport =
      api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
