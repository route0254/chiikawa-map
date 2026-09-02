"use strict";

const dataUrls = {
  current: new URL(
    "./data/collaborations-current.json",
    import.meta.url
  ),
  archive: new URL(
    "./data/collaborations-archive.json",
    import.meta.url
  )
};

const categoryDetails = {
  experience: {
    label: "おでかけ・体験",
    icon: "✦"
  },
  food: {
    label: "飲食店",
    icon: "🍽"
  },
  campaign: {
    label: "お買い物・キャンペーン",
    icon: "🎁"
  },
  collection: {
    label: "商品・コレクション",
    icon: "🛍"
  },
  media_sports: {
    label: "作品・スポーツ",
    icon: "⚑"
  }
};

const categoryOrder = Object.keys(
  categoryDetails
);

const statusLabels = {
  active: "開催中",
  upcoming: "開催予定",
  application_only: "応募受付中",
  while_supplies_last: "在庫限り",
  needs_review: "取扱状況を確認",
  ended: "終了",
  past: "過去の記録"
};

const listStates = {
  current: {
    records: null,
    loading: false,
    filters: {
      search: "",
      category: "",
      status: "",
      channel: "",
      sort: "ending"
    }
  },
  archive: {
    records: null,
    loading: false,
    filters: {
      search: "",
      category: "",
      year: "",
      channel: "",
      sort: "newest"
    }
  }
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ja");
}

function queryElement(selector) {
  return document.querySelector(selector);
}

function getListElement(type, name) {
  return queryElement(
    `[data-${name}="${type}"]`
  );
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(
    `${value}T00:00:00+09:00`
  );

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function formatDate(value, includeYear = true) {
  const date = parseDate(value);

  if (!date) {
    return "";
  }

  const options = includeYear
    ? {
        year: "numeric",
        month: "numeric",
        day: "numeric"
      }
    : {
        month: "numeric",
        day: "numeric"
      };

  return new Intl.DateTimeFormat(
    "ja-JP",
    options
  ).format(date);
}

function formatCheckedDate(value) {
  const date = parseDate(value);

  return date
    ? new Intl.DateTimeFormat(
        "ja-JP",
        {
          year: "numeric",
          month: "long",
          day: "numeric"
        }
      ).format(date)
    : value;
}

function formatPeriodDate(period) {
  const { startDate, endDate } = period;

  if (startDate && endDate) {
    if (startDate === endDate) {
      return formatDate(startDate);
    }

    const sameYear =
      startDate.slice(0, 4) ===
      endDate.slice(0, 4);

    return `${formatDate(startDate)}〜${formatDate(endDate, !sameYear)}`;
  }

  if (startDate) {
    return `${formatDate(startDate)}〜`;
  }

  if (endDate) {
    return `〜${formatDate(endDate)}`;
  }

  return "日程は公式情報をご確認ください";
}

function getRecordSearchText(record) {
  return normalizeText(
    [
      record.title,
      record.partner,
      record.summary,
      record.areaText,
      ...record.channels,
      ...record.tags,
      ...record.periods.flatMap(
        period => [
          period.label,
          period.note
        ]
      )
    ].join(" ")
  );
}

function getRecordYears(record) {
  return new Set(
    record.periods
      .map(period =>
        period.startDate?.slice(0, 4)
      )
      .filter(Boolean)
  );
}

function getDateValues(record, key) {
  return record.periods
    .map(period => parseDate(period[key]))
    .filter(Boolean)
    .map(date => date.getTime());
}

function getLatestDate(record, key) {
  const values = getDateValues(record, key);

  return values.length
    ? Math.max(...values)
    : 0;
}

function getNearestFutureDate(record, key) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const values = getDateValues(record, key)
    .filter(value => value >= today.getTime());

  return values.length
    ? Math.min(...values)
    : Number.POSITIVE_INFINITY;
}

function sortRecords(records, type, sort) {
  const collator = new Intl.Collator(
    "ja",
    {
      numeric: true,
      sensitivity: "base"
    }
  );

  return [...records].sort(
    (left, right) => {
      if (sort === "name") {
        return collator.compare(
          left.title,
          right.title
        );
      }

      if (type === "current") {
        if (sort === "starting") {
          const difference =
            getNearestFutureDate(
              left,
              "startDate"
            ) -
            getNearestFutureDate(
              right,
              "startDate"
            );

          return difference ||
            collator.compare(
              left.title,
              right.title
            );
        }

        if (sort === "newest") {
          return (
            getLatestDate(
              right,
              "startDate"
            ) -
            getLatestDate(
              left,
              "startDate"
            ) ||
            collator.compare(
              left.title,
              right.title
            )
          );
        }

        const difference =
          getNearestFutureDate(
            left,
            "endDate"
          ) -
          getNearestFutureDate(
            right,
            "endDate"
          );

        return difference ||
          collator.compare(
            left.title,
            right.title
          );
      }

      const leftDate = Math.max(
        getLatestDate(left, "endDate"),
        getLatestDate(left, "startDate")
      );
      const rightDate = Math.max(
        getLatestDate(right, "endDate"),
        getLatestDate(right, "startDate")
      );
      const direction =
        sort === "oldest" ? 1 : -1;

      return (
        (leftDate - rightDate) * direction ||
        collator.compare(
          left.title,
          right.title
        )
      );
    }
  );
}

