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


async function getDuplicateLayoutAudit(
  page,
  spotIds
) {
  return page.evaluate(
    ids => {
      const directions = [
        "top",
        "right",
        "bottom",
        "left"
      ];

      const items =
        ids.map(
          id => {
            const marker =
              document.querySelector(
                '.spot-marker[data-spot-id="' +
                id +
                '"]'
              )
                ?.getBoundingClientRect();

            const labelElement =
              document.querySelector(
                '.spot-name-label-duplicate[data-spot-id="' +
                id +
                '"]'
              );

            const label =
              labelElement
                ?.getBoundingClientRect();

            const direction =
              directions.find(
                value =>
                  labelElement
                    ?.classList
                    .contains(
                      "spot-name-label-" +
                      value
                    )
              );

            return {
              direction,
              label: {
                bottom:
                  label.bottom,
                left:
                  label.left,
                right:
                  label.right,
                top:
                  label.top
              },
              marker: {
                x:
                  marker.left +
                  marker.width / 2,
                y:
                  marker.top +
                  marker.height / 2
              }
            };
          }
        );

      const center = {
        x:
          items.reduce(
            (sum, item) =>
              sum + item.marker.x,
            0
          ) / items.length,
        y:
          items.reduce(
            (sum, item) =>
              sum + item.marker.y,
            0
          ) / items.length
      };

      const labelOverlaps = [];

      for (
        let firstIndex = 0;
        firstIndex < items.length;
        firstIndex++
      ) {
        for (
          let secondIndex =
            firstIndex + 1;
          secondIndex < items.length;
          secondIndex++
        ) {
          const first =
            items[firstIndex].label;

          const second =
            items[secondIndex].label;

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

          if (
            overlapWidth *
            overlapHeight > 0
          ) {
            labelOverlaps.push([
              firstIndex,
              secondIndex
            ]);
          }
        }
      }

      const segments =
        items.map(
          item => {
            if (
              item.direction ===
                "top"
            ) {
              return {
                axis: "vertical",
                fixed:
                  item.marker.x,
                from:
                  item.label.bottom,
                to:
                  item.marker.y
              };
            }

            if (
              item.direction ===
                "bottom"
            ) {
              return {
                axis: "vertical",
                fixed:
                  item.marker.x,
                from:
                  item.marker.y,
                to:
                  item.label.top
              };
            }

            if (
              item.direction ===
                "left"
            ) {
              return {
                axis: "horizontal",
                fixed:
                  item.marker.y,
                from:
                  item.label.right,
                to:
                  item.marker.x
              };
            }

            return {
              axis: "horizontal",
              fixed:
                item.marker.y,
              from:
                item.marker.x,
              to:
                item.label.left
            };
          }
        );

      const isBetween =
        (
          value,
          first,
          second
        ) =>
          value >=
            Math.min(
              first,
              second
            ) &&
          value <=
            Math.max(
              first,
              second
            );

      const lineCrossings = [];

      for (
        let firstIndex = 0;
        firstIndex < segments.length;
        firstIndex++
      ) {
        for (
          let secondIndex =
            firstIndex + 1;
          secondIndex < segments.length;
          secondIndex++
        ) {
          const first =
            segments[firstIndex];

          const second =
            segments[secondIndex];

          let crosses = false;

          if (
            first.axis ===
            second.axis
          ) {
            crosses =
              Math.abs(
                first.fixed -
                second.fixed
              ) < 0.5 &&
              Math.max(
                Math.min(
                  first.from,
                  first.to
                ),
                Math.min(
                  second.from,
                  second.to
                )
              ) <=
              Math.min(
                Math.max(
                  first.from,
                  first.to
                ),
                Math.max(
                  second.from,
                  second.to
                )
              );
          } else {
            const vertical =
              first.axis ===
                "vertical"
                ? first
                : second;

            const horizontal =
              first.axis ===
                "horizontal"
                ? first
                : second;

            crosses =
              isBetween(
                vertical.fixed,
                horizontal.from,
                horizontal.to
              ) &&
              isBetween(
                horizontal.fixed,
                vertical.from,
                vertical.to
              );
          }

          if (crosses) {
            lineCrossings.push([
              firstIndex,
              secondIndex
            ]);
          }
        }
      }

      const outward =
        items.every(
          item => {
            if (
              item.direction ===
                "top"
            ) {
              return item.marker.y <=
                center.y;
            }

            if (
              item.direction ===
                "bottom"
            ) {
              return item.marker.y >=
                center.y;
            }

            if (
              item.direction ===
                "left"
            ) {
              return item.marker.x <=
                center.x;
            }

            return item.marker.x >=
              center.x;
          }
        );

      return {
        directions:
          items.map(
            item =>
              item.direction
          ),
        labelOverlaps,
        lineCrossings,
        outward
      };
    },
    spotIds
  );
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
  "適用中の条件を表示し、ゼロ件から全件表示へ戻せる",
  async ({ page }) => {
    await page.goto("/");

    const visibleCount =
      await waitForSpots(page);

    const search =
      page.locator(
        "#spot-search"
      );

    await search.fill(
      "存在しないスポット名12345"
    );

    await expect(
      page.locator(
        "#result-count"
      )
    ).toHaveText("0件表示");

    await expect(
      page.locator(
        "#active-filter-summary"
      )
    ).toBeVisible();

    await expect(
      page.locator(
        "#active-filter-list"
      )
    ).toContainText(
      "存在しないスポット名12345"
    );

    await expect(
      page.locator(
        "#no-results"
      )
    ).toBeVisible();

    await page.locator(
      "#no-results-reset"
    ).click();

    await expect(search).toHaveValue("");
    await expect(search).toBeFocused();

    await expect(
      page.locator(
        "#result-count"
      )
    ).toHaveText(
      visibleCount +
      "件表示"
    );

    await expect(
      page.locator(
        "#active-filter-summary"
      )
    ).toBeHidden();

    await expect(
      page.locator(
        "#no-results"
      )
    ).toBeHidden();
  }
);


