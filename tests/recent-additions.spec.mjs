import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

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
