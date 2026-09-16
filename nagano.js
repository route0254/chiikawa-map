"use strict";

const historyDataUrl = new URL(
  "./data/nagano-history.json?v=20260916-5",
  import.meta.url
);
const historyListElement = document.querySelector(
  "#nagano-history-list"
);
const historySummaryElement = document.querySelector(
  "#nagano-history-summary"
);
const historyCountElement = document.querySelector(
  "#nagano-history-count"
);
const historyNoteElement = document.querySelector(
  "#nagano-history-note"
);
const historyEmptyElement = document.querySelector(
  "#nagano-history-empty"
);
const historyErrorElement = document.querySelector(
  "#nagano-history-error"
);
const historyFilterButtons = [
  ...document.querySelectorAll(
    "[data-history-filter]"
  )
];
const themeGridElement = document.querySelector(
  "#nagano-theme-grid"
);
const tabButtons = [
  ...document.querySelectorAll("[data-nagano-tab]")
];
const tabPanels = [
  ...document.querySelectorAll(".nagano-tab-panel")
];
const profileNameElement = document.querySelector(
  "#nagano-profile-name"
);
const profileReadingElement = document.querySelector(
  "#nagano-profile-reading"
);
const profileRoleElement = document.querySelector(
  "#nagano-profile-role"
);
const profileSummaryElement = document.querySelector(
  "#nagano-profile-summary"
);
const profileActivityElement = document.querySelector(
  "#nagano-profile-activity"
);
const profileWorksElement = document.querySelector(
  "#nagano-profile-works"
);
const profileLinksElement = document.querySelector(
  "#nagano-profile-links"
);
const profileSourcesElement = document.querySelector(
  "#nagano-profile-sources"
);
const profileInterestListElement = document.querySelector(
  "#nagano-profile-interest-list"
);

const historyTagLabels = {
  creation: "原点・創作",
  line: "LINE・くま",
  publishing: "書籍・連載",
  chiikawa: "ちいかわ",
  milestones: "展覧会・受賞・映像"
};

let historyRecords = [];
let activeHistoryFilter = "all";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderSourceLinks(sources) {
  return sources.map(source => `
    <a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">
      ${escapeHtml(source.label)} ↗
    </a>
  `).join("");
}

function renderProfile(profile) {
  profileNameElement.textContent = profile.name;
  profileReadingElement.textContent = profile.reading;
  profileRoleElement.textContent = profile.role;
  profileSummaryElement.textContent = profile.summary;
  profileActivityElement.textContent = profile.activity;
  profileWorksElement.innerHTML = profile.works.map(
    work => `<li>${escapeHtml(work)}</li>`
  ).join("");
  profileLinksElement.innerHTML = renderSourceLinks(
    profile.officialLinks
  );
  profileSourcesElement.innerHTML = renderSourceLinks(
    profile.sources
  );
  profileInterestListElement.innerHTML = profile.interests.map(
    interest => `
      <article class="nagano-profile-interest-card">
        <h4>${escapeHtml(interest.label)}</h4>
        <p>${escapeHtml(interest.summary)}</p>
      </article>
    `
  ).join("");
}

function activateTab(
  tabName,
  { updateHash = false, focus = false } = {}
) {
  const activeButton = tabButtons.find(
    button => button.dataset.naganoTab === tabName
  ) ?? tabButtons[0];
  const activePanelId = activeButton.getAttribute(
    "aria-controls"
  );

  tabButtons.forEach(button => {
    const isActive = button === activeButton;
    button.setAttribute(
      "aria-selected",
      String(isActive)
    );
    button.tabIndex = isActive ? 0 : -1;
  });

  tabPanels.forEach(panel => {
    panel.hidden = panel.id !== activePanelId;
  });

  if (updateHash) {
    window.history.replaceState(
      null,
      "",
      `#${activePanelId}`
    );
  }

  if (focus) {
    activePanelId && document
      .getElementById(activePanelId)
      ?.focus({ preventScroll: true });
  }
}

function activateTabFromHash() {
  const panelId = window.location.hash.slice(1);
  const matchedButton = tabButtons.find(
    button =>
      button.getAttribute("aria-controls") === panelId
  );
  activateTab(
    matchedButton?.dataset.naganoTab ?? "profile"
  );
}

