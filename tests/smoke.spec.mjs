import {
  expect,
  test
} from "@playwright/test";
import {
  readFile
} from "node:fs/promises";
import {
  dirname,
  resolve
} from "node:path";
import {
  fileURLToPath
} from "node:url";


const projectDirectory =
  resolve(
    dirname(
      fileURLToPath(
        import.meta.url
      )
    ),
    ".."
  );


const localMapAssets = [
  {
    url:
      "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
    path:
      "node_modules/leaflet/dist/leaflet.css",
    contentType:
      "text/css"
  },
  {
    url:
      "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
    path:
      "node_modules/leaflet/dist/leaflet.js",
    contentType:
      "text/javascript"
  },
  {
    url:
      "https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/MarkerCluster.css",
    path:
      "node_modules/leaflet.markercluster/dist/MarkerCluster.css",
    contentType:
      "text/css"
  },
  {
    url:
      "https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js",
    path:
      "node_modules/leaflet.markercluster/dist/leaflet.markercluster.js",
    contentType:
      "text/javascript"
  }
];


const transparentTile =
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64"
  );


test.beforeEach(
  async ({ page }) => {
    for (
      const asset of
      localMapAssets
    ) {
      await page.route(
        asset.url,
        async route => {
          await route.fulfill({
            body:
              await readFile(
                resolve(
                  projectDirectory,
                  asset.path
                )
              ),
            contentType:
              asset.contentType,
            status:
              200
          });
        }
      );
    }

    for (
      const tilePattern of [
        "https://tile.openstreetmap.org/**",
        "https://tiles.stadiamaps.com/**"
      ]
    ) {
      await page.route(
        tilePattern,
        async route => {
          await route.fulfill({
            body:
              transparentTile,
            contentType:
              "image/png",
            status:
              200
          });
        }
      );
    }

    page.on(
      "pageerror",
      error => {
        console.error(
          "Browser page error:",
          error.stack ||
          error.message
        );
      }
    );
  }
);


async function waitForSpots(
  page
) {
  const resultCount =
    page.locator(
      "#result-count"
    );

  await expect(
    resultCount
  ).toHaveText(
    /^\d+件表示$/
  );

  const visibleCount =
    Number(
      (
        await resultCount.textContent()
      ).replace(
        "件表示",
        ""
      )
    );

  expect(
    visibleCount
  ).toBeGreaterThan(0);

  await page.waitForTimeout(500);

  return visibleCount;
}


async function expectMinTouchTarget(
  page,
  selector
) {
  const box =
    await page.locator(
      selector
    ).first().boundingBox();

  expect(
    box,
    selector +
    "が表示されていること"
  ).not.toBeNull();

  expect(
    box.width,
    selector +
    "の幅"
  ).toBeGreaterThanOrEqual(44);

  expect(
    box.height,
    selector +
    "の高さ"
  ).toBeGreaterThanOrEqual(44);
}


test(
  "地図と一覧を切り替え、一覧DOMは必要な時だけ生成する",
  async ({ page }) => {
    await page.goto("/");

    const visibleCount =
      await waitForSpots(page);

    await expect(
      page.locator(
        ".spot-list-card"
      )
    ).toHaveCount(0);

    await page.locator(
      "#list-view-button"
    ).click();

    await expect(
      page.locator(
        "#spot-list-panel"
      )
    ).toBeVisible();

    await expect(
      page.locator(
        ".spot-list-card"
      )
    ).toHaveCount(
      visibleCount
    );

    await page.locator(
      "#map-view-button"
    ).click();

    await expect(
      page.locator(
        ".spot-list-card"
      )
    ).toHaveCount(0);
  }
);


