import assert from "node:assert/strict";
import test from "node:test";
import exportUtils from "../../journal-export-utils.js";

const generatedAt =
  new Date(
    "2026-09-01T03:04:05.000Z"
  );

test(
  "期間イベントは終了日の翌日をDTENDにする",
  () => {
    const calendar =
      exportUtils.createEventCalendar({
        spot: {
          id: "event-tokyo",
          name: "イベント東京",
          address: "東京都千代田区",
          startDate: "2026-09-10",
          endDate: "2026-09-12",
          officialUrl: "https://example.com/event"
        },
        selectedDate: "2026-09-11",
        pageUrl: "https://chiikatsu-map.com/spot/event-tokyo/",
        generatedAt
      });

    assert.match(
      calendar,
      /DTSTART;VALUE=DATE:20260910\r\n/
    );
    assert.match(
      calendar,
      /DTEND;VALUE=DATE:20260913\r\n/
    );
    assert.match(
      calendar,
      /DTSTAMP:20260901T030405Z/
    );
  }
);

test(
  "終了日未定のイベントは選択日だけを登録する",
  () => {
    const calendar =
      exportUtils.createEventCalendar({
        spot: {
          id: "open-event",
          name: "開催中イベント",
          startDate: "2026-08-01"
        },
        selectedDate: "2026-09-01",
        pageUrl: "https://chiikatsu-map.com/",
        generatedAt
      });

    assert.match(
      calendar,
      /DTSTART;VALUE=DATE:20260901\r\n/
    );
    assert.match(
      calendar,
      /DTEND;VALUE=DATE:20260902\r\n/
    );
  }
);

test(
  "プラン内の名称と住所を1日の予定にまとめる",
  () => {
    const calendar =
      exportUtils.createPlanCalendar({
        spots: [
          {
            id: "first",
            name: "店舗A,本店",
            address: "東京都;千代田区"
          },
          {
            id: "second",
            name: "店舗B",
            address: "東京都中央区"
          }
        ],
        date: "2026-09-01",
        pageUrl: "https://chiikatsu-map.com/journal.html?view=plan",
        generatedAt
      });

    assert.match(
      calendar,
      /SUMMARY:ちい活プラン（2スポット）/
    );
    assert.match(
      calendar,
      /店舗A\\,本店/
    );
    assert.match(
      calendar,
      /東京都\\;千代田区/
    );
    assert.match(
      calendar,
      /DTEND;VALUE=DATE:20260902/
    );
  }
);
