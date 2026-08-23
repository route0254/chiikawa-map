// ========================================
// ちいかわ推し活MAP
// ========================================


// ========================================
// 地図初期設定
// ========================================

const INITIAL_POSITION = [
  35.681236,
  139.767125
];

const INITIAL_ZOOM = 11;


// ========================================
// タイルプロバイダー
// ========================================

const TILE_PROVIDERS = [

  {

    name:
      "OpenStreetMap",

    url:
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",

    options: {

      maxZoom:
        19,

      attribution:

        '&copy; ' +

        '<a href="https://www.openstreetmap.org/copyright">' +

        'OpenStreetMap contributors' +

        '</a>'

    }

  },


  {

    name:
      "Stadia Maps",

    url:

      "https://tiles.stadiamaps.com/" +

      "tiles/alidade_smooth/" +

      "{z}/{x}/{y}{r}.png",

    options: {

      maxZoom:
        20,

      attribution:

        '&copy; ' +

        '<a href="https://stadiamaps.com/" target="_blank">' +

        'Stadia Maps' +

        '</a>, ' +

        '&copy; ' +

        '<a href="https://openmaptiles.org/" target="_blank">' +

        'OpenMapTiles' +

        '</a>, ' +

        '&copy; ' +

        '<a href="https://www.openstreetmap.org/copyright" target="_blank">' +

        'OpenStreetMap' +

        '</a>'

    }

  }

];


// ========================================
// 障害テスト
// ========================================

const params =
  new URLSearchParams(
    window.location.search
  );


const TILE_TEST_MODE =
  params.get(
    "tileTest"
  );


// ========================================
// Leaflet
// ========================================

const map =
  L.map(
    "map"
  ).setView(

    INITIAL_POSITION,
    INITIAL_ZOOM

  );


// ========================================
// タイル状態
// ========================================

let currentProviderIndex =
  0;


let currentTileLayer =
  null;


let tileErrorTimes =
  [];


let switchingProvider =
  false;


let allProvidersFailed =
  false;


const TILE_ERROR_THRESHOLD =
  3;


const TILE_ERROR_WINDOW =
  5000;


// ========================================
// DOM
// ========================================

const mapStatus =
  document.getElementById(
    "map-status"
  );


const resultCount =
  document.getElementById(
    "result-count"
  );


const filterToggle =
  document.getElementById(
    "filter-toggle"
  );


const filterPanel =
  document.getElementById(
    "filter-panel"
  );


const filterClose =
  document.getElementById(
    "filter-close"
  );


const filterReset =
  document.getElementById(
    "filter-reset"
  );


// ========================================
// 地図ステータス
// ========================================

function showMapStatus(
  message
) {

  if (!mapStatus) {
    return;
  }


  mapStatus.textContent =
    message;


  mapStatus.hidden =
    false;

}


function hideMapStatus() {

  if (!mapStatus) {
    return;
  }


  mapStatus.hidden =
    true;

}


// ========================================
// テスト用タイル
// ========================================

function getTileUrl(
  providerIndex
) {


  if (
    TILE_TEST_MODE ===
    "all-fail"
  ) {

    return (

      "https://invalid.example.com/" +

      "{z}/{x}/{y}.png"

    );

  }


  if (

    TILE_TEST_MODE ===
      "osm-fail" &&

    providerIndex ===
      0

  ) {

    return (

      "https://invalid.example.com/" +

      "{z}/{x}/{y}.png"

    );

  }


  return (

    TILE_PROVIDERS[
      providerIndex
    ].url

  );

}


// ========================================
// タイル読込
// ========================================

