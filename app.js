// ========================================
// ちいかわ推し活MAP
// ========================================


// ========================================
// 地図設定
// ========================================

const INITIAL_POSITION = [
  35.681236,
  139.767125
];

const INITIAL_ZOOM = 11;


const TILE_PROVIDERS = [

  {
    name: "OpenStreetMap",

    url:
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",

    options: {
      maxZoom: 19,

      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">' +
        "OpenStreetMap contributors</a>"
    }
  },


  {
    name: "Stadia Maps",

    url:
      "https://tiles.stadiamaps.com/tiles/" +
      "alidade_smooth/{z}/{x}/{y}{r}.png",

    options: {
      maxZoom: 20,

      attribution:
        '&copy; <a href="https://stadiamaps.com/" target="_blank">' +
        "Stadia Maps</a>, " +

        '&copy; <a href="https://openmaptiles.org/" target="_blank">' +
        "OpenMapTiles</a>, " +

        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">' +
        "OpenStreetMap</a>"
    }
  }

];


// ========================================
// 障害試験
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


const mapContent =
  document.getElementById(
    "map-content"
  );


const detailPanel =
  document.getElementById(
    "spot-detail-panel"
  );


const detailBody =
  document.getElementById(
    "spot-detail-body"
  );


const detailClose =
  document.getElementById(
    "detail-close"
  );


// ========================================
// タイル管理
// ========================================

let currentProviderIndex = 0;

let currentTileLayer = null;

let tileErrorTimes = [];

let switchingProvider = false;

let allProvidersFailed = false;


const TILE_ERROR_THRESHOLD = 3;

const TILE_ERROR_WINDOW = 5000;


// ========================================
// 地図状態
// ========================================