function filterRecords(type) {
  const state = listStates[type];
  const filters = state.filters;
  const search = normalizeText(
    filters.search
  );

  const filtered = state.records.filter(
    record => {
      if (
        search &&
        !getRecordSearchText(record)
          .includes(search)
      ) {
        return false;
      }

      if (
        filters.category &&
        record.category !== filters.category
      ) {
        return false;
      }

      if (
        filters.status &&
        record.status !== filters.status
      ) {
        return false;
      }

      if (
        filters.channel &&
        !record.channels.includes(
          filters.channel
        )
      ) {
        return false;
      }

      if (
        filters.year &&
        !getRecordYears(record).has(
          filters.year
        )
      ) {
        return false;
      }

      return true;
    }
  );

  return sortRecords(
    filtered,
    type,
    filters.sort
  );
}

function renderPeriods(periods) {
  return `<ul class="collaboration-periods">${periods.map(
    period => {
      const note = period.note
        ? `<span class="collaboration-period-note">${escapeHtml(period.note)}</span>`
        : "";

      return `<li><strong>${escapeHtml(period.label)}</strong>：${escapeHtml(formatPeriodDate(period))}${note}</li>`;
    }
  ).join("")}</ul>`;
}

function renderCard(record) {
  const category =
    categoryDetails[record.category];
  const status =
    statusLabels[record.status] ||
    record.status;
  const tags = [
    ...record.channels,
    ...record.tags
  ];
  const mapLink =
    record.linkedSpotIds.length
      ? `<a class="collaboration-card-action is-map" href="./?spot=${encodeURIComponent(record.linkedSpotIds[0])}">🗺 地図で見る</a>`
      : "";

  return `
    <article class="collaboration-card" data-record-id="${escapeHtml(record.id)}">
      <div class="collaboration-card-head">
        <div class="collaboration-card-title-wrap">
          <span class="collaboration-status is-${escapeHtml(record.status)}">${escapeHtml(status)}</span>
          <h4>${escapeHtml(record.title)}</h4>
          <p class="collaboration-partner">${escapeHtml(record.partner)}</p>
        </div>
        <span class="collaboration-group-icon" title="${escapeHtml(category.label)}" aria-label="${escapeHtml(category.label)}">${category.icon}</span>
      </div>
      <p class="collaboration-summary">${escapeHtml(record.summary)}</p>
      <dl class="collaboration-detail-list">
        <div><dt>期間</dt><dd>${renderPeriods(record.periods)}</dd></div>
        <div><dt>場所</dt><dd>${escapeHtml(record.areaText)}</dd></div>
      </dl>
      <div class="collaboration-tags">${tags.map(tag => `<span class="collaboration-tag">${escapeHtml(tag)}</span>`).join("")}</div>
      <div class="collaboration-card-actions">
        <a class="collaboration-card-action" href="${escapeHtml(record.sourceUrl)}" target="_blank" rel="noopener noreferrer">公式・運営元の情報 ↗</a>
        ${mapLink}
      </div>
    </article>
  `;
}

function renderList(type) {
  const state = listStates[type];

  if (!state.records) {
    return;
  }

  const records = filterRecords(type);
  const groupsElement = getListElement(
    type,
    "groups"
  );
  const summaryElement = getListElement(
    type,
    "summary"
  );
  const emptyElement = getListElement(
    type,
    "empty"
  );

  summaryElement.textContent =
    `${state.records.length}件中 ${records.length}件を表示`;
  emptyElement.hidden = records.length > 0;

  groupsElement.innerHTML = categoryOrder
    .map(categoryKey => {
      const categoryRecords = records.filter(
        record =>
          record.category === categoryKey
      );

      if (!categoryRecords.length) {
        return "";
      }

      const category =
        categoryDetails[categoryKey];

      return `
        <section class="collaboration-group" data-category="${categoryKey}" aria-labelledby="${type}-${categoryKey}-title">
          <div class="collaboration-group-heading">
            <span class="collaboration-group-icon" aria-hidden="true">${category.icon}</span>
            <h3 id="${type}-${categoryKey}-title">${escapeHtml(category.label)}</h3>
            <span>${categoryRecords.length}件</span>
          </div>
          <div class="collaboration-card-grid">${categoryRecords.map(renderCard).join("")}</div>
        </section>
      `;
    })
    .join("");
}

