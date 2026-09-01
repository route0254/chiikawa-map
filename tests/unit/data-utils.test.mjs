import assert from "node:assert/strict";
import test from "node:test";
import {
  getLatestCheckedDate,
  mergeManagedRecords,
  shouldArchiveEvent
} from "../../scripts/lib/data-utils.mjs";

test(
  "終了日を過ぎたイベントだけ過去扱いにする",
  () => {
    assert.equal(
      shouldArchiveEvent(
        { endDate: "2026-08-31" },
        "2026-09-01"
      ),
      true
    );
    assert.equal(
      shouldArchiveEvent(
        { endDate: "2026-09-01" },
        "2026-09-01"
      ),
      false
    );
    assert.equal(
      shouldArchiveEvent(
        { endDate: "2026-09-02" },
        "2026-09-01"
      ),
      false
    );
  }
);

test(
  "最新の確認日を入れ子のデータから取得する",
  () => {
    assert.equal(
      getLatestCheckedDate([
        { hoursCheckedAt: "2026-08-29" },
        {
          statusAsOf: "2026-09-01",
          events: [
            { entryInfoCheckedAt: "2026-08-31" }
          ]
        }
      ]),
      "2026-09-01"
    );
  }
);

test(
  "管理対象を更新しても既存レコードの並びを維持する",
  () => {
    const existing = [
      { id: "unmanaged-a", value: 1 },
      { id: "managed-a", value: 1 },
      { id: "unmanaged-b", value: 1 }
    ];
    const generated = [
      { id: "managed-a", value: 2 },
      { id: "managed-new", value: 1 }
    ];
    const merged = mergeManagedRecords(
      existing,
      generated,
      new Set([
        "managed-a",
        "managed-new"
      ])
    );

    assert.deepEqual(
      merged.map(record => record.id),
      [
        "unmanaged-a",
        "managed-a",
        "unmanaged-b",
        "managed-new"
      ]
    );
    assert.equal(merged[1].value, 2);
  }
);
