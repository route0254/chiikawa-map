import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test
} from "@playwright/test";

const pages = [
  {
    name: "公式スポット一覧",
    path: "/official.html",
    ready: "#current-groups .official-spot-card"
  },
  {
    name: "ちい活手帳",
    path: "/journal.html?view=calendar&date=2026-09-01",
    ready: "#calendar-grid .calendar-day"
  },
  {
    name: "カレンダー登録画面",
    path: "/journal.html?view=calendar&date=2026-09-01",
    ready: "#calendar-export-dialog[open]",
    openCalendar: true
  },
  {
    name: "行きたいリスト",
    path: "/journal.html?view=favorites",
    ready: "#favorites-list .favorite-card",
    favorites: true
  },
  {
    name: "ちい活プラン",
    path: "/journal.html?view=plan",
    ready: "#plan-list .plan-stop",
    records: true
  },
  {
    name: "共有されたちい活プラン",
    path: "/journal.html?view=plan&plan=chiikawaland-osaka-umeda,nagano-takao-mountain",
    ready: "#shared-plan-banner:not([hidden])"
  },
  {
    name: "わたしの足あと",
    path: "/journal.html?view=activity",
    ready: ".activity-summary-card",
    records: true
  }
];

for (const target of pages) {
  test(
    `${target.name}に重大なアクセシビリティ違反がない`,
    async ({ page }) => {
      if (
        target.favorites ||
        target.records
      ) {
        await page.addInitScript(() => {
          localStorage.setItem(
            "chiikawa-map-favorites-v1",
            JSON.stringify([
              "chiikawaland-osaka-umeda"
            ])
          );
        });
      }

      if (target.records) {
        await page.addInitScript(() => {
          localStorage.setItem(
            "chiikawa-map-plan-v1",
            JSON.stringify([
              "chiikawaland-osaka-umeda",
              "nagano-takao-mountain"
            ])
          );
          localStorage.setItem(
            "chiikawa-map-visited-v1",
            JSON.stringify([
              "chiikawaland-osaka-umeda"
            ])
          );
        });
      }

      await page.goto(target.path);

      if (target.openCalendar) {
        await page.getByRole(
          "button",
          {
            name: "カレンダーに登録"
          }
        ).first().click();
      }

      await page.locator(target.ready)
        .first()
        .waitFor();

      const results = await new AxeBuilder({ page })
        .withTags([
          "wcag2a",
          "wcag2aa",
          "wcag21a",
          "wcag21aa"
        ])
        .analyze();
      const summary = results.violations.map(
        violation => ({
          id: violation.id,
          impact: violation.impact,
          help: violation.help,
          targets: violation.nodes
            .map(node => node.target)
        })
      );

      expect(
        summary,
        JSON.stringify(summary, null, 2)
      ).toEqual([]);
    }
  );
}
