import { test, expect, devices } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

const pages = [
  ['地図', '/', '#result-count'],
  ['公式一覧', '/official.html', '#current-groups .official-spot-card'],
  ['コラボ', '/collaborations.html', '[data-groups="current"] .collaboration-card'],
  ['手帳', '/journal.html?view=calendar', '#calendar-grid .calendar-day'],
  ['ナガノ先生', '/nagano.html', '.nagano-profile-interest-card'],
  ['公式リンク', '/official-links.html', '.official-links-list a'],
  ['個別スポット', '/spot/chiikawaland-osaka-umeda/', '.spot-page-card'],
  ['プライバシー', '/privacy.html', '.legal-grid'],
  ['利用条件', '/terms.html', '.legal-grid']
];

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-03T03:00:00Z'));
  for (const [url, file, contentType] of [
    ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'leaflet/dist/leaflet.js', 'text/javascript'],
    ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'leaflet/dist/leaflet.css', 'text/css'],
    ['https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js', 'leaflet.markercluster/dist/leaflet.markercluster.js', 'text/javascript'],
    ['https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/MarkerCluster.css', 'leaflet.markercluster/dist/MarkerCluster.css', 'text/css']
  ]) await page.route(url, async route => route.fulfill({ body: await readFile(new URL(`../node_modules/${file}`, import.meta.url)), contentType }));
  await page.route(/tile.openstreetmap.org|tiles.stadiamaps.com/, route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64') }));
  await page.route('**/firebase-config.json', async route => {
    const config = JSON.parse(await readFile(new URL('../firebase-config.json', import.meta.url), 'utf8'));
    config.enabled = false;
    await route.fulfill({ json: config });
  });
});

async function showCloudHeader(page) {
  await page.locator('[data-cloud-header-account]').waitFor({ state: 'attached' });
  await page.evaluate(() => {
    const state = { available: true, signedIn: false, syncing: false, status: 'signed-out', needsAccountConfirmation: false };
    window.ChiikatsuCloudSync = { getState: () => state, signIn: async () => { window.__designSignIn = true; } };
    window.dispatchEvent(new CustomEvent('chiikatsu:cloud-sync-state', { detail: state }));
  });
}

for (const width of [320, 390, 768, 1440]) {
  test(`共有ヘッダーと主要ページに横はみ出し・操作の重なりがない (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const [name, path, ready] of pages) {
      await page.goto(path);
      await expect(page.locator(ready).first()).toBeVisible();
      await showCloudHeader(page);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), name).toBe(width);
      await expect(page.locator('.site-nav-link')).toHaveCount(6);
      for (const item of await page.locator('.site-nav-link').all()) {
        const box = await item.boundingBox();
        expect(box.height, `${name}: navigation`).toBeGreaterThanOrEqual(44);
      }
      const login = await page.locator('[data-cloud-header-button]').boundingBox();
      const title = await page.locator('.site-header h1').boundingBox();
      expect(title.x + title.width <= login.x || title.y >= login.y + login.height || login.x + login.width <= title.x, name).toBe(true);
      await page.locator('[data-cloud-header-button]').click();
      expect(await page.evaluate(() => window.__designSignIn), name).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}

test('スマホで地図を初期画面に表示し、その他の操作をキーボードでも使える', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#result-count')).toHaveText(/^\d+件表示$/);
  await showCloudHeader(page);
  await page.evaluate(() => document.fonts.ready);
  expect((await page.locator('#map').boundingBox()).y).toBeLessThan(790);
  for (const control of await page.locator('.date-quick-button, .date-calendar-link').all()) {
    const box = await control.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await expect(page.locator('.map-legend')).toBeVisible();
  const tools = page.locator('#map-extra-tools');
  await tools.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#saved-data-toggle')).toBeVisible();
  await page.locator('#saved-data-toggle').click();
  await expect(page.locator('#saved-data-panel')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#saved-data-toggle')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(tools).not.toHaveAttribute('open');
  await expect(tools.locator('summary')).toBeFocused();
  await page.locator('.map-recent-link').click();
  await expect(page.locator('#recent-additions-title')).toBeInViewport();
});

test('狭い画面でも一覧カードの保存・地図ボタンを押せる', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/official.html');
    const card = page.locator('#current-groups .official-spot-card').first();
    await expect(card).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await card.locator('.spot-card-save-plan').click();
    await expect(card.locator('.spot-card-save-plan')).toHaveAttribute('aria-pressed', 'true');
    for (const control of await card.locator('.spot-card-save-button, .spot-card-action').all()) {
      const box = await control.boundingBox();
      expect(Math.round(box.height * 100) / 100).toBeGreaterThanOrEqual(44);
      expect(Math.round(box.width * 100) / 100).toBeGreaterThanOrEqual(44);
      expect(await control.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await card.locator('.spot-card-save-plan').click();
  }
});

test('スマホの主要ページにWCAG AAの違反がない', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [name, path, ready] of pages) {
    await page.goto(path);
    await expect(page.locator(ready).first()).toBeVisible();
    await showCloudHeader(page);
    if (path === '/') {
      await expect(page.locator('#result-count')).toHaveText(/^\d+件表示$/);
      await page.locator('#map-extra-tools > summary').click();
      // MarkerClusterのフェード表示が完了してからコントラストを測定する。
      await expect(page.locator('#map .leaflet-cluster-anim, #map .leaflet-zoom-anim')).toHaveCount(0);
    }
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(node => ({ target: node.target, message: node.failureSummary })) })), name).toEqual([]);
  }
});

test.describe('Androidのタッチ操作', () => {
  test.use({ viewport: devices['Pixel 7'].viewport, userAgent: devices['Pixel 7'].userAgent, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test('検索から保存・プラン・カレンダーまで一続きで利用できる', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#result-count')).toHaveText(/^\d+件表示$/);
    await page.locator('#spot-search').tap();
    await page.locator('#spot-search').fill('ちいかわらんど 大阪梅田');
    await page.locator('.search-suggestion').first().tap();
    await expect(page.locator('.spot-detail-title')).toContainText('大阪梅田');
    await page.locator('.spot-favorite-button').tap();
    await page.locator('.spot-plan-button').tap();
    await page.locator('.spot-visited-button').tap();
    await expect(page.locator('.spot-visit-card')).toBeVisible();
    await page.locator('.spot-visit-date').fill('2026-10-03');
    await page.locator('.spot-visit-note').fill('訪問記録の確認');
    await page.locator('.spot-visit-save').tap();
    await page.locator('#detail-close').tap();
    await page.locator('.site-nav-link[href="journal.html"]').tap();
    await page.locator('#favorites-tab').tap();
    await expect(page.locator('.favorite-card')).toContainText('大阪梅田');
    await page.locator('#plan-tab').tap();
    await expect(page.locator('.plan-stop')).toContainText('大阪梅田');
    await page.locator('#calendar-tab').tap();
    await expect(page.locator('#calendar-grid .calendar-day').first()).toBeVisible();
    await page.locator('#calendar-grid .calendar-day').first().tap();
    await page.locator('#activity-tab').tap();
    await expect(page.locator('#activity-view')).toContainText('訪問記録の確認');
    await page.reload();
    await expect(page.locator('#activity-view')).toContainText('訪問記録の確認');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(412);
  });
});
