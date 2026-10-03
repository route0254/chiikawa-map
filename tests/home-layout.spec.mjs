import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
const pageErrors=new WeakMap();
test('saved-data menu closes behind its dialog and returns focus to a visible trigger',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await page.locator('.map-tools-menu>summary').click();await page.locator('#saved-data-toggle').click();
 await expect(page.locator('.map-tools-menu')).not.toHaveAttribute('open','');
 await expect(page.locator('#saved-data-panel')).toBeVisible();
 expect(await page.locator('#saved-data-export').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
 await page.keyboard.press('Escape');await expect(page.locator('#saved-data-panel')).toBeHidden();
 await expect(page.locator('.map-tools-menu>summary')).toBeFocused();
});
test.afterEach(async ({page})=>expect(pageErrors.get(page)||[]).toEqual([]));

test.beforeEach(async ({ page }) => {
  const errors=[];pageErrors.set(page,errors);page.on('pageerror',error=>errors.push(error.message));
  for (const [url, file, contentType] of [
    ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "leaflet/dist/leaflet.js", "text/javascript"],
    ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "leaflet/dist/leaflet.css", "text/css"],
    ["https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js", "leaflet.markercluster/dist/leaflet.markercluster.js", "text/javascript"],
    ["https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/MarkerCluster.css", "leaflet.markercluster/dist/MarkerCluster.css", "text/css"]
  ]) await page.route(url, async route => route.fulfill({ body: await readFile(new URL(`../node_modules/${file}`, import.meta.url)), contentType }));
  await page.route(/tile.openstreetmap.org|tiles.stadiamaps.com/, route => route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") }));
});

test("mobile prioritises the chosen view and preserves search and prefecture across switches", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();
  expect((await page.locator("#map").boundingBox()).y).toBeLessThan(180);
  expect((await page.locator("#map").boundingBox()).height).toBeGreaterThanOrEqual(300);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.locator("#spot-search").fill("町田");
  await page.locator("#spot-search").blur();
  await page.locator("h1").click();
  await page.locator("#prefecture-filter").selectOption({ label: "東京都" });
  const count = await page.locator("#result-count").textContent();
  await page.locator("#list-view-button").click();
  await expect(page.locator("#map-content")).toBeHidden();
  expect(await page.locator("#map-content").evaluate(node => getComputedStyle(node).display)).toBe("none");
  await expect(page.locator(".spot-list-card").first()).toBeVisible();
  await expect(page.locator("#spot-list-panel")).toBeFocused();
  expect((await page.locator("#spot-list-panel").boundingBox()).y).toBeLessThan(320);
  await expect(page.locator("#list-view-button")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#map-view-button").click();
  await expect(page.locator("#spot-list-panel")).toBeHidden();
  await expect(page.locator("#map")).toBeFocused();
  await expect(page.locator("#spot-search")).toHaveValue("町田");
  await expect(page.locator("#prefecture-filter")).toHaveValue("東京都");
  await expect(page.locator("#result-count")).toHaveText(count);
});