test(
  "検索から詳細を開き、報告リンクとフォーカス復帰を利用できる",
  async ({ page }) => {
    await page.goto("/");
    await waitForSpots(page);

    const search =
      page.locator(
        "#spot-search"
      );

    await search.fill("東京");

    const firstSuggestion =
      page.locator(
        ".search-suggestion"
      ).first();

    await expect(
      firstSuggestion
    ).toBeVisible();

    await firstSuggestion.click();

    const detailPanel =
      page.locator(
        "#spot-detail-panel"
      );

    await expect(
      detailPanel
    ).toBeVisible();

    await expect(
      detailPanel
    ).toBeFocused();

    await expect(
      detailPanel.locator(
        "#spot-detail-title"
      )
    ).not.toBeEmpty();

    await expect(
      detailPanel.locator(
        ".spot-report-link"
      )
    ).toHaveAttribute(
      "href",
      /github\.com\/route0254\/chiikawa-map\/issues\/new/
    );

    await expect(
      detailPanel.locator(
        ".spot-map-button"
      )
    ).toBeVisible();

    await expect(
      detailPanel.locator(
        ".spot-map-button"
      )
    ).toHaveAttribute(
      "href",
      /^https?:\/\//
    );

    await expect(
      detailPanel.locator(
        ".spot-map-button"
      )
    ).toHaveAttribute(
      "target",
      "_blank"
    );

    await expect(
      detailPanel.locator(
        ".spot-map-button"
      )
    ).toHaveAttribute(
      "rel",
      "noopener noreferrer"
    );

    await page.locator(
      "#detail-close"
    ).click();

    await expect(search).toBeFocused();
  }
);


test(
  "各ダイアログのフォーカスを保ち、保存データを専用パネルで操作する",
  async ({ page }) => {
    await page.goto("/");
    await waitForSpots(page);

    const toggle =
      page.locator(
        "#filter-toggle"
      );

    const panel =
      page.locator(
        "#filter-panel"
      );

    await toggle.click();

    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute(
      "aria-modal",
      "true"
    );
    await expect(
      page.locator(
        "#filter-close"
      )
    ).toBeFocused();

    await page.keyboard.press(
      "Shift+Tab"
    );

    expect(
      await panel.evaluate(
        element =>
          element.contains(
            document.activeElement
          )
      )
    ).toBe(true);

    await page.keyboard.press(
      "Escape"
    );

    await expect(panel).toBeHidden();
    await expect(toggle).toBeFocused();

    const savedToggle =
      page.locator(
        "#saved-data-toggle"
      );

    const savedPanel =
      page.locator(
        "#saved-data-panel"
      );

    await savedToggle.click();

    await expect(savedPanel).toBeVisible();
    await expect(savedPanel).toHaveAttribute(
      "aria-modal",
      "true"
    );
    await expect(
      page.locator(
        "#saved-data-close"
      )
    ).toBeFocused();

    await expect(
      page.locator(
        "#saved-data-export"
      )
    ).toBeVisible();

    await expect(
      page.locator(
        "#saved-data-import"
      )
    ).toBeVisible();

    await page.locator(
      "#saved-data-file"
    ).setInputFiles({
      name:
        "chiikatsu-map-saved-test.json",
      mimeType:
        "application/json",
      buffer:
        Buffer.from(
          JSON.stringify({
            format:
              "chiikatsu-map-saved-spots",
            version:
              1,
            exportedAt:
              "2026-08-26T00:00:00.000Z",
            favorites: [
              "chiikawaland-osaka-umeda"
            ],
            visited: [
              "nagano-takao-mountain"
            ]
          })
        )
    });

    await expect(
      page.locator(
        "#app-status-message"
      )
    ).toContainText(
      "保存データを追加統合しました"
    );

    const savedValues =
      await page.evaluate(
        () => ({
          favorites:
            JSON.parse(
              localStorage.getItem(
                "chiikawa-map-favorites-v1"
              )
            ),
          visited:
            JSON.parse(
              localStorage.getItem(
                "chiikawa-map-visited-v1"
              )
            )
        })
      );

    expect(
      savedValues.favorites
    ).toContain(
      "chiikawaland-osaka-umeda"
    );

    expect(
      savedValues.visited
    ).toContain(
      "nagano-takao-mountain"
    );

    const downloadPromise =
      page.waitForEvent(
        "download"
      );

    await page.locator(
      "#saved-data-export"
    ).click();

    const download =
      await downloadPromise;

    expect(
      download.suggestedFilename()
    ).toMatch(
      /^chiikatsu-map-saved-\d{4}-\d{2}-\d{2}\.json$/
    );

    await page.keyboard.press(
      "Escape"
    );

    await expect(savedPanel).toBeHidden();
    await expect(savedToggle).toBeFocused();
  }
);


