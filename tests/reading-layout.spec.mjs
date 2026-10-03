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

test('one visible planning action connects search results and details to the same saved plan',async({page})=>{
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:width===390?844:1000});
  await page.goto('/?q='+encodeURIComponent('原宿')+'&pref='+encodeURIComponent('東京都')+'&view=list');
  const card=page.locator('.spot-list-card[data-spot-id="chiikawaland-harajuku"]');
  const add=card.locator('.spot-list-plan-button');await expect(add).toBeVisible();
  expect(await add.evaluate(el=>!el.closest('details:not([open])'))).toBe(true);
  // The primary action must fit its label, rather than retain the old icon-only width.
  expect(await add.evaluate(el=>el.clientWidth>=200 && el.scrollHeight<=el.clientHeight)).toBe(true);
  if(await add.getAttribute('aria-pressed')==='true')await add.click();
  await add.click();await expect(add).toHaveAttribute('aria-pressed','true');await expect(add).toBeFocused();
  await card.locator('.spot-list-open-button').click();
  const detailAdd=page.locator('.explorer-primary-actions .spot-plan-button');await expect(detailAdd).toBeVisible();
  await expect(page.locator('.spot-detail-action-menu')).not.toHaveAttribute('open','');
  await expect(detailAdd).toHaveAttribute('aria-pressed','true');await detailAdd.click();
  await expect(detailAdd).toHaveAttribute('aria-pressed','false');await expect(detailAdd).toBeFocused();
  await detailAdd.click();await expect(detailAdd).toHaveAttribute('aria-pressed','true');
  await page.locator('#detail-close').click();await page.locator('.site-nav-link[href="journal.html"]').click();
  await page.locator('#plan-tab').click();await expect(page.locator('.plan-stop')).toContainText('原宿');
 }
});

test('planning labels fit sidebar and list cards at normal and 200 percent sizes',async({page})=>{
 for(const {width,textScale} of [{width:1440,textScale:1},{width:390,textScale:1},{width:720,textScale:1},{width:1440,textScale:2},{width:390,textScale:2}]){
  await page.setViewportSize({width,height:1000});await page.goto('/'+(width<=720?'?view=list':''));
  await expect(page.locator('.spot-list-plan-button').first()).toBeVisible();
  if(textScale===2)await page.evaluate(()=>{
   const doubleRules=rules=>{for(const rule of rules){if(rule.cssRules)doubleRules(rule.cssRules);const size=rule.style?.getPropertyValue('font-size');if(size&&/^[\d.]+px$/.test(size))rule.style.setProperty('font-size',parseFloat(size)*2+'px',rule.style.getPropertyPriority('font-size'));}};
   for(const sheet of document.styleSheets){try{doubleRules(sheet.cssRules);}catch{}}
   document.documentElement.style.fontSize='32px';
  });
  const results=await page.locator('.spot-list-card').evaluateAll(cards=>cards.slice(0,3).map(card=>{
   const button=card.querySelector('.spot-list-plan-button'),footer=card.querySelector('.candidate-footer');
   const b=button.getBoundingClientRect(),c=card.getBoundingClientRect(),f=footer.getBoundingClientRect();
   const range=document.createRange();range.selectNodeContents(button);
   const favorite=card.querySelector('.spot-list-favorite-button'),fb=favorite.getBoundingClientRect(),fr=document.createRange();fr.selectNodeContents(favorite);
   return {width:b.width,fits:[...range.getClientRects()].every(r=>r.left>=b.left-1&&r.right<=b.right+1&&r.top>=b.top-1&&r.bottom<=b.bottom+1),favoriteFits:[...fr.getClientRects()].every(r=>r.left>=fb.left-1&&r.right<=fb.right+1&&r.top>=fb.top-1&&r.bottom<=fb.bottom+1),contained:b.left>=c.left&&b.right<=c.right&&f.bottom<=c.bottom,overflow:button.scrollHeight>button.clientHeight};
  }));
  for(const result of results){expect(result.width).toBeGreaterThan(200);expect(result.fits).toBe(true);expect(result.favoriteFits).toBe(true);expect(result.contained).toBe(true);expect(result.overflow).toBe(false);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
 }
});

test('navigation retains the same playful symbols across the complete site',async({page})=>{
 for(const url of ['/','/official.html','/collaborations.html','/nagano.html','/journal.html?view=plan','/official-links.html','/spot/chiikawaland-harajuku/']){
  await page.goto(url);
  await expect(page.locator('.chiikatsu-nav-icon')).toHaveText(['🗺','✦','🎀','✎','🌱','🔗']);
 }
});

test('a collaboration with a mapped place leads through direct planning to the journal',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/collaborations.html');
 const card=page.locator('.collaboration-card').filter({hasText:'東京メトロ脱出ゲーム'});
 await card.locator('.collaboration-card-action.is-map').click();
 await expect(page.locator('.spot-detail-title')).toBeVisible();
 const title=(await page.locator('.spot-detail-title').textContent()).trim();
 await page.locator('.explorer-primary-actions .spot-plan-button').click();
 await expect(page.locator('.explorer-primary-actions .spot-plan-button')).toHaveAttribute('aria-pressed','true');
 await page.locator('#detail-close').click();await page.locator('.site-nav-link[href="journal.html"]').click();
 await page.locator('#plan-tab').click();await expect(page.locator('.plan-stop')).toContainText(title);
});

