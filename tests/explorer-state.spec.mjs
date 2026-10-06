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
  test(`original filter dialog closes on a mode change and keeps conditions (${width}px)`, async ({page}) => {
    await page.setViewportSize({width, height: 844});
    await page.goto('/?q=町田&pref=東京都&view=list');
    await expect(page.locator('#result-count')).toHaveText('2件表示');
    await page.locator('#filter-toggle').click();
    await expect(page.locator('#filter-panel')).toHaveAttribute('aria-modal', 'true');
    await page.keyboard.press('Escape');
    await expect(page.locator('#filter-toggle')).toBeFocused();
    await page.locator('#filter-toggle').click();
    await page.locator('#map-view-button').click();
    await expect(page.locator('#filter-panel')).toBeHidden();
    await expect(page.locator('#filter-toggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#spot-search')).toHaveValue('町田');
    await expect(page.locator('#prefecture-filter')).toHaveValue('東京都');
    expect(new URL(page.url()).searchParams.has('view')).toBe(false);
    await page.locator('#list-view-button').click();
    await expect(page.locator('.spot-list-card')).toHaveCount(2);
    await page.reload();
    await expect(page.locator('.spot-list-card')).toHaveCount(2);
    await expect(page.locator('#list-view-button')).toHaveAttribute('aria-pressed', 'true');
  });

  test(`original list detail restores its condition, focus and scroll (${width}px)`, async ({page}) => {
    await page.setViewportSize({width, height: 844});
    await page.goto('/?view=list&pref=東京都');
    await expect(page.locator('.spot-list-card').nth(8)).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const open = page.locator('.spot-list-card').nth(8).locator('.spot-list-open-button');
    const id = await open.evaluate(button => button.closest('article').dataset.spotId);
    await open.scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => ({page: scrollY, list: spotListPanel.scrollTop}));
    await open.click();
    await expect(page.locator('#spot-detail-panel')).toBeVisible();
    await expect(page.locator('#spot-detail-panel')).toBeFocused();
    await expect(page.locator('#map-content')).toBeVisible();
    await expect(page.locator('#detail-close')).toHaveAccessibleName('スポット詳細を閉じる');
    await page.locator('#detail-close').click();
    await expect(page.locator('#spot-detail-panel')).toBeHidden();
    await expect(page.locator('#list-view-button')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.spot-list-card[data-spot-id="' + id + '"] .spot-list-open-button')).toBeFocused();
    await expect(page.locator('#prefecture-filter')).toHaveValue('東京都');
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(scroll.page);
    expect(await page.locator('#spot-list-panel').evaluate(panel => panel.scrollTop)).toBe(scroll.list);
    expect(new URL(page.url()).searchParams.get('view')).toBe('list');
  });

  for (const method of ['pointer', 'keyboard']) {
    test(`a ${method} search from the original list opens visible detail and returns (${width}px)`, async ({page}) => {
      const query = method === 'pointer' ? '常滑' : '原宿';
      const prefecture = method === 'pointer' ? '愛知県' : '東京都';
      await page.setViewportSize({width, height: 844});
      await page.goto('/?view=list&pref=' + encodeURIComponent(prefecture));
      await expect(page.locator('.spot-list-card').first()).toBeVisible();
      const search = page.locator('#spot-search');
      await search.fill(query);
      const suggestion = page.locator('.search-suggestion').first();
      await expect(suggestion).toBeVisible();
      const name = await suggestion.locator('.search-suggestion-name').textContent();
      if (method === 'pointer') await suggestion.click();
      else {await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');}
      await expect(page.locator('#spot-detail-panel')).toBeVisible();
      await expect(page.locator('#spot-detail-panel')).toBeFocused();
      await expect(page.locator('.spot-detail-title')).toHaveText(name);
      await expect(page.locator('#map-content')).toBeVisible();
      expect(new URL(page.url()).searchParams.has('view')).toBe(false);
      if (method === 'pointer') await page.locator('#detail-close').click();
      else await page.keyboard.press('Escape');
      await expect(page.locator('#spot-detail-panel')).toBeHidden();
      await expect(page.locator('#list-view-button')).toHaveAttribute('aria-pressed', 'true');
      await expect(search).toBeFocused();
      await expect(search).toHaveValue(name);
      await expect(page.locator('#prefecture-filter')).toHaveValue(prefecture);
      expect(new URL(page.url()).searchParams.get('view')).toBe('list');
      await page.reload();
      await expect(page.locator('.spot-list-card').first()).toBeVisible();
      await expect(search).toHaveValue(name);
    });
  }

  test(`hidden map retains a centered marker through view switches, zoom and reload (${width}px)`, async ({page}) => {
    await page.setViewportSize({width, height: 844});
    await page.goto('/?q=町田&view=list&recent=1');
    await expect(page.locator('#result-count')).toHaveText('1件表示');
    const marker = page.locator('.leaflet-marker-icon').first();
    const insideMap = async () => {
      await expect(marker).toBeVisible();
      await expect.poll(() => page.evaluate(() => {
        const marker = spotRecords.find(record => record.spot.id === 'popup-2026-10-09-machida-modi').marker.getElement();
        if (!marker) return false;
        const box = marker.getBoundingClientRect(), canvas = document.getElementById('map').getBoundingClientRect();
        const x = box.x + box.width / 2, y = box.y + box.height / 2;
        return x > canvas.x + 16 && x < canvas.right - 16 && y > canvas.y + 16 && y < canvas.bottom - 16;
      })).toBe(true);
    };
    await page.locator('#map-view-button').click();await insideMap();
    const zoom = await page.evaluate(() => map.getZoom());
    await page.locator('.leaflet-control-zoom-in').click();
    await expect.poll(() => page.evaluate(() => map.getZoom())).toBe(zoom + 1);await insideMap();
    await page.locator('#list-view-button').click();await page.locator('#map-view-button').click();await insideMap();
    await page.reload();await expect(page.locator('#result-count')).toHaveText('1件表示');await insideMap();
    await marker.click();await expect(page.locator('#spot-detail-panel')).toBeVisible();
    await expect(page.locator('.spot-detail-title')).toContainText('町田');
    await page.locator('#detail-close').click();await insideMap();
  });
}

