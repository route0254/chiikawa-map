import { test, expect } from '@playwright/test';
import {readFile} from 'node:fs/promises';
const errors=new WeakMap();
test.beforeEach(async({page})=>{
 const messages=[];errors.set(page,messages);page.on('pageerror',error=>messages.push(error.message));
 for(const [url,file,type]of[
  ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','leaflet/dist/leaflet.js','text/javascript'],
  ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','leaflet/dist/leaflet.css','text/css'],
  ['https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js','leaflet.markercluster/dist/leaflet.markercluster.js','text/javascript'],
  ['https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/MarkerCluster.css','leaflet.markercluster/dist/MarkerCluster.css','text/css']
 ])await page.route(url,async route=>route.fulfill({body:await readFile(new URL('../node_modules/'+file,import.meta.url)),contentType:type}));
 await page.route(/tile.openstreetmap.org/,route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')}));
});
test.afterEach(async({page})=>expect(errors.get(page)).toEqual([]));

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
  await page.locator('.site-collaboration-options').first().locator(':scope > summary').click();
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

test('mobile catalogue starts with a readable first result and status',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 for(const url of ['/official.html','/collaborations.html']){
  await page.goto(url);
  const card=page.locator(url.includes('official')?'.official-spot-card':'.collaboration-card').first();
  const title=await card.locator('h4').boundingBox();
  const status=await card.locator(url.includes('official')?'.spot-status-badge':'.collaboration-status').first().boundingBox();
  expect(title.y+title.height).toBeLessThan(844);expect(status.y+status.height).toBeLessThan(844);
  await expect(page.locator('.unofficial-badge')).toBeVisible();
  await expect(page.locator('.site-notice')).toBeVisible();
 }
});

test('current page is recognizable in initial mobile navigation',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 for(const url of ['/nagano.html','/journal.html?view=plan','/journal.html?view=activity']){
  await page.goto(url);
  const active=page.locator('.site-nav [aria-current="page"]');
  await expect(active).toBeVisible();
  await expect.poll(async()=>{
   const r=await active.boundingBox();return r.x>=0&&r.x+r.width<=390;
  }).toBe(true);
 }
});

test('desktop discovery leads to recent entries and a regional search without geolocation',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('/');
 await page.locator('.explorer-discovery button').nth(1).click();
 await expect(page.locator('.recent-additions-details')).toHaveAttribute('open','');
 await page.keyboard.press('Escape');
 await page.locator('.explorer-discovery button').first().click();
 await expect(page.locator('#prefecture-filter')).toBeFocused();
 await page.locator('#prefecture-filter').selectOption('東京都');
 await expect(page.locator('.explorer-discovery')).toBeHidden();
 await expect(page.locator('#prefecture-filter')).toHaveValue('東京都');
});

test('200 percent text completes mobile filters to results and original actions',async({page})=>{
 await page.setViewportSize({width:360,height:900});
 for(const url of ['/official.html','/collaborations.html']){
  await page.goto(url);
  await page.evaluate(()=>{
   const doubleRules=rules=>{for(const rule of rules){if(rule.cssRules)doubleRules(rule.cssRules);const size=rule.style?.getPropertyValue('font-size');if(size&&/^[\d.]+px$/.test(size))rule.style.setProperty('font-size',parseFloat(size)*2+'px',rule.style.getPropertyPriority('font-size'));}};
   for(const sheet of document.styleSheets){try{doubleRules(sheet.cssRules);}catch{/* Cross-origin font declarations do not define local UI sizes. */}}
   document.documentElement.style.fontSize='32px';
  });
  for(const tab of await page.locator('.catalog-tab,.collaboration-tab').all()){
   const fits=await tab.evaluate(element=>{
    const label=element.querySelector('strong');if(!label)return true;
    const range=document.createRange();range.selectNodeContents(label);const bounds=element.getBoundingClientRect();
    return [...range.getClientRects()].every(rect=>rect.left>=bounds.left-1&&rect.right<=bounds.right+1);
   });
   expect(fits).toBe(true);
  }
  if(url.includes('official')){
   await page.locator('#current-search').fill('常滑');
   await page.locator('#current-filter-toggle').click();
   await page.locator('#current-status').selectOption('upcoming');
   await expect(page.locator('#current-groups .official-spot-card')).toHaveCount(2);
   await page.locator('#current-groups .spot-card-save-favorite').first().click();
   await expect(page.locator('#current-groups .spot-card-save-favorite').first()).toHaveClass(/is-active/);
   const save=page.locator('#current-groups .spot-card-save-favorite').first();
   expect((await save.boundingBox()).width).toBeGreaterThan(250);
  }else{
   await page.locator('[data-filter="search"][data-list="current"]').fill('GU');
   await page.locator('.site-collaboration-options').first().locator(':scope > summary').click();
   await page.locator('[data-filter="category"][data-list="current"]').selectOption('collection');
   const result=page.locator('[data-groups="current"] .collaboration-card');
   await expect(result).toHaveCount(1);
   const action=result.locator('.collaboration-card-action').first();await action.scrollIntoViewIfNeeded();await expect(action).toBeVisible();
   expect(await action.getAttribute('href')).toMatch(/^https:/);
   await page.context().route('https://**/*',route=>route.fulfill({status:200,contentType:'text/html',body:'<title>QA link destination</title>'}));
   const popupPromise=page.waitForEvent('popup');await action.click();const popup=await popupPromise;
   await expect(popup).toHaveURL(/^https:/);await popup.close();
  }
  const title=page.locator(url.includes('official')?'#current-groups .official-spot-card h4':'[data-groups="current"] .collaboration-card h4').first();
  expect(await title.evaluate(element=>parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(32);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(360);
  await page.screenshot({path:'node_modules/.cache/web-20261003-compact-final/360-text200-'+(url.includes('official')?'official':'collaborations')+'-operation.png'});
 }
});

test('desktop collaboration filters align labels and inputs across three columns',async({page})=>{
 for(const width of [1024,1440]){
  await page.setViewportSize({width,height:1000});await page.goto('/collaborations.html');
  for(const list of ['current','archive']){
   if(list==='archive')await page.locator('#collaboration-tab-archive').click();
   const fields=page.locator('[data-list="'+list+'"][data-filter]');
   const primary=await fields.filter({visible:true}).all();
   const first=[];for(const field of primary.slice(0,3))first.push(await field.boundingBox());
   expect(first).toHaveLength(3);
   expect(Math.max(...first.map(r=>r.y))-Math.min(...first.map(r=>r.y))).toBeLessThan(1);
   expect(first[0].x).toBeLessThan(first[1].x);expect(first[1].x).toBeLessThan(first[2].x);
  }
 }
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
