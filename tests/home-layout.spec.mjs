import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.use({ timezoneId: 'Asia/Tokyo' });
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-03T03:00:00Z'));
  for (const [url, file, contentType] of [
    ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'leaflet/dist/leaflet.js', 'text/javascript'],
    ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'leaflet/dist/leaflet.css', 'text/css'],
    ['https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js', 'leaflet.markercluster/dist/leaflet.markercluster.js', 'text/javascript'],
    ['https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/MarkerCluster.css', 'leaflet.markercluster/dist/MarkerCluster.css', 'text/css']
  ]) await page.route(url, async route => route.fulfill({ body: await readFile(new URL(`../node_modules/${file}`, import.meta.url)), contentType }));
  await page.route(/tile.openstreetmap.org|tiles.stadiamaps.com/, route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64') }));
});


for (const width of [390, 1440]) test(`the original page layout keeps its normal navigation and lazy list (${width}px)`, async ({page}) => {
  await page.setViewportSize({width, height: 1000});await page.goto('/');
  await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();
  await expect(page.locator('body')).not.toHaveClass(/explorer/);
  await expect(page.locator('.explorer-sidebar, .site-menu, .map-tools-menu, .explorer-dates, .spot-preview')).toHaveCount(0);
  await expect(page.locator('.site-nav-link')).toHaveCount(6);
  await expect(page.locator('.date-discovery')).toBeVisible();
  await expect(page.locator('.spot-list-card')).toHaveCount(0);
  await page.locator('#list-view-button').click();await expect(page.locator('.spot-list-card').first()).toBeVisible();
  await expect(page.locator('#map-content')).toBeHidden();
  await page.locator('#map-view-button').click();await expect(page.locator('.spot-list-card')).toHaveCount(0);
  await expect(page.locator('#map-content')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
});

test('late cluster callbacks cannot reopen an older selection or an excluded record', async ({page}) => {
  await page.goto('/');await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();
  const audit = await page.evaluate(() => {
    const pending = [], original = spotLayer.zoomToShowLayer;
    spotLayer.zoomToShowLayer = (_marker, callback) => pending.push(callback);
    const first = spotRecords.find(record => record.spot.id === 'chiikawaland-solamachi');
    const second = spotRecords.find(record => record.spot.id === 'chiikawaland-harajuku');
    focusSpotRecord(first);focusSpotRecord(second);pending[1]();pending[0]();
    const latest = selectedRecord?.spot.id;
    focusSpotRecord(first);spotSearch.value = '存在しない候補zzzz';updateSpotFilters();pending[2]();
    spotLayer.zoomToShowLayer = original;
    return {latest, afterFilter: selectedRecord?.spot.id || null, hidden: detailPanel.hidden};
  });
  expect(audit).toEqual({latest: 'chiikawaland-harajuku', afterFilter: null, hidden: true});
});
