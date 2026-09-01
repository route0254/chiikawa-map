import assert from "node:assert/strict";
import test from "node:test";
import calendarUtils from "../../calendar-utils.js";

const {
  getCalendarGroupLabel,
  groupCalendarEvents
} = calendarUtils;

test(
  "会場名ではなくイベント系列でまとめる",
  () => {
    const groups = groupCalendarEvents([
      {
        id: "popup-tokyo",
        name: "ちいかわPOP UP STORE 東京",
        brand: "chiikawa",
        relationType: "popup"
      },
      {
        id: "popup-osaka",
        name: "ちいかわPOP UP STORE 大阪",
        brand: "chiikawa",
        relationType: "popup"
      },
      {
        id: "movie-hiroshima",
        name: "映画ちいかわ POP UP STORE 広島",
        brand: "chiikawa_movie",
        relationType: "popup"
      },
      {
        id: "ramen-ikebukuro",
        name: "ちいかわラーメン 豚 池袋",
        brand: "ramen_buta"
      }
    ]);

    assert.deepEqual(
      groups.map(
        ({ label, count }) => ({ label, count })
      ),
      [
        { label: "POP UP", count: 2 },
        { label: "ちいかわ映画 POP UP", count: 1 },
        { label: "ラーメン豚", count: 1 }
      ]
    );
  }
);

test(
  "未定義ブランドは掲載区分から表示名を決める",
  () => {
    assert.equal(
      getCalendarGroupLabel({
        brand: "new-collaboration",
        relationType: "collaboration"
      }),
      "コラボ"
    );
    assert.equal(
      getCalendarGroupLabel({
        category: "nagano"
      }),
      "ナガノ先生関連"
    );
  }
);
