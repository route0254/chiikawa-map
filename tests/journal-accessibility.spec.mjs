import {
  expect,
  test
} from "@playwright/test";

test.beforeEach(
  async ({ page }) => {
    await page.clock.setFixedTime(
      new Date(
        "2026-09-01T03:00:00.000Z"
      )
    );
    await page.addInitScript(() => {
      localStorage.setItem(
        "chiikawa-map-favorites-v1",
        JSON.stringify([
          "chiikawaland-osaka-umeda",
          "nagano-takao-mountain"
        ])
      );
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
);

test(
  "手帳タブを矢印キーとHome・Endで移動できる",
  async ({ page }) => {
    await page.goto(
      "/journal.html?view=calendar&date=2026-09-01"
    );

    const calendarTab =
      page.locator("#calendar-tab");
    const favoritesTab =
      page.locator("#favorites-tab");
    const activityTab =
      page.locator("#activity-tab");

    await expect(calendarTab)
      .toHaveAttribute("tabindex", "0");
    await expect(favoritesTab)
      .toHaveAttribute("tabindex", "-1");

    await calendarTab.focus();
    await page.keyboard.press(
      "ArrowRight"
    );
    await expect(favoritesTab)
      .toBeFocused();
    await expect(favoritesTab)
      .toHaveAttribute(
        "aria-selected",
        "true"
      );
    await expect(page).toHaveURL(
      /view=favorites/
    );

    await page.keyboard.press("End");
    await expect(activityTab)
      .toBeFocused();
    await expect(page).toHaveURL(
      /view=activity/
    );

    await page.keyboard.press("Home");
    await expect(calendarTab)
      .toBeFocused();
    await expect(page).toHaveURL(
      /view=calendar/
    );
  }
);

test(
  "200%拡大相当でも手帳の各表示が横にはみ出さない",
  async ({ page }) => {
    await page.setViewportSize({
      width: 640,
      height: 450
    });
    await page.goto(
      "/journal.html?view=calendar&date=2026-09-01"
    );

    for (
      const view of [
        "calendar",
        "favorites",
        "plan",
        "activity"
      ]
    ) {
      await page.locator(
        `[data-journal-view="${view}"]`
      ).click();
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth
        )
      ).toBe(true);
    }
  }
);

test(
  "動きを減らす設定では足あと内を即時スクロールする",
  async ({ page }) => {
    await page.emulateMedia({
      reducedMotion: "reduce"
    });
    await page.addInitScript(() => {
      window.__scrollOptions = [];
      Element.prototype.scrollIntoView =
        function captureScrollOptions(
          options
        ) {
          window.__scrollOptions.push(
            options
          );
        };
    });
    await page.goto(
      "/journal.html?view=activity"
    );
    await page.locator(
      "button.activity-progress-item"
    ).first().click();

    expect(
      await page.evaluate(
        () =>
          window.__scrollOptions.at(-1)
            ?.behavior
      )
    ).toBe("auto");
  }
);

test(
  "色を使えない表示でも選択日と開催状態を文字で確認できる",
  async ({ page }) => {
    await page.emulateMedia({
      forcedColors: "active"
    });
    await page.goto(
      "/journal.html?view=calendar&date=2026-09-01"
    );

    const selectedDay =
      page.locator(
        "#calendar-grid .calendar-day.is-selected"
      );
    await expect(selectedDay)
      .toHaveAttribute(
        "aria-pressed",
        "true"
      );
    await expect(
      page.locator(
        '#calendar-grid .calendar-day[aria-current="date"]'
      )
    ).toHaveCount(1);
    await expect(
      page.locator(
        "#calendar-day-list .calendar-event-badge"
      ).first()
    ).not.toBeEmpty();
  }
);