test('page destinations and a named date filter stay reachable without opening a utility menu',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 for(const url of ['/','/official.html','/collaborations.html','/nagano.html','/journal.html?view=plan']){
  await page.goto(url);
  for(const link of await page.locator('.site-nav-link').all()){
   await expect(link).toBeVisible();
   expect(await link.evaluate(el=>{const r=el.getBoundingClientRect();return r.height>=44&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
  }
 }
 await page.goto('/');await page.locator('.explorer-dates>summary').click();
 await page.locator('[data-date-quick="today"]').click();
 await page.locator('#spot-search').fill('原宿');await page.locator('#prefecture-filter').focus();await page.locator('#prefecture-filter').selectOption('東京都');
 await page.locator('#list-view-button').click();await expect(page.locator('.spot-list-card')).toHaveCount(2);
 await page.locator('#map-view-button').click();await expect(page.locator('#spot-search')).toHaveValue('原宿');
 await expect(page.locator('[data-date-quick="today"]')).toHaveAttribute('aria-pressed','true');
});

test('home to official search to saved plan and back to the map forms a complete mobile route',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await page.locator('#spot-search').fill('原宿');await page.locator('#prefecture-filter').selectOption('東京都');
 await page.locator('.site-nav-link[href="official.html"]').click();
 await page.locator('#current-search').fill('常滑');await expect(page.locator('#current-groups .official-spot-card')).toHaveCount(3);
 const first=page.locator('#current-groups .official-spot-card').first();
 const title=await first.locator('h4').textContent();await first.locator('.spot-card-save-plan').click();
 await page.locator('.site-nav-link[href="journal.html"]').click();
 await page.locator('[data-journal-view="plan"]').click();
 await expect(page.locator('.plan-stop').first()).toContainText(title.trim());
 await page.locator('.site-nav-link[href="./"]').click();
 await expect(page.locator('#spot-search')).toBeVisible();await expect(page.locator('#map')).toBeVisible();
 await expect(page.locator('#spot-search')).toHaveValue('原宿');await expect(page.locator('#prefecture-filter')).toHaveValue('東京都');
});

test('mobile 200 percent text moves navigation into the page and reaches the last result actions',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/?view=list');await expect(page.locator('.spot-list-card').first()).toBeVisible();
 await page.evaluate(()=>{const double=rules=>{for(const r of rules){if(r.cssRules)double(r.cssRules);const s=r.style?.getPropertyValue('font-size');if(s&&/^[\d.]+px$/.test(s))r.style.setProperty('font-size',parseFloat(s)*2+'px',r.style.getPropertyPriority('font-size'));}};for(const sheet of document.styleSheets){try{double(sheet.cssRules);}catch{}}document.documentElement.style.fontSize='32px';});
 await expect(page.locator('body')).toHaveClass(/navigation-flow/);
 expect(await page.locator('.site-nav').evaluate(el=>getComputedStyle(el).position)).toBe('static');
 expect(await page.locator('.spot-list-panel').evaluate(el=>getComputedStyle(el).overflowY)).toBe('visible');
 const last=page.locator('.spot-list-card').last();const id=await last.getAttribute('data-spot-id');
 for(const selector of ['.spot-list-plan-button','.spot-list-favorite-button']){
  const action=last.locator(selector);await action.scrollIntoViewIfNeeded();
  expect(await action.evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
  await action.click();await expect(action).toHaveAttribute('aria-pressed','true');
 }
 expect(await page.locator('.site-nav').evaluate(el=>el.getBoundingClientRect().bottom)).toBeLessThan(0);
 await last.locator('.candidate-tools>summary').click();await last.locator('.spot-list-visited-button').click();await expect(last.locator('.explorer-visit-stamp')).toHaveText('行った');
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.qaCopiedShare=value;}}}));
 await last.locator('.candidate-tools>summary').click();await last.locator('.spot-list-share-button').click();expect(await page.evaluate(()=>window.qaCopiedShare)).toContain('/spot/'+id+'/');
 await last.locator('.spot-list-open-button').click();await expect(page.locator('#spot-detail-panel')).toBeVisible();
 const detail=await page.locator('#spot-detail-panel').boundingBox();expect(detail.y).toBe(0);expect(detail.height).toBe(844);
 await page.locator('#detail-close').click();await page.locator('.site-nav-link[href="journal.html"]').click();await page.locator('#plan-tab').click();await expect(page.locator('.plan-stop')).toHaveCount(1);
});

