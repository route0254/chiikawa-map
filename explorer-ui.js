/* Local exploration prototype. Existing spot and saved-data models remain authoritative. */
function isWideExplorer() {
  return document.body.classList.contains("explorer") && matchMedia("(min-width: 900px)").matches;
}

let explorerReturnScroll = 0;
let explorerPreviewRecord = null;
let explorerSheetHistoryActive = false;
let explorerPendingClose = null;
let explorerSelectionRequest = 0;
const explorerWordSegmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('ja',{granularity:'word'}):null;

function closeExplorerMenus() {
  document.querySelectorAll('.map-tools-menu[open],.recent-additions-details[open],.explorer-dates[open],.explorer-sort[open]').forEach(menu=>menu.open=false);
}

function focusExplorerMenuTrigger(button) {
  const closedMenu=button?.closest('details:not([open])');
  (closedMenu?.querySelector('summary') || (button?.getClientRects().length?button:document.querySelector('.map-tools-menu > summary')))?.focus({preventScroll:true});
}

function explorerIcon(name) { const icon=ChiikatsuUI.icon(name);icon.classList.add('explorer-icon');return icon; }

function explorerSaveButton(button,spot) {
  const saved=isFavoriteSpot(spot);
  button.replaceChildren(explorerIcon('bookmark'),document.createTextNode(saved?'行きたいに保存済み':'行きたい'));
  if(saved)button.append(explorerIcon('check'));
  button.classList.add('explorer-save');button.classList.toggle('is-active',saved);button.setAttribute('aria-pressed',String(saved));
}

function explorerRestoreActionFocus(button,spot,selector,fromList=false) {
  button.addEventListener('click',()=>{
    const request=explorerSelectionRequest;
    requestAnimationFrame(()=>{
      if(request!==explorerSelectionRequest || (document.activeElement!==document.body && document.activeElement!==button))return;
      const scope=fromList?document.querySelector(`.spot-list-card[data-spot-id="${CSS.escape(spot.id)}"]`):selectedRecord?.spot.id===spot.id?document.getElementById('spot-detail-body'):null;
      const target=scope?.querySelector(selector);
      if(target?.getClientRects().length)target.focus({preventScroll:true});
      else if(fromList)scope?.querySelector('.candidate-tools > summary')?.focus({preventScroll:true});
    });
  });
}

function explorerVisitedButton(button,spot) {
  button.replaceChildren(explorerIcon('visit'),document.createTextNode(isVisitedSpot(spot)?'行った：記録済み':'行った'));
  button.classList.add('explorer-visited');button.classList.toggle('is-active',isVisitedSpot(spot));button.setAttribute('aria-pressed',String(isVisitedSpot(spot)));
}

function explorerLeader(record,labelRect,mapRect) {
  const marker=record?.marker.getElement();if(!marker)return;
  const pin=marker.getBoundingClientRect();const x=pin.left+pin.width/2,y=pin.top+pin.height/2;
  const endX=Math.max(labelRect.left,Math.min(x,labelRect.right)),endY=Math.max(labelRect.top,Math.min(y,labelRect.bottom));
  if(Math.hypot(endX-x,endY-y)<8)return;
  let svg=document.querySelector('.explorer-selection-leader');
  if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('explorer-selection-leader');svg.setAttribute('aria-hidden','true');document.getElementById('map').append(svg);}
  const line=document.createElementNS(svg.namespaceURI,'line');
  for(const [key,value] of Object.entries({x1:x-mapRect.left,y1:y-mapRect.top,x2:endX-mapRect.left,y2:endY-mapRect.top,stroke:'#17607C','stroke-width':1.5}))line.setAttribute(key,value);
  svg.append(line);
}

