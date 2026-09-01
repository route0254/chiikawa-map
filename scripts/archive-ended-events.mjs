import {
  readFile,
  writeFile
} from "node:fs/promises";
import {
  getArchiveCandidates,
  prepareArchiveMove
} from "./lib/archive-events.mjs";


const currentUrl = new URL(
  "../data/official-spots.json",
  import.meta.url
);
const archiveUrl = new URL(
  "../data/official-events-archive.json",
  import.meta.url
);
const specialSourceUrl = new URL(
  "../research/official-special-events-source.json",
  import.meta.url
);


function getTodayInJapan() {
  return new Intl.DateTimeFormat(
    "sv-SE",
    {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  ).format(new Date());
}


function getArgument(name) {
  const prefix = `--${name}=`;
  const argument = process.argv.find(
    value => value.startsWith(prefix)
  );

  return argument
    ? argument.slice(prefix.length)
    : "";
}


function getSpecialManagedIds(source) {
  return new Set(
    source.series.flatMap(series =>
      series.events.map(event => event.id)
    )
  );
}


function printRecords(records) {
  if (!records.length) {
    console.log("- 該当なし");
    return;
  }

  records.forEach(record => {
    console.log(
      `- ${record.endDate} | ${record.id} | ${record.name}`
    );
  });
}


const today =
  getArgument("today") ||
  getTodayInJapan();
const ids = getArgument("ids")
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);
const write =
  process.argv.includes("--write");
const confirmed =
  process.argv.includes(
    "--confirm-official"
  );
const [
  currentRecords,
  archiveRecords,
  specialSource
] = await Promise.all([
  readFile(currentUrl, "utf8")
    .then(JSON.parse),
  readFile(archiveUrl, "utf8")
    .then(JSON.parse),
  readFile(specialSourceUrl, "utf8")
    .then(JSON.parse)
]);

if (!ids.length) {
  const candidates =
    getArchiveCandidates(
      currentRecords,
      today
    );

  console.log(
    `基準日 ${today} のアーカイブ移動候補: ${candidates.length}件`
  );
  printRecords(candidates);
  console.log(
    "\n移動する場合: pnpm run archive:ended -- --today=YYYY-MM-DD --ids=id1,id2 --confirm-official --write"
  );
  process.exit(0);
}

const managedIds =
  getSpecialManagedIds(specialSource);
const selectedManagedIds = ids.filter(
  id => managedIds.has(id)
);

if (selectedManagedIds.length) {
  throw new Error(
    "特設ページ原本の管理対象は直接移動できません。" +
    "research/official-special-events-source.json の statusAsOf を更新し、" +
    "pnpm run import:special-events を実行してください: " +
    selectedManagedIds.join(", ")
  );
}

const result = prepareArchiveMove(
  currentRecords,
  archiveRecords,
  {
    ids,
    today
  }
);

console.log(
  `${write ? "移動" : "移動予定"}: ${result.moved.length}件`
);
printRecords(result.moved);

if (result.warnings.length) {
  console.log(
    "\n移動後に文言確認が必要です:"
  );
  result.warnings.forEach(warning => {
    console.log(
      `- ${warning.id} | ${warning.field} | 「${warning.pattern}」`
    );
  });
}

if (!write) {
  console.log(
    "\nプレビューのみです。公式情報を確認後、--confirm-official --write を追加してください。"
  );
  process.exit(0);
}

if (!confirmed) {
  throw new Error(
    "書き込みには公式情報の確認後、--confirm-official が必要です"
  );
}

await Promise.all([
  writeFile(
    currentUrl,
    JSON.stringify(
      result.current,
      null,
      2
    ) + "\n",
    "utf8"
  ),
  writeFile(
    archiveUrl,
    JSON.stringify(
      result.archive,
      null,
      2
    ) + "\n",
    "utf8"
  )
]);

console.log(
  "\nJSONを更新しました。文言確認後、pnpm run build:spot-pages と pnpm run check を実行してください。"
);
