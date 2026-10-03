import { test, expect } from '@playwright/test';

test('mobile official search stays usable with closed filters and after resizing', async ({ page }) => {
  await page.setViewportSize({ width:390,height:844 });
  await page.goto('/official.html');
  const search=page.locator('#current-search');
  await expect(search).toBeVisible();
  await expect(page.locator('#current-filters')).toBeHidden();
  await search.fill('常滑');
  await expect(page.locator('#current-groups .official-spot-card')).toHaveCount(3);
  await page.setViewportSize({width:1440,height:1000});
  await expect(search).toHaveValue('常滑');
  await expect(search).toBeVisible();
  await search.fill('');
  await expect(page.locator('#current-groups .official-spot-card')).not.toHaveCount(3);
});

test('secondary collaboration filters remain operable and report applied conditions', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/collaborations.html');
  const extra=page.locator('.collaboration-filters').first().locator('.site-extra-filters');
  await extra.locator('summary').focus();
  await page.keyboard.press('Enter');
  await extra.locator('[data-filter="channel"]').selectOption({label:'オンライン'});
  await expect(extra.locator('summary')).toContainText('1条件を適用中');
  await extra.locator('summary').click();
  await expect(extra.locator('select').first()).toBeHidden();
  await expect(extra.locator('summary')).toContainText('1条件を適用中');
  await page.locator('[data-reset="current"]').click();
  await expect(extra.locator('summary')).not.toContainText('適用中');
});

test('large collaboration text including source URLs fits a narrow viewport', async ({ page }) => {
  await page.setViewportSize({width:360,height:900});
  await page.goto('/collaborations.html');
  await page.evaluate(() => {
    const sizes=[...document.querySelectorAll('body *')].map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]);
    for(const [e,size] of sizes) e.style.fontSize=(size*2)+'px';
  });
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(360);
  const overview=page.locator('.site-overview');
  await overview.locator('summary').click();
  await expect(overview.locator('.collaboration-about')).toBeVisible();
});
