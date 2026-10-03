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

for (const width of [390, 1180, 1440]) {
  test(`explorer panels share a flow slot and dismiss without losing a tap (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1180 ? 757 : 844 });
    await page.goto('/?q=町田&pref=東京都&view=list');
    await expect(page.locator('#result-count')).toHaveText('2件表示');
    const dates = page.locator('.explorer-dates > summary');
    const datePanel = page.locator('#explorer-date-panel');
    const filter = page.locator('#filter-panel');
    const summary = page.locator('#active-filter-summary');
    await dates.focus();await page.keyboard.press('Enter');
    await expect(datePanel).toBeVisible();
    await expect(dates).toHaveAttribute('aria-expanded', 'true');
    await page.locator('.date-discovery-help > summary').click();
    await expect(datePanel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.date-discovery-help')).not.toHaveAttribute('open', '');
    await expect(datePanel).toBeVisible();
    await page.locator('#filter-toggle').click();
    await expect(filter).toBeVisible();
    await expect(datePanel).toBeHidden();
    await expect(dates).toHaveAttribute('aria-expanded', 'false');
    await expect(filter).toHaveAttribute('role', 'region');
    const panelBounds = await filter.boundingBox();
    const summaryBounds = await summary.boundingBox();
    expect(summaryBounds.y).toBeGreaterThanOrEqual(panelBounds.y + panelBounds.height - 1);
    // A single real click must both apply reset and dismiss the flow panel.
    await page.locator('#active-filter-reset').click();
    await expect(page.locator('#spot-search')).toHaveValue('');
    await expect(page.locator('#prefecture-filter')).toHaveValue('');
    await expect(filter).toBeHidden();
    await expect(summary).toBeHidden();
    await page.locator('#spot-search').fill('町田');
    await page.locator('#prefecture-filter').selectOption('東京都');
    await page.locator('#filter-toggle').click();
    await dates.click();
    await expect(filter).toBeHidden();
    await expect(datePanel).toBeVisible();
    await page.locator('#map-view-button').click();
    await expect(filter).toBeHidden();await expect(datePanel).toBeHidden();
    expect(new URL(page.url()).searchParams.has('view')).toBe(false);
    await page.locator('#filter-toggle').click();
    await page.locator('#list-view-button').click();
    await expect(filter).toBeHidden();
    expect(new URL(page.url()).searchParams.get('view')).toBe('list');
    await expect(page.locator('#spot-search')).toHaveValue('町田');
    await expect(page.locator('#prefecture-filter')).toHaveValue('東京都');
    await dates.click();await page.locator('.spot-list-header h2').click();
    await expect(datePanel).toBeHidden();
    await page.locator('#filter-toggle').click();await page.keyboard.press('Escape');
    await expect(filter).toBeHidden();await expect(page.locator('#filter-toggle')).toBeFocused();
    await dates.click();await page.setViewportSize({ width: width + 1, height: 850 });
    await expect(datePanel).toBeHidden();
    await page.reload();
    await expect(page.locator('#result-count')).toHaveText('2件表示');
    await expect(page.locator('#spot-search')).toHaveValue('町田');
    await expect(page.locator('#list-view-button')).toHaveAttribute('aria-pressed', 'true');
  });

  test(`list detail closes back to its mode, conditions, focus, and scroll (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1180 ? 757 : 844 });
    await page.goto('/?q=原宿&pref=東京都&view=list');
    const card = page.locator('.spot-list-card[data-spot-id="chiikawaland-harajuku"]');
    const open = card.locator('.spot-list-open-button');
    await expect(card).toBeVisible();
    await open.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => ({ page: scrollY, list: spotListPanel.scrollTop }));
    await open.click();
    await expect(page.locator('#spot-detail-panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#spot-detail-panel')).toBeHidden();
    await expect(page.locator('#list-view-button')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#spot-search')).toHaveValue('原宿');
    await expect(page.locator('#prefecture-filter')).toHaveValue('東京都');
    await expect(open).toBeFocused();
    expect(new URL(page.url()).searchParams.get('view')).toBe('list');
    await expect.poll(() => page.evaluate(() => spotListPanel.scrollTop)).toBe(before.list);
    if (width < 900) await expect.poll(() => page.evaluate(() => scrollY)).toBe(before.page);
    await open.click();await expect(page.locator('#spot-detail-panel')).toBeVisible();
    if (width < 900) await page.goBack();else await page.locator('#detail-close').click();
    await expect(page.locator('#spot-detail-panel')).toBeHidden();
    await expect(page.locator('#list-view-button')).toHaveAttribute('aria-pressed', 'true');
    await expect(open).toBeFocused();
    if (width < 900) {
      await page.goForward();
      await expect(page.locator('#map-view-button')).toHaveAttribute('aria-pressed', 'true');
      expect(new URL(page.url()).searchParams.has('view')).toBe(false);
      await expect(page.locator('#spot-detail-panel')).toBeHidden();
      await page.goBack();
      await expect(page.locator('#list-view-button')).toHaveAttribute('aria-pressed', 'true');
    }
    await page.reload();
    await expect(page.locator('#spot-search')).toHaveValue('原宿');
    await expect(page.locator('#list-view-button')).toHaveAttribute('aria-pressed', 'true');
  });
}

