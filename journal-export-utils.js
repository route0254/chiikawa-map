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

  function createGoogleCalendarUrl({
    title,
    startDate,
    endDate,
    description,
    location,
    pageUrl
  }) {
    const url =
      new URL(
        "https://calendar.google.com/calendar/r/eventedit"
      );
    url.searchParams.set(
      "action",
      "TEMPLATE"
    );
    url.searchParams.set(
      "dates",
      toIcsDate(startDate) +
        "/" +
        toIcsDate(endDate)
    );
    url.searchParams.set(
      "text",
      title
    );
    url.searchParams.set(
      "details",
      [
        description,
        pageUrl
      ].filter(Boolean).join("\n")
    );

    if (location) {
      url.searchParams.set(
        "location",
        location
      );
    }

    return url.toString();
  }

  function getEventFields({
    spot,
    selectedDate,
    pageUrl
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

    return {
      title: spot.name,
      startDate,
      endDate,
      description,
      location: spot.address || "",
      pageUrl
    };
  }

  function getPlanFields({
    spots,
    date,
    pageUrl
  }) {
    if (!date || !spots?.length) {
      throw new Error(
        "カレンダーに登録するプランがありません。"
      );
    }

    return {
      title:
        "ちい活プラン（" +
        spots.length +
        "スポット）",
      startDate: date,
      endDate: addOneDay(date),
      description:
        spots.map(
          (spot, index) =>
            (index + 1) +
            ". " +
            spot.name +
            (spot.address
              ? "（" + spot.address + "）"
              : "")
        ).join("\n"),
      location:
        spots[0].address || "",
      pageUrl
    };
  }

  function createEventCalendar({
    spot,
    selectedDate,
    pageUrl,
    generatedAt
  }) {
    const fields =
      getEventFields({
        spot,
        selectedDate,
        pageUrl
      });
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
        toIcsDate(
          fields.startDate
        ) +
        "@chiikatsu-map.com",
      "DTSTAMP:" +
        toUtcTimestamp(generatedAt),
      "DTSTART;VALUE=DATE:" +
        toIcsDate(
          fields.startDate
        ),
      "DTEND;VALUE=DATE:" +
        toIcsDate(
          fields.endDate
        ),
      "SUMMARY:" +
        escapeIcsText(
          fields.title
        ),
      "LOCATION:" +
        escapeIcsText(
          fields.location
        ),
      "DESCRIPTION:" +
        escapeIcsText(
          fields.description
        ),
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
    const fields =
      getPlanFields({
        spots,
        date,
        pageUrl
      });
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
        toIcsDate(
          fields.startDate
        ),
      "DTEND;VALUE=DATE:" +
        toIcsDate(
          fields.endDate
        ),
      "SUMMARY:" +
        escapeIcsText(
          fields.title
        ),
      "LOCATION:" +
        escapeIcsText(
          fields.location
        ),
      "DESCRIPTION:" +
        escapeIcsText(
          fields.description
        ),
      "URL:" +
        sanitizeIcsUri(pageUrl),
      "END:VEVENT"
    ]);
  }

  function createEventGoogleCalendarUrl(
    options
  ) {
    return createGoogleCalendarUrl(
      getEventFields(options)
    );
  }

  function createPlanGoogleCalendarUrl(
    options
  ) {
    return createGoogleCalendarUrl(
      getPlanFields(options)
    );
  }

  const api = {
    addOneDay,
    createEventCalendar,
    createEventGoogleCalendarUrl,
    createPlanCalendar,
    createPlanGoogleCalendarUrl,
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
