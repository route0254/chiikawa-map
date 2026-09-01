import assert from "node:assert/strict";
import test from "node:test";
import {
  getArchiveCandidates,
  prepareArchiveMove
} from "../../scripts/lib/archive-events.mjs";


const ended = {
  id: "ended",
  name: "終了済みイベント",
  periodType: "limited",
  endDate: "2026-08-31",
  description: "会場で開催されるイベントです。"
};
const active = {
  id: "active",
  name: "開催中イベント",
  periodType: "limited",
  endDate: "2026-09-01"
};


test(
  "終了日の翌日から移動候補にする",
  () => {
    assert.deepEqual(
      getArchiveCandidates(
        [ended, active],
        "2026-09-01"
      ).map(record => record.id),
      ["ended"]
    );
    assert.throws(
      () => getArchiveCandidates(
        [ended],
        "2026-02-30"
      ),
      /YYYY-MM-DD/
    );
  }
);


test(
  "指定した候補だけをIDを維持して移動する",
  () => {
    const result = prepareArchiveMove(
      [ended, active],
      [],
      {
        ids: ["ended"],
        today: "2026-09-01"
      }
    );

    assert.deepEqual(
      result.current.map(record => record.id),
      ["active"]
    );
    assert.equal(
      result.archive[0].id,
      "ended"
    );
    assert.equal(
      result.archive[0].eventStatus,
      "held"
    );
    assert.deepEqual(
      result.warnings,
      [{
        id: "ended",
        field: "description",
        pattern: "開催される"
      }]
    );
  }
);


test(
  "対象外や重複IDは移動しない",
  () => {
    assert.throws(
      () => prepareArchiveMove(
        [ended, active],
        [],
        {
          ids: ["active"],
          today: "2026-09-01"
        }
      ),
      /終了日を過ぎた/
    );
    assert.throws(
      () => prepareArchiveMove(
        [ended],
        [{ id: "ended" }],
        {
          ids: ["ended"],
          today: "2026-09-01"
        }
      ),
      /過去JSONに同じID/
    );
  }
);