test("visit facts precede optional detail actions and menus keep their original functions", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?spot=chiikawaland-harajuku");
  await expect(page.locator(".spot-detail-title")).toBeVisible();
  const actions = page.locator(".spot-detail-action-menu");
  await expect(actions).not.toHaveAttribute("open", "");
  const order = await page.evaluate(() => {
    const menu = document.querySelector(".spot-detail-action-menu");
    return [".spot-address", ".spot-period", ".explorer-visit-facts"].every(selector => {
      const fact = document.querySelector(`#spot-detail-body ${selector}`);
      return !fact || Boolean(fact.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });
  expect(order).toBe(true);
  await actions.locator("summary").click();
  await expect(page.locator(".explorer-primary-actions .spot-visited-button")).toBeVisible();
  await page.locator("#detail-close").click();
  await page.locator(".map-tools-menu > summary").click();
  await expect(page.locator("#saved-data-toggle")).toBeVisible();
  expect((await page.locator(".map-tools-menu > summary").boundingBox()).height).toBeGreaterThanOrEqual(44);
  await page.locator(".map-tools-menu > summary").click();
  await page.locator("#filter-toggle").click();
  await expect(page.locator(".map-tools-menu")).not.toHaveAttribute("open", "");
  await expect(page.locator("#filter-close")).toBeVisible();
  await page.locator("#filter-close").click();
});

test("series selection explains all and partial states without resetting selections", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();
  await page.locator("#filter-toggle").click();
  await expect(page.locator("#brand-selection-status")).toHaveText("すべてのシリーズを表示（絞り込みなし）");
  const brands = page.locator('input[name="filter-brand"]');
  const total = await brands.count();
  await brands.first().locator("..").click();
  await expect(brands.first()).not.toBeChecked();
  await expect(page.locator("#brand-selection-status")).toHaveText(`${total}シリーズ中${total - 1}シリーズを表示`);
  await page.locator("#filter-toggle").click();
  await page.locator("#list-view-button").click();
  await page.locator("#map-view-button").click();
  await expect(brands.first()).not.toBeChecked();
  await page.locator("#filter-toggle").click();
  for (const brand of await brands.all()) {
    if (await brand.isChecked()) await brand.locator("..").click();
  }
  await expect(page.locator("#brand-selection-status")).toHaveText("シリーズが未選択のため、表示は0件です");
  await expect(page.locator("#result-count")).toHaveText("0件表示");
});

test("mobile detail appears before the map and its close action restores map view", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?spot=chiikawaland-harajuku");
  await expect(page.locator(".spot-detail-title")).toContainText("原宿");
  await expect(page.locator("#spot-detail-panel")).toHaveAttribute("role","dialog");
  await expect(page.locator("#spot-detail-panel")).toHaveAttribute("aria-modal","true");
  await expect(page.locator('.explorer-navigation')).toBeHidden();
  await page.locator("#detail-close").click();
  await expect(page.locator("#spot-detail-panel")).toBeHidden();
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();
  await expect(page.locator('.explorer-navigation')).toBeVisible();
});

test("overview uses counts, selected labels stay inside the map and detailed labels do not collide", async ({ page }) => {
  await page.setViewportSize({ width:390, height:844 });
  await page.goto("/");
  await expect(page.locator(".cluster-count").first()).toBeVisible();
  await expect(page.locator(".cluster-name-list")).toHaveCount(0);
  await expect(page.locator(".spot-name-label.is-readable")).toHaveCount(0);
  const select=await page.locator("#prefecture-filter").boundingBox();
  expect(select.x+select.width).toBeLessThanOrEqual(380);
  await page.locator(".explorer-dates > summary").click();
  for(const selector of [".map-tools-menu > summary", ".date-discovery-help summary"]) {
    const lines=await page.locator(selector).evaluate(el=>({height:el.getBoundingClientRect().height,lineHeight:parseFloat(getComputedStyle(el).lineHeight),textHeight:el.scrollHeight}));
    expect(lines.height).toBeGreaterThanOrEqual(44);
    expect(lines.height).toBeLessThan(50);
  }
  await page.goto("/?spot=chiikawaland-harajuku");
  await expect(page.locator(".spot-name-label.is-selected-label.is-readable")).toHaveCount(1);
  await page.evaluate(()=>map.setZoom(16));
  await page.waitForTimeout(400);
  await page.evaluate(()=>map.panBy([100,75],{animate:false}));
  await page.waitForTimeout(100);
  const audit=await page.evaluate(()=>{
    const bounds=document.querySelector('#map').getBoundingClientRect();
    const rects=[...document.querySelectorAll('.spot-name-label.is-readable')].map(el=>el.getBoundingClientRect());
    return {count:rects.length,contained:rects.every(r=>r.left>=bounds.left && r.right<=bounds.right && r.top>=bounds.top && r.bottom<=bounds.bottom),collision:rects.some((a,i)=>rects.slice(i+1).some(b=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top))};
  });
  expect(audit.count).toBeGreaterThan(0);
  expect(audit.contained).toBe(true);
  expect(audit.collision).toBe(false);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
});

