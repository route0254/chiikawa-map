import { test, expect } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";

const current = JSON.parse(await readFile(new URL("../data/official-spots.json", import.meta.url), "utf8"));
const archive = JSON.parse(await readFile(new URL("../data/official-events-archive.json", import.meta.url), "utf8"));
const id = "popup-2026-10-16-fukuoka-mitsukoshi";
const fukuoka = current.find(spot => spot.id === id);
const pastCount = archive.filter(spot => spot.brand === "chiikawa_sushi").length;
const future = { ...fukuoka, id: "test-upcoming-sushi", name: "開催予定の寿司シリーズ", brand: "chiikawa_sushi",
  address: "京都府京都市", description: "開催予定の寿司シリーズを検証するテスト会場です。",
  startDate: "2026-11-04", endDate: "2026-11-17" };
delete future.additionalBrands;
const kura = { ...fukuoka, id: "test-kura-sushi", name: "くら寿司×ちいかわ", brand: "chiikawa" };
delete kura.additionalBrands;

async function prepare(page, zero = false) {
  await page.clock.setFixedTime(new Date("2026-11-03T01:00:00Z"));
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const [url, file, contentType] of [
    ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "leaflet/dist/leaflet.js", "text/javascript"],
    ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "leaflet/dist/leaflet.css", "text/css"],
    ["https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js", "leaflet.markercluster/dist/leaflet.markercluster.js", "text/javascript"],
    ["https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/MarkerCluster.css", "leaflet.markercluster/dist/MarkerCluster.css", "text/css"]
  ]) await page.route(url, async route => route.fulfill({ body: await readFile(new URL("../node_modules/" + file, import.meta.url)), contentType }));
  await page.route(/tile.openstreetmap.org|tiles.stadiamaps.com/, route => route.fulfill({
    contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64")
  }));
  await page.route("**/data/official-spots.json", route => route.fulfill({
    contentType: "application/json", body: JSON.stringify([...current.filter(spot => !zero || spot.id !== id), ...(zero ? [] : [future]), kura])
  }));
  return errors;
}

async function history(page, checked) {
  await page.keyboard.press("Escape");
  await page.locator("#map-view-button").click();
  await page.locator("#filter-toggle").click();
  const input = page.locator("#filter-ended");
  if (await input.isChecked() !== checked) await page.locator(".filter-chip-archive").click();
  if (checked) await expect(input).toBeChecked();
  else await expect(input).not.toBeChecked();
  await page.keyboard.press("Escape");
  await page.locator("#spot-search").press("Escape");
  await expect(page.locator("#spot-search-suggestions")).toBeHidden();
  await page.locator("#list-view-button").click();
}
async function select(page, selector, value, toggle) {
  if (!await page.locator(selector).isVisible()) await page.locator(toggle).click();
  await page.locator(selector).selectOption(value);
}
async function shot(page, name, width) {
  const output = process.env.CHIIKATSU_SUSHI_QA_DIR;
  if (output) { await mkdir(output, { recursive: true }); await page.screenshot({ path: path.join(output, name + "-" + width + ".png"), fullPage: true }); }
}

for (const width of [390, 1440]) {
  test("sushi joins current, upcoming and history without duplicating the cohosted popup (" + width + "px)", async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = await prepare(page);
    expect(fukuoka.brand).toBe("chiikawa");
    expect(fukuoka.additionalBrands).toEqual(["chiikawa_sushi"]);
    await page.goto("/?brand=chiikawa_sushi&view=list");
    const sushi = page.locator('input[name="filter-brand"][value="chiikawa_sushi"]');
    await expect(sushi).toHaveCount(1);
    await expect(sushi).toBeChecked();
    await expect(page.locator(".spot-list-card")).toHaveCount(2);
    await expect(page.locator('.spot-list-card[data-spot-id="' + id + '"]')).toHaveCount(1);
    await expect(page.locator('.spot-list-card[data-spot-id="test-upcoming-sushi"]')).toHaveCount(1);
    await expect(page.locator('.spot-list-card[data-spot-id="test-kura-sushi"]')).toHaveCount(0);
    await shot(page, "current-and-upcoming", width);
    await page.locator("#spot-search").fill("福岡");
    await expect(page.locator(".spot-list-card")).toHaveCount(1);
    await page.reload();
    await expect(page.locator("#spot-search")).toHaveValue("福岡");
    await expect(page.locator(".spot-list-card")).toHaveCount(1);
    await expect(sushi).toBeChecked();
    await page.locator("#spot-search").fill("");
    await history(page, true);
    await expect(page.locator(".spot-list-card")).toHaveCount(pastCount + 2);
    await expect(sushi).toBeChecked();
    await expect(page.locator('.spot-list-card[data-spot-id="test-kura-sushi"]')).toHaveCount(0);
    await history(page, false);
    await expect(page.locator(".spot-list-card")).toHaveCount(2);
    await page.goto("/?brand=chiikawa&view=list&q=福岡");
    await expect(page.locator('.spot-list-card[data-spot-id="' + id + '"]')).toHaveCount(1);

    await page.goto("/official.html");
    await select(page, "#current-brand", "chiikawa_sushi", "#current-filter-toggle");
    await expect(page.locator("#current-result-summary")).toHaveText("2件を表示しています。");
    await page.locator("#current-search").fill("福岡");
    await expect(page.getByRole("heading", { name: fukuoka.name, exact: true })).toBeVisible();
    await expect(page.locator("#current-result-summary")).toHaveText("1件を表示しています。");
    await select(page, "#current-brand", "chiikawa", "#current-filter-toggle");
    await expect(page.getByRole("heading", { name: fukuoka.name, exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("zero current sushi venues keep the filter and history searchable (" + width + "px)", async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = await prepare(page, true);
    await page.goto("/?brand=chiikawa_sushi&view=list");
    const sushi = page.locator('input[name="filter-brand"][value="chiikawa_sushi"]');
    await expect(sushi).toHaveCount(1);
    await expect(sushi).toBeChecked();
    await expect(sushi).toBeEnabled();
    await expect(page.locator(".spot-list-card")).toHaveCount(0);
    await history(page, true);
    await expect(page.locator(".spot-list-card")).toHaveCount(pastCount);
    await page.locator("#spot-search").fill("横浜");
    await expect(page.locator(".spot-list-card")).toHaveCount(2);
    for (const historicalId of ["chiikawa-sushi-2024-09-06-chiikawaland-yokohama", "chiikawa-sushi-2026-10-22-yokohama-skybuilding"]) {
      await expect(page.locator('.spot-list-card[data-spot-id="' + historicalId + '"]')).toHaveCount(1);
    }
    await shot(page, "past-search", width);
    await history(page, false);
    await expect(page.locator(".spot-list-card")).toHaveCount(0);
    await expect(sushi).toBeChecked();
    await expect(sushi).toBeEnabled();
    await page.goto("/official.html");
    await select(page, "#current-brand", "chiikawa_sushi", "#current-filter-toggle");
    await expect(page.locator("#current-result-summary")).toHaveText("0件を表示しています。");
    await page.goto("/official.html?view=past&brand=chiikawa_sushi");
    await expect(page.locator("#past-result-summary")).toHaveText(pastCount + "件を表示しています。");
    if (!await page.locator("#past-search").isVisible()) await page.locator("#past-filter-toggle").click();
    await page.locator("#past-search").fill("横浜");
    await expect(page.locator("#past-result-summary")).toHaveText("2件を表示しています。");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(errors).toEqual([]);
  });
}
