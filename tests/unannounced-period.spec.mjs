import { test, expect } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const id = 'chiikawa-vending-kitte-nagoya';
const spots = JSON.parse(await readFile(new URL('../data/official-spots.json', import.meta.url), 'utf8'));
const spot = spots.find(spot => spot.id === id);
const oldId = spots.find(spot => spot.periodType === 'permanent').id;

for (const width of [390, 1440]) {
  test(`unannounced installation keeps filters, Place data and saved IDs consistent (${width}px)`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.clock.install({ time: new Date() });
    const errors = [], checks = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(({ id, oldId }) => {
      if (localStorage.getItem('_periodSeed')) return;
      localStorage.setItem('chiikawa-map-favorites-v1', JSON.stringify([oldId, id]));
      localStorage.setItem('chiikawa-map-visited-v1', JSON.stringify([id]));
      localStorage.setItem('chiikawa-map-visit-details-v1', JSON.stringify({ [id]: { visitedAt: '2026-11-03', note: '保存互換確認' } }));
      localStorage.setItem('_periodSeed', '1');
    }, { id, oldId });
    for (const [url, file, contentType] of [
      ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'leaflet/dist/leaflet.js', 'text/javascript'],
      ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'leaflet/dist/leaflet.css', 'text/css'],
      ['https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js', 'leaflet.markercluster/dist/leaflet.markercluster.js', 'text/javascript'],
      ['https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/MarkerCluster.css', 'leaflet.markercluster/dist/MarkerCluster.css', 'text/css']
    ]) await page.route(url, async route => route.fulfill({ body: await readFile(new URL('../node_modules/' + file, import.meta.url)), contentType }));
    await page.route(/tile.openstreetmap.org|tiles.stadiamaps.com/, route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64') }));

    await page.goto('/?spot=' + id);
    await expect(page.locator('#spot-detail-panel')).toBeVisible();
    await expect(page.locator('#spot-detail-title')).toHaveText(spot.name);
    await expect(page.locator('#spot-detail-panel')).toContainText('設置期間未公表');
    await expect(page.locator('#spot-detail-panel .spot-favorite-button')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#spot-detail-panel .spot-visited-button')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('input[name="filter-period"][value="unannounced"]')).toBeChecked();
    checks.push('default_and_shared_detail', 'saved_buttons', 'new_filter_default');
    await page.reload();
    await expect(page.locator('#spot-detail-title')).toHaveText(spot.name);
    checks.push('shared_reload');

    for (const period of ['permanent', 'limited']) {
      await page.goto('/?period=' + period);
      await page.locator('#list-view-button').click();
      await expect(page.locator('.spot-list-card[data-spot-id="' + id + '"]')).toHaveCount(0);
      await expect(page.locator('.spot-list-card').first()).toBeVisible();
      checks.push('existing_' + period + '_filter');
    }
    await page.goto('/?period=unannounced');
    await page.locator('#list-view-button').click();
    await expect(page.locator('.spot-list-card')).toHaveCount(1);
    await expect(page.locator('.spot-list-card[data-spot-id="' + id + '"]')).toContainText('設置期間未公表');
    await expect(page.locator('.spot-list-card[data-spot-id="' + id + '"]')).not.toContainText('常設');
    checks.push('new_filter_only_new_record');

    await page.goto('/official.html');
    await expect(page.locator('#current-total-count')).toHaveText(String(spots.length));
    const selectCurrent = async (selector, value) => {
      if (!await page.locator(selector).isVisible()) await page.locator('#current-filter-toggle').click();
      await page.locator(selector).selectOption(value);
    };
    await selectCurrent('#current-kind', 'unannounced');
    await expect(page.locator('#current-result-summary')).toHaveText('1件を表示しています。');
    await expect(page.locator('#unannounced-count')).toHaveText('1');
    await expect(page.locator('#permanent-count')).toHaveText(String(spots.filter(spot => spot.periodType === 'permanent').length));
    await expect(page.getByRole('heading', { name: spot.name, exact: true })).toBeVisible();
    checks.push('directory_new_group_and_counts');
    await selectCurrent('#current-kind', 'permanent-shop');
    await expect(page.getByRole('heading', { name: spot.name, exact: true })).toHaveCount(0);
    checks.push('directory_existing_permanent_excludes_new');
    await selectCurrent('#current-kind', '');
    await selectCurrent('#current-status', 'unannounced');
    await expect(page.locator('#current-result-summary')).toHaveText('1件を表示しています。');
    checks.push('directory_new_status');

    await page.goto('/spot/' + id + '/');
    await expect(page.locator('body')).toContainText('設置期間未公表');
    await expect(page.locator('body')).toContainText('施設代表点');
    const json = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
    expect(json['@type']).toBe('Place');
    for (const key of ['startDate', 'endDate', 'eventStatus']) expect(json).not.toHaveProperty(key);
    checks.push('static_label_and_geo_precision', 'structured_place_without_event_dates');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const saved = await page.evaluate(() => Object.fromEntries(['chiikawa-map-favorites-v1', 'chiikawa-map-visited-v1', 'chiikawa-map-visit-details-v1'].map(key => [key, JSON.parse(localStorage.getItem(key))])));
    expect(saved['chiikawa-map-favorites-v1']).toEqual([oldId, id]);
    expect(saved['chiikawa-map-visited-v1']).toEqual([id]);
    expect(saved['chiikawa-map-visit-details-v1'][id]).toEqual({ visitedAt: '2026-11-03', note: '保存互換確認' });
    expect(errors).toEqual([]);
    checks.push('no_horizontal_overflow', 'saved_data_unchanged', 'no_page_errors');
    const output = process.env.CHIIKATSU_PERIOD_QA_DIR;
    if (output) {
      await mkdir(output, { recursive: true });
      await page.screenshot({ path: path.join(output, 'static-' + width + '.png'), fullPage: true });
      await page.goto('/?spot=' + id);
      await expect(page.locator('#spot-detail-panel')).toBeVisible();
      await page.locator('#spot-detail-panel').screenshot({ path: path.join(output, 'shared-' + width + '.png') });
      await writeFile(path.join(output, 'checks-' + width + '.json'), JSON.stringify({ width, checks, errors }, null, 2));
    }
  });
}