test(
  "過去イベントを初期非表示にし、絞り込み時だけ遅延読込する",
  async ({ page }) => {
    let archiveRequestCount = 0;

    page.on(
      "request",
      request => {
        if (
          request.url().includes(
            "official-events-archive.json"
          )
        ) {
          archiveRequestCount++;
        }
      }
    );

    await page.goto("/");

    const initialCount =
      await waitForSpots(page);

    expect(archiveRequestCount).toBe(0);

    const archiveSpots =
      JSON.parse(
        await readFile(
          resolve(
            projectDirectory,
            "data/official-events-archive.json"
          ),
          "utf8"
        )
      );

    await page.locator(
      "#filter-toggle"
    ).click();

    const endedFilter =
      page.locator(
        "#filter-ended"
      );

    await expect(
      endedFilter
    ).not.toBeChecked();

    await page.locator(
      ".filter-chip-archive span"
    ).click();

    await expect(
      page.locator(
        "#result-count"
      )
    ).toHaveText(
      initialCount +
      archiveSpots.length +
      "件表示"
    );

    expect(archiveRequestCount).toBe(1);

    await expect(
      page.locator(
        "#active-filter-list"
      )
    ).toContainText(
      "終了済み（過去イベント）を含む"
    );

    const sharedUrl =
      await page.evaluate(
        () =>
          window.getCurrentFiltersShareUrl()
      );

    expect(sharedUrl).toContain(
      "past=1"
    );

    await page.locator(
      "#filter-close"
    ).click();

    await page.locator(
      "#spot-search"
    ).fill("おばけの森");

    await expect(
      page.locator(
        "#result-count"
      )
    ).toHaveText("1件表示");

    await page.locator(
      ".search-suggestion"
    ).first().click();

    await expect(
      page.locator(
        "#spot-detail-title"
      )
    ).toHaveText(
      "お台場ファンライジング ちいかわ おばけの森"
    );

    await expect(
      page.locator(
        ".spot-timing-badge.timing-ended"
      )
    ).toContainText("終了済み");

    await page.goto(
      "/?spot=collab-odaiba-obake-forest"
    );

    await waitForSpots(page);

    await expect(
      page.locator(
        "#filter-ended"
      )
    ).toBeChecked();

    await expect(
      page.locator(
        "#spot-detail-title"
      )
    ).toHaveText(
      "お台場ファンライジング ちいかわ おばけの森"
    );
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
  "訪問日・メモを保存し、再読込とJSON書き出しで維持する",
  async ({ page }) => {
    await page.goto("/");
    await waitForSpots(page);

    const search =
      page.locator(
        "#spot-search"
      );

    await search.fill(
      "ちいかわらんど 大阪梅田店"
    );

    await page.locator(
      ".search-suggestion"
    ).filter({
      hasText:
        "ちいかわらんど 大阪梅田店"
    }).first().click();

    await page.locator(
      ".spot-visited-button"
    ).click();

    const visitCard =
      page.locator(
        ".spot-visit-card"
      );

    await expect(
      visitCard
    ).toBeVisible();

    await visitCard.locator(
      ".spot-visit-date"
    ).fill("2026-08-24");

    await visitCard.locator(
      ".spot-visit-note"
    ).fill(
      "限定グッズを購入。次回は午前中に行く。"
    );

    await visitCard.locator(
      ".spot-visit-save"
    ).click();

    await expect(
      visitCard.locator(
        ".spot-visit-status"
      )
    ).toHaveText(
      "この端末に保存しました。"
    );

    const storedDetails =
      await page.evaluate(
        () => JSON.parse(
          localStorage.getItem(
            "chiikawa-map-visit-details-v1"
          )
        )
      );

    expect(
      storedDetails[
        "chiikawaland-osaka-umeda"
      ]
    ).toEqual({
      visitedAt:
        "2026-08-24",
      note:
        "限定グッズを購入。次回は午前中に行く。"
    });

    await page.locator(
      "#saved-data-toggle"
    ).click();

    await page.locator(
      "#saved-data-file"
    ).setInputFiles({
      name:
        "chiikatsu-map-saved-visit-details.json",
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
            favorites: [],
            visited: [
              "nagano-takao-mountain"
            ],
            visitDetails: {
              "chiikawaland-osaka-umeda": {
                visitedAt:
                  "2026-08-20",
                note:
                  "インポート側の記録"
              },
              "nagano-takao-mountain": {
                visitedAt:
                  "2026-08-25",
                note:
                  "高尾山の記録"
              }
            }
          })
        )
    });

    const mergedDetails =
      await page.evaluate(
        () => JSON.parse(
          localStorage.getItem(
            "chiikawa-map-visit-details-v1"
          )
        )
      );

    expect(
      mergedDetails[
        "chiikawaland-osaka-umeda"
      ]
    ).toEqual({
      visitedAt:
        "2026-08-24",
      note:
        "限定グッズを購入。次回は午前中に行く。"
    });

    expect(
      mergedDetails[
        "nagano-takao-mountain"
      ]
    ).toEqual({
      visitedAt:
        "2026-08-25",
      note:
        "高尾山の記録"
    });

    await page.keyboard.press(
      "Escape"
    );

    await page.reload();
    await waitForSpots(page);
    await search.fill(
      "ちいかわらんど 大阪梅田店"
    );

    await page.locator(
      ".search-suggestion"
    ).filter({
      hasText:
        "ちいかわらんど 大阪梅田店"
    }).first().click();

    await expect(
      page.locator(
        ".spot-visit-date"
      )
    ).toHaveValue(
      "2026-08-24"
    );

    await expect(
      page.locator(
        ".spot-visit-note"
      )
    ).toHaveValue(
      "限定グッズを購入。次回は午前中に行く。"
    );

    await page.locator(
      "#saved-data-toggle"
    ).click();

    const downloadPromise =
      page.waitForEvent(
        "download"
      );

    await page.locator(
      "#saved-data-export"
    ).click();

    const download =
      await downloadPromise;

    const exportedData =
      JSON.parse(
        await readFile(
          await download.path(),
          "utf8"
        )
      );

    expect(
      exportedData.visitDetails[
        "chiikawaland-osaka-umeda"
      ]
    ).toEqual({
      visitedAt:
        "2026-08-24",
      note:
        "限定グッズを購入。次回は午前中に行く。"
    });
  }
);