function loadTileProvider(
  providerIndex
) {


  const provider =

    TILE_PROVIDERS[
      providerIndex
    ];


  if (
    currentTileLayer
  ) {

    currentTileLayer.off();


    map.removeLayer(
      currentTileLayer
    );

  }


  currentProviderIndex =
    providerIndex;


  tileErrorTimes =
    [];


  switchingProvider =
    false;


  currentTileLayer =

    L.tileLayer(

      getTileUrl(
        providerIndex
      ),

      provider.options

    );


  currentTileLayer.once(

    "tileload",

    function () {


      if (
        currentProviderIndex ===
        0
      ) {

        hideMapStatus();

      } else {

        showMapStatus(

          "バックアップ地図で表示しています：" +

          provider.name

        );

      }

    }

  );


  currentTileLayer.on(

    "tileerror",

    handleTileError

  );


  currentTileLayer.addTo(
    map
  );

}


// ========================================
// タイルエラー
// ========================================

function handleTileError() {


  if (

    switchingProvider ||

    allProvidersFailed

  ) {

    return;

  }


  const now =
    Date.now();


  tileErrorTimes =

    tileErrorTimes.filter(

      time =>

        now - time <

        TILE_ERROR_WINDOW

    );


  tileErrorTimes.push(
    now
  );


  if (

    tileErrorTimes.length <

    TILE_ERROR_THRESHOLD

  ) {

    return;

  }


  switchToNextProvider();

}


// ========================================
// タイル切替
// ========================================

function switchToNextProvider() {


  switchingProvider =
    true;


  const nextProviderIndex =

    currentProviderIndex +
    1;


  if (

    nextProviderIndex <

    TILE_PROVIDERS.length

  ) {


    const currentName =

      TILE_PROVIDERS[
        currentProviderIndex
      ].name;


    const nextName =

      TILE_PROVIDERS[
        nextProviderIndex
      ].name;


    console.warn(

      currentName +

      " の読み込みに失敗しました。" +

      nextName +

      " に切り替えます。"

    );


    showMapStatus(
      "地図サービスを切り替えています…"
    );


    loadTileProvider(
      nextProviderIndex
    );


    return;

  }


  allProvidersFailed =
    true;


  console.error(
    "すべての地図サービスの読み込みに失敗しました。"
  );


  showMapStatus(

    "現在、背景地図を読み込めません。" +

    "スポット情報は引き続き利用できます。"

  );

}


// ========================================
// 日本時間の日付
// ========================================

function getTodayInJapan() {


  const formatter =

    new Intl.DateTimeFormat(

      "en-CA",

      {

        timeZone:
          "Asia/Tokyo",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit"

      }

    );


  const values = {};


  formatter

    .formatToParts(
      new Date()
    )

    .forEach(
      part => {

        if (
          part.type !==
          "literal"
        ) {

          values[
            part.type
          ] =
            part.value;

        }

      }
    );


  return (

    values.year +

    "-" +

    values.month +

    "-" +

    values.day

  );

}


// ========================================
// 開催状態
// ========================================

function getSpotPeriodStatus(
  spot
) {


  if (
    spot.periodType ===
    "permanent"
  ) {

    return "permanent";

  }


  if (
    spot.periodType !==
    "limited"
  ) {

    return "unknown";

  }


  const today =
    getTodayInJapan();


  if (

    spot.startDate &&

    today <
      spot.startDate

  ) {

    return "upcoming";

  }


  if (

    spot.endDate &&

    today >
      spot.endDate

  ) {

    return "ended";

  }


  return "active";

}


// ========================================
// 各種ラベル
// ========================================

function getPeriodStatusLabel(
  status
) {


  const labels = {

    permanent:
      "常設",

    upcoming:
      "開催前",

    active:
      "開催中",

    ended:
      "終了済み",

    unknown:
      "期間不明"

  };


  return (
    labels[status] ||
    "期間不明"
  );

}


function formatDate(
  dateString
) {


  if (!dateString) {

    return "";

  }


  return dateString.replaceAll(
    "-",
    "/"
  );

}


function getCategoryLabel(
  category
) {


  const labels = {

    official:
      "ちいかわ公式関連",

    nagano:
      "ナガノ先生関連"

  };


  return (
    labels[category] ||
    "その他"
  );

}


