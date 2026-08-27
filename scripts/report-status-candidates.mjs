import {
  appendFile,
  readFile
} from "node:fs/promises";


const officialSpotsUrl =
  new URL(
    "../data/official-spots.json",
    import.meta.url
  );
const endingSoonDays = 14;


function getTodayInJapan() {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }
    ).formatToParts(new Date());
  const values =
    Object.fromEntries(
      parts.map(
        part => [
          part.type,
          part.value
        ]
      )
    );

  return [
    values.year,
    values.month,
    values.day
  ].join("-");
}


function getDaysBetween(
  startDate,
  endDate
) {
  const millisecondsPerDay =
    24 * 60 * 60 * 1000;

  return Math.round(
    (
      Date.parse(endDate + "T00:00:00Z") -
      Date.parse(startDate + "T00:00:00Z")
    ) /
      millisecondsPerDay
  );
}


function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [
    year,
    month,
    day
  ] = value
    .split("-")
    .map(Number);
  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}


function toReportItem(
  spot,
  today
) {
  return {
    id: spot.id,
    name: spot.name,
    startDate: spot.startDate,
    endDate: spot.endDate,
    daysUntilEnd:
      spot.endDate
        ? getDaysBetween(
            today,
            spot.endDate
          )
        : null,
    sourceUrl: spot.sourceUrl
  };
}


function sortByEndDate(
  first,
  second
) {
  return (
    first.endDate ||
    "9999-12-31"
  ).localeCompare(
    second.endDate ||
    "9999-12-31"
  ) ||
    first.name.localeCompare(
      second.name,
      "ja"
    );
}


function printItems(
  title,
  items
) {
  console.log(
    `\n${title}: ${items.length}件`
  );

  if (!items.length) {
    console.log("- 該当なし");
    return;
  }

  items.forEach(
    item => {
      console.log(
        "- " +
        (item.endDate || "終了日未定") +
        (
          item.daysUntilEnd === null
            ? ""
            : item.daysUntilEnd < 0
              ? ` | ${Math.abs(item.daysUntilEnd)}日経過`
              : ` | 残り${item.daysUntilEnd}日`
        ) +
        " | " +
        item.id +
        " | " +
        item.name
      );
    }
  );
}


function escapeWorkflowCommand(value) {
  return String(value)
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
}


function escapeMarkdownCell(value) {
  return String(value)
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
}


function createMarkdownTable(
  items,
  emptyText
) {
  if (!items.length) {
    return `${emptyText}\n`;
  }

  const rows = items.map(
    item => {
      const timing =
        item.daysUntilEnd === null
          ? "終了日未定"
          : item.daysUntilEnd < 0
            ? `${Math.abs(item.daysUntilEnd)}日経過`
            : item.daysUntilEnd === 0
              ? "本日終了"
              : `残り${item.daysUntilEnd}日`;
      const sourceLink =
        item.sourceUrl
          ? `[公式情報](${item.sourceUrl})`
          : "－";

      return (
        `| ${escapeMarkdownCell(item.endDate || "未定")} ` +
        `| ${escapeMarkdownCell(timing)} ` +
        `| ${escapeMarkdownCell(item.name)} ` +
        `| \`${escapeMarkdownCell(item.id)}\` ` +
        `| ${sourceLink} |`
      );
    }
  );

  return [
    "| 終了日 | 状態 | スポット | ID | 確認先 |",
    "|---|---:|---|---|---|",
    ...rows,
    ""
  ].join("\n");
}


function createGithubSummary(report) {
  return [
    "## 公式スポット状況確認",
    "",
    `基準日（日本時間）: **${report.today}**`,
    "",
    "| 確認区分 | 件数 | 対応 |",
    "|---|---:|---|",
    `| アーカイブ移動候補 | ${report.archiveCandidates.length} | 公式情報を確認し、現在JSONから過去JSONへ移動 |`,
    `| 14日以内に終了 | ${report.endingSoon.length} | 延長・終了告知を確認 |`,
    `| 終了日未定の期間限定 | ${report.openEndedLimited.length} | 終了日の発表有無を確認 |`,
    "",
    "### アーカイブ移動候補（終了日経過）",
    "",
    createMarkdownTable(
      report.archiveCandidates,
      "該当なし"
    ),
    "### 終了間近（14日以内）",
    "",
    createMarkdownTable(
      report.endingSoon,
      "該当なし"
    ),
    "### 終了日未定の期間限定スポット",
    "",
    createMarkdownTable(
      report.openEndedLimited,
      "該当なし"
    ),
    "> このレポートは候補抽出のみです。公式情報を確認してからJSONを更新してください。",
    ""
  ].join("\n");
}