function showMapStatus(message) {

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
// テスト用タイルURL
// ========================================

function getTileUrl(providerIndex) {

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
    providerIndex === 0
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


  if (currentTileLayer) {

    currentTileLayer.off();

    map.removeLayer(
      currentTileLayer
    );
  }


  currentProviderIndex =
    providerIndex;

  tileErrorTimes = [];

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
// フォールバック
// ========================================

function switchToNextProvider() {

  switchingProvider =
    true;


  const nextProviderIndex =
    currentProviderIndex + 1;


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
// 日本時間
// ========================================

function getTodayInJapan() {

  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
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
// 期間判定
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
// ラベル
// ========================================

function getPeriodStatusLabel(
  status
) {

  const labels = {
    permanent: "常設",
    upcoming: "開催前",
    active: "開催中",
    ended: "終了済み",
    unknown: "期間不明"
  };

  return (
    labels[status] ||
    "期間不明"
  );
}


function formatDate(dateString) {

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
    shop: "ショップ",
    food: "グルメ",
    spot: "おでかけスポット",
    lodging: "宿泊",
    other: "その他"
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
    none: "",
    when_crowded: "混雑時",
    always: "常時",
    sometimes: "状況により",
    announced: "公式案内時"
  };


  return (
    labels[condition] ||
    ""
  );
}


// ========================================
// URLチェック
// ========================================

function getSafeUrl(url) {

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
// スポットレイヤー
// MarkerCluster対応
// ========================================


// ----------------------------------------
// クラスタアイコン
// ----------------------------------------

function createClusterIcon(
  cluster
) {

  const markers =
    cluster.getAllChildMarkers();


  const count =
    cluster.getChildCount();


  let hasOfficial =
    false;


  let hasNagano =
    false;


  markers.forEach(
    marker => {

      if (
        marker.options
          .spotCategory ===
        "official"
      ) {

        hasOfficial =
          true;

      }


      if (
        marker.options
          .spotCategory ===
        "nagano"
      ) {

        hasNagano =
          true;

      }

    }
  );


  let colorClass =
    "cluster-mixed";


  if (
    hasOfficial &&
    !hasNagano
  ) {

    colorClass =
      "cluster-official";

  }


  if (
    hasNagano &&
    !hasOfficial
  ) {

    colorClass =
      "cluster-nagano";

  }


  /*
    件数に応じて
    少しだけサイズ変更
  */

  let size =
    42;


  if (
    count >= 10
  ) {

    size =
      48;

  }


  if (
    count >= 30
  ) {

    size =
      54;

  }


  return L.divIcon({

    className:
      "marker-cluster-custom",

    html:
      '<div class="cluster-bubble ' +
      colorClass +
      '">' +

      '<span class="cluster-count">' +
      count +
      '</span>' +

      '</div>',

    iconSize:
      [size, size]

  });

}


// ----------------------------------------
// MarkerClusterGroup
// ----------------------------------------

const spotLayer =
  L.markerClusterGroup({

    /*
      クラスタにマウスを乗せた時の
      青い範囲表示はOFF
    */

    showCoverageOnHover:
      false,


    /*
      クラスタをクリックしたら
      中のピンが見えるところまで拡大
    */

    zoomToBoundsOnClick:
      true,


    /*
      最大ズームまで行ったら
      同一座標のピンを蜘蛛の巣状に展開
    */

    spiderfyOnMaxZoom:
      true,


    /*
      同じ建物に5店舗などある時、
      少し広めにバラす
    */

    spiderfyDistanceMultiplier:
      1.35,


    /*
      数字を大きくすると
      より遠いピンまでまとめる。

      80が標準なので、
      今回は少し細かめの50px。
    */

    maxClusterRadius:
      50,


    /*
      画面外のクラスタを一時的に
      DOMから外して軽量化
    */

    removeOutsideVisibleBounds:
      true,


    /*
      独自デザイン
    */

    iconCreateFunction:
      createClusterIcon

  })
  .addTo(map);


const spotRecords = [];


let selectedRecord =
  null;

// ========================================
// 全スポットが入る範囲へ初期表示
// ========================================

function fitMapToAllSpots() {

  const latLngs =
    spotRecords.map(
      record => [
        record.spot.lat,
        record.spot.lng
      ]
    );


  if (
    latLngs.length === 0
  ) {

    return;
  }


  requestAnimationFrame(
    () => {

      /*
        レスポンシブレイアウト反映後の
        正しい地図サイズをLeafletへ通知
      */

      map.invalidateSize({
        pan: false,
        animate: false
      });


      /*
        1件しかない場合は
        fitBoundsだと拡大しすぎるので固定
      */

      if (
        latLngs.length === 1
      ) {

        map.setView(
          latLngs[0],
          13,
          {
            animate: false
          }
        );

        return;
      }


      const bounds =
        L.latLngBounds(
          latLngs
        );


      const padding =
        window.innerWidth <= 650
          ? [24, 24]
          : [40, 40];


      map.fitBounds(
        bounds,
        {
          padding: padding,

          /*
            将来、近所の数店舗しか
            データがなくなっても
            拡大しすぎないための保険
          */
          maxZoom: 12,

          animate: false
        }
      );

    }
  );
}

// ========================================
// ピン
// ========================================

function createSpotIcon(
  category
) {

  let label = "?";
  let className = "";


  if (
    category ===
    "official"
  ) {

    label = "公";

    className =
      "spot-pin-official";
  }


  if (
    category ===
    "nagano"
  ) {

    label = "ナ";

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
      "<span>" +
      label +
      "</span>" +
      "</div>",

    iconSize:
      [38, 38],

    iconAnchor:
      [19, 19]

  });
}


// ========================================
// DOM生成補助
// ========================================

function createDiv(
  className,
  text = null
) {

  const element =
    document.createElement(
      "div"
    );


  element.className =
    className;


  if (text !== null) {

    element.textContent =
      text;
  }


  return element;
}


function appendLink(
  parent,
  url,
  text
) {

  const safeUrl =
    getSafeUrl(url);


  if (!safeUrl) {
    return;
  }


  const link =
    document.createElement(
      "a"
    );


  link.href =
    safeUrl;

  link.target =
    "_blank";

  link.rel =
    "noopener noreferrer";

  link.textContent =
    text;


  parent.appendChild(
    link
  );
}


// ========================================
// 詳細画面作成
// ========================================

function createSpotDetail(
  spot
) {

  const container =
    document.createElement(
      "div"
    );


  // タイトル

  const title =
    document.createElement(
      "h2"
    );

  title.className =
    "spot-detail-title";

  title.textContent =
    spot.name;

  container.appendChild(
    title
  );


  // タグ

  const tags =
    createDiv(
      "spot-tags"
    );


  const categoryTag =
    createDiv(
      "spot-tag " +
      (
        spot.category ===
        "official"
          ? "tag-official"
          : "tag-nagano"
      ),
      getCategoryLabel(
        spot.category
      )
    );


  const placeTag =
    createDiv(
      "spot-tag tag-neutral",
      getPlaceTypeLabel(
        spot.placeType
      )
    );


  tags.appendChild(
    categoryTag
  );

  tags.appendChild(
    placeTag
  );


  container.appendChild(
    tags
  );


  // 関係性

  container.appendChild(
    createDiv(
      "spot-relation",
      "🏷️ " +
      getRelationTypeLabel(
        spot.category,
        spot.relationType
      )
    )
  );


  // 期間

  const periodStatus =
    getSpotPeriodStatus(
      spot
    );


  let periodText;


  if (
    spot.periodType ===
    "permanent"
  ) {

    periodText =
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


    periodText =
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
    createDiv(
      "spot-period period-" +
      periodStatus,
      periodText
    )
  );


  // ========================================
  // 営業情報
  // ========================================

  if (
    spot.hoursText ||
    spot.closedDaysText ||
    spot.hoursInfoUrl ||
    spot.hoursCheckedAt
  ) {

    const hours =
      createDiv(
        "spot-info-card spot-hours-card"
      );


    hours.appendChild(
      createDiv(
        "spot-info-title",
        "🕐 営業・開催情報"
      )
    );


    if (
      spot.hoursText
    ) {

      hours.appendChild(
        createDiv(
          "spot-info-row",
          "時間： " +
          spot.hoursText
        )
      );
    }


    if (
      spot.closedDaysText
    ) {

      hours.appendChild(
        createDiv(
          "spot-info-row",
          "休業・休催： " +
          spot.closedDaysText
        )
      );
    }


    appendLink(
      hours,
      spot.hoursInfoUrl,
      "最新の営業時間を見る ↗"
    );


    if (
      spot.hoursCheckedAt
    ) {

      hours.appendChild(
        createDiv(
          "spot-info-checked",
          "営業時間確認： " +
          formatDate(
            spot.hoursCheckedAt
          )
        )
      );
    }


    container.appendChild(
      hours
    );
  }


  // ========================================
  // 入場情報
  // ========================================

  const entry =
    createDiv(
      "spot-info-card spot-entry-card"
    );


  entry.appendChild(
    createDiv(
      "spot-info-title",
      "🎫 入店・入場方法"
    )
  );


  entry.appendChild(
    createDiv(
      "spot-info-row",
      "予約： " +
      getReservationLabel(
        spot.reservationType
      )
    )
  );


  entry.appendChild(
    createDiv(
      "spot-info-row",
      "通常時： " +
      getDefaultEntryLabel(
        spot.defaultEntryType
      )
    )
  );


  const crowdControl =
    getCrowdControlLabel(
      spot.crowdControlType
    );


  if (
    crowdControl
  ) {

    const condition =
      getCrowdConditionLabel(
        spot.crowdControlCondition
      );


    entry.appendChild(
      createDiv(
        "spot-info-row",
        (
          condition
            ? condition + "： "
            : ""
        ) +
        crowdControl
      )
    );
  }


  if (
    spot.entryNote
  ) {

    entry.appendChild(
      createDiv(
        "spot-info-note",
        spot.entryNote
      )
    );
  }


  appendLink(
    entry,
    spot.reservationUrl,
    "予約ページを見る ↗"
  );


  appendLink(
    entry,
    spot.entryInfoUrl,
    "最新の入場情報を見る ↗"
  );


  if (
    spot.entryInfoCheckedAt
  ) {

    entry.appendChild(
      createDiv(
        "spot-info-checked",
        "入場情報確認： " +
        formatDate(
          spot.entryInfoCheckedAt
        )
      )
    );
  }


  container.appendChild(
    entry
  );


  // 住所

  if (
    spot.address
  ) {

    container.appendChild(
      createDiv(
        "spot-address",
        "📌 " +
        spot.address
      )
    );
  }


  // 説明

  if (
    spot.description
  ) {

    container.appendChild(
      createDiv(
        "spot-description",
        spot.description
      )
    );
  }


  appendLink(
    container,
    spot.sourceUrl,
    "情報元を見る ↗"
  );


  appendLink(
    container,
    spot.mapUrl,
    "地図で開く ↗"
  );


  return container;
}


// ========================================
// スポット詳細表示
// ========================================

function showSpotDetail(
  record
) {

  // 前の選択を解除

  if (
    selectedRecord
  ) {

    selectedRecord.marker
      .getElement()
      ?.classList
      .remove(
        "is-selected"
      );
  }


  selectedRecord =
    record;


  detailBody.replaceChildren(
    createSpotDetail(
      record.spot
    )
  );


  detailPanel.hidden =
    false;


  mapContent.classList.add(
    "has-detail"
  );


  record.marker
    .getElement()
    ?.classList
    .add(
      "is-selected"
    );


  /*
    重要：
    scrollIntoViewやpanToは呼ばない。
    そのためスマホでも勝手に
    スクロール・地図移動しない。
  */


  requestAnimationFrame(
    () => {

      map.invalidateSize(
        {
          pan: false,
          animate: false
        }
      );

    }
  );
}


// ========================================
// 詳細を閉じる
// ========================================

function closeSpotDetail() {

  if (
    selectedRecord
  ) {

    selectedRecord.marker
      .getElement()
      ?.classList
      .remove(
        "is-selected"
      );
  }


  selectedRecord =
    null;


  detailPanel.hidden =
    true;


  detailBody.replaceChildren();


  mapContent.classList.remove(
    "has-detail"
  );


  requestAnimationFrame(
    () => {

      map.invalidateSize(
        {
          pan: false,
          animate: false
        }
      );

    }
  );
}


// ========================================
// スポット作成
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
        ),

      /*
        クラスタ色の判定用
      */

      spotCategory:
        spot.category,

      /*
        アクセシビリティ兼
        マーカー識別用
      */

      title:
        spot.name,

      alt:
        spot.name
    }
  );


  const record = {
    spot,
    marker
  };


  /*
    Leaflet Popupは使わない。
  */

  marker.on(
    "click",
    () => {

      showSpotDetail(
        record
      );

    }
  );


  return record;
}