function getPlaceTypeLabel(
  placeType
) {


  const labels = {

    shop:
      "ショップ",

    food:
      "グルメ",

    spot:
      "おでかけスポット",

    lodging:
      "宿泊",

    other:
      "その他"

  };


  return (
    labels[placeType] ||
    "その他"
  );

}


function getRelationTypeLabel(

  category,
  relationType

) {


  const officialLabels = {

    official_store:
      "公式ショップ",

    official_facility:
      "公式施設・常設スポット",

    collaboration:
      "公式コラボ",

    popup:
      "ポップアップ・期間限定ショップ",

    event:
      "イベント・展示"

  };


  const naganoLabels = {

    introduced:
      "ナガノ先生が紹介",

    visited:
      "ナガノ先生が訪問",

    related:
      "ナガノ先生ゆかり・関連"

  };


  if (
    category ===
    "official"
  ) {

    return (

      officialLabels[
        relationType
      ] ||

      "公式関連"

    );

  }


  if (
    category ===
    "nagano"
  ) {

    return (

      naganoLabels[
        relationType
      ] ||

      "ナガノ先生関連"

    );

  }


  return "その他";

}


function getReservationLabel(
  reservationType
) {


  const labels = {

    not_available:
      "予約不可",

    optional:
      "予約可",

    priority:
      "予約優先",

    required:
      "要予約",

    unknown:
      "要確認"

  };


  return (

    labels[
      reservationType
    ] ||

    "要確認"

  );

}


function getDefaultEntryLabel(
  entryType
) {


  const labels = {

    walkin:
      "通常入場",

    reservation_priority:
      "予約優先",

    reservation_required:
      "予約必須",

    ticket_required:
      "入場券が必要",

    other:
      "その他"

  };


  return (

    labels[
      entryType
    ] ||

    "要確認"

  );

}


function getCrowdControlLabel(
  type
) {


  const labels = {

    none:
      null,

    numbered_ticket:
      "整理券",

    lottery:
      "抽選",

    timed_entry:
      "時間指定入場",

    admission_ticket:
      "入場チケット",

    other:
      "その他の入場制限"

  };


  return (
    labels[type] ??
    null
  );

}


function getCrowdConditionLabel(
  condition
) {


  const labels = {

    none:
      "",

    when_crowded:
      "混雑時",

    always:
      "常時",

    sometimes:
      "状況により",

    announced:
      "公式案内時"

  };


  return (
    labels[condition] ||
    ""
  );

}


// ========================================
// URL検証
// ========================================

function getSafeUrl(
  url
) {


  if (!url) {

    return null;

  }


  try {


    const parsed =
      new URL(url);


    if (

      parsed.protocol ===
        "https:" ||

      parsed.protocol ===
        "http:"

    ) {

      return parsed.href;

    }


  } catch (error) {


    console.warn(

      "不正なURLを無視しました:",

      url

    );

  }


  return null;

}


// ========================================
// スポット保持
// ========================================

const spotLayer =

  L.layerGroup()
    .addTo(map);


const spotRecords =
  [];


// ========================================
// ピン
// ========================================

function createSpotIcon(
  category
) {


  let label =
    "?";


  let className =
    "";


  if (
    category ===
    "official"
  ) {

    label =
      "公";

    className =
      "spot-pin-official";

  }


  if (
    category ===
    "nagano"
  ) {

    label =
      "ナ";

    className =
      "spot-pin-nagano";

  }


  return L.divIcon({

    className:
      "spot-marker",

    html:

      '<div class="spot-pin ' +

      className +

      '">' +

      '<span>' +

      label +

      '</span>' +

      '</div>',


    iconSize:
      [38, 38],


    iconAnchor:
      [19, 19],


    popupAnchor:
      [0, -20]

  });

}


// ========================================
// ポップアップ
// ========================================