for (const width of [390, 1180]) {
  test(`list to map retains its geographic center and a usable marker after zoom (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1180 ? 757 : 844 });
    await page.goto('/?q=町田&view=list&recent=1');
    await expect(page.locator('#result-count')).toHaveText('1件表示');
    await expect.poll(() => page.evaluate(() => map.getCenter().distanceTo([
      lastFilteredRecords[0].spot.lat, lastFilteredRecords[0].spot.lng
    ]))).toBeLessThan(1);
    const expectCenteredMarker = async () => {
      await expect.poll(() => page.evaluate(() => {
        const size = map.getSize();
        const rect = document.getElementById('map').getBoundingClientRect();
        return size.x > 0 && size.y > 0 && size.x === rect.width && size.y === rect.height;
      })).toBe(true);
      await expect.poll(() => page.evaluate(() => {
        const spot = lastFilteredRecords[0].spot;
        const point = map.latLngToContainerPoint([spot.lat, spot.lng]);
        return point.distanceTo(map.getSize().divideBy(2));
      })).toBeLessThan(2);
      const marker = page.locator('.spot-marker');
      await expect(marker).toHaveCount(1);
      const pin = await marker.boundingBox();
      const canvas = await page.locator('#map').boundingBox();
      expect(pin.x + pin.width / 2).toBeGreaterThan(canvas.x + 16);
      expect(pin.x + pin.width / 2).toBeLessThan(canvas.x + canvas.width - 16);
      expect(pin.y + pin.height / 2).toBeGreaterThan(canvas.y + 16);
      expect(pin.y + pin.height / 2).toBeLessThan(canvas.y + canvas.height - 16);
    };
    await page.locator('#map-view-button').click();
    await expectCenteredMarker();
    const zoom = await page.evaluate(() => map.getZoom());
    await page.locator('.leaflet-control-zoom-in').click();
    await expect.poll(() => page.evaluate(() => map.getZoom())).toBe(zoom + 1);
    await expectCenteredMarker();
    await page.locator('#list-view-button').click();
    await page.locator('#map-view-button').click();
    await expectCenteredMarker();
    expect(await page.evaluate(() => map.getZoom())).toBe(zoom + 1);
    await page.reload();
    await expect(page.locator('#result-count')).toHaveText('1件表示');
    await expectCenteredMarker();
    await page.locator('.spot-marker').click();
    if (width < 900) {
      await expect(page.locator('#spot-preview')).toBeVisible();
      await page.locator('.preview-open').click();
    }
    await expect(page.locator('#spot-detail-panel')).toBeVisible();
    await expect(page.locator('#spot-detail-title')).toContainText('町田');
    await page.locator('#detail-close').click();
    await expect(page.locator('#spot-detail-panel')).toBeHidden();
    await expect(page.locator('#map-view-button')).toHaveAttribute('aria-pressed', 'true');
    await expectCenteredMarker();
  });

  for (const method of ['pointer', 'keyboard']) {
    test(`a ${method} search selection from list opens visible detail and returns to list (${width}px)`, async ({ page }) => {
      const query = method === 'pointer' ? '常滑' : '原宿';
      const prefecture = method === 'pointer' ? '愛知県' : '東京都';
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: width === 1180 ? 757 : 844 });
      await page.goto(`/?view=list&pref=${encodeURIComponent(prefecture)}`);
      await expect(page.locator('.spot-list-card').first()).toBeVisible();
      const search = page.locator('#spot-search');
      await search.fill(query);
      const suggestion = page.locator('.search-suggestion').first();
      await expect(suggestion).toBeVisible();
      const selectedName = await suggestion.locator('.search-suggestion-name').textContent();
      if (method === 'pointer') await suggestion.click();
      else { await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter'); }
      const detail = page.locator('#spot-detail-panel');
      await expect(detail).toBeVisible();
      await expect(detail).toBeFocused();
      await expect(page.locator('#spot-detail-title')).toHaveText(selectedName);
      await expect(page.locator('#map-content')).toBeVisible();
      await expect(page.locator('#map-view-button')).toHaveAttribute('aria-pressed', 'true');
      expect(new URL(page.url()).searchParams.has('view')).toBe(false);
      if (method === 'pointer') await page.locator('#detail-close').click();
      else await page.keyboard.press('Escape');
      await expect(detail).toBeHidden();
      await expect(page.locator('#list-view-button')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#map-content')).toBeHidden();
      await expect(search).toBeFocused();
      await expect(search).toHaveValue(selectedName);
      await expect(page.locator('#prefecture-filter')).toHaveValue(prefecture);
      expect(await page.locator('.explorer-sidebar').evaluate(el => el.inert)).toBe(false);
      expect(new URL(page.url()).searchParams.get('view')).toBe('list');
      expect(new URL(page.url()).searchParams.get('q')).toBe(selectedName);
      await page.reload();
      await expect(page.locator('.spot-list-card').first()).toBeVisible();
      await expect(page.locator('#list-view-button')).toHaveAttribute('aria-pressed', 'true');
      await expect(search).toHaveValue(selectedName);
      await expect(page.locator('#prefecture-filter')).toHaveValue(prefecture);
      expect(errors).toEqual([]);
    });
  }
}

test('recent entry points toggle the same AND condition through rapid switches and reload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?q=町田&pref=東京都&view=list');
  await expect(page.locator('#result-count')).toHaveText('2件表示');
  for (const selector of ['#recent-additions [data-recent-filter]', '.explorer-discovery [data-recent-filter]']) {
    for (const enabled of [true, false, true, false]) {
      await page.locator(selector).click();
      await expect(page.locator('#result-count')).toHaveText(enabled ? '1件表示' : '2件表示');
      for (const button of await page.locator('[data-recent-filter]').all()) await expect(button).toHaveAttribute('aria-pressed', String(enabled));
      expect(new URL(page.url()).searchParams.has('recent')).toBe(enabled);
      await expect(page.locator('#spot-search')).toHaveValue('町田');
      await expect(page.locator('#prefecture-filter')).toHaveValue('東京都');
    }
  }
  await page.locator('#map-view-button').click();
  expect(new URL(page.url()).searchParams.has('view')).toBe(false);
  await page.reload();await expect(page.locator('#result-count')).toHaveText('2件表示');
  await expect(page.locator('#map-view-button')).toHaveAttribute('aria-pressed', 'true');
});

test('a long combined query is serialized without recent and restored after reload and navigation', async ({ page }) => {
  const query = 'ちいかわPOP UP STORE 中部国際空港 第1ターミナル';
  await page.goto('/?view=list&tileTest=primary-fail');
  await expect(page.locator('.spot-list-card').first()).toBeVisible();
  await page.locator('#spot-search').fill(query);
  await page.locator('#prefecture-filter').selectOption('愛知県');
  await expect(page.locator('#result-count')).toHaveText('1件表示');
  expect(new URL(page.url()).searchParams.get('q')).toBe(query);
  expect(new URL(page.url()).searchParams.get('tileTest')).toBe('primary-fail');
  await page.reload();await expect(page.locator('#result-count')).toHaveText('1件表示');
  await expect(page.locator('#spot-search')).toHaveValue(query);
  await page.locator('.site-nav-link[href="official.html"]').click();await page.goBack();
  await expect(page.locator('#spot-search')).toHaveValue(query);
  await expect(page.locator('#list-view-button')).toHaveAttribute('aria-pressed', 'true');
});

test('mobile list scrolls controls away and keeps compact conditions usable in a short viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('/?q=町田&view=list&recent=1');
  await expect(page.locator('#result-count')).toHaveText('1件表示');
  expect((await page.locator('#active-filter-summary').boundingBox()).height).toBeLessThan(90);
  expect(await page.locator('#spot-list-panel').evaluate(el => getComputedStyle(el).overflowY)).toBe('visible');
  await page.locator('#recent-filter-clear').click();
  await expect(page.locator('#result-count')).toHaveText('2件表示');
  await page.locator('#active-filter-reset').click();
  await expect(page.locator('.spot-list-card')).not.toHaveCount(2);
  await page.locator('.spot-list-card').nth(5).scrollIntoViewIfNeeded();
  expect(await page.locator('.map-search-bar').evaluate(el => el.getBoundingClientRect().bottom)).toBeLessThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('search Escape preserves the query and suggestions remain selectable by pointer and keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();
  const search=page.locator('#spot-search');
  const suggestions=page.locator('#spot-search-suggestions');
  await search.fill('町田');await expect(suggestions).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(search).toHaveValue('町田');await expect(suggestions).toBeHidden();
  await page.locator('#prefecture-filter').selectOption('東京都');
  await expect(suggestions).toBeHidden();
  await search.fill('原宿');await expect(suggestions).toBeVisible();
  await suggestions.locator('.search-suggestion').first().click();
  await expect(page.locator('#spot-detail-panel')).toBeVisible();
  await page.locator('#detail-close').click();
  await search.fill('町田');await expect(suggestions).toBeVisible();
  const selectedName=await suggestions.locator('.search-suggestion-name').first().textContent();
  await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  await expect(page.locator('#spot-detail-panel')).toBeVisible();
  await expect(search).toHaveValue(selectedName);
});

test('journal data arriving after a tab click keeps the selected saved plan and URL', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('chiikawa-map-plan-v1', JSON.stringify(['chiikawaland-harajuku'])));
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await page.route('**/data/*.json', async route => { await pending;await route.continue(); });
  await page.goto('/journal.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#plan-tab').click();
  await expect(page.locator('#plan-tab')).toHaveAttribute('aria-selected', 'true');
  expect(new URL(page.url()).searchParams.get('view')).toBe('plan');
  release();
  await expect(page.locator('.plan-stop')).toContainText('原宿');
  await expect(page.locator('#plan-tab')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-journal-panel="calendar"]')).toBeHidden();
  await page.goBack();await expect(page.locator('#calendar-tab')).toHaveAttribute('aria-selected', 'true');
  await page.goForward();await expect(page.locator('#plan-tab')).toHaveAttribute('aria-selected', 'true');
});