// ========================================
// フィルター値
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

  if (
    selectedRecord &&
    !spotMatchesFilters(
      selectedRecord.spot
    )
  ) {

    closeSpotDetail();
  }


  spotLayer.clearLayers();


  let visibleCount = 0;


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


        if (
          record ===
          selectedRecord
        ) {

          requestAnimationFrame(
            () => {

              record.marker
                .getElement()
                ?.classList
                .add(
                  "is-selected"
                );

            }
          );
        }
      }
    }
  );


  resultCount.textContent =
    visibleCount +
    "件表示";
}


// ========================================
// フィルターパネル
// ========================================

function setFilterPanelOpen(
  open
) {

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
          cache: "no-store"
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


    let endedCount = 0;

    let skippedCount = 0;


    spots.forEach(
      spot => {

        const periodStatus =
          getSpotPeriodStatus(
            spot
          );


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


        if (record) {

          spotRecords.push(
            record
          );

        } else {

          skippedCount++;
        }
      }
    );


    updateSpotFilters();
    fitMapToAllSpots();


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


  } catch (error) {

    console.error(
      "スポットデータの読み込みに失敗しました。",
      error
    );


    resultCount.textContent =
      "スポット読込エラー";
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

    }
  );


filterReset
  ?.addEventListener(
    "click",
    resetFilters
  );


detailClose
  ?.addEventListener(
    "click",
    closeSpotDetail
  );


document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Escape"
    ) {

      if (
        !filterPanel.hidden
      ) {

        setFilterPanelOpen(
          false
        );

        return;
      }


      if (
        !detailPanel.hidden
      ) {

        closeSpotDetail();
      }
    }

  }
);


// ========================================
// 起動
// ========================================

loadTileProvider(0);

loadSpots();