test("desktop keeps candidates, search, selected pin and map position across detail close", async ({page}) => {
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/');
  await expect(page.locator('.spot-list-card').first()).toBeVisible();
  await expect(page.locator('#map')).toBeVisible();
  expect((await page.locator('.explorer-sidebar').boundingBox()).width).toBe(368);
  await page.locator('#spot-search').fill('東京'); await page.locator('h1').click();
  await page.locator('#prefecture-filter').selectOption({label:'東京都'});
  await page.locator('#spot-list-panel').evaluate(el=>el.scrollTop=300);
  const chosen=page.locator('.spot-list-card').nth(1);
  const id=await chosen.getAttribute('data-spot-id');
  await chosen.locator('.spot-list-open-button').click();
  await expect(page.locator('#spot-detail-panel')).toBeVisible();
  await page.waitForTimeout(500);
  const before=await page.evaluate(()=>({center:[map.getCenter().lat,map.getCenter().lng],zoom:map.getZoom(),scroll:spotListPanel.scrollTop}));
  await page.locator('#detail-close').click();
  await expect(page.locator('#spot-detail-panel')).toBeHidden();
  await expect(page.locator('#spot-search')).toHaveValue('東京');
  await expect(page.locator('#prefecture-filter')).toHaveValue('東京都');
  await expect(page.locator(`.spot-list-card[data-spot-id="${id}"]`)).toHaveClass(/is-selected-candidate/);
  const after=await page.evaluate(()=>({center:[map.getCenter().lat,map.getCenter().lng],zoom:map.getZoom(),scroll:spotListPanel.scrollTop}));
  expect(after.zoom).toBe(before.zoom);
  expect(after.scroll).toBe(before.scroll);
  expect(await page.evaluate(({before,after})=>map.project(before.center).distanceTo(map.project(after.center)),{before,after})).toBeLessThan(1);
});

test("mobile pin preview, save, detail, keyboard and browser back preserve the same place", async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();
  await page.evaluate(()=>map.setView([35.7101,139.8107],18,{animate:false}));
  await page.evaluate(()=>new Promise(resolve=>spotLayer.zoomToShowLayer(spotRecords.find(record=>record.spot.id==='chiikawaland-solamachi').marker,resolve)));
  await page.waitForTimeout(500);
  const pin=page.locator('.spot-marker[data-spot-id="chiikawaland-solamachi"]');
  await expect(pin).toBeVisible(); await pin.click();
  await expect(page.locator('#spot-preview')).toBeVisible();
  const snapshot=await page.evaluate(()=>({center:[map.getCenter().lat,map.getCenter().lng],zoom:map.getZoom(),id:selectedRecord.spot.id}));
  await expect(page.locator('.preview-plan')).toBeVisible();
  await page.locator('.preview-plan').click();await expect(page.locator('.preview-plan')).toHaveAttribute('aria-pressed','true');
  await page.locator('.preview-save').click();
  await expect(page.locator('.preview-save')).toHaveAttribute('aria-pressed','true');
  await page.locator('.preview-open').click();
  await expect(page.locator('#spot-detail-panel')).toHaveAttribute('aria-modal','true');
  await expect(page.locator('.explorer-primary-actions .spot-plan-button')).toHaveAttribute('aria-pressed','true');
  await page.keyboard.press('Tab');
  expect(await page.locator('#spot-detail-panel').evaluate(el=>el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#spot-detail-panel')).toBeHidden();
  await expect(page.locator('#spot-preview')).toBeVisible();
  const restored=await page.evaluate(()=>({center:[map.getCenter().lat,map.getCenter().lng],zoom:map.getZoom(),id:selectedRecord.spot.id}));
  expect(restored.zoom).toBe(snapshot.zoom);
  expect(restored.id).toBe(snapshot.id);
  expect(await page.evaluate(({snapshot,restored})=>map.project(snapshot.center).distanceTo(map.project(restored.center)),{snapshot,restored})).toBeLessThan(1);
  await page.locator('.preview-open').click();
  await expect(page.locator('#spot-detail-panel')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#spot-detail-panel')).toBeHidden();
  await expect(page.locator('#spot-preview')).toBeVisible();
  await page.reload();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('chiikawa-map-favorites-v1')))).toContain('chiikawaland-solamachi');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
});

test("compact widths keep controls in bounds and a modal detail has no serious accessibility violations", async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const width of [320,1024]) {
    await page.setViewportSize({width,height:844});
    await page.goto('/?spot=chiikawaland-solamachi');
    await expect(page.locator('#spot-detail-panel')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
    const detail=await page.locator('#spot-detail-panel').boundingBox();
    expect(detail.x).toBeGreaterThanOrEqual(0);
    expect(detail.x+detail.width).toBeLessThanOrEqual(width);
    if(width===1024) {
      expect(detail.x).toBe(0);
      expect(detail.height).toBe(788);
      await expect(page.locator('.explorer-sidebar')).toBeHidden();
      await expect(page.locator('#detail-close')).toBeVisible();
      await expect(page.locator('#map')).toBeVisible();
    } else {
      const audit=await new AxeBuilder({page}).include('#spot-detail-panel').analyze();
      expect(audit.violations.filter(item=>['serious','critical'].includes(item.impact))).toEqual([]);
    }
    await page.locator('#detail-close').click();
    await expect(page.locator('#spot-detail-panel')).toBeHidden();
    await expect(page.locator('#spot-search')).toBeEnabled();
  }
});