function emitGithubAnnotations(report) {
  for (const item of report.archiveCandidates) {
    console.log(
      "::error title=アーカイブ移動候補::" +
      escapeWorkflowCommand(
        `${item.endDate}に終了した ${item.name}（${item.id}）を公式確認してください`
      )
    );
  }

  for (const item of report.endingSoon) {
    console.log(
      "::notice title=終了間近の公式スポット::" +
      escapeWorkflowCommand(
        `${item.endDate}まで残り${item.daysUntilEnd}日: ${item.name}（${item.id}）`
      )
    );
  }

  for (const item of report.openEndedLimited) {
    console.log(
      "::notice title=終了日未定の期間限定スポット::" +
      escapeWorkflowCommand(
        `${item.name}（${item.id}）の終了日発表有無を確認してください`
      )
    );
  }
}


const todayArgument =
  process.argv.find(
    argument =>
      argument.startsWith("--today=")
  );
const today =
  todayArgument
    ? todayArgument.slice("--today=".length)
    : getTodayInJapan();

if (
  !isValidDateString(today)
) {
  throw new Error(
    `--today は YYYY-MM-DD 形式で指定してください: ${today}`
  );
}

const officialSpots =
  JSON.parse(
    await readFile(
      officialSpotsUrl,
      "utf8"
    )
  );
const limitedSpots =
  officialSpots.filter(
    spot =>
      spot.periodType === "limited"
  );
const archiveCandidates =
  limitedSpots
    .filter(
      spot =>
        spot.endDate &&
        spot.endDate < today
    )
    .sort(sortByEndDate)
    .map(
      spot =>
        toReportItem(
          spot,
          today
        )
    );
const endingSoon =
  limitedSpots
    .filter(
      spot => {
        if (
          !spot.endDate ||
          spot.endDate < today
        ) {
          return false;
        }

        const remainingDays =
          getDaysBetween(
            today,
            spot.endDate
          );

        return (
          remainingDays <=
          endingSoonDays
        );
      }
    )
    .sort(sortByEndDate)
    .map(
      spot =>
        toReportItem(
          spot,
          today
        )
    );
const openEndedLimited =
  limitedSpots
    .filter(
      spot =>
        !spot.endDate
    )
    .sort(
      (first, second) =>
        first.name.localeCompare(
          second.name,
          "ja"
        )
    )
    .map(
      spot =>
        toReportItem(
          spot,
          today
        )
    );
const report = {
  generatedAt:
    new Date().toISOString(),
  today,
  archiveCandidates,
  endingSoon,
  openEndedLimited
};


if (
  process.argv.includes("--json")
) {
  console.log(
    JSON.stringify(
      report,
      null,
      2
    )
  );
} else {
  console.log(
    "ちい活マップ 公式スポット状況確認"
  );
  console.log(
    "基準日（日本時間）: " +
    today
  );
  printItems(
    "アーカイブ移動候補（終了日経過）",
    archiveCandidates
  );
  printItems(
    `終了間近（${endingSoonDays}日以内）`,
    endingSoon
  );
  printItems(
    "終了日未定の期間限定スポット",
    openEndedLimited
  );
  console.log(
    "\nこのレポートは候補抽出のみです。公式情報を確認してからJSONを更新してください。"
  );
}

if (
  process.argv.includes(
    "--github-summary"
  )
) {
  const summaryPath =
    process.env.GITHUB_STEP_SUMMARY;

  if (!summaryPath) {
    throw new Error(
      "--github-summary には GITHUB_STEP_SUMMARY 環境変数が必要です"
    );
  }

  await appendFile(
    summaryPath,
    createGithubSummary(report),
    "utf8"
  );
  emitGithubAnnotations(report);
}

if (
  process.argv.includes(
    "--fail-on-archive-candidates"
  ) &&
  archiveCandidates.length > 0
) {
  console.error(
    `\nアーカイブ移動候補が${archiveCandidates.length}件あります。公式情報を確認し、現在JSONと過去JSONを更新してください。`
  );
  process.exitCode = 1;
}
