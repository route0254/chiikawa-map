"use strict";

const dataUrl = new URL(
  "./data/nagano-unlocated-mentions.json",
  import.meta.url
);

const searchInput = document.querySelector(
  "#nagano-mention-search"
);
const listElement = document.querySelector(
  "#nagano-mention-list"
);
const summaryElement = document.querySelector(
  "#nagano-mention-summary"
);
const emptyElement = document.querySelector(
  "#nagano-mention-empty"
);
const errorElement = document.querySelector(
  "#nagano-mention-error"
);

let records = [];

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

function formatDate(value) {
  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      year: "numeric",
      month: "numeric",
      day: "numeric"
    }
  ).format(
    new Date(`${value}T00:00:00+09:00`)
  );
}

function render() {
  const search = normalizeText(
    searchInput.value
  );
  const filtered = records.filter(record =>
    !search ||
    normalizeText([
      record.name,
      record.items,
      record.summary
    ].join(" ")).includes(search)
  );

  summaryElement.textContent =
    `${records.length}件中 ${filtered.length}件を表示`;
  emptyElement.hidden = filtered.length > 0;
  listElement.innerHTML = filtered.map(record => `
    <article class="nagano-card" data-record-id="${escapeHtml(record.id)}">
      <div class="nagano-card-head">
        <h3>${escapeHtml(record.name)}</h3>
        <span>店舗未特定</span>
      </div>
      <dl>
        <div><dt>投稿日</dt><dd>${escapeHtml(formatDate(record.mentionDate))}</dd></div>
        <div><dt>内容</dt><dd>${escapeHtml(record.items)}</dd></div>
      </dl>
      <p>${escapeHtml(record.summary)}</p>
      <p class="nagano-location">${escapeHtml(record.locationText)}</p>
      <a href="${escapeHtml(record.sourceUrl)}" target="_blank" rel="noopener noreferrer">確認に使った情報を見る ↗</a>
    </article>
  `).join("");
}

searchInput.addEventListener(
  "input",
  render
);

try {
  const response = await fetch(
    dataUrl,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new TypeError(
      "記録データの形式が不正です。"
    );
  }

  records = data;
  render();
} catch (error) {
  console.error(
    "ナガノ先生関連の記録を読み込めませんでした。",
    error
  );
  summaryElement.textContent =
    "記録を読み込めませんでした。";
  errorElement.hidden = false;
}

import("./cloud-sync-loader.js").catch(
  error => {
    console.warn(
      "クラウド保存機能を読み込めませんでした。",
      error
    );
  }
);