function finishExplorerCandidate(card,record,openButton) {
  const spot=record.spot;
  card.querySelectorAll('.spot-list-address,.spot-list-hours,.spot-list-evidence').forEach(el=>el.remove());
  const meta=card.querySelector('.spot-list-card-meta');
  const address=(spot.address||'').replace(record.prefecture||'','');const town=address.match(/^(.+?[市区町村])/u)?.[1];
  if(meta)meta.textContent=[record.prefecture,town].filter(Boolean).join(' · ');
  const period=card.querySelector('.explorer-period');
  period.replaceChildren(document.createTextNode(spot.periodType==='permanent'?'常設':`${formatDate(spot.startDate)}〜${formatDate(spot.endDate)}`));
  const timing=card.querySelector('.spot-list-timing');
  if(timing){timing.textContent=timing.textContent.replace(/^[^\p{L}\p{N}]+/u,'').replace('本日終了','本日まで');period.append(timing);}else if(spot.periodType!=='permanent')period.append(createDiv('explorer-period-state',getPeriodStatusLabel(getSpotPeriodStatus(spot))));
  card.querySelector('.explorer-classification').textContent=explorerCategory(spot);
  const name=document.createElement('span');name.className='explorer-candidate-name';
  const words=explorerWordSegmenter?explorerWordSegmenter.segment(spot.name):[{segment:spot.name,isWordLike:true}];
  for(const word of words) {
    if(word.isWordLike){const part=document.createElement('span');part.className='explorer-name-part';part.textContent=word.segment;name.append(part);}
    else name.append(document.createTextNode(word.segment));
  }
  const heading=card.querySelector('h3');openButton.replaceChildren(explorerIcon('bookmark'),name);heading.replaceChildren(openButton);
  meta.before(period);
  const summary=createDiv('explorer-candidate-summary');meta.after(summary);summary.append(meta);
  const entryLabel=spot.defaultEntryType==='normal'?'予約：'+getReservationLabel(spot.reservationType):'入場：'+getDefaultEntryLabel(spot.defaultEntryType)+' · 予約：'+getReservationLabel(spot.reservationType);
  summary.append(createDiv('explorer-entry-hint',entryLabel));
  explorerSaveButton(card.querySelector('.spot-list-favorite-button'),spot);
  explorerVisitedButton(card.querySelector('.spot-list-visited-button'),spot);
  explorerRestoreActionFocus(card.querySelector('.spot-list-favorite-button'),spot,'.spot-list-favorite-button',true);
  explorerRestoreActionFocus(card.querySelector('.spot-list-visited-button'),spot,'.spot-list-visited-button',true);
  explorerRestoreActionFocus(card.querySelector('.spot-list-plan-button'),spot,'.spot-list-plan-button',true);
  for(const [selector,icon,label] of [['.spot-list-share-button','share','共有'],['.spot-list-plan-button','plan',isPlanSpot(spot)?'プランに追加済み':'プランに追加']]) {
    const button=card.querySelector(selector);if(button){const text=label||button.textContent.replace(/^[^\p{L}\p{N}]+/u,'');button.replaceChildren(explorerIcon(icon),document.createTextNode(text));}
  }
}