test(
  "同一座標の最大6スポットを展開し、ピンと名称ラベルを分散する",
  async ({ page }) => {
    await page.goto(
      "/?spot=chiikawaland-nagoya"
    );

    await waitForSpots(page);

    await expect(
      page.locator(
        "#spot-detail-panel"
      )
    ).toBeVisible();

    await page.waitForTimeout(700);

    const duplicateIds = [
      "chiikawaland-nagoya",
      "magical-nagoya",
      "ramen-buta-nagoya",
      "chiikawa-yaki-nagoya",
      "pocket-popup-nagoya",
      "movie-cafe-nagoya"
    ];

    const markerPositions = [];

    for (
      const spotId of
      duplicateIds
    ) {
      const marker =
        page.locator(
          '.spot-marker[data-spot-id="' +
          spotId +
          '"]'
        );

      await expect(marker).toBeVisible();

      const box =
        await marker.boundingBox();

      markerPositions.push(
        Math.round(box.x) +
        "," +
        Math.round(box.y)
      );
    }

    expect(
      new Set(
        markerPositions
      ).size
    ).toBe(
      duplicateIds.length
    );

    const labels =
      await page.locator(
        ".spot-name-label-duplicate"
      ).evaluateAll(
        elements =>
          elements
            .filter(
              element =>
                element.getClientRects().length >
                0
            )
            .map(
              element => {
                const rect =
                  element.getBoundingClientRect();

                return {
                  className:
                    element.className,
                  left:
                    rect.left,
                  right:
                    rect.right,
                  top:
                    rect.top,
                  bottom:
                    rect.bottom
                };
              }
            )
      );

    expect(labels).toHaveLength(
      duplicateIds.length
    );

    expect(
      labels.some(
        label =>
          label.className.includes(
            "spot-name-label-right"
          )
      )
    ).toBe(true);

    expect(
      labels.some(
        label =>
          label.className.includes(
            "spot-name-label-left"
          )
      )
    ).toBe(true);

    expect(
      labels.some(
        label =>
          label.className.includes(
            "spot-name-label-top"
          )
      )
    ).toBe(true);

    expect(
      labels.some(
        label =>
          label.className.includes(
            "spot-name-label-bottom"
          )
      )
    ).toBe(true);

    for (
      let firstIndex = 0;
      firstIndex < labels.length;
      firstIndex++
    ) {
      for (
        let secondIndex =
          firstIndex + 1;
        secondIndex < labels.length;
        secondIndex++
      ) {
        const first =
          labels[firstIndex];

        const second =
          labels[secondIndex];

        const overlapWidth =
          Math.max(
            0,
            Math.min(
              first.right,
              second.right
            ) -
            Math.max(
              first.left,
              second.left
            )
          );

        const overlapHeight =
          Math.max(
            0,
            Math.min(
              first.bottom,
              second.bottom
            ) -
            Math.max(
              first.top,
              second.top
            )
          );

        expect(
          overlapWidth *
          overlapHeight
        ).toBe(0);
      }
    }
  }
);


test(
  "スマートフォン幅で主要操作を44px以上に保つ",
  async ({ page }) => {
    await page.setViewportSize({
      width: 390,
      height: 844
    });

    await page.goto("/");
    await waitForSpots(page);

    const selectors = [
      "#spot-search",
      "#prefecture-filter",
      "#filter-toggle",
      "#location-button",
      "#map-view-button",
      "#list-view-button",
      "#favorite-filter-button",
      "#visited-filter-button",
      "#saved-data-toggle"
    ];

    for (
      const selector of
      selectors
    ) {
      await expectMinTouchTarget(
        page,
        selector
      );
    }

    await page.locator(
      "#filter-toggle"
    ).click();

    await expectMinTouchTarget(
      page,
      ".filter-chip span"
    );

    await page.locator(
      "#filter-close"
    ).click();

    await page.locator(
      "#list-view-button"
    ).click();

    for (
      const selector of [
        ".spot-list-tool-button",
        ".spot-list-favorite-button",
        ".spot-list-visited-button",
        ".spot-list-share-button",
        ".spot-list-open-button"
      ]
    ) {
      await expectMinTouchTarget(
        page,
        selector
      );
    }

    const hasHorizontalOverflow =
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth
      );

    expect(
      hasHorizontalOverflow
    ).toBe(false);
  }
);