function createSpotPopup(
  spot
) {


  const container =

    document.createElement(
      "div"
    );


  container.className =
    "spot-popup";


  /* タイトル */

  const title =

    document.createElement(
      "div"
    );


  title.className =
    "spot-popup-title";


  title.textContent =
    spot.name;


  container.appendChild(
    title
  );


  /* タグ */

  const tags =

    document.createElement(
      "div"
    );


  tags.className =
    "spot-popup-tags";


  const categoryTag =

    document.createElement(
      "span"
    );


  categoryTag.className =

    "spot-popup-tag " +

    (
      spot.category ===
      "official"

        ? "tag-official"

        : "tag-nagano"
    );


  categoryTag.textContent =

    getCategoryLabel(
      spot.category
    );


  tags.appendChild(
    categoryTag
  );


  const placeTag =

    document.createElement(
      "span"
    );


  placeTag.className =

    "spot-popup-tag " +

    "tag-neutral";


  placeTag.textContent =

    getPlaceTypeLabel(
      spot.placeType
    );


  tags.appendChild(
    placeTag
  );


  container.appendChild(
    tags
  );


  /* 関係性 */

  const relation =

    document.createElement(
      "div"
    );


  relation.className =
    "spot-popup-meta";


  relation.textContent =

    "🏷️ " +

    getRelationTypeLabel(

      spot.category,

      spot.relationType

    );


  container.appendChild(
    relation
  );


  /* 開催期間 */

  const periodStatus =

    getSpotPeriodStatus(
      spot
    );


  const period =

    document.createElement(
      "div"
    );


  period.className =

    "spot-popup-period " +

    "period-" +

    periodStatus;


  if (
    spot.periodType ===
    "permanent"
  ) {

    period.textContent =
      "🗓 常設";

  } else {


    const start =

      spot.startDate

        ? formatDate(
            spot.startDate
          )

        : "開始日未定";


    const end =

      spot.endDate

        ? formatDate(
            spot.endDate
          )

        : "終了日未定";


    period.textContent =

      "🗓 " +

      start +

      " ～ " +

      end +

      "　" +

      getPeriodStatusLabel(
        periodStatus
      );

  }


  container.appendChild(
    period
  );


  /* ==================================
     営業時間
     ================================== */

  if (

    spot.hoursText ||

    spot.closedDaysText ||

    spot.hoursInfoUrl ||

    spot.hoursCheckedAt

  ) {


    const hoursBox =

      document.createElement(
        "section"
      );


    hoursBox.className =

      "spot-popup-info " +

      "spot-popup-hours";


    const hoursTitle =

      document.createElement(
        "div"
      );


    hoursTitle.className =
      "spot-popup-info-title";


    hoursTitle.textContent =
      "🕐 営業・開催情報";


    hoursBox.appendChild(
      hoursTitle
    );


    if (
      spot.hoursText
    ) {


      const row =

        document.createElement(
          "div"
        );


      row.className =
        "spot-popup-info-row";


      row.textContent =

        "時間： " +

        spot.hoursText;


      hoursBox.appendChild(
        row
      );

    }


    if (
      spot.closedDaysText
    ) {


      const row =

        document.createElement(
          "div"
        );


      row.className =
        "spot-popup-info-row";


      row.textContent =

        "休業・休催： " +

        spot.closedDaysText;


      hoursBox.appendChild(
        row
      );

    }


    const hoursInfoUrl =

      getSafeUrl(
        spot.hoursInfoUrl
      );


    if (
      hoursInfoUrl
    ) {


      const link =

        document.createElement(
          "a"
        );


      link.href =
        hoursInfoUrl;


      link.target =
        "_blank";


      link.rel =
        "noopener noreferrer";


      link.textContent =
        "最新の営業時間を見る";


      hoursBox.appendChild(
        link
      );

    }


    if (
      spot.hoursCheckedAt
    ) {


      const checked =

        document.createElement(
          "div"
        );


      checked.className =
        "spot-popup-checked";


      checked.textContent =

        "営業時間確認： " +

        formatDate(
          spot.hoursCheckedAt
        );


      hoursBox.appendChild(
        checked
      );

    }


    container.appendChild(
      hoursBox
    );

  }


  /* ==================================
     入場方法
     ================================== */

  const entryBox =

    document.createElement(
      "section"
    );


  entryBox.className =

    "spot-popup-info " +

    "spot-popup-entry";


  const entryTitle =

    document.createElement(
      "div"
    );


  entryTitle.className =
    "spot-popup-info-title";


  entryTitle.textContent =
    "🎫 入店・入場方法";


  entryBox.appendChild(
    entryTitle
  );


  /* 予約 */

  const reservation =

    document.createElement(
      "div"
    );


  reservation.className =
    "spot-popup-info-row";


  reservation.textContent =

    "予約： " +

    getReservationLabel(
      spot.reservationType
    );


  entryBox.appendChild(
    reservation
  );


  /* 通常時 */

  const defaultEntry =

    document.createElement(
      "div"
    );


  defaultEntry.className =
    "spot-popup-info-row";


  defaultEntry.textContent =

    "通常時： " +

    getDefaultEntryLabel(
      spot.defaultEntryType
    );


  entryBox.appendChild(
    defaultEntry
  );


  /* 整理券等 */

  const crowdControl =

    getCrowdControlLabel(
      spot.crowdControlType
    );


  if (
    crowdControl
  ) {


    const crowdRow =

      document.createElement(
        "div"
      );


    crowdRow.className =
      "spot-popup-info-row";


    const condition =

      getCrowdConditionLabel(
        spot.crowdControlCondition
      );


    crowdRow.textContent =

      (
        condition

          ? condition + "： "

          : ""
      )

      +

      crowdControl;


    entryBox.appendChild(
      crowdRow
    );

  }


  /* 補足 */

  if (
    spot.entryNote
  ) {


    const note =

      document.createElement(
        "div"
      );


    note.className =
      "spot-popup-note";


    note.textContent =
      spot.entryNote;


    entryBox.appendChild(
      note
    );

  }


  /* 予約URL */

  const reservationUrl =

    getSafeUrl(
      spot.reservationUrl
    );


  if (
    reservationUrl
  ) {


    const link =

      document.createElement(
        "a"
      );


    link.href =
      reservationUrl;


    link.target =
      "_blank";


    link.rel =
      "noopener noreferrer";


    link.textContent =
      "予約ページを見る";


    entryBox.appendChild(
      link
    );

  }


  /* 入場情報URL */

  const entryInfoUrl =

    getSafeUrl(
      spot.entryInfoUrl
    );


  if (
    entryInfoUrl
  ) {


    const link =

      document.createElement(
        "a"
      );


    link.href =
      entryInfoUrl;


    link.target =
      "_blank";


    link.rel =
      "noopener noreferrer";


    link.textContent =
      "最新の入場情報を見る";


    entryBox.appendChild(
      link
    );

  }


  /* 確認日 */

  if (
    spot.entryInfoCheckedAt
  ) {


    const checked =

      document.createElement(
        "div"
      );


    checked.className =
      "spot-popup-checked";


    checked.textContent =

      "入場情報確認： " +

      formatDate(
        spot.entryInfoCheckedAt
      );


    entryBox.appendChild(
      checked
    );

  }


  container.appendChild(
    entryBox
  );


  /* ==================================
     住所
     ================================== */

  if (
    spot.address
  ) {


    const address =

      document.createElement(
        "div"
      );


    address.className =
      "spot-popup-address";


    address.textContent =

      "📌 " +

      spot.address;


    container.appendChild(
      address
    );

  }


  /* 説明 */

  if (
    spot.description
  ) {


    const description =

      document.createElement(
        "div"
      );


    description.className =
      "spot-popup-description";


    description.textContent =
      spot.description;


    container.appendChild(
      description
    );

  }


  /* ==================================
     外部リンク
     ================================== */

  const sourceUrl =

    getSafeUrl(
      spot.sourceUrl
    );


  const mapUrl =

    getSafeUrl(
      spot.mapUrl
    );


  if (
    sourceUrl ||
    mapUrl
  ) {


    const links =

      document.createElement(
        "div"
      );


    links.className =
      "spot-popup-links";


    if (
      sourceUrl
    ) {


      const sourceLink =

        document.createElement(
          "a"
        );


      sourceLink.href =
        sourceUrl;


      sourceLink.target =
        "_blank";


      sourceLink.rel =
        "noopener noreferrer";


      sourceLink.textContent =
        "情報元を見る ↗";


      links.appendChild(
        sourceLink
      );

    }


    if (
      mapUrl
    ) {


      const mapLink =

        document.createElement(
          "a"
        );


      mapLink.href =
        mapUrl;


      mapLink.target =
        "_blank";


      mapLink.rel =
        "noopener noreferrer";


      mapLink.textContent =
        "地図で開く ↗";


      links.appendChild(
        mapLink
      );

    }


    container.appendChild(
      links
    );

  }


  return container;

}


