import {
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


function toReportItem(spot) {
  return {
    id: spot.id,
    name: spot.name,
    startDate: spot.startDate,
    endDate: spot.endDate,
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
        " | " +
        item.id +
        " | " +
        item.name
      );
    }
  );
}


const today =
  getTodayInJapan();
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
    .map(toReportItem);
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
    .map(toReportItem);
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
    .map(toReportItem);
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
