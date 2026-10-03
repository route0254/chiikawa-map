import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

// Listing dates are checked in the site's Japan calendar, including on UTC CI runners.
test.use({ timezoneId: "Asia/Tokyo" });

test.beforeEach(async ({ page }) => {
  // Same local CDN substitutions used by the existing smoke suite.
  for (const [url, file, contentType] of [
    ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "leaflet/dist/leaflet.js", "text/javascript"],
    ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "leaflet/dist/leaflet.css", "text/css"],
    ["https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js", "leaflet.markercluster/dist/leaflet.markercluster.js", "text/javascript"],
    ["https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/MarkerCluster.css", "leaflet.markercluster/dist/MarkerCluster.css", "text/css"]
  ]) await page.route(url, async route => route.fulfill({ body: await readFile(new URL(`../node_modules/${file}`, import.meta.url)), contentType }));
  for (const pattern of ["https://tile.openstreetmap.org/**", "https://tiles.stadiamaps.com/**"]) {
    await page.route(pattern, route => route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") }));
  }
});

test("recent additions stay compact on mobile and desktop and link to existing detail pages", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-01T03:00:00Z"));
  await page.goto("/");
  const links = page.locator("#recent-additions-list a");
  await expect(links).toHaveCount(6);
  await expect(page.locator("#recent-additions-list .new-badge")).toHaveCount(6);
  await expect(links.first()).toContainText("2026/10/01 追加");
  for (const [name, width, height] of [["mobile", 390, 844], ["desktop", 1440, 1000]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect((await page.locator("#recent-additions").boundingBox()).height).toBeLessThan(210);
    await page.screenshot({ path: `test-results/recent-${name}.png`, fullPage: true });
  }
  await page.locator(".recent-additions-details summary").click();
  await links.first().click();
  await expect(page).toHaveURL(/\/spot\//);
  await expect(page.getByRole("heading", { name: "ナガノマーケット POP UP SHOP 横浜スカイビル", exact: true })).toBeVisible();
  await page.goto("/?spot=popup-2026-10-09-machida-modi");
  await expect(page.locator(".spot-detail-title")).toContainText("町田モディ");
  await expect(page.locator(".spot-detail-title + .spot-added-date")).toContainText("2026/10/01 追加");
  await expect(page.locator(".spot-detail-title + .spot-added-date .new-badge")).toBeVisible();
});

test("expired or unavailable announcements do not block map and search", async ({ page }) => {
  const registry = JSON.parse(await readFile(new URL("../data/added-dates.json", import.meta.url), "utf8"));
  const latestAddition = Object.values(registry.firstAdded).filter(Boolean).sort().at(-1);
  const afterNewPeriod = new Date(`${latestAddition}T03:00:00Z`);
  afterNewPeriod.setUTCDate(afterNewPeriod.getUTCDate() + 14);
  await page.clock.setFixedTime(afterNewPeriod);
  await page.goto("/");
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();
  await expect(page.locator("#recent-additions")).toBeHidden();
  await page.route("**/data/added-dates.json", route => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.goto("/");
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();
  await expect(page.locator("#recent-additions")).toBeHidden();
  await page.locator("#spot-search").fill("町田");
  await expect(page.locator("#spot-search-suggestions")).toContainText("町田モディ");
});

for (const width of [390, 1440]) test(`recent filter preserves both display modes and combines with search (${width}px)`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.clock.setFixedTime(new Date("2026-10-03T03:00:00Z"));
  await page.goto("/");
  await expect(page.locator("#recent-additions-count")).toHaveText("13件");
  await page.locator("#recent-additions [data-recent-filter]").click();
  await expect(page.locator("#map-view-button")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#result-count")).toHaveText("13件表示");
  await expect(page.locator("#location-button")).toBeVisible();
  await page.locator("#list-view-button").click();
  await expect(page.locator("#location-button")).toBeHidden();
  await expect(page.locator("#filter-toggle")).toBeVisible();
  await page.locator("#filter-toggle").click();
  await expect(page.locator("#filter-panel")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator("#spot-search").fill("町田");
  await expect(page.locator("#result-count")).toHaveText("1件表示");
  await page.locator(".explorer-discovery [data-recent-filter]").click();
  await expect(page.locator("#list-view-button")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".recent-additions-details")).not.toHaveAttribute("open", "");
  await page.reload();
  await expect(page.locator("#spot-search")).toHaveValue("町田");
  await expect(page.locator("#list-view-button")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#result-count")).toHaveText("1件表示");
  await page.locator("#spot-search").fill("存在しない新着検索");
  await expect(page.locator("#result-count")).toHaveText("0件表示");
  await page.locator("#recent-filter-clear").click();
  await expect(page.locator("#spot-search")).toHaveValue("存在しない新着検索");
  await expect(page.locator("#recent-filter-clear")).toBeHidden();
  await page.locator("#no-results-reset").click();
  await expect(page.locator("#spot-search")).toHaveValue("");
  await expect(page.locator("#list-view-button")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#spot-search").fill("町田");
  await page.locator(".explorer-discovery [data-recent-filter]").click();
  await page.locator('.site-nav a[href="official.html"]').click();
  await page.locator('.site-nav a[href="./"]').click();
  await expect(page.locator("#spot-search")).toHaveValue("町田");
  await expect(page.locator("#result-count")).toHaveText("1件表示");
  await expect(page.locator("#recent-filter-clear")).toBeVisible();
  await expect(page.locator("#list-view-button")).toHaveAttribute("aria-pressed", "true");
});

test("official and collaboration pages filter their own additions, retain dates, and clear independently", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-03T03:00:00Z"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/official.html");
  await expect(page.locator("#official-recent [data-catalog-recent]")).toHaveText("新着 13件");
  await page.locator("#official-recent [data-catalog-recent]").click();
  await expect(page.locator("#current-groups .official-spot-card")).toHaveCount(13);
  await expect(page.locator("#current-groups .spot-added-date .new-badge")).toHaveCount(13);
  await page.locator("#current-search").fill("町田");
  await expect(page.locator("#current-groups .official-spot-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator("#current-search")).toHaveValue("町田");
  await expect(page.locator("#official-recent [data-catalog-recent]")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#official-recent [data-catalog-recent-clear]").click();
  await expect(page.locator("#current-search")).toHaveValue("町田");
  await page.locator("#current-filter-toggle").click();
  await page.locator("#current-filter-reset").click();
  await expect(page.locator("#current-search")).toHaveValue("");
  await page.goto("/collaborations.html");
  await expect(page.locator("#collaboration-recent [data-catalog-recent]")).toHaveText("新着 4件");
  const ana = page.locator('[data-record-id="ana-chiikawa-jet-2026"]');
  await expect(ana).toContainText("情報確認日2026/10/3");
  await expect(ana.locator(".spot-added-date")).toHaveCount(0);
  await page.locator("#collaboration-recent [data-catalog-recent]").click();
  await expect(page.locator('[data-groups="current"] .collaboration-card')).toHaveCount(4);
  await expect(page.locator('[data-groups="current"] .spot-added-date')).toHaveCount(4);
  await page.locator('[data-filter="search"][data-list="current"]').fill("オキシ");
  await expect(page.locator('[data-groups="current"] .collaboration-card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('[data-filter="search"][data-list="current"]')).toHaveValue("オキシ");
  await expect(page.locator('[data-groups="current"] .collaboration-card')).toHaveCount(1);
  await page.locator('[data-filter="search"][data-list="current"]').fill("存在しない新着検索");
  await expect(page.locator('[data-empty="current"]')).toBeVisible();
  await page.locator("#collaboration-recent [data-catalog-recent-clear]").click();
  await expect(page.locator('[data-filter="search"][data-list="current"]')).toHaveValue("存在しない新着検索");
  await page.locator('[data-reset="current"]').click();
  await expect(page.locator('[data-groups="current"] .collaboration-card')).toHaveCount(20);
});

test("no new dates remains a usable explicit empty filter on every page", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-20T03:00:00Z"));
  await page.goto("/?view=list&recent=1");
  await expect(page.locator("#result-count")).toHaveText("0件表示");
  await expect(page.locator("#recent-filter-clear")).toBeVisible();
  await page.locator("#no-results-reset").click();
  await expect(page.locator("#recent-filter-clear")).toBeHidden();
  for (const [url,id] of [["official.html", "official-recent"], ["collaborations.html", "collaboration-recent"]]) {
    await page.goto(`/${url}`);
    await expect(page.locator(`#${id} small`)).toHaveText("14日以内の追加はありません");
    await page.locator(`#${id} [data-catalog-recent]`).click();
    await expect(page.locator(`#${id} [data-catalog-recent-clear]`)).toBeVisible();
    await page.locator(`#${id} [data-catalog-recent-clear]`).click();
    await expect(page.locator(`#${id} [data-catalog-recent-clear]`)).toBeHidden();
  }
});


test("official new results show the first card title before the navigation on mobile and within the desktop viewport", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-03T03:00:00Z"));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto("/official.html?recent=1");
    await expect(page.locator("#current-groups .official-spot-card")).toHaveCount(13);
    await expect(page.locator("#current-active-filters")).toBeHidden();
    await expect(page.locator("#official-recent [data-catalog-recent]")).toHaveAttribute("aria-label", /絞り込み中/);
    await expect(page.locator("#official-recent [data-catalog-recent-clear]")).toBeVisible();
    await expect(page.locator("#official-recent small")).toBeHidden();
    await page.evaluate(() => document.fonts.ready);
    const position = await page.locator("#current-groups .official-spot-card h4").first().evaluate(el => {
      const rect = el.getBoundingClientRect();
      const navigation = document.querySelector(".site-nav").getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, limit: matchMedia("(max-width:899px)").matches ? navigation.top : innerHeight };
    });
    expect(position.top).toBeGreaterThanOrEqual(0);
    expect(position.bottom).toBeLessThan(position.limit - 8);
    await page.locator("#official-recent .recent-date-help summary").click();
    await expect(page.locator("#official-recent small")).toBeVisible();
    await expect(page.locator("#official-recent small")).toContainText("開催日・情報確認日とは別");
  }
});
