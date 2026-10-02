/* Local exploration prototype. Existing spot and saved-data models remain authoritative. */
function isWideExplorer() {
  return document.body.classList.contains("explorer") && matchMedia("(min-width: 900px)").matches;
}

let explorerReturnScroll = 0;
let explorerPreviewRecord = null;
let explorerSheetHistoryActive = false;
let explorerPendingClose = null;

function explorerCategory(spot) {
  if (spot.category !== "nagano") return getCategoryLabel(spot.category);
  return "ナガセン" + getEvidenceLevelLabel(getEvidenceLevel(spot));
}

function syncExplorerSelection() {
  document.querySelectorAll(".spot-list-card[data-spot-id]").forEach(card => {
    card.classList.toggle("is-selected-candidate", card.dataset.spotId === selectedRecord?.spot.id);
  });
}

function openSpotPreview(record) {
  if (isWideExplorer()) {
    showSpotDetail(record, {returnFocusTo:record.marker.getElement()});
    return;
  }
  selectedRecord?.marker.getElement()?.classList.remove("is-selected");
  selectedRecord = record;
  explorerPreviewRecord = record;
  record.marker.getElement()?.classList.add("is-selected");
  scheduleMapLabels();
  const preview = document.getElementById("spot-preview");
  preview.replaceChildren();
  const close = document.createElement("button");
  close.type = "button"; close.className = "preview-close";
  close.textContent = "×"; close.setAttribute("aria-label", "候補プレビューを閉じる");
  close.addEventListener("click", () => {
    preview.hidden = true;
    record.marker.getElement()?.focus({preventScroll:true});
  });
  const category = createDiv("preview-category", explorerCategory(record.spot));
  const heading = document.createElement("h2");
  heading.id = "spot-preview-title"; heading.textContent = record.spot.name;
  const place = createDiv("preview-place", record.spot.address || record.prefecture);
  const period = createDiv("preview-period", record.spot.periodType === "permanent" ? "常設 · 訪問前に営業・入場情報をご確認ください" : `${formatDate(record.spot.startDate)}〜${formatDate(record.spot.endDate)} · ${getPeriodStatusLabel(getSpotPeriodStatus(record.spot))}`);
  const entry = createDiv("preview-period", "予約：" + getReservationLabel(record.spot.reservationType) + " · 入場：" + getDefaultEntryLabel(record.spot.defaultEntryType));
  const actions = createDiv("preview-actions");
  const open = document.createElement("button");
  open.type="button"; open.className="preview-open"; open.textContent="場所と訪問情報を見る";
  open.addEventListener("click", () => showSpotDetail(record, {returnFocusTo:open}));
  const save = document.createElement("button");
  save.type="button"; save.className="preview-save";
  const updateSave = () => { save.textContent = isFavoriteSpot(record.spot) ? "栞 保存済み" : "栞 保存"; save.setAttribute("aria-pressed", String(isFavoriteSpot(record.spot))); };
  updateSave();
  save.addEventListener("click", () => { toggleFavoriteSpot(record.spot); updateSave(); });
  actions.append(open,save); preview.append(close,category,heading,place,period,entry,actions);
  preview.hidden=false; preview.focus({preventScroll:true});
  syncExplorerSelection();
}

function prepareExplorerDetail(record) {
  if (!isWideExplorer() && explorerPreviewRecord?.spot.id === record.spot.id && detailPanel.hidden && !explorerSheetHistoryActive) {
    history.pushState({...history.state, explorerSheet:true}, "", location.href);
    explorerSheetHistoryActive=true;
  }
  explorerReturnScroll = document.getElementById("spot-list-panel").scrollTop;
  document.getElementById("spot-preview").hidden=true;
  const panel=document.getElementById("spot-detail-panel");
  document.getElementById("detail-close").textContent=isWideExplorer() ? "候補に戻る" : "地図に戻る";
  panel.setAttribute("role", isWideExplorer() ? "region" : "dialog");
  if (isWideExplorer()) panel.removeAttribute("aria-modal"); else panel.setAttribute("aria-modal","true");
  document.querySelector(".site-header").inert=!isWideExplorer();
  document.querySelector(".explorer-sidebar").inert=!isWideExplorer() || matchMedia("(min-width:900px) and (max-width:1279px)").matches;
  document.getElementById("map-wrapper").inert=!isWideExplorer();
  requestAnimationFrame(syncExplorerSelection);
}