test('a combined long query survives reload, site navigation and history', async ({page}) => {
  const query = 'ちいかわPOP UP STORE 中部国際空港 第1ターミナル';
  await page.goto('/?view=list&past=1&tileTest=primary-fail');
  await expect(page.locator('.spot-list-card').first()).toBeVisible();
  await page.locator('#spot-search').fill(query);await page.locator('#prefecture-filter').selectOption('愛知県');
  await expect(page.locator('#result-count')).toHaveText('1件表示');
  expect(new URL(page.url()).searchParams.get('q')).toBe(query);
  expect(new URL(page.url()).searchParams.get('past')).toBe('1');
  expect(new URL(page.url()).searchParams.get('tileTest')).toBe('primary-fail');
  await page.reload();await expect(page.locator('#result-count')).toHaveText('1件表示');
  await page.locator('.site-nav-link[href="official.html"]').click();await page.goBack();
  await expect(page.locator('#spot-search')).toHaveValue(query);
  await expect(page.locator('#list-view-button')).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => history.pushState({}, '', '?q=町田&pref=東京都&view=list'));
  await page.evaluate(() => dispatchEvent(new PopStateEvent('popstate')));
  await expect(page.locator('#spot-search')).toHaveValue('町田');
  await expect(page.locator('#result-count')).toHaveText('2件表示');
  await page.goBack();await expect(page.locator('#spot-search')).toHaveValue(query);
  await expect(page.locator('#prefecture-filter')).toHaveValue('愛知県');
  expect(new URL(page.url()).searchParams.get('past')).toBe('1');
  await expect(page.locator('#result-count')).toHaveText('1件表示');
  await page.goForward();await expect(page.locator('#spot-search')).toHaveValue('町田');
});

test('search Escape preserves text and both pointer and keyboard suggestions remain usable', async ({page}) => {
  await page.goto('/');await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();
  const search = page.locator('#spot-search'), suggestions = page.locator('#spot-search-suggestions');
  await search.fill('町田');await expect(suggestions).toBeVisible();await page.keyboard.press('Escape');
  await expect(search).toHaveValue('町田');await expect(suggestions).toBeHidden();
  await page.locator('#prefecture-filter').selectOption('東京都');await expect(suggestions).toBeHidden();
  await search.fill('原宿');await expect(suggestions).toBeVisible();await suggestions.locator('.search-suggestion').first().click();
  await expect(page.locator('#spot-detail-panel')).toBeVisible();await page.locator('#detail-close').click();
  await search.fill('町田');await expect(suggestions).toBeVisible();
  const name = await suggestions.locator('.search-suggestion-name').first().textContent();
  await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  await expect(page.locator('.spot-detail-title')).toHaveText(name);
});

test('delayed journal data respects the tab chosen during loading and its history', async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('chiikawa-map-plan-v1', JSON.stringify(['chiikawaland-harajuku'])));
  let release;const pending = new Promise(resolve => {release = resolve;});
  await page.route('**/data/*.json', async route => {await pending;await route.continue();});
  await page.goto('/journal.html', {waitUntil: 'domcontentloaded'});await page.locator('#plan-tab').click();
  await expect(page.locator('#plan-tab')).toHaveAttribute('aria-selected', 'true');release();
  await expect(page.locator('.plan-stop')).toContainText('原宿');
  await expect(page.locator('#plan-tab')).toHaveAttribute('aria-selected', 'true');
  expect(new URL(page.url()).searchParams.get('view')).toBe('plan');
  await page.goBack();await expect(page.locator('#calendar-tab')).toHaveAttribute('aria-selected', 'true');
  await page.goForward();await expect(page.locator('#plan-tab')).toHaveAttribute('aria-selected', 'true');
});