test("360px long names and 200 percent text keep exploration actions reachable", async ({page}) => {
  await page.setViewportSize({width:360,height:800});
  await page.goto('/');
  await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();
  await page.locator('#list-view-button').click();
  await page.evaluate(()=>{spotRecords[0].spot.name='東京スカイツリータウン・ソラマチのとても長い施設名と期間限定イベントを確認する候補';updateSpotFilters();});
  await page.evaluate(()=>{const sizes=[...document.querySelectorAll('body *')].map(el=>[el,parseFloat(getComputedStyle(el).fontSize)]);for(const [el,size] of sizes){if(Number.isFinite(size))el.style.setProperty('font-size',size*2+'px','important');}});
  await page.addStyleTag({content:'.home-map.explorer .spot-list-card h3,.home-map.explorer .spot-list-open-button{font-size:32px!important}.home-map.explorer .explorer-classification,.home-map.explorer .spot-list-card-meta,.home-map.explorer .explorer-entry-hint,.home-map.explorer .spot-list-timing{font-size:26px!important}.home-map.explorer .explorer-period,.home-map.explorer .explorer-save,.home-map.explorer .explorer-visited{font-size:28px!important}'});
  expect(await page.locator('.spot-list-open-button').first().evaluate(el=>parseFloat(getComputedStyle(el).lineHeight))).toBeGreaterThanOrEqual(48);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(360);
  for(const selector of ['#spot-search','#prefecture-filter','#filter-toggle','#list-view-button','.map-tools-menu > summary','#recent-additions [data-recent-filter]','.spot-list-open-button']) {
    const box=await page.locator(selector).first().boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(360);
  }
  await page.evaluate(()=>scrollTo(0,0));
  await expect(page.locator('.spot-list-open-button').first()).toContainText('とても長い施設名');
  await page.screenshot({path:'node_modules/.cache/ui-explorer-stress-360-text200.png'});
  await page.locator('.spot-list-open-button').first().click();
  await expect(page.locator('#detail-close')).toBeVisible();
  await page.locator('#detail-close').click();
});

test("zero and single candidates clear a preview excluded by changed conditions", async ({page}) => {
  await page.setViewportSize({width:360,height:800});await page.goto('/');
  await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();
  await page.evaluate(()=>openSpotPreview(spotRecords.find(r=>r.spot.id==='chiikawaland-solamachi')));
  await expect(page.locator('#spot-preview')).toBeVisible();
  await page.locator('#spot-search').fill('存在しない候補zzzz');await page.locator('h1').click();
  await expect(page.locator('#result-count')).toHaveText('0件表示');
  await expect(page.locator('#spot-preview')).toBeHidden();
  expect(await page.evaluate(()=>selectedRecord)).toBeNull();
  await page.screenshot({path:'node_modules/.cache/ui-explorer-stress-360-zero.png'});
  await page.locator('#spot-search').fill('ちいかわらんど 東京スカイツリータウン・ソラマチ店');await page.locator('h1').click();
  await expect(page.locator('#result-count')).toHaveText('1件表示');
  await page.locator('#list-view-button').click();await expect(page.locator('.spot-list-card')).toHaveCount(1);
  await page.screenshot({path:'node_modules/.cache/ui-explorer-stress-360-one.png'});
});

test("keyboard pin selection returns focus through preview, detail, Escape and browser back", async ({page}) => {
  await page.setViewportSize({width:360,height:800});await page.goto('/');
  await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();
  await page.evaluate(()=>map.setView([35.7101,139.8107],18,{animate:false}));
  await page.evaluate(()=>new Promise(resolve=>spotLayer.zoomToShowLayer(spotRecords.find(r=>r.spot.id==='chiikawaland-solamachi').marker,resolve)));await page.waitForTimeout(500);
  const pin=page.locator('.spot-marker[data-spot-id="chiikawaland-solamachi"]');await pin.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#spot-preview')).toBeFocused();
  await page.locator('.preview-open').focus();await page.keyboard.press('Enter');await expect(page.locator('#spot-detail-panel')).toBeFocused();
  await page.keyboard.press('Escape');await expect(page.locator('.preview-open')).toBeFocused();
  await page.keyboard.press('Enter');await expect(page.locator('#spot-detail-panel')).toBeVisible();await page.goBack();await expect(page.locator('.preview-open')).toBeFocused();
  await page.keyboard.press('Escape');await expect(page.locator('#spot-preview')).toBeHidden();await expect(pin).toBeFocused();
});