// ========================================
// マーカー生成
// ========================================

function createSpotRecord(
  spot
) {


  if (

    typeof spot.lat !==
      "number" ||

    typeof spot.lng !==
      "number"

  ) {


    console.warn(

      "緯度経度が不正なためスキップ:",

      spot

    );


    return null;

  }


  if (

    spot.category !==
      "official" &&

    spot.category !==
      "nagano"

  ) {


    console.warn(

      "未対応カテゴリのためスキップ:",

      spot.category,

      spot.name

    );


    return null;

  }


  const marker =

    L.marker(

      [
        spot.lat,
        spot.lng
      ],

      {

        icon:

          createSpotIcon(
            spot.category
          )

      }

    );


  marker.bindPopup(

    createSpotPopup(
      spot
    ),

    {

      maxWidth:
        330,

      minWidth:
        240

    }

  );


  return {

    spot,
    marker

  };

}


// ========================================
// フィルター値取得
// ========================================

function getSelectedValues(
  name
) {


  return new Set(

    Array.from(

      document.querySelectorAll(

        'input[name="' +

        name +

        '"]:checked'

      )

    )

    .map(

      input =>
        input.value

    )

  );

}


// ========================================
// フィルター判定
// ========================================

function spotMatchesFilters(
  spot
) {


  const categories =

    getSelectedValues(
      "filter-category"
    );


  const places =

    getSelectedValues(
      "filter-place"
    );


  const periods =

    getSelectedValues(
      "filter-period"
    );


  const reservations =

    getSelectedValues(
      "filter-reservation"
    );


  if (
    !categories.has(
      spot.category
    )
  ) {

    return false;

  }


  if (
    !places.has(
      spot.placeType
    )
  ) {

    return false;

  }


  if (
    !periods.has(
      spot.periodType
    )
  ) {

    return false;

  }


  if (
    !reservations.has(

      spot.reservationType ||

      "unknown"

    )
  ) {

    return false;

  }


  /* 公式の関係種類 */

  if (
    spot.category ===
    "official"
  ) {


    const relations =

      getSelectedValues(
        "filter-official-relation"
      );


    if (
      !relations.has(
        spot.relationType
      )
    ) {

      return false;

    }

  }


  /* ナガノ先生 */

  if (
    spot.category ===
    "nagano"
  ) {


    const relations =

      getSelectedValues(
        "filter-nagano-relation"
      );


    if (
      !relations.has(
        spot.relationType
      )
    ) {

      return false;

    }

  }


  return true;

}


