import {test, expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test.use({timezoneId: 'Asia/Tokyo'});
test.beforeEach(async ({page}) => {
  await page.clock.setFixedTime(new Date('2026-10-03T03:00:00Z'));
  for (const [url, file, contentType] of [
    ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'leaflet/dist/leaflet.js', 'text/javascript'],
    ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'leaflet/dist/leaflet.css', 'text/css'],
    ['https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js', 'leaflet.markercluster/dist/leaflet.markercluster.js', 'text/javascript'],
    ['https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/MarkerCluster.css', 'leaflet.markercluster/dist/MarkerCluster.css', 'text/css']
  ]) await page.route(url, async route => route.fulfill({body: await readFile(new URL('../node_modules/' + file, import.meta.url)), contentType}));
  await page.route(/tile.openstreetmap.org|tiles.stadiamaps.com/, route => route.fulfill({contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')}));
});

for (const width of [390, 1440]) {
  test(`original save and plan controls share their existing storage across pages (${width}px)`, async ({page}) => {
    await page.setViewportSize({width, height: 1000});
    await page.goto('/?q=原宿&pref=東京都&view=list');
    const card = page.locator('.spot-list-card[data-spot-id="chiikawaland-harajuku"]');
    await expect(card).toBeVisible();
    await card.locator('.spot-list-plan-button').click();
    await expect(card.locator('.spot-list-plan-button')).toHaveAccessibleName('今日のプランから外す');
    await card.locator('.spot-list-favorite-button').click();
    await expect(card.locator('.spot-list-favorite-button')).toHaveAccessibleName('行きたいから削除');
    await card.locator('.spot-list-open-button').click();
    await expect(page.locator('#spot-detail-panel')).toBeVisible();
    const plan = page.locator('#spot-detail-panel .spot-plan-button');
    await expect(plan).toHaveAttribute('aria-pressed', 'true');
    await plan.click();await expect(plan).toHaveAttribute('aria-pressed', 'false');
    await plan.click();await expect(plan).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#detail-close').click();
    await page.locator('.site-nav-link[href="journal.html"]').click();
    await expect(page.locator('#calendar-grid .calendar-day').first()).toBeVisible();
    await page.locator('#plan-tab').click();await expect(page.locator('.plan-stop')).toContainText('原宿');
    await page.locator('#favorites-tab').click();await expect(page.locator('.favorite-card')).toContainText('原宿');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('chiikawa-map-plan-v1')))).toEqual(['chiikawaland-harajuku']);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('chiikawa-map-favorites-v1')))).toEqual(['chiikawaland-harajuku']);
    await page.goBack();await page.goBack();await page.goBack();
    await expect(page.locator('#spot-search')).toHaveValue('原宿');
    await expect(page.locator('#list-view-button')).toHaveAttribute('aria-pressed', 'true');
  });

  test(`all original navigation destinations remain reachable without new UI assets (${width}px)`, async ({page}) => {
    await page.setViewportSize({width, height: 1000});
    for (const url of ['/', '/official.html', '/collaborations.html', '/nagano.html', '/journal.html?view=plan', '/official-links.html', '/spot/chiikawaland-harajuku/']) {
      await page.goto(url);
      await expect(page.locator('.site-nav-link')).toHaveCount(6);
      for (const link of await page.locator('.site-nav-link').all()) await expect(link).toBeVisible();
      expect(await page.locator('script[src], link[rel="stylesheet"]').evaluateAll(nodes => nodes.some(node => /(?:explorer-ui|explorer\.css|navigation\.js|site-ui|recent-ui|journal-ui|journal-focus|ui-icons)/.test(node.src || node.href)))).toBe(false);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    }
  });
}

test('mapped collaborations still connect to the existing detail and private plan', async ({page}) => {
  await page.goto('/collaborations.html');
  const card = page.locator('.collaboration-card').filter({hasText: '東京メトロ脱出ゲーム'});
  await expect(card).toBeVisible();await card.locator('.collaboration-card-action.is-map').click();
  await expect(page.locator('.spot-detail-title')).toBeVisible();
  const name = await page.locator('.spot-detail-title').textContent();
  await page.locator('#spot-detail-panel .spot-plan-button').click();
  await page.locator('#detail-close').click();await page.locator('.site-nav-link[href="journal.html"]').click();
  await expect(page.locator('#calendar-grid .calendar-day').first()).toBeVisible();
  await page.locator('#plan-tab').click();await expect(page.locator('.plan-stop')).toContainText(name);
});

test('published catalogue recent URLs retain their AND condition and reset without new controls', async ({page}) => {
  await page.goto('/official.html?recent=1');
  await expect(page.locator('#current-groups .official-spot-card')).toHaveCount(13);
  await expect(page.locator('#official-recent')).toHaveCount(0);
  await page.locator('#current-search').fill('町田');
  await expect(page.locator('#current-groups .official-spot-card')).toHaveCount(1);
  await page.reload();await expect(page.locator('#current-search')).toHaveValue('町田');
  await expect(page.locator('#current-groups .official-spot-card')).toHaveCount(1);
  await page.locator('#current-filter-reset').click();
  await expect(page.locator('#current-groups .official-spot-card')).toHaveCount(79);
  expect(new URL(page.url()).searchParams.has('recent')).toBe(false);
  await page.goto('/collaborations.html?recent=1');
  await expect(page.locator('[data-groups="current"] .collaboration-card')).toHaveCount(4);
  await expect(page.locator('#collaboration-recent')).toHaveCount(0);
  await page.locator('[data-filter="search"][data-list="current"]').fill('オキシ');
  await expect(page.locator('[data-groups="current"] .collaboration-card')).toHaveCount(1);
  await page.reload();await expect(page.locator('[data-filter="search"][data-list="current"]')).toHaveValue('オキシ');
  await expect(page.locator('[data-groups="current"] .collaboration-card')).toHaveCount(1);
  await page.locator('[data-reset="current"]').click();
  await expect(page.locator('[data-groups="current"] .collaboration-card')).toHaveCount(20);
  expect(new URL(page.url()).searchParams.has('recent')).toBe(false);
});

test('latest information confirmation dates remain visible with the original rendering', async ({page}) => {
  await page.goto('/collaborations.html');
  const card = page.locator('.collaboration-card').filter({hasText: 'ANA'}).first();
  await expect(card).toContainText('情報確認日2026/10/3');
  const spots = JSON.parse(await readFile(new URL('../data/official-spots.json', import.meta.url), 'utf8'));
  for (const [field, label] of [['hoursCheckedAt', '営業時間の確認日'], ['entryInfoCheckedAt', '入場案内の確認日']]) {
    const spot = spots.find(spot => spot[field]);
    expect(spot).toBeTruthy();await page.goto('/spot/' + spot.id + '/');
    await expect(page.locator('.spot-page-card')).toContainText(label);
    await expect(page.locator('.spot-page-card')).toContainText(spot[field]);
  }
});
