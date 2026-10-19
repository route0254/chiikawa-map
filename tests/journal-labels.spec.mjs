import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Fixed records keep label coverage independent of future listing changes.
const spots = [
  "chiikawaland",
  "chiikawaland",
  "chiikawa_bakery",
  "chiikawa_movie",
  "nagano_market"
].map((brand, index) => ({
  id: `label-regression-${index}`,
  name: `読み上げテスト会場${index + 1}`,
  category: "official",
  placeType: "shop",
  relationType: "official_facility",
  brand,
  periodType: "limited",
  startDate: "2026-09-01",
  endDate: index === 0 ? "2026-09-02" : "2026-09-01",
  address: "東京都千代田区",
  lat: 35.681,
  lng: 139.767,
  description: "表示文と読み上げ名の回帰テストです。",
  sourceUrl: "https://example.com/"
}));

async function expectMatchingLabels(page, selector) {
  const results = await new AxeBuilder({ page })
    .include(selector)
    .withRules(["label-content-name-mismatch"])
    .analyze();
  expect(results.violations).toEqual([]);
}

for (const width of [1280, 390]) {
  test.describe(`journal labels at ${width}px`, () => {
    test.use({ viewport: { width, height: 844 } });

    test.beforeEach(async ({ page }) => {
      await page.clock.setFixedTime(new Date("2026-09-01T03:00:00Z"));
      for (const file of [
        "official-spots.json",
        "official-events-archive.json",
        "nagano-spots.json",
        "community-spots.json"
      ]) {
        await page.route(`**/data/${file}`, route => route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(file === "official-spots.json" ? spots : [])
        }));
      }
    });

    test("calendar names include all visible labels and retain date context", async ({ page }) => {
      await page.goto("/journal.html?view=calendar&date=2026-09-01");
      const days = page.locator("#calendar-grid .calendar-day");
      await expect(days).toHaveCount(42);
      const selected = page.locator(".calendar-day.is-selected");
      await expect(selected.locator(".calendar-day-group")).toHaveText([
        "ちいかわらんど2件",
        "ちいかわ映画 POP UP1件",
        "ナガノマーケット1件"
      ]);
      await expect(selected.locator(".calendar-day-group-more")).toHaveText("ほか1種類");
      await expect(selected.locator(".starts")).toHaveText("開始5");
      await expect(selected.locator(".ends")).toHaveText("最終4");
      await expect(selected).toHaveAccessibleName(
        "1ちいかわらんど2件ちいかわ映画 POP UP1件ナガノマーケット1件ほか1種類開始5最終4、2026年9月1日(火)、ベーカリー1件"
      );
      await expect(selected).toHaveAttribute("aria-pressed", "true");
      await expect(selected).toHaveAttribute("aria-current", "date");

      // Empty days and both adjacent months retain their actual full date.
      await expect(days.nth(0)).toHaveAccessibleName("30、2026年8月30日(日)、イベントなし");
      await expect(days.nth(4)).toHaveAccessibleName("3、2026年9月3日(木)、イベントなし");
      await expect(days.nth(32)).toHaveAccessibleName("1、2026年10月1日(木)、イベントなし");
      await expect(days.nth(3)).toHaveAccessibleName("2ちいかわらんど1件最終1、2026年9月2日(水)");
      await expectMatchingLabels(page, "#calendar-grid");

      await days.nth(0).click();
      await expect(page).toHaveURL(/date=2026-08-30/);
      await expect(page.locator("#calendar-month-label")).toHaveText("2026年8月");
      await expect(page.locator(".calendar-day.is-selected")).toHaveAccessibleName("30、2026年8月30日(日)、イベントなし");
      await expect(page.locator("#calendar-day-count")).toHaveText("0件");
      await expectMatchingLabels(page, "#calendar-grid");
    });

    for (const shared of [false, true]) {
      test(`${shared ? "shared" : "saved"} plan detail links keep their visible label`, async ({ page }) => {
        const ids = spots.slice(0, 2).map(spot => spot.id);
        if (!shared) {
          await page.addInitScript(planIds => {
            localStorage.setItem("chiikawa-map-plan-v1", JSON.stringify(planIds));
          }, ids);
        }
        await page.goto(
          "/journal.html?view=plan" + (shared ? `&plan=${ids.join(",")}` : "")
        );
        await expect(page.locator("#plan-list .plan-stop")).toHaveCount(2);
        if (shared) {
          await expect(page.locator("#shared-plan-banner")).toBeVisible();
        }
        for (const spot of spots.slice(0, 2)) {
          const detail = page.getByRole("link", { name: `詳細: ${spot.name}`, exact: true });
          await expect(detail).toHaveText("詳細");
          await expect(detail).toHaveAttribute("href", new URL(`spot/${spot.id}/`, page.url()).href);
        }
        await expectMatchingLabels(page, "#plan-list");
      });
    }
  });
}