function finishExplorerDetail(container,spot,actionDisclosure) {
  const title=container.querySelector('.spot-detail-title'),period=container.querySelector('.spot-period');
  container.querySelector('.explorer-classification').textContent=explorerCategory(spot);
  if(period)period.textContent=period.textContent.replace(/^[^\p{L}\p{N}]+/u,'');
  const facts=createDiv('explorer-visit-facts');
  const hours=createDiv('explorer-visit-fact');hours.append(explorerIcon('clock'),document.createTextNode('営業時間：'+(spot.hoursText||'要確認')));facts.append(hours);
  const entry=createDiv('explorer-visit-fact');entry.append(explorerIcon('visit'),document.createTextNode('通常の入場：'+getDefaultEntryLabel(spot.defaultEntryType)+' · 予約：'+getReservationLabel(spot.reservationType)));facts.append(entry);
  const crowd=getCrowdControlLabel(spot.crowdControlType);
  if(crowd)facts.append(createDiv('explorer-entry-attention','特定日の対応：'+crowd+(getCrowdConditionLabel(spot.crowdControlCondition)?'（'+getCrowdConditionLabel(spot.crowdControlCondition)+'）':'')));
  const primary=createDiv('explorer-primary-actions');
  const save=container.querySelector('.spot-favorite-button'),visited=container.querySelector('.spot-visited-button');
  explorerSaveButton(save,spot);explorerVisitedButton(visited,spot);primary.append(save,visited);
  explorerRestoreActionFocus(save,spot,'.spot-favorite-button');explorerRestoreActionFocus(visited,spot,'.spot-visited-button');
  actionDisclosure.querySelector('summary').textContent='プラン・共有・その他';
  let anchor=period||title;
  for(const selector of ['.spot-important-notice','.spot-cancelled-notice']){const notice=container.querySelector(selector);if(notice){anchor.after(notice);anchor=notice;}}
  anchor.after(facts);anchor=facts;
  const address=container.querySelector('.spot-address');
  if(address){address.replaceChildren(explorerIcon('location'),document.createTextNode(spot.address));anchor.after(address);anchor=address;}
  anchor.after(primary);primary.after(actionDisclosure);
  let after=actionDisclosure;
  for(const selector of ['.spot-hours-card','.spot-entry-card','.spot-same-place-card']){const part=container.querySelector(selector);if(part){after.after(part);after=part;}}
  for(const selector of ['.spot-hours-card .spot-info-title','.spot-entry-card .spot-info-title']) {
    const heading=container.querySelector(selector);if(heading)heading.textContent=heading.textContent.replace(/^[^\p{L}\p{N}]+/u,'');
  }
  for(const node of container.querySelectorAll('.spot-info-title,.spot-relation,.spot-important-notice-title'))node.textContent=node.textContent.replace(/^[^\p{L}\p{N}]+/u,'');
  const rows=container.querySelectorAll('.spot-entry-card .spot-info-row');
  for(const row of rows){row.textContent=row.textContent.replace(/^通常時：/,'通常の入場：').replace(/^公式案内時：/,'特定日の対応（公式案内時）：');}
  for(const [selector,icon,label] of [['.spot-share-button','share','このスポットを共有'],['.spot-plan-button','plan',null]]) {
    const button=container.querySelector(selector);if(button)button.replaceChildren(explorerIcon(icon),document.createTextNode(label||button.textContent.replace(/^[^\p{L}\p{N}]+/u,'')));
  }
  ChiikatsuUI.decorateAction(container.querySelector('.spot-visit-save'),'visit');
  ChiikatsuUI.decorateAction(container.querySelector('.spot-visit-clear'),'close');
}

function explorerCategory(spot) {
  if (spot.category !== "nagano") return getCategoryLabel(spot.category);
  return "ナガセン" + getEvidenceLevelLabel(getEvidenceLevel(spot));
}

function syncExplorerSelection() {
  document.querySelectorAll(".spot-list-card[data-spot-id]").forEach(card => {
    card.classList.toggle("is-selected-candidate", card.dataset.spotId === selectedRecord?.spot.id);
  });
  for(const record of spotRecords) {
    const marker=record.marker.getElement();if(!marker)continue;
    marker.classList.toggle('is-favorite',isFavoriteSpot(record.spot));
    let badge=marker.querySelector('.explorer-marker-bookmark');
    if(isFavoriteSpot(record.spot)||record===selectedRecord) {
      if(!badge){badge=document.createElement('span');badge.className='explorer-marker-bookmark';badge.append(explorerIcon('bookmark'));marker.append(badge);}
    }else badge?.remove();
  }
}