test("late cluster callbacks cannot reopen older selections after another selection or filters", async ({page}) => {
  await page.goto('/');await expect(page.locator('.spot-list-card').first()).toBeVisible();
  const audit=await page.evaluate(()=>{
    const pending=[];const original=spotLayer.zoomToShowLayer;
    spotLayer.zoomToShowLayer=(_marker,callback)=>pending.push(callback);
    const first=spotRecords.find(r=>r.spot.id==='chiikawaland-solamachi'), second=spotRecords.find(r=>r.spot.id==='chiikawaland-harajuku');
    focusSpotRecord(first);focusSpotRecord(second);pending[1]();pending[0]();
    const latest=selectedRecord?.spot.id;
    focusSpotRecord(first);spotSearch.value='存在しない候補zzzz';updateSpotFilters();pending[2]();
    spotLayer.zoomToShowLayer=original;
    return {latest,afterFilter:selectedRecord?.spot.id||null,detailHidden:detailPanel.hidden};
  });
  expect(audit.latest).toBe('chiikawaland-harajuku');expect(audit.afterFilter).toBeNull();expect(audit.detailHidden).toBe(true);
});

test("desktop modes change the layout and the initial map explains its unofficial classifications", async ({page}) => {
  await page.setViewportSize({width:1440,height:900});await page.goto('/');
  await expect(page.locator('#map')).toBeVisible();await expect(page.locator('.spot-list-card').first()).toBeVisible();
  await expect(page.locator('#map-view-button')).toHaveText('地図＋一覧');
  await expect(page.locator('#list-view-button')).toHaveText('一覧を広く');
  const legend=page.locator('.explorer-map-legend > summary');await expect(legend).toBeVisible();
  for(const label of ['非公式','公式','ナガノ','ファン'])await expect(legend).toContainText(label);
  await legend.click();await expect(page.locator('.explorer-legend-notes')).toContainText('出典');
  await page.keyboard.press('Escape');await expect(page.locator('.explorer-map-legend')).not.toHaveAttribute('open','');
  await page.locator('#list-view-button').click();await expect(page.locator('#map-content')).toBeHidden();
  expect((await page.locator('#spot-list-panel').boundingBox()).width).toBeGreaterThan(1300);
  await page.locator('#map-view-button').click();await expect(page.locator('#map')).toBeVisible();
  expect((await page.locator('.explorer-sidebar').boundingBox()).width).toBe(368);
});

test("NEW boundaries and last-day current status remain independent in the new UI", async ({page}) => {
  await page.goto('/');await expect(page.locator('.spot-list-card').first()).toBeVisible();
  const audit=await page.evaluate(()=>{
    const today=getTodayInJapan();const prior=days=>new Date(Date.parse(today)-days*86400000).toISOString().slice(0,10);
    const spot={...spotRecords[0].spot,periodType:'limited',startDate:today,endDate:today};
    return {day13:RecentAdditions.isNew(prior(13),today),day14:RecentAdditions.isNew(prior(14),today),unknown:RecentAdditions.isNew(null,today),status:getSpotPeriodStatus(spot),lastDayIncluded:RecentAdditions.selectRecent([spot],{[spot.id]:today},today).length,card:createSpotListCard({...spotRecords[0],spot}).textContent};
  });
  expect(audit.day13).toBe(true);expect(audit.day14).toBe(false);expect(audit.unknown).toBe(false);
  expect(audit.status).toBe('active');expect(audit.lastDayIncluded).toBe(1);expect(audit.card).toContain('本日まで');
});

