import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import recent from "../../recent-utils.js";

export const spotFiles = ["official-spots", "official-events-archive", "nagano-spots", "community-spots"];

export function registerAdditions(existing, spots, today) {
  const dates = { ...existing };
  for (const spot of spots) {
    if (!Object.hasOwn(dates, spot.id)) {
      // Historical imports must never turn into live NEW announcements.
      dates[spot.id] = spot.endDate && spot.endDate < today ? null : today;
    }
  }
  return dates;
}

export function registerCollaborations(existing, current, archive, today) {
  const dates = { ...existing };
  for (const record of [...archive, ...current]) {
    if (!Object.hasOwn(dates, record.id)) {
      dates[record.id] = archive.some(old => old.id === record.id) ||
        recent.isHistoricalCollaboration(record, today) ? null : today;
    }
  }
  return dates;
}

export async function syncAddedDates(root, writeMode) {
  const file = resolve(root, "data/added-dates.json");
  const registry = JSON.parse(await readFile(file, "utf8"));
  const today = recent.japanToday();
  if (registry.schemaVersion !== 1 || !registry.firstAdded ||
      typeof registry.firstAdded !== "object" || Array.isArray(registry.firstAdded)) {
    throw new Error("追加日管理ファイルのschemaが不正です");
  }
  if (!registry.collaborationFirstAdded || typeof registry.collaborationFirstAdded !== "object" ||
      Array.isArray(registry.collaborationFirstAdded)) throw new Error("コラボ追加日管理が不正です");
  for (const [id, date] of [registry.firstAdded, registry.collaborationFirstAdded].flatMap(Object.entries)) {
    if (date !== null && (!recent.validDate(date) || date > today)) {
      throw new Error(`追加日が不正です: ${id} ${date}`);
    }
  }
  const datasets = await Promise.all(spotFiles.map(async name =>
    JSON.parse(await readFile(resolve(root, `data/${name}.json`), "utf8"))));
  const next = registerAdditions(registry.firstAdded, datasets.flat(), today);
  const missing = Object.keys(next).filter(id => !Object.hasOwn(registry.firstAdded, id));
  const [current, archive] = await Promise.all(["current", "archive"].map(async kind =>
    JSON.parse(await readFile(resolve(root, `data/collaborations-${kind}.json`), "utf8"))));
  const collaborationNext = registerCollaborations(registry.collaborationFirstAdded, current, archive, today);
  const collaborationMissing = Object.keys(collaborationNext).filter(id => !Object.hasOwn(registry.collaborationFirstAdded, id));
  missing.push(...collaborationMissing);
  if (!missing.length) return;
  if (!writeMode) throw new Error(`追加日未登録: ${missing.join(", ")}。build:site-meta を実行してください`);
  registry.firstAdded = next;
  registry.collaborationFirstAdded = collaborationNext;
  await writeFile(file, JSON.stringify(registry, null, 2) + "\n");
  console.log(`追加日を記録しました: ${missing.length}件（既存の日付は保持）`);
}