// ========================================
// フィルター反映
// ========================================

function updateSpotFilters() {


  spotLayer.clearLayers();


  let visibleCount =
    0;


  spotRecords.forEach(

    record => {


      if (

        spotMatchesFilters(
          record.spot
        )

      ) {


        record.marker.addTo(
          spotLayer
        );


        visibleCount++;

      }

    }

  );


  if (
    resultCount
  ) {

    resultCount.textContent =

      visibleCount +

      "件表示";

  }

}


// ========================================
// フィルターパネル
// ========================================

function setFilterPanelOpen(
  open
) {


  if (
    !filterPanel ||
    !filterToggle
  ) {

    return;

  }


  filterPanel.hidden =
    !open;


  filterToggle.setAttribute(

    "aria-expanded",

    String(open)

  );


  filterToggle.classList.toggle(

    "is-active",

    open

  );


  if (
    open
  ) {


    filterPanel

      .querySelector(
        "input"
      )

      ?.focus(
        {
          preventScroll:
            true
        }
      );

  }

}


// ========================================
// フィルターリセット
// ========================================

function resetFilters() {


  document

    .querySelectorAll(
      ".spot-filter"
    )

    .forEach(

      input => {

        input.checked =
          true;

      }

    );


  updateSpotFilters();

}


// ========================================
// JSON読込
// ========================================