for (const width of [390, 1440]) test(`a single Hokkaido search stays usable after zoom (${width}px)`, async ({page}) => {
  await page.setViewportSize({width, height: 844});
  await page.goto('/?q=もぐもぐ本舗 小樽&pref=北海道');
  await expect(page.locator('#result-count')).toHaveText('1件表示');
  const marker = page.locator('.spot-marker[data-spot-id="mogumogu-otaru"]');
  const insideMap = async () => {
    await expect.poll(() => page.evaluate(() => {
      const marker = spotRecords.find(record => record.spot.id === 'mogumogu-otaru').marker.getElement();
      if (!marker) return false;
      const b = marker.getBoundingClientRect(), canvas = document.getElementById('map').getBoundingClientRect();
      return b.x > canvas.x && b.right < canvas.right && b.y > canvas.y && b.bottom < canvas.bottom;
    })).toBe(true);
  };
  await insideMap();
  await page.locator('.leaflet-control-zoom-in').click();await insideMap();
  await marker.click();await expect(page.locator('.spot-detail-title')).toContainText('小樽');
});

for (const width of [390, 1440]) test.describe(`consecutive exploration with saved data (${width}px)`, () => {
  test.use({isMobile: width === 390, hasTouch: width === 390});
  test('search detail returns and hidden filtering keep the final marker selectable', async ({page}) => {
    await page.setViewportSize({width, height: width === 390 ? 844 : 1000});
    await page.addInitScript(() => {
      localStorage.setItem('chiikawa-map-favorites-v1', JSON.stringify(['chiikawaland-osaka-umeda', 'nagano-takao-mountain']));
      localStorage.setItem('chiikawa-map-plan-v1', JSON.stringify(['chiikawaland-osaka-umeda', 'nagano-takao-mountain']));
      localStorage.setItem('chiikawa-map-visited-v1', JSON.stringify(['nagano-takao-mountain']));
      localStorage.setItem('chiikawa-map-visit-details-v1', JSON.stringify({'nagano-takao-mountain': {visitedAt: '2026-09-28', note: '復元互換QA'}}));
    });
    const activate = locator => width === 390 ? locator.tap() : locator.click();
    await page.goto('/');await expect(page.locator('#result-count')).toHaveText(/^\d+件表示$/);
    await page.locator('#spot-search').fill('町田');await page.locator('#prefecture-filter').selectOption('東京都');
    await expect(page.locator('#result-count')).toHaveText('2件表示');
    await activate(page.locator('#filter-toggle'));await activate(page.locator('#filter-close'));
    await activate(page.locator('#list-view-button'));await expect(page.locator('.spot-list-card')).toHaveCount(2);
    await activate(page.locator('.spot-list-open-button').first());await expect(page.locator('#spot-detail-panel')).toBeVisible();
    await activate(page.locator('#detail-close'));await expect(page.locator('#list-view-button')).toHaveAttribute('aria-pressed', 'true');
    await page.reload();await expect(page.locator('#result-count')).toHaveText('2件表示');
    for (const method of ['pointer', 'keyboard']) {
      await page.locator('#spot-search').fill('原宿');
      await expect(page.locator('#spot-search-suggestions [role="option"]').first()).toBeVisible();
      if (method === 'pointer') await activate(page.locator('#spot-search-suggestions [role="option"]').first());
      else {await page.locator('#spot-search').press('ArrowDown');await page.locator('#spot-search').press('Enter');}
      await expect(page.locator('#spot-detail-panel')).toBeVisible();
      await expect.poll(() => page.evaluate(() => map.getCenter().distanceTo(selectedRecord.marker.getLatLng()))).toBeLessThan(30);
      await activate(page.locator('#detail-close'));
      await expect(page.locator('#list-view-button')).toHaveAttribute('aria-pressed', 'true');
      await page.locator('#spot-search').focus();await page.locator('#spot-search').press('Escape');
    }
    await page.locator('#spot-search').fill('ちいかわもぐもぐ本舗 小樽店');
    await page.locator('#prefecture-filter').selectOption('北海道');await expect(page.locator('#result-count')).toHaveText('1件表示');
    await activate(page.locator('#map-view-button'));await page.locator('#map').scrollIntoViewIfNeeded();
    await expect(page.locator('#map-content')).toBeVisible();
    await expect.poll(() => page.evaluate(() => {
      const record = spotRecords.find(record => record.spot.id === 'mogumogu-otaru');
      return record.marker.getElement()?.isConnected || false;
    })).toBe(true);
    const zoom = await page.evaluate(() => map.getZoom());
    await activate(page.locator('.leaflet-control-zoom-in'));
    await expect.poll(() => page.evaluate(() => map.getZoom())).toBe(zoom + 1);
    await activate(page.locator('.spot-marker[data-spot-id="mogumogu-otaru"]'));
    await expect(page.locator('.spot-detail-title')).toContainText('小樽');
  });
});