function renderHistory() {
  const filtered = historyRecords.filter(
    record =>
      activeHistoryFilter === "all" ||
      record.tags.includes(activeHistoryFilter)
  );

  historySummaryElement.textContent =
    `${historyRecords.length}件中 ${filtered.length}件を表示`;
  historyEmptyElement.hidden = filtered.length > 0;
  historyListElement.innerHTML = filtered.map(
    record => `
      <article class="nagano-history-item${record.featured ? " is-featured" : ""}" data-history-id="${escapeHtml(record.id)}">
        <div class="nagano-history-date">
          <strong>${escapeHtml(record.year)}</strong>
          <span>${escapeHtml(record.dateLabel)}</span>
        </div>
        <div class="nagano-history-card">
          <div class="nagano-history-tags">
            ${record.tags.map(tag => `
              <span>${escapeHtml(historyTagLabels[tag])}</span>
            `).join("")}
          </div>
          <h3>${escapeHtml(record.title)}</h3>
          <p>${escapeHtml(record.summary)}</p>
          <div class="nagano-history-sources" aria-label="出典">
            ${renderSourceLinks(record.sources)}
          </div>
        </div>
      </article>
    `
  ).join("");
}

function renderThemes(themes) {
  themeGridElement.innerHTML = themes.map(
    (theme, index) => `
      <article class="nagano-theme-card" data-theme-id="${escapeHtml(theme.id)}">
        <span class="nagano-theme-number">${index + 1}</span>
        <h3>${escapeHtml(theme.title)}</h3>
        <p>${escapeHtml(theme.summary)}</p>
        <div class="nagano-theme-sources" aria-label="出典">
          ${renderSourceLinks(theme.sources)}
        </div>
      </article>
    `
  ).join("");
}

tabButtons.forEach((button, buttonIndex) => {
  button.addEventListener("click", () => {
    activateTab(
      button.dataset.naganoTab,
      { updateHash: true }
    );
  });

  button.addEventListener("keydown", event => {
    const directions = {
      ArrowLeft: -1,
      ArrowRight: 1
    };

    if (
      !(event.key in directions) &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    event.preventDefault();
    let nextIndex = buttonIndex;

    if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabButtons.length - 1;
    } else {
      nextIndex = (
        buttonIndex +
        directions[event.key] +
        tabButtons.length
      ) % tabButtons.length;
    }

    const nextButton = tabButtons[nextIndex];
    nextButton.focus();
    activateTab(
      nextButton.dataset.naganoTab,
      { updateHash: true }
    );
  });
});

document.querySelectorAll(
  'a[href="#nagano-profile"], a[href="#nagano-history"], a[href="#nagano-themes"]'
).forEach(link => {
  link.addEventListener("click", event => {
    const panelId = link.hash.slice(1);
    const targetButton = tabButtons.find(
      button =>
        button.getAttribute("aria-controls") === panelId
    );

    if (!targetButton) {
      return;
    }

    event.preventDefault();
    activateTab(
      targetButton.dataset.naganoTab,
      { updateHash: true, focus: true }
    );
  });
});

window.addEventListener(
  "hashchange",
  activateTabFromHash
);
activateTabFromHash();

historyFilterButtons.forEach(button => {
  button.addEventListener(
    "click",
    () => {
      activeHistoryFilter =
        button.dataset.historyFilter;

      historyFilterButtons.forEach(
        candidate => {
          const isActive =
            candidate === button;
          candidate.classList.toggle(
            "is-active",
            isActive
          );
          candidate.setAttribute(
            "aria-pressed",
            String(isActive)
          );
        }
      );

      renderHistory();
    }
  );
});

async function loadHistory() {
  try {
    const response = await fetch(
      historyDataUrl,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (
      !data ||
      !data.profile ||
      !Array.isArray(data.entries) ||
      !Array.isArray(data.themes)
    ) {
      throw new TypeError(
        "歩みデータの形式が不正です。"
      );
    }

    historyRecords = [...data.entries].sort(
      (first, second) =>
        first.sortKey - second.sortKey
    );
    historyCountElement.textContent =
      historyRecords.length;
    historyNoteElement.textContent =
      data.editorialNote;
    renderProfile(data.profile);
    renderHistory();
    renderThemes(data.themes);
  } catch (error) {
    console.error(
      "ナガノ先生の歩みを読み込めませんでした。",
      error
    );
    historySummaryElement.textContent =
      "歩みを読み込めませんでした。";
    historyErrorElement.hidden = false;
  }
}

await loadHistory();

import("./cloud-sync-loader.js").catch(
  error => {
    console.warn(
      "クラウド保存機能を読み込めませんでした。",
      error
    );
  }
);