async function loadSpots() {


  try {


    const response =

      await fetch(

        "./data/spots.json",

        {

          cache:
            "no-store"

        }

      );


    if (
      !response.ok
    ) {

      throw new Error(

        "HTTP " +

        response.status

      );

    }


    const spots =

      await response.json();


    if (
      !Array.isArray(
        spots
      )
    ) {

      throw new Error(

        "spots.json が配列ではありません。"

      );

    }


    let endedCount =
      0;


    let skippedCount =
      0;


    spots.forEach(

      spot => {


        const periodStatus =

          getSpotPeriodStatus(
            spot
          );


        /* 終了済み */

        if (
          periodStatus ===
          "ended"
        ) {


          endedCount++;


          console.log(

            "終了済みスポットを非表示:",

            spot.name

          );


          return;

        }


        const record =

          createSpotRecord(
            spot
          );


        if (
          record
        ) {


          spotRecords.push(
            record
          );


        } else {


          skippedCount++;

        }

      }

    );


    updateSpotFilters();


    console.log(

      spots.length +

      "件のスポットデータを読み込みました。"

    );


    console.log(

      spotRecords.length +

      "件が表示対象です。"

    );


    console.log(

      endedCount +

      "件の終了済みスポットを非表示にしました。"

    );


    if (
      skippedCount > 0
    ) {


      console.warn(

        skippedCount +

        "件のスポットをデータ不備によりスキップしました。"

      );

    }


  } catch (
    error
  ) {


    console.error(

      "スポットデータの読み込みに失敗しました。",

      error

    );


    if (
      resultCount
    ) {

      resultCount.textContent =
        "スポット読込エラー";

    }

  }

}


// ========================================
// フィルターイベント
// ========================================

document

  .querySelectorAll(
    ".spot-filter"
  )

  .forEach(

    input => {


      input.addEventListener(

        "change",

        updateSpotFilters

      );

    }

  );


// ========================================
// パネル開閉
// ========================================

filterToggle
  ?.addEventListener(

    "click",

    () => {


      setFilterPanelOpen(
        filterPanel.hidden
      );

    }

  );


filterClose
  ?.addEventListener(

    "click",

    () => {


      setFilterPanelOpen(
        false
      );


      filterToggle
        ?.focus();

    }

  );


filterReset
  ?.addEventListener(

    "click",

    resetFilters

  );


// ESCでも閉じる

document.addEventListener(

  "keydown",

  event => {


    if (

      event.key ===
        "Escape" &&

      filterPanel &&

      !filterPanel.hidden

    ) {


      setFilterPanelOpen(
        false
      );


      filterToggle
        ?.focus();

    }

  }

);


// ========================================
// 起動
// ========================================

loadTileProvider(
  0
);


loadSpots();
