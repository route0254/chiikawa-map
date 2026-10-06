import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { reconcileNaganoEvent } from "../../scripts/lib/nagano-event-reconciliation.mjs";

const source = JSON.parse(await readFile(new URL("../../research/official-special-events-source.json", import.meta.url), "utf8"));
const events = source.series.flatMap(series => series.events);
const published = (await Promise.all(["official-spots.json", "official-events-archive.json"].map(async file =>
  JSON.parse(await readFile(new URL("../../data/" + file, import.meta.url), "utf8"))
))).flat();
const fukuoka = events.find(event => event.id === "nagano-market-popup-2026-10-16-fukuoka-mitsukoshi");
const yokohama = events.find(event => event.id === "nagano-market-popup-2026-10-09-yokohama-skybuilding");
function fetched(event, changes = {}) {
  const { id, name, startDate, endDate, venueName, address, sourceUrl } = event;
  return { id, name, startDate, endDate, venueName, address, sourceUrl, ...changes };
}

test("URL末尾から生成した福岡IDを既存IDへ名寄せし、階数・個別案内を保つ", () => {
  const result = reconcileNaganoEvent(fetched(fukuoka, { id: "nagano-market-popup-2026-10-16-fukuoka-mk", hoursText: undefined }), events, published);
  assert.equal(result.id, fukuoka.id);
  assert.equal(result.venueSpace, "9階 三越ギャラリー");
  assert.equal(result.entryNote, fukuoka.entryNote);
  assert.equal(result.hoursText, fukuoka.hoursText);
  assert.equal(result.checkedAt, fukuoka.checkedAt);
  assert.equal(result.lat, fukuoka.lat);
});

test("原本に未掲載の横浜も公開ID・詳細住所・入場区分を保持する", () => {
  const result = reconcileNaganoEvent(fetched(yokohama, { id: "nagano-market-popup-2026-10-09-yokohama", address: "神奈川県横浜市西区高島2-19-12 横浜スカイビル" }), events.filter(event => event.id !== yokohama.id), published);
  assert.equal(result.id, yokohama.id);
  assert.equal(result.address, yokohama.address);
  assert.equal(result.defaultEntryType, "other");
  assert.equal(result.checkedAt, yokohama.checkedAt);
});

test("5つの過去開催の階数・催場情報を短い一般住所で上書きしない", () => {
  for (const id of ["nagano-market-popup-2024-11-09-nogata", "nagano-market-popup-2024-09-19-musashimurayama", "nagano-market-popup-2024-08-08-shinkomatsu", "nagano-market-popup-2024-07-12-ikebukuro", "nagano-exhibition-2023-06-14-fukuoka"]) {
    const existing = events.find(event => event.id === id);
    const shorter = existing.address.replace(/\s(?:1F|本館[^\s]*).*$/, "");
    assert.notEqual(shorter, existing.address);
    assert.equal(reconcileNaganoEvent(fetched(existing, { address: shorter }), events, []).address, existing.address);
    assert.equal(reconcileNaganoEvent(fetched(existing, { address: "" }), events, []).address, existing.address);
  }
});

test("同じURLでも別の開始日は別開催とし、住所の実変更は検査へ残す", () => {
  const other = fetched(fukuoka, { id: "nagano-market-popup-2027-10-16-fukuoka-mk", startDate: "2027-10-16", endDate: "2027-11-03" });
  assert.equal(reconcileNaganoEvent(other, events, published).id, other.id);
  const moved = reconcileNaganoEvent(fetched(yokohama, { address: "神奈川県横浜市西区高島9-9-9 移転先" }), events, published);
  assert.equal(moved.id, yokohama.id);
  assert.equal(moved.address, "神奈川県横浜市西区高島9-9-9 移転先");
  assert.equal(moved.lat, undefined);
  const shortenedStreetNumber = "神奈川県横浜市西区高島2-19-1";
  assert.equal(reconcileNaganoEvent(fetched(yokohama, { address: shortenedStreetNumber }), events, published).address, shortenedStreetNumber);
});

test("複数IDに一致する開催や原本と公開IDの矛盾を勝手に解決しない", () => {
  const duplicate = { ...fukuoka, id: "nagano-market-popup-2026-10-16-another" };
  assert.throws(() => reconcileNaganoEvent(fetched(fukuoka), [fukuoka, duplicate], []), /照合が曖昧/);
  assert.throws(() => reconcileNaganoEvent(fetched(fukuoka), [fukuoka], [duplicate]), /IDが一致しません/);
});

async function fixtureProject(t) {
  const tempParent = path.resolve(os.tmpdir());
  const root = await mkdtemp(path.join(tempParent, "chiikatsu-nagano-import-"));
  const assertTempRoot = () => {
    assert.equal(path.dirname(path.resolve(root)), tempParent);
    assert.ok(path.basename(root).startsWith("chiikatsu-nagano-import-"));
  };
  assertTempRoot();
  t.after(async () => { assertTempRoot(); await rm(root, { recursive: true, force: true }); });
  for (const directory of ["scripts/lib", "research", "data"]) await mkdir(path.join(root, directory), { recursive: true });
  for (const file of ["scripts/import-nagano-official-series.mjs", "scripts/lib/nagano-event-reconciliation.mjs", "research/official-special-events-source.json", "data/official-spots.json", "data/official-events-archive.json"]) await cp(new URL("../../" + file, import.meta.url), path.join(root, file));
  const fixtureSource = path.join(root, "fixture-source.json");
  await writeFile(fixtureSource, JSON.stringify(source));
  const log = path.join(root, "requests.json");
  const run = (mode, change = "") => spawnSync(process.execPath, ["--import", new URL("../fixtures/nagano-official-lists.mjs", import.meta.url).href, path.join(root, "scripts/import-nagano-official-series.mjs"), mode], {
    cwd: root, encoding: "utf8", env: { ...process.env, NAGANO_FIXTURE_PATH: fixtureSource, NAGANO_FIXTURE_LOG: log, NAGANO_FIXTURE_CHANGE: change }, timeout: 30000
  });
  return { root, log, run };
}

test("取込CLIは掲載順・URL slug・住所省略が変わっても既存原本と一致する（外部通信なし）", async t => {
  const fixture = await fixtureProject(t);
  const result = fixture.run("--check");
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes(`POP UP SHOP: ${source.series.find(series => series.key === "nagano-market-popup").events.length}件`));
  assert.equal(JSON.parse(await readFile(fixture.log, "utf8")).geocodeRequests, 0);
  assert.deepEqual(JSON.parse(await readFile(path.join(fixture.root, "research/official-special-events-source.json"), "utf8")), source);
  const written = fixture.run("--write");
  assert.equal(written.status, 0, written.stderr);
  const generated = JSON.parse(await readFile(path.join(fixture.root, "research/official-special-events-source.json"), "utf8"));
  for (const existing of events.filter(event => /^nagano-(market-popup|aquarium|exhibition)-/.test(event.id))) {
    const current = generated.series.flatMap(series => series.events).find(event => event.id === existing.id);
    assert.ok(current, existing.id);
    assert.equal(current.address, existing.address, existing.id);
    if (existing.venueSpace) assert.equal(current.venueSpace, existing.venueSpace);
    if (existing.entryNote) assert.equal(current.entryNote, existing.entryNote);
  }
});

test("取込CLIは会期・住所の実変更と開催の欠落を差分として失敗させる（外部通信なし）", async t => {
  const fixture = await fixtureProject(t);
  for (const change of ["endDate", "address", "missing"]) {
    const result = fixture.run("--check", change);
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, /ナガノ公式一覧との差分があります: nagano-market-popup/);
  }
});
