import {test,expect} from '@playwright/test';
const ids=['chiikawaland-harajuku','chiikawaland-solamachi'];
test.beforeEach(async({page})=>{
 await page.addInitScript(ids=>{
  if(sessionStorage.getItem('journal-content-fixture'))return;
  sessionStorage.setItem('journal-content-fixture','seeded');
  localStorage.setItem('chiikawa-map-favorites-v1',JSON.stringify(ids));
  localStorage.setItem('chiikawa-map-plan-v1',JSON.stringify(ids));
  localStorage.setItem('chiikawa-map-visited-v1',JSON.stringify([ids[0]]));
  localStorage.setItem('chiikawa-map-visit-details-v1',JSON.stringify({[ids[0]]:{visitedAt:'2026-09-28',note:'記録された日付とメモ'}}));
 },ids);
});
for(const width of [390,1440])test(`saved journal content and existing notes remain usable at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:1000});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 for(const [view,selector,limit]of[['plan','.plan-stop',600],['favorites','.favorite-card',650],['activity','.recent-activity-card',500]]){
  await page.goto('/journal.html?view='+view);await expect(page.locator(selector).first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
 }
 await expect(page.locator('.recent-activity-card time')).toHaveAttribute('datetime','2026-09-28');
 await expect(page.locator('.recent-activity-card')).toContainText('記録された日付とメモ');
await expect(page.locator('#journal-favorite-count')).toBeVisible();await expect(page.locator('#journal-favorite-count')).toHaveText('2');
 expect(errors).toEqual([]);
});
test('reordering and shared-plan saving keep the existing storage semantics',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/journal.html?view=plan');
 await expect(page.locator('.plan-stop')).toHaveCount(2);
 await page.locator('.plan-stop').first().getByRole('button',{name:'1つ後へ'}).click();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('chiikawa-map-plan-v1')))).toEqual([...ids].reverse());
 await page.goto('/journal.html?view=plan&plan='+ids.join(','));await expect(page.locator('#shared-plan-banner')).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('chiikawa-map-plan-v1')))).toEqual([...ids].reverse());
 await page.locator('#save-shared-plan').click();await expect(page.locator('#shared-plan-banner')).toBeHidden();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('chiikawa-map-plan-v1')))).toEqual(ids);
});
