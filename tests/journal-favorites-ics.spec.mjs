import {
  expect,
  test
} from "@playwright/test";
import {
  readFile
} from "node:fs/promises";

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
    });
  }
);

test(
  "行きたいリストを絞り込み、保存を解除できる",
  async ({ page }) => {
    await page.goto(
      "/journal.html?view=favorites"
    );

    await expect(
      page.locator(
        "#favorites-list .favorite-card"
      )
    ).toHaveCount(2);
    await expect(
      page.locator(
        "#favorites-result-count"
      )
    ).toHaveText("2件");

    await page.locator(
      "#favorites-prefecture"
    ).selectOption("大阪府");
    await expect(page).toHaveURL(
      /fpref=%E5%A4%A7%E9%98%AA%E5%BA%9C/
    );
    await expect(
      page.locator(
        "#favorites-list .favorite-card"
      )
    ).toHaveCount(1);
    await expect(
      page.locator("#favorites-list")
    ).toContainText(
      "ちいかわらんど 大阪梅田店"
    );

    await page.getByRole(
      "button",
      {
        name: "行きたいから外す"
      }
    ).click();
    await expect(
      page.locator(
        "#favorites-result-count"
      )
    ).toHaveText("0件");
    const savedIds =
      await page.evaluate(
        () => JSON.parse(
          localStorage.getItem(
            "chiikawa-map-favorites-v1"
          )
        )
      );
    expect(savedIds).toEqual([
      "nagano-takao-mountain"
    ]);

    await page.setViewportSize({
      width: 390,
      height: 844
    });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          window.innerWidth
      )
    ).toBe(true);
  }
);

test(
  "登録方法を選び、イベントと今日のプランをICSで保存できる",
  async ({ page }) => {
    await page.goto(
      "/journal.html?view=calendar&date=2026-09-01"
    );

    await page.locator(
      "#calendar-day-list .calendar-event-card"
    ).first().getByRole(
      "button",
      {
        name: "カレンダーに登録"
      }
    ).click();
    await expect(
      page.locator(
        "#calendar-export-dialog"
      )
    ).toBeVisible();
    await expect(
      page.locator(
        "#calendar-google-link"
      )
    ).toHaveAttribute(
      "href",
      /calendar\.google\.com.*action=TEMPLATE/
    );
    await expect(
      page.locator(
        ".calendar-export-help"
      )
    ).toContainText(
      "予定作成画面を直接開けない"
    );

    await page.context()
      .grantPermissions([
        "clipboard-read",
        "clipboard-write"
      ]);
    await page.locator(
      "#calendar-copy-details"
    ).click();
    await expect(
      page.locator(
        "#calendar-export-status"
      )
    ).toContainText(
      "予定情報をコピーしました"
    );
    const copiedEvent =
      await page.evaluate(
        () => navigator.clipboard.readText()
      );
    expect(copiedEvent).toContain(
      "日程:"
    );
    expect(copiedEvent).toContain(
      "ちい活MAP:"
    );

    const eventDownloadPromise =
      page.waitForEvent("download");
    await page.locator(
      "#calendar-ics-download"
    ).click();
    const eventDownload =
      await eventDownloadPromise;
    expect(
      eventDownload.suggestedFilename()
    ).toMatch(
      /^chiikatsu-.+\.ics$/
    );
    const eventCalendar =
      await readFile(
        await eventDownload.path(),
        "utf8"
      );
    expect(eventCalendar).toContain(
      "BEGIN:VCALENDAR"
    );
    expect(eventCalendar).toContain(
      "BEGIN:VEVENT"
    );
    await expect(
      page.locator(
        "#calendar-export-status"
      )
    ).toContainText(
      "ICSに対応している場合"
    );
    await expect(
      page.locator(
        "#calendar-ics-download"
      )
    ).toHaveText(
      "ICSファイルをもう一度保存"
    );
    await page.locator(
      "#calendar-export-close"
    ).click();

    await page.locator(
      "#plan-tab"
    ).click();
    await page.locator(
      "#plan-calendar"
    ).click();
    await expect(
      page.locator(
        "#calendar-export-summary"
      )
    ).toContainText(
      "今日のプラン（2スポット）"
    );
    const planDownloadPromise =
      page.waitForEvent("download");
    await page.locator(
      "#calendar-ics-download"
    ).click();
    const planDownload =
      await planDownloadPromise;
    expect(
      planDownload.suggestedFilename()
    ).toBe(
      "chiikatsu-plan-2026-09-01.ics"
    );
    const planCalendar =
      await readFile(
        await planDownload.path(),
        "utf8"
      );
    expect(planCalendar).toContain(
      "SUMMARY:ちい活プラン"
    );
    expect(planCalendar).toContain(
      "ちいかわらんど 大阪梅田店"
    );
  }
);