test('returning through site pages restores the map and private saved filters without changing direct visits',async({page})=>{
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:1000});
  await page.goto('/?q='+encodeURIComponent('原宿')+'&pref='+encodeURIComponent('東京都')+'&view=list');
  const card=page.locator('.spot-list-card[data-spot-id="chiikawaland-harajuku"]');
  await expect(card).toBeVisible();
  if(await card.locator('.spot-list-favorite-button').getAttribute('aria-pressed')!=='true')await card.locator('.spot-list-favorite-button').click();
  await card.locator('.candidate-tools>summary').click();
  if(await card.locator('.spot-list-visited-button').getAttribute('aria-pressed')!=='true')await card.locator('.spot-list-visited-button').click();
  await page.locator('.map-tools-menu>summary').click();await page.locator('#favorite-filter-button').click();await page.locator('#visited-filter-button').click();
  await page.locator('.map-tools-menu>summary').click();
  await page.locator('#map-view-button').click();
  await expect.poll(()=>page.evaluate(()=>map._animatingZoom===true)).toBe(false);
  await page.evaluate(()=>map.setView([35.672,139.701],16,{animate:false}));
  await expect.poll(()=>page.evaluate(()=>map.getZoom())).toBe(16);
  const before=await page.evaluate(()=>({center:[map.getCenter().lat,map.getCenter().lng],zoom:map.getZoom()}));
  await page.locator('.site-nav-link[href="official.html"]').click();
  await page.locator('.site-nav-link[href="journal.html"]').click();await page.locator('.site-nav-link[href="./"]').click();
  await expect(page.locator('#result-count')).toHaveText('1件表示');
  await expect(page.locator('#favorite-filter-button')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#visited-filter-button')).toHaveAttribute('aria-pressed','true');
  await expect.poll(()=>page.evaluate(before=>map.project(map.getCenter(),before.zoom).distanceTo(map.project(before.center,before.zoom)),before)).toBeLessThan(1);
  expect(await page.evaluate(()=>map.getZoom())).toBe(before.zoom);
  expect(page.url()).not.toMatch(/favorite|visited|center|zoom/);
  expect(await page.evaluate(()=>sessionStorage.getItem('chiikawa-map-exploration-pending-v1'))).toBeNull();
  await page.goto('/?q='+encodeURIComponent('常滑')+'&pref='+encodeURIComponent('愛知県'));
  await expect(page.locator('#spot-search')).toHaveValue('常滑');await expect(page.locator('#prefecture-filter')).toHaveValue('愛知県');
  await expect(page.locator('#favorite-filter-button')).toHaveAttribute('aria-pressed','false');await expect(page.locator('#visited-filter-button')).toHaveAttribute('aria-pressed','false');
 }
});

test('help, empty plan, and footprints lead to the actions their text describes',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await page.locator('.map-tools-menu>summary').click();await page.locator('#official-help-toggle').click();
 await expect(page.locator('#official-help-panel')).toContainText('今日のプランに追加');await expect(page.locator('#official-help-panel')).toContainText('地図位置・ズーム・保存済みの絞り込み');
 await page.locator('#official-help-close').click();
 await page.goto('/journal.html?view=plan');
 await expect(page.locator('#plan-list .plan-empty')).toContainText('地図や公式一覧');await expect(page.locator('#plan-list .plan-empty')).toContainText('行きたい');
 await page.locator('.journal-about-drawer>summary').click();await expect(page.locator('.journal-hero')).toContainText('クラウド保存は任意');
 await page.locator('#activity-tab').click();
 const next=page.locator('.recent-activity-panel a');await expect(next).toHaveText('次のお出かけ先を探す');await next.click();
 await expect(page.locator('.spot-list-card').first()).toBeVisible();await expect(page.locator('#list-view-button')).toHaveClass(/is-active/);
 await expect(page.locator('#spot-search')).toHaveValue('');
});

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
 await expect(page.locator('#recent-additions [data-recent-filter]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.recent-additions-details')).not.toHaveAttribute('open','');
 await page.keyboard.press('Escape');
 await page.locator('.explorer-discovery button').first().click();
 await expect(page.locator('#prefecture-filter')).toBeFocused();
 await page.locator('#prefecture-filter').selectOption('東京都');
 await expect(page.locator('.explorer-discovery button').first()).toBeHidden();
 await expect(page.locator('.explorer-discovery [data-recent-filter]')).toBeVisible();
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
