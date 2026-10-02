import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
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
    return [".spot-address", ".spot-period", ".spot-entry-card"].every(selector => {
      const fact = document.querySelector(`#spot-detail-body ${selector}`);
      return !fact || Boolean(fact.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });
  expect(order).toBe(true);
  await actions.locator("summary").click();
  await expect(page.locator(".spot-detail-actions .spot-visited-button")).toBeVisible();
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
  await page.locator("#detail-close").click();
  await expect(page.locator("#spot-detail-panel")).toBeHidden();
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();
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
  await page.locator('.preview-save').click();
  await expect(page.locator('.preview-save')).toHaveAttribute('aria-pressed','true');
  await page.locator('.preview-open').click();
  await expect(page.locator('#spot-detail-panel')).toHaveAttribute('aria-modal','true');
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