test("candidate density and independent saved visited plan actions remain reachable", async ({page}) => {
  await page.setViewportSize({width:1440,height:1000});await page.goto('/');await expect(page.locator('.spot-list-card').first()).toBeVisible();
  const first=page.locator('.spot-list-card').first();
  expect((await first.boundingBox()).height).toBeLessThan(250);
  expect(await first.locator('h3').evaluate(el=>getComputedStyle(el).fontSize)).toBe('16px');
  await first.locator('.spot-list-favorite-button').click();await expect(first.locator('.spot-list-favorite-button')).toHaveAttribute('aria-pressed','true');
  await first.locator('.candidate-tools > summary').click();await first.locator('.spot-list-visited-button').click();
  await expect(first.locator('.explorer-visit-stamp')).toHaveText('行った');
  await expect(first.locator('.spot-list-favorite-button')).toHaveAttribute('aria-pressed','true');
  await first.locator('.candidate-tools > summary').click();await first.locator('.spot-list-plan-button').click();
  expect(await page.evaluate(()=>isPlanSpot(spotRecords.find(r=>r.spot.id===document.querySelector('.spot-list-card').dataset.spotId).spot))).toBe(true);
  await first.locator('.spot-list-open-button').click();
  await expect(page.locator('.explorer-primary-actions .spot-favorite-button')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.explorer-primary-actions .spot-visited-button')).toHaveAttribute('aria-pressed','true');
  await page.locator('.spot-favorite-button').focus();await page.keyboard.press('Space');
  await expect(page.locator('.spot-favorite-button')).toHaveAttribute('aria-pressed','false');await expect(page.locator('.spot-favorite-button')).toBeFocused();
  await page.keyboard.press('Space');await expect(page.locator('.spot-favorite-button')).toHaveAttribute('aria-pressed','true');await expect(page.locator('.spot-favorite-button')).toBeFocused();
  await page.locator('.spot-detail-action-menu > summary').click();await expect(page.locator('.spot-share-button')).toBeVisible();await expect(page.locator('.spot-plan-button')).toBeVisible();
  const order=await page.evaluate(()=>{
    const same=document.querySelector('.spot-same-place-card');return ['.explorer-visit-facts','.spot-hours-card','.spot-entry-card'].every(s=>{const node=document.querySelector(s);return !same||!node||!!(node.compareDocumentPosition(same)&Node.DOCUMENT_POSITION_FOLLOWING);});
  });expect(order).toBe(true);
  await page.locator('#detail-close').click();await page.locator('.recent-additions-details > summary').click();await expect(page.locator('#recent-additions-list a').first()).toBeVisible();
});

test("actual search selection retains geographic context and a connected selected name", async ({page}) => {
  await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();
  await page.locator('#spot-search').fill('ちいかわらんど 東京スカイツリータウン・ソラマチ店');
  await expect(page.locator('.search-suggestion').first()).toBeVisible();await page.locator('.search-suggestion').first().click();
  await expect(page.locator('#spot-detail-title')).toContainText('ソラマチ');await page.waitForTimeout(500);
  expect(await page.evaluate(()=>map.getZoom())).toBeLessThanOrEqual(16);
  await expect(page.locator('.spot-marker.is-selected')).toHaveCount(1);
  await expect(page.locator('.explorer-selection-leader line')).toHaveCount(1);
});

test("Saga Yamato wraps in words and zero candidates offer one reset action", async ({page}) => {
  await page.setViewportSize({width:1440,height:1000});await page.goto('/');await expect(page.locator('.spot-list-card').first()).toBeVisible();
  const title=page.locator('.spot-list-card').filter({hasText:'イオンモール佐賀大和'}).first().locator('.explorer-candidate-name');
  await expect(title).toHaveText('ちいかわPOP UP STORE イオンモール佐賀大和');
  const lines=await title.evaluate(el=>{
    const text=[...el.querySelectorAll('.explorer-name-part')].find(part=>part.textContent.includes('大和')).firstChild;
    const index=text.textContent.indexOf('大和');const range=document.createRange();range.setStart(text,index);range.setEnd(text,index+2);
    return [...range.getClientRects()].map(rect=>Math.round(rect.top));
  });expect(new Set(lines).size).toBe(1);
  await page.locator('#spot-search').fill('候補のない検索zzzz');await page.locator('h1').click();
  await expect(page.locator('#no-results-reset')).toBeVisible();await expect(page.locator('#active-filter-reset')).toBeHidden();
  await expect(page.locator('#no-results-reset')).toHaveText('絞り込みをリセット');await page.locator('#no-results-reset').click();
  await expect(page.locator('#spot-search')).toHaveValue('');await expect(page.locator('#no-results')).toBeHidden();await expect(page.locator('#spot-search')).toBeFocused();
});