test(
  "詳細に近隣5件を表示し、絞り込み中でも別スポットを開ける",
  async ({ page }) => {
    await page.goto("/");
    await waitForSpots(page);

    await page.locator(
      "#spot-search"
    ).fill(
      "ちいかわらんど 大阪梅田店"
    );

    await page.locator(
      ".search-suggestion"
    ).filter({
      hasText:
        "ちいかわらんど 大阪梅田店"
    }).first().click();

    const nearbyButtons =
      page.locator(
        ".spot-nearby-button"
      );

    await expect(
      nearbyButtons
    ).toHaveCount(5);

    await expect(
      nearbyButtons.first()
    ).toContainText(
      "直線距離"
    );

    const nearbyName =
      await nearbyButtons.first()
        .locator(
          ".spot-nearby-name"
        ).textContent();

    await nearbyButtons.first()
      .click();

    await expect(
      page.locator(
        "#spot-detail-title"
      )
    ).toHaveText(
      nearbyName
    );
  }
);


test(
  "同一座標の2〜6スポットを件数別パターンで外向きに配置する",
  async ({ page }) => {
    const scenarios = [
      {
        directions: [
          "left",
          "right"
        ],
        ids: [
          "ramen-buta-shibuya",
          "movie-cafe-shibuya"
        ],
        spot:
          "ramen-buta-shibuya"
      },
      {
        directions: [
          "top",
          "bottom",
          "right"
        ],
        ids: [
          "chiikawaland-solamachi",
          "collab-skytree-2026",
          "nagano-tokyo-skytree"
        ],
        spot:
          "chiikawaland-solamachi"
      },
      {
        directions: [
          "top",
          "left",
          "bottom",
          "right"
        ],
        ids: [
          "chiikawaland-ikebukuro",
          "chiikawa-restaurant-ikebukuro",
          "shisa-popup-ikebukuro",
          "pocket-popup-ikebukuro"
        ],
        spot:
          "chiikawaland-ikebukuro"
      },
      {
        directions: [
          "top",
          "left",
          "left",
          "left",
          "bottom",
          "right"
        ],
        ids: [
          "chiikawaland-nagoya",
          "magical-nagoya",
          "ramen-buta-nagoya",
          "chiikawa-yaki-nagoya",
          "pocket-popup-nagoya",
          "movie-cafe-nagoya"
        ],
        spot:
          "chiikawaland-nagoya"
      }
    ];

    for (
      const scenario of
      scenarios
    ) {
      await page.goto(
        "/?spot=" +
        scenario.spot
      );

      await waitForSpots(page);

      await page.waitForTimeout(300);

      const audit =
        await getDuplicateLayoutAudit(
          page,
          scenario.ids
        );

      expect(
        audit.directions
      ).toEqual(
        scenario.directions
      );

      expect(
        audit.outward
      ).toBe(true);

      expect(
        audit.labelOverlaps
      ).toEqual([]);

      expect(
        audit.lineCrossings
      ).toEqual([]);
    }

    const officialSpots =
      JSON.parse(
        await readFile(
          resolve(
            projectDirectory,
            "data/official-spots.json"
          ),
          "utf8"
        )
      );

    const templateSpot =
      officialSpots.find(
        spot =>
          spot.id ===
          "chiikawaland-ikebukuro"
      );

    const syntheticSpots =
      Array.from(
        {
          length: 5
        },
        (_, index) => ({
          ...templateSpot,
          endDate: null,
          id:
            "layout-five-" +
            index,
          lat: 35,
          lng: 135,
          name:
            "5件配置確認スポット " +
            (index + 1),
          periodType:
            "permanent",
          startDate: null
        })
      );

    await page.route(
      "**/data/official-spots.json",
      async route => {
        await route.fulfill({
          body:
            JSON.stringify([
              ...officialSpots,
              ...syntheticSpots
            ]),
          contentType:
            "application/json",
          status: 200
        });
      }
    );

    await page.goto(
      "/?spot=layout-five-0"
    );

    await waitForSpots(page);

    await page.waitForTimeout(300);

    const fiveSpotAudit =
      await getDuplicateLayoutAudit(
        page,
        syntheticSpots.map(
          spot => spot.id
        )
      );

    expect(
      fiveSpotAudit.directions
    ).toEqual([
      "top",
      "left",
      "left",
      "bottom",
      "right"
    ]);

    expect(
      fiveSpotAudit.outward
    ).toBe(true);

    expect(
      fiveSpotAudit.labelOverlaps
    ).toEqual([]);

    expect(
      fiveSpotAudit.lineCrossings
    ).toEqual([]);
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

    const duplicateSpots = [
      {
        id:
          "chiikawaland-nagoya",
        name:
          "ちいかわらんど 名古屋パルコ店"
      },
      {
        id:
          "magical-nagoya",
        name:
          "まじかるちいかわストア 名古屋パルコ店"
      },
      {
        id:
          "ramen-buta-nagoya",
        name:
          "ちいかわラーメン 豚 名古屋PARCO"
      },
      {
        id:
          "chiikawa-yaki-nagoya",
        name:
          "ちいかわ焼き 名古屋PARCO店"
      },
      {
        id:
          "pocket-popup-nagoya",
        name:
          "ちいかわぽけっと POP UP STORE 名古屋"
      },
      {
        id:
          "movie-cafe-nagoya",
        name:
          "映画ちいかわ 人魚の島のひみつ Collaboration CAFE 名古屋"
      }
    ];

    const duplicateIds =
      duplicateSpots.map(
        spot => spot.id
      );

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

    for (
      const spot of
      duplicateSpots
    ) {
      const marker =
        page.locator(
          '.spot-marker[data-spot-id="' +
          spot.id +
          '"]'
        );

      const label =
        page.locator(
          '.spot-name-label-duplicate[data-spot-id="' +
          spot.id +
          '"]'
        );

      await label.click();

      await expect(
        page.locator(
          "#spot-detail-title"
        )
      ).toHaveText(
        spot.name
      );

      await marker.click();

      await expect(
        page.locator(
          "#spot-detail-title"
        )
      ).toHaveText(
        spot.name
      );
    }

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