function openSpotPreview(record) {
  explorerSelectionRequest++;
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
  open.type="button"; open.className="preview-open"; open.textContent="詳細を見る";
  open.addEventListener("click", () => showSpotDetail(record, {returnFocusTo:open}));
  const save = document.createElement("button");
  save.type="button"; save.className="preview-save";
  const updateSave = () => explorerSaveButton(save,record.spot);
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
  explorerSelectionRequest++;
  if(explorerSheetHistoryActive && !options.fromHistory) {
    if(!explorerPendingClose) { explorerPendingClose={...options,recordId:selectedRecord?.spot.id}; history.back(); }
    else if(options.restoreFocus === false) explorerPendingClose.restoreFocus=false;
    return;
  }
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
  const position=document.createElement('small');position.className='site-position';position.textContent='非公式';document.querySelector('.site-header h1').after(position);
  const searchIcon=document.querySelector('.spot-search-icon');if(searchIcon)searchIcon.replaceChildren(explorerIcon('search'));
  const locationIcon=document.querySelector('#location-button > span:first-child');if(locationIcon)locationIcon.replaceChildren(explorerIcon('location'));
  const card=document.querySelector(".map-card");
  const sidebar=document.createElement("aside");
  sidebar.className="explorer-sidebar"; sidebar.setAttribute("aria-label","検索と候補");
  const mapContent=document.getElementById("map-content");
  for(const node of [...card.children]) if(node !== mapContent) sidebar.append(node);
  card.prepend(sidebar);
  const toolbar=document.querySelector(".map-toolbar-left");
  const dates=document.createElement("details"); dates.className="explorer-dates";
  const summary=document.createElement("summary"); summary.setAttribute('aria-label','開催日');summary.append(explorerIcon('calendar'));const dateLabel=document.createElement('span');dateLabel.className='explorer-date-label';dateLabel.textContent='開催日';summary.append(dateLabel);
  dates.append(summary,document.querySelector(".date-discovery")); toolbar.append(dates);
  const tools=document.querySelector(".map-tools-menu");
  tools.classList.add("site-menu"); tools.querySelector("summary").textContent="保存・案内";
  const actions=tools.querySelector(".map-extra-actions");
  actions.append(document.querySelector(".site-menu:not(.map-tools-menu) .site-nav"), document.querySelector(".site-notice"),document.querySelector(".map-legend"), document.querySelector(".home-screen-card"),document.querySelector(".site-note"));
  const savedHeading=document.createElement('h3');savedHeading.className='explorer-menu-heading';savedHeading.textContent='手帳と保存データ';actions.prepend(savedHeading);
  const guideHeading=document.createElement('h3');guideHeading.className='explorer-menu-heading';guideHeading.textContent='サイト案内';actions.querySelector('.site-nav').before(guideHeading);
  document.querySelector(".site-menu:not(.map-tools-menu)").remove();
  for(const [selector,icon] of [['#favorite-filter-button','bookmark'],['.plan-open-button','plan'],['#visited-filter-button','visit'],['#saved-data-toggle','data'],['#share-filters-button','share'],['#official-help-toggle','info'],['#nagano-help-toggle','info']])ChiikatsuUI.decorateAction(document.querySelector(selector),icon);
  for(const link of actions.querySelectorAll('.site-nav-link'))ChiikatsuUI.decorateAction(link,link.getAttribute('href')?.includes('journal')?'bookmark':'info');
  for(const [index,icon] of ['bookmark','plan','visit'].entries())ChiikatsuUI.decorateAction(document.querySelectorAll('.saved-data-current > span')[index],icon);
  ChiikatsuUI.decorateAction(document.getElementById('saved-data-export'),'data');
  const header=document.querySelector(".site-header-inner");
  header.append(document.querySelector("#recent-additions"), tools);
  document.getElementById("recent-additions-title").textContent="新着";
  const preview=document.createElement("aside"); preview.id="spot-preview"; preview.className="spot-preview";
  preview.hidden=true; preview.tabIndex=-1; preview.setAttribute("role","region"); preview.setAttribute("aria-labelledby","spot-preview-title");
  mapContent.append(preview);
  const legend=document.createElement("details"); legend.className="explorer-map-legend";
  const legendSummary=document.createElement("summary");
  legendSummary.innerHTML='<span>非公式</span><span class="legend-official">公 公式</span><span class="legend-nagano">ナ ナガノ</span><span class="legend-fan">聖 ファン</span><span aria-hidden="true">ⓘ</span>';
  const legendText=document.createElement("div"); legendText.className="explorer-legend-notes";
  legendText.textContent="ファンによる非公式まとめです。公：ちいかわ公式関連。ナ：ナガノ関連（確認済み・可能性が高い・要確認を区別）。聖：ファン発の聖地。数字はまとめた候補数、混在するまとまりは中立色。掲載理由・出典は各詳細で確認できます。";
  const categories=document.createElement('ul');categories.className='explorer-legend-categories';
  for(const [key,label] of [['official','公：ちいかわ公式関連'],['confirmed','ナ✓：ナガノ関連・確認済み'],['high','ナ~：ナガノ関連・可能性が高い'],['caution','ナ?：ナガノ関連・要確認'],['fan','聖：ファン発の聖地']]){const item=document.createElement('li');item.className='legend-category-'+key;item.textContent=label;categories.append(item);}
  legendText.prepend(categories);
  legend.append(legendSummary,legendText);document.getElementById("map-wrapper").append(legend);
  legendSummary.querySelector('.legend-official').textContent='公:公式関連';
  legendSummary.querySelector('.legend-nagano').textContent='ナ:ナガノ関連';
  legendSummary.querySelector('.legend-fan').textContent='聖:ファン聖地';
  legendSummary.setAttribute('aria-label','非公式マップの凡例。開くと情報源と確度の5区分を確認できます');
  legend.addEventListener("toggle",()=>scheduleMapLabels());
  const listTools=document.querySelector(".spot-list-tools");
  const sorting=document.createElement("details"); sorting.className="explorer-sort";
  const sortSummary=document.createElement("summary"); sortSummary.textContent="並び順";
  listTools.before(sorting); sorting.append(sortSummary,listTools);
  document.querySelector(".spot-list-header h2").textContent="スポット";
}

