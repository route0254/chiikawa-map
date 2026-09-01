import { readFile } from "node:fs/promises";
import { auditSpecialSeries } from "./lib/special-series-audit.mjs";


const catalogUrl = new URL(
  "../research/official-special-series-catalog.json",
  import.meta.url
);
const sourceUrl = new URL(
  "../research/official-special-events-source.json",
  import.meta.url
);
const [catalog, source] =
  await Promise.all([
    readFile(catalogUrl, "utf8")
      .then(JSON.parse),
    readFile(sourceUrl, "utf8")
      .then(JSON.parse)
  ]);
const result = auditSpecialSeries(
  catalog,
  source
);

if (process.argv.includes("--json")) {
  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );
} else {
  console.log(
    `特設ページ系列台帳（確認日: ${catalog.checkedAt}）`
  );
  console.log(
    `- 原本管理: ${result.statusCounts.managed}系列（${result.mappedSourceSeriesCount}/${result.sourceSeriesCount}照合済み）`
  );
  console.log(
    `- 保留: ${result.statusCounts.hold}系列`
  );
  console.log(
    `- 対象外: ${result.statusCounts.excluded}系列`
  );

  if (result.pending.length) {
    console.log("\n保留中:");
    result.pending.forEach(entry => {
      console.log(
        `- ${entry.label}: ${entry.reason}`
      );
    });
  }

  if (result.errors.length) {
    console.error("\n差分・不整合:");
    result.errors.forEach(error => {
      console.error(`- ${error}`);
    });
  } else {
    console.log(
      "\n台帳と特設イベント原本の差分はありません。"
    );
  }
}

if (!result.valid) {
  process.exitCode = 1;
}