function populateSelect(
  type,
  filterName,
  values
) {
  const select = queryElement(
    `[data-filter="${filterName}"][data-list="${type}"]`
  );

  if (!select) {
    return;
  }

  const firstOption = select.options[0];
  select.replaceChildren(firstOption);

  values.forEach(value => {
    const option = document.createElement(
      "option"
    );
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function populateDynamicFilters(type) {
  const records = listStates[type].records;
  const channels = [...new Set(
    records.flatMap(
      record => record.channels
    )
  )].sort(
    new Intl.Collator("ja").compare
  );

  populateSelect(
    type,
    "channel",
    channels
  );

  if (type === "archive") {
    const years = [...new Set(
      records.flatMap(record =>
        [...getRecordYears(record)]
      )
    )].sort((left, right) =>
      right.localeCompare(left)
    );

    populateSelect(
      type,
      "year",
      years
    );
  }
}

function updateDataAsOf() {
  const dates = Object.values(listStates)
    .flatMap(state =>
      state.records || []
    )
    .map(record => record.checkedAt)
    .filter(Boolean)
    .sort();

  const latestDate = dates.at(-1);

  if (latestDate) {
    queryElement(
      "#collaboration-data-as-of"
    ).textContent = formatCheckedDate(
      latestDate
    );
  }
}

async function loadList(type, force = false) {
  const state = listStates[type];

  if (
    state.loading ||
    (state.records && !force)
  ) {
    return;
  }

  state.loading = true;
  const loadingElement = getListElement(
    type,
    "loading"
  );
  const errorElement = getListElement(
    type,
    "error"
  );
  const groupsElement = getListElement(
    type,
    "groups"
  );

  loadingElement.hidden = false;
  errorElement.hidden = true;
  groupsElement.innerHTML = "";

  try {
    const response = await fetch(
      dataUrls[type],
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const records = await response.json();

    if (!Array.isArray(records)) {
      throw new TypeError(
        "コラボデータの形式が不正です。"
      );
    }

    state.records = records;
    populateDynamicFilters(type);
    renderList(type);
    updateDataAsOf();

    queryElement(
      `#collaboration-${type}-total`
    ).textContent = String(records.length);
  } catch (error) {
    console.error(
      "コラボ情報を読み込めませんでした。",
      error
    );
    state.records = null;
    errorElement.hidden = false;
    getListElement(
      type,
      "summary"
    ).textContent =
      "コラボ情報を読み込めませんでした。";
  } finally {
    state.loading = false;
    loadingElement.hidden = true;
  }
}

function selectTab(type, focus = false) {
  document.querySelectorAll(
    ".collaboration-tab"
  ).forEach(tab => {
    const active =
      tab.dataset.list === type;
    tab.classList.toggle(
      "is-active",
      active
    );
    tab.setAttribute(
      "aria-selected",
      String(active)
    );
    tab.tabIndex = active ? 0 : -1;

    if (active && focus) {
      tab.focus();
    }
  });

  document.querySelectorAll(
    ".collaboration-panel"
  ).forEach(panel => {
    panel.hidden =
      panel.dataset.panel !== type;
  });

  loadList(type);
}

document.querySelectorAll(
  ".collaboration-tab"
).forEach(tab => {
  tab.addEventListener(
    "click",
    () => selectTab(tab.dataset.list)
  );

  tab.addEventListener(
    "keydown",
    event => {
      if (
        event.key !== "ArrowLeft" &&
        event.key !== "ArrowRight"
      ) {
        return;
      }

      event.preventDefault();
      const nextType =
        tab.dataset.list === "current"
          ? "archive"
          : "current";
      selectTab(nextType, true);
    }
  );
});

document.querySelectorAll(
  "[data-filter][data-list]"
).forEach(control => {
  const eventName =
    control.type === "search"
      ? "input"
      : "change";

  control.addEventListener(
    eventName,
    () => {
      const { list, filter } =
        control.dataset;
      listStates[list].filters[filter] =
        control.value;
      renderList(list);
    }
  );
});

document.querySelectorAll(
  "[data-reset]"
).forEach(button => {
  button.addEventListener(
    "click",
    () => {
      const type = button.dataset.reset;

      document.querySelectorAll(
        `[data-filter][data-list="${type}"]`
      ).forEach(control => {
        control.value = "";
      });

      listStates[type].filters =
        type === "current"
          ? {
              search: "",
              category: "",
              status: "",
              channel: "",
              sort: "ending"
            }
          : {
              search: "",
              category: "",
              year: "",
              channel: "",
              sort: "newest"
            };

      queryElement(
        `[data-filter="sort"][data-list="${type}"]`
      ).value =
        listStates[type].filters.sort;
      renderList(type);
    }
  );
});

document.querySelectorAll(
  "[data-retry]"
).forEach(button => {
  button.addEventListener(
    "click",
    () => loadList(
      button.dataset.retry,
      true
    )
  );
});

loadList("current");

import("./cloud-sync-loader.js").catch(
  error => {
    console.warn(
      "クラウド保存機能を読み込めませんでした。",
      error
    );
  }
);