function closeExplorerDetail(options = {}) {
  if(explorerSheetHistoryActive && !options.fromHistory) { explorerPendingClose=options; history.back(); return; }
  detailPanel.hidden=true;
  document.querySelector(".site-header").inert=false;
  document.querySelector(".explorer-sidebar").inert=false;
  document.getElementById("map-wrapper").inert=false;
  if (options.restoreFocus === false) {
    document.getElementById("spot-preview").hidden=true;
    explorerPreviewRecord=null;
    if(selectedRecord && !recordMatchesFilters(selectedRecord,getCurrentFilterState())) {
      selectedRecord.marker.getElement()?.classList.remove("is-selected"); selectedRecord=null;
    }
  }
  mapContent.classList.remove("has-detail");
  document.getElementById("spot-list-panel").scrollTop=explorerReturnScroll;
  map.invalidateSize({pan:false,animate:false});
  scheduleMapLabels(); syncExplorerSelection();
  if (options.restoreFocus !== false && !isWideExplorer() && selectedRecord && explorerPreviewRecord?.spot.id === selectedRecord.spot.id) {
    openSpotPreview(selectedRecord);
    document.querySelector(".preview-open")?.focus({preventScroll:true});
  } else if (options.restoreFocus !== false) {
    const target = detailReturnFocusElement?.isConnected ? detailReturnFocusElement : selectedRecord?.marker.getElement();
    target?.focus({preventScroll:true});
  }
}

function initializeExplorer() {
  document.body.classList.add("explorer");
  document.getElementById("map-view-button").textContent="地図";
  document.getElementById("list-view-button").textContent="一覧";
  document.getElementById("filter-toggle").textContent="条件";
  document.getElementById("filter-toggle").setAttribute("aria-label","スポットを絞り込む");
  document.querySelector(".spot-detail-kicker").textContent="訪問情報";
  const card=document.querySelector(".map-card");
  const sidebar=document.createElement("aside");
  sidebar.className="explorer-sidebar"; sidebar.setAttribute("aria-label","検索と候補");
  const mapContent=document.getElementById("map-content");
  for(const node of [...card.children]) if(node !== mapContent) sidebar.append(node);
  card.prepend(sidebar);
  const toolbar=document.querySelector(".map-toolbar-left");
  const dates=document.createElement("details"); dates.className="explorer-dates";
  const summary=document.createElement("summary"); summary.textContent="開催日";
  dates.append(summary,document.querySelector(".date-discovery")); toolbar.append(dates);
  const tools=document.querySelector(".map-tools-menu");
  tools.classList.add("site-menu"); tools.querySelector("summary").textContent="保存・案内";
  const actions=tools.querySelector(".map-extra-actions");
  actions.append(document.querySelector(".site-menu:not(.map-tools-menu) .site-nav"), document.querySelector(".site-notice"),document.querySelector(".map-legend"), document.querySelector(".home-screen-card"),document.querySelector(".site-note"));
  document.querySelector(".site-menu:not(.map-tools-menu)").remove();
  const header=document.querySelector(".site-header-inner");
  header.append(document.querySelector("#recent-additions"), tools);
  document.getElementById("recent-additions-title").textContent="NEW";
  const preview=document.createElement("aside"); preview.id="spot-preview"; preview.className="spot-preview";
  preview.hidden=true; preview.tabIndex=-1; preview.setAttribute("role","region"); preview.setAttribute("aria-labelledby","spot-preview-title");
  mapContent.append(preview);
  const listTools=document.querySelector(".spot-list-tools");
  const sorting=document.createElement("details"); sorting.className="explorer-sort";
  const sortSummary=document.createElement("summary"); sortSummary.textContent="並び順";
  listTools.before(sorting); sorting.append(sortSummary,listTools);
  document.querySelector(".spot-list-header h2").textContent="見つけた道しるべ";
}

initializeExplorer();
addEventListener("popstate", () => {
  if(explorerSheetHistoryActive) {
    explorerSheetHistoryActive=false;
    const options=explorerPendingClose || {}; explorerPendingClose=null;
    closeExplorerDetail({...options,fromHistory:true});
  }
});
addEventListener("resize", () => {
  setViewMode(currentViewMode); updateSpotFilters();
  if(!detailPanel.hidden) prepareExplorerDetail(selectedRecord);
});
document.addEventListener("keydown", event => {
  if(event.key === "Escape" && !document.getElementById("spot-preview").hidden && detailPanel.hidden && !getOpenDialogPanel()) {
    document.getElementById("spot-preview").hidden=true;
    selectedRecord?.marker.getElement()?.focus({preventScroll:true});
  }
});
