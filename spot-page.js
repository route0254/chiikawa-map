"use strict";

const FAVORITES_STORAGE_KEY = "chiikawa-map-favorites-v1";
const VISITED_STORAGE_KEY = "chiikawa-map-visited-v1";
const PLAN_STORAGE_KEY = "chiikawa-map-plan-v1";
const PLAN_MAX_SPOTS = 8;

const spotId = document.body.dataset.spotId || "";
const spotName = document.body.dataset.spotName || "スポット";
const statusElement = document.getElementById("spot-page-status");

function loadIds(key) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed)
      ? Array.from(new Set(parsed.filter(id => typeof id === "string")))
      : [];
  } catch (error) {
    return [];
  }
}

function getButtonLabel(type, saved) {
  if (type === "favorite") {
    return saved ? "♡ 行きたいに保存済み" : "♡ 行きたい";
  }
  if (type === "visited") {
    return saved ? "✓ 行った！登録済み" : "✓ 行った！";
  }
  return saved ? "👜 プランに追加済み" : "＋ 今日のプラン";
}

function syncButtons() {
  const savedByType = {
    favorite: loadIds(FAVORITES_STORAGE_KEY),
    visited: loadIds(VISITED_STORAGE_KEY),
    plan: loadIds(PLAN_STORAGE_KEY)
  };

  document.querySelectorAll("[data-save-type]").forEach(button => {
    const type = button.dataset.saveType;
    const saved = savedByType[type]?.includes(spotId);
    button.classList.toggle("is-active", Boolean(saved));
    button.setAttribute("aria-pressed", String(Boolean(saved)));
    button.textContent = getButtonLabel(type, Boolean(saved));
  });
}

function showStatus(message) {
  if (statusElement) {
    statusElement.textContent = message;
  }
}

function toggleSaved(type) {
  const key = type === "favorite"
    ? FAVORITES_STORAGE_KEY
    : type === "visited"
      ? VISITED_STORAGE_KEY
      : PLAN_STORAGE_KEY;
  let ids = loadIds(key);
  const saved = ids.includes(spotId);

  if (saved) {
    ids = ids.filter(id => id !== spotId);
  } else {
    if (type === "plan" && ids.length >= PLAN_MAX_SPOTS) {
      showStatus(`今日のプランへ追加できるのは${PLAN_MAX_SPOTS}件までです。`);
      return;
    }
    ids.push(spotId);
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
    syncButtons();
    showStatus(saved ? "保存から外しました。" : "この端末に保存しました。");
  } catch (error) {
    showStatus("端末へ保存できませんでした。ブラウザの保存設定をご確認ください。");
  }
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

async function shareSpot() {
  const shareData = {
    title: spotName + "｜ちい活MAP",
    text: spotName + "をちい活MAPで見る",
    url: window.location.href
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }
    }
  }

  try {
    await copyText(shareData.url);
    showStatus("スポットURLをコピーしました。");
  } catch (error) {
    showStatus("URLをコピーできませんでした。");
  }
}

document.querySelectorAll("[data-save-type]").forEach(button => {
  button.addEventListener("click", () => toggleSaved(button.dataset.saveType));
});
document.getElementById("spot-page-share")?.addEventListener("click", shareSpot);
window.addEventListener("storage", event => {
  if ([FAVORITES_STORAGE_KEY, VISITED_STORAGE_KEY, PLAN_STORAGE_KEY].includes(event.key)) {
    syncButtons();
  }
});
window.addEventListener("pageshow", syncButtons);
syncButtons();

const spotPageScriptUrl =
  Array.from(document.scripts)
    .find(
      script =>
        /\/spot-page\.js(?:\?|$)/.test(
          script.src
        )
    )?.src;

if (spotPageScriptUrl) {
  import(
    new URL(
      "./cloud-sync-loader.js",
      spotPageScriptUrl
    ).href
  ).catch(
    error => {
      console.warn(
        "クラウド保存機能を読み込めませんでした。",
        error
      );
    }
  );
}
