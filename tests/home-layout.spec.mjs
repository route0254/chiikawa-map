import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  for (const [url, file, contentType] of [
    ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "leaflet/dist/leaflet.js", "text/javascript"],
    ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "leaflet/dist/leaflet.css", "text/css"],
    ["https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js", "leaflet.markercluster/dist/leaflet.markercluster.js", "text/javascript"],
    ["https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/MarkerCluster.css", "leaflet.markercluster/dist/MarkerCluster.css", "text/css"]
  ]) await page.route(url, async route => route.fulfill({ body: await readFile(new URL(`../node_modules/${file}`, import.meta.url)), contentType }));
  await page.route(/tile.openstreetmap.org|tiles.stadiamaps.com/, route => route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") }));
});

test("mobile prioritises the chosen view and preserves search and prefecture across switches", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();
  expect((await page.locator("#map").boundingBox()).y).toBeLessThan(400);
  expect((await page.locator("#map").boundingBox()).height).toBeGreaterThanOrEqual(300);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.locator("#spot-search").fill("町田");
  await page.locator("#spot-search").blur();
  await page.locator("h1").click();
  await page.locator("#prefecture-filter").selectOption({ label: "東京都" });
  const count = await page.locator("#result-count").textContent();
  await page.locator("#list-view-button").click();
  await expect(page.locator("#map-content")).toBeHidden();
  expect(await page.locator("#map-content").evaluate(node => getComputedStyle(node).display)).toBe("none");
  await expect(page.locator(".spot-list-card").first()).toBeVisible();
  await expect(page.locator("#spot-list-panel")).toBeFocused();
  expect((await page.locator("#spot-list-panel").boundingBox()).y).toBeLessThan(30);
  await expect(page.locator("#list-view-button")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#map-view-button").click();
  await expect(page.locator("#spot-list-panel")).toBeHidden();
  await expect(page.locator("#map")).toBeFocused();
  await expect(page.locator("#spot-search")).toHaveValue("町田");
  await expect(page.locator("#prefecture-filter")).toHaveValue("東京都");
  await expect(page.locator("#result-count")).toHaveText(count);
});

test("visit facts precede optional detail actions and menus keep their original functions", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?spot=chiikawaland-harajuku");
  await expect(page.locator(".spot-detail-title")).toBeVisible();
  const actions = page.locator(".spot-detail-action-menu");
  await expect(actions).not.toHaveAttribute("open", "");
  const order = await page.evaluate(() => {
    const menu = document.querySelector(".spot-detail-action-menu");
    return [".spot-address", ".spot-period", ".spot-hours-card", ".spot-entry-card"].every(selector => {
      const fact = document.querySelector(`#spot-detail-body ${selector}`);
      return !fact || Boolean(fact.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });
  expect(order).toBe(true);
  await actions.locator("summary").click();
  await expect(page.locator(".spot-detail-actions .spot-visited-button")).toBeVisible();
  await page.locator("#detail-close").click();
  await page.locator(".map-tools-menu summary").click();
  await expect(page.locator("#saved-data-toggle")).toBeVisible();
  expect((await page.locator(".map-tools-menu summary").boundingBox()).height).toBeGreaterThanOrEqual(44);
  await page.locator("#filter-toggle").click();
  await expect(page.locator(".map-tools-menu")).not.toHaveAttribute("open", "");
  await expect(page.locator("#filter-close")).toBeVisible();
  await page.locator("#filter-close").click();
});

test("series selection explains all and partial states without resetting selections", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();
  await page.locator("#filter-toggle").click();
  await expect(page.locator("#brand-selection-status")).toHaveText("すべてのシリーズを表示（絞り込みなし）");
  const brands = page.locator('input[name="filter-brand"]');
  const total = await brands.count();
  await brands.first().locator("..").click();
  await expect(brands.first()).not.toBeChecked();
  await expect(page.locator("#brand-selection-status")).toHaveText(`${total}シリーズ中${total - 1}シリーズを表示`);
  await page.locator("#filter-toggle").click();
  await page.locator("#list-view-button").click();
  await page.locator("#map-view-button").click();
  await expect(brands.first()).not.toBeChecked();
  await page.locator("#filter-toggle").click();
  for (const brand of await brands.all()) {
    if (await brand.isChecked()) await brand.locator("..").click();
  }
  await expect(page.locator("#brand-selection-status")).toHaveText("シリーズが未選択のため、表示は0件です");
  await expect(page.locator("#result-count")).toHaveText("0件表示");
});

test("mobile detail appears before the map and its close action restores map view", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?spot=chiikawaland-harajuku");
  await expect(page.locator(".spot-detail-title")).toContainText("原宿");
  expect(await page.evaluate(() => document.querySelector("#spot-detail-panel").getBoundingClientRect().top < document.querySelector("#map").getBoundingClientRect().top)).toBe(true);
  await page.locator("#detail-close").click();
  await expect(page.locator("#spot-detail-panel")).toBeHidden();
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();
});
