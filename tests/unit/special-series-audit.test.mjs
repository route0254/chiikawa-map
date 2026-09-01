import assert from "node:assert/strict";
import test from "node:test";
import { auditSpecialSeries } from "../../scripts/lib/special-series-audit.mjs";


test(
  "原本の系列と保留項目を区別して照合する",
  () => {
    const result = auditSpecialSeries(
      {
        entries: [
          {
            key: "managed-a",
            status: "managed",
            sourceKey: "source-a",
            sourceUrls: [
              "https://example.com/a"
            ]
          },
          {
            key: "hold-a",
            label: "保留A",
            status: "hold",
            reason: "日程未確定",
            sourceUrls: [
              "https://example.com/hold"
            ]
          }
        ]
      },
      {
        series: [
          { key: "source-a" }
        ]
      }
    );

    assert.equal(result.valid, true);
    assert.equal(
      result.statusCounts.managed,
      1
    );
    assert.equal(
      result.pending[0].key,
      "hold-a"
    );
  }
);


test(
  "台帳にない原本系列を差分として報告する",
  () => {
    const result = auditSpecialSeries(
      {
        entries: []
      },
      {
        series: [
          { key: "unmapped" }
        ]
      }
    );

    assert.equal(result.valid, false);
    assert.match(
      result.errors[0],
      /原本の系列が台帳にありません/
    );
  }
);


test(
  "保留理由と公式URLを必須にする",
  () => {
    const result = auditSpecialSeries(
      {
        entries: [
          {
            key: "hold-a",
            status: "hold",
            sourceUrls: []
          }
        ]
      },
      { series: [] }
    );

    assert.equal(result.valid, false);
    assert.equal(
      result.errors.length,
      2
    );
  }
);