initializeExplorer();
// A concrete starting point for the nationwide desktop view; location permission is optional.
const discovery=document.createElement('div');
discovery.className='explorer-discovery';
const discoveryCopy=document.createElement('p');discoveryCopy.textContent='行きたい地域や、最近追加されたスポットから探せます。';
const regionAction=document.createElement('button');regionAction.type='button';regionAction.textContent='地域を選ぶ';
const recentAction=document.createElement('button');recentAction.type='button';recentAction.textContent='最近追加した情報';
discovery.append(discoveryCopy,regionAction,recentAction);
document.querySelector('.spot-list-header').after(discovery);
regionAction.addEventListener('click',()=>{
 const select=document.querySelector('#prefecture-filter');
 select.focus();try{select.showPicker?.();}catch{/* The native select remains keyboard-operable. */}
});
recentAction.addEventListener('click',()=>{
 const recent=document.querySelector('.recent-additions-details');recent.open=true;recent.querySelector('summary').focus();
});
const discoveryRegion=document.querySelector('#prefecture-filter');
const refreshDiscovery=()=>{discovery.hidden=Boolean(discoveryRegion.value);};
discoveryRegion.addEventListener('change',refreshDiscovery);refreshDiscovery();
addEventListener("popstate", () => {
  if(explorerSheetHistoryActive) {
    explorerSheetHistoryActive=false;
    const options=explorerPendingClose || {}; explorerPendingClose=null;
    if(options.recordId && selectedRecord?.spot.id !== options.recordId) return;
    closeExplorerDetail({...options,fromHistory:true});
  }
});
addEventListener("resize", () => {
  setViewMode(currentViewMode); updateSpotFilters();
  if(!detailPanel.hidden) prepareExplorerDetail(selectedRecord);
});
document.addEventListener("keydown", event => {
  if((event.key === "Enter" || event.key === " ") && event.target instanceof Element) {
    const pin=event.target.closest(".spot-marker[data-spot-id]");
    if(pin) {
      event.preventDefault();
      const record=spotRecords.find(candidate=>candidate.spot.id === pin.dataset.spotId);
      if(record) openSpotPreview(record);
      return;
    }
  }
  if(event.key === "Escape" && !document.getElementById("spot-preview").hidden && detailPanel.hidden && !getOpenDialogPanel()) {
    document.getElementById("spot-preview").hidden=true;
    selectedRecord?.marker.getElement()?.focus({preventScroll:true});
  }
}, true);
