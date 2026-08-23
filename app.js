// ========================================
// ちいかわ推し活MAP
//
// ・Leaflet地図
// ・OpenStreetMap
// ・Stadia Mapsフォールバック
// ・障害試験
// ・スポットJSON読込
// ・公式 / ナガノ先生フィルター
// ・開催期間判定
// ・営業時間表示
// ・予約 / 入場方法表示
// ========================================


// ========================================
// 1. 地図の初期設定
// ========================================

const INITIAL_POSITION = [
  35.681236,
  139.767125
];

const INITIAL_ZOOM = 11;


// ========================================
// 2. タイルプロバイダー
// ========================================

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
      "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",

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
// 3. 障害試験モード
// ========================================

const params =
  new URLSearchParams(
    window.location.search
  );

const TILE_TEST_MODE =
  params.get("tileTest");


// ========================================
// 4. Leaflet地図作成
// ========================================

const map =
  L.map("map").setView(
    INITIAL_POSITION,
    INITIAL_ZOOM
  );


// ========================================
// 5. タイル状態管理
// ========================================

let currentProviderIndex = 0;
let currentTileLayer = null;

let tileErrorTimes = [];

let switchingProvider = false;
let allProvidersFailed = false;

const TILE_ERROR_THRESHOLD = 3;
const TILE_ERROR_WINDOW = 5000;


// ========================================
// 6. 地図状態メッセージ
// ========================================

const mapStatus =
  document.getElementById(
    "map-status"
  );


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
// 7. 障害試験用タイルURL
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
// 8. タイルプロバイダー読込
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


  const tileUrl =
    getTileUrl(
      providerIndex
    );


  currentTileLayer =
    L.tileLayer(
      tileUrl,
      provider.options
    );


  currentTileLayer.once(
    "tileload",
    function () {

      if (
        currentProviderIndex === 0
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


  currentTileLayer.addTo(map);
}


// ========================================
// 9. タイルエラー処理
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


  tileErrorTimes.push(now);


  if (
    tileErrorTimes.length <
    TILE_ERROR_THRESHOLD
  ) {

    return;
  }


  switchToNextProvider();
}


// ========================================
// 10. 次のタイルへ切替
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
// 11. 日本時間の日付
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


  const parts =
    formatter.formatToParts(
      new Date()
    );


  const values = {};


  parts.forEach(
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
// 12. 開催期間判定
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
// 13. 開催状態ラベル
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


// ========================================
// 14. 日付表示
// ========================================

function formatDate(
  dateString
) {

  if (!dateString) {
    return "";
  }


  return (
    dateString.replaceAll(
      "-",
      "/"
    )
  );
}


// ========================================
// 15. カテゴリ日本語表示
// ========================================

function getCategoryLabel(
  category
) {

  if (
    category ===
    "official"
  ) {

    return (
      "ちいかわ公式関連"
    );
  }


  if (
    category ===
    "nagano"
  ) {

    return (
      "ナガノ先生関連"
    );
  }


  return "その他";
}


// ========================================
// 16. 場所タイプ
// ========================================

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


// ========================================
// 17. 関係タイプ
// ========================================

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


// ========================================
// 18. 予約方式
// ========================================

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


// ========================================
// 19. 通常入場方式
// ========================================

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
    labels[entryType] ||
    "要確認"
  );
}


// ========================================
// 20. 整理券・抽選など
// ========================================

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


// ========================================
// 21. 入場制限の発動条件
// ========================================

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
// 22. URL安全確認
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
// 23. スポットレイヤー
// ========================================

const spotLayers = {

  official:
    L.layerGroup()
      .addTo(map),

  nagano:
    L.layerGroup()
      .addTo(map)

};


// ========================================
// 24. マーカーアイコン
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
      label +
      "</div>",

    iconSize:
      [34, 34],

    iconAnchor:
      [17, 17],

    popupAnchor:
      [0, -18]

  });
}


// ========================================
// 25. ポップアップ作成
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


  // --------------------------------
  // タイトル
  // --------------------------------

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


  // --------------------------------
  // 大分類
  // --------------------------------

  const category =
    document.createElement(
      "div"
    );

  category.className =
    "spot-popup-category";

  category.textContent =
    getCategoryLabel(
      spot.category
    );

  container.appendChild(
    category
  );


  // --------------------------------
  // 場所タイプ
  // --------------------------------

  const placeType =
    document.createElement(
      "div"
    );

  placeType.className =
    "spot-popup-meta";

  placeType.textContent =
    "📍 " +
    getPlaceTypeLabel(
      spot.placeType
    );

  container.appendChild(
    placeType
  );


  // --------------------------------
  // 関係性
  // --------------------------------

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


  // --------------------------------
  // 開催期間
  // --------------------------------

  const periodStatus =
    getSpotPeriodStatus(
      spot
    );


  const period =
    document.createElement(
      "div"
    );

  period.className =
    "spot-popup-period";


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


  // =================================
  // 営業・開催情報
  // =================================

  if (
    spot.hoursText ||
    spot.closedDaysText ||
    spot.hoursInfoUrl ||
    spot.hoursCheckedAt
  ) {

    const hoursBox =
      document.createElement(
        "div"
      );

    hoursBox.className =
      "spot-popup-hours";


    const hoursTitle =
      document.createElement(
        "div"
      );

    hoursTitle.className =
      "spot-popup-hours-title";

    hoursTitle.textContent =
      "🕐 営業・開催情報";

    hoursBox.appendChild(
      hoursTitle
    );


    if (spot.hoursText) {

      const hoursRow =
        document.createElement(
          "div"
        );

      hoursRow.className =
        "spot-popup-hours-row";

      hoursRow.textContent =
        "時間： " +
        spot.hoursText;

      hoursBox.appendChild(
        hoursRow
      );
    }


    if (spot.closedDaysText) {

      const closedRow =
        document.createElement(
          "div"
        );

      closedRow.className =
        "spot-popup-hours-row";

      closedRow.textContent =
        "休業・休催： " +
        spot.closedDaysText;

      hoursBox.appendChild(
        closedRow
      );
    }


    const hoursInfoUrl =
      getSafeUrl(
        spot.hoursInfoUrl
      );


    if (hoursInfoUrl) {

      const hoursLink =
        document.createElement(
          "a"
        );

      hoursLink.href =
        hoursInfoUrl;

      hoursLink.target =
        "_blank";

      hoursLink.rel =
        "noopener noreferrer";

      hoursLink.textContent =
        "最新の営業時間を見る";

      hoursBox.appendChild(
        hoursLink
      );
    }


    if (spot.hoursCheckedAt) {

      const hoursChecked =
        document.createElement(
          "div"
        );

      hoursChecked.className =
        "spot-popup-hours-checked";

      hoursChecked.textContent =
        "営業時間確認： " +
        formatDate(
          spot.hoursCheckedAt
        );

      hoursBox.appendChild(
        hoursChecked
      );
    }


    container.appendChild(
      hoursBox
    );
  }


  // =================================
  // 入店・入場方法
  // =================================

  const entryBox =
    document.createElement(
      "div"
    );

  entryBox.className =
    "spot-popup-entry";


  const entryTitle =
    document.createElement(
      "div"
    );

  entryTitle.className =
    "spot-popup-entry-title";

  entryTitle.textContent =
    "🎫 入店・入場方法";

  entryBox.appendChild(
    entryTitle
  );


  const reservation =
    document.createElement(
      "div"
    );

  reservation.className =
    "spot-popup-entry-row";

  reservation.textContent =
    "予約： " +
    getReservationLabel(
      spot.reservationType
    );

  entryBox.appendChild(
    reservation
  );


  const defaultEntry =
    document.createElement(
      "div"
    );

  defaultEntry.className =
    "spot-popup-entry-row";

  defaultEntry.textContent =
    "通常時： " +
    getDefaultEntryLabel(
      spot.defaultEntryType
    );

  entryBox.appendChild(
    defaultEntry
  );


  const crowdControl =
    getCrowdControlLabel(
      spot.crowdControlType
    );


  if (crowdControl) {

    const crowdRow =
      document.createElement(
        "div"
      );

    crowdRow.className =
      "spot-popup-entry-row";


    const condition =
      getCrowdConditionLabel(
        spot.crowdControlCondition
      );


    crowdRow.textContent =
      (
        condition
          ? condition + "： "
          : ""
      ) +
      crowdControl;


    entryBox.appendChild(
      crowdRow
    );
  }


  if (spot.entryNote) {

    const note =
      document.createElement(
        "div"
      );

    note.className =
      "spot-popup-entry-note";

    note.textContent =
      spot.entryNote;

    entryBox.appendChild(
      note
    );
  }


  const reservationUrl =
    getSafeUrl(
      spot.reservationUrl
    );


  if (reservationUrl) {

    const reservationLink =
      document.createElement(
        "a"
      );

    reservationLink.href =
      reservationUrl;

    reservationLink.target =
      "_blank";

    reservationLink.rel =
      "noopener noreferrer";

    reservationLink.textContent =
      "予約ページを見る";

    entryBox.appendChild(
      reservationLink
    );
  }


  const entryInfoUrl =
    getSafeUrl(
      spot.entryInfoUrl
    );


  if (entryInfoUrl) {

    const entryLink =
      document.createElement(
        "a"
      );

    entryLink.href =
      entryInfoUrl;

    entryLink.target =
      "_blank";

    entryLink.rel =
      "noopener noreferrer";

    entryLink.textContent =
      "最新の入場情報を見る";

    entryBox.appendChild(
      entryLink
    );
  }


  if (
    spot.entryInfoCheckedAt
  ) {

    const checkedAt =
      document.createElement(
        "div"
      );

    checkedAt.className =
      "spot-popup-entry-checked";

    checkedAt.textContent =
      "入場情報確認： " +
      formatDate(
        spot.entryInfoCheckedAt
      );

    entryBox.appendChild(
      checkedAt
    );
  }


  container.appendChild(
    entryBox
  );


  // =================================
  // 住所
  // =================================

  if (spot.address) {

    const address =
      document.createElement(
        "div"
      );

    address.className =
      "spot-popup-address";

    address.textContent =
      spot.address;

    container.appendChild(
      address
    );
  }


  // =================================
  // 説明
  // =================================

  if (spot.description) {

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


  // =================================
  // 一般リンク
  // =================================

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


    if (sourceUrl) {

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
        "情報元を見る";

      links.appendChild(
        sourceLink
      );
    }


    if (mapUrl) {

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
        "地図で開く";

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
// 26. スポット1件を地図へ追加
// ========================================

function addSpotMarker(
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

    return false;
  }


  const layer =
    spotLayers[
      spot.category
    ];


  if (!layer) {

    console.warn(
      "未対応カテゴリのためスキップ:",
      spot.category,
      spot.name
    );

    return false;
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
    )
  );


  marker.addTo(
    layer
  );


  return true;
}


// ========================================
// 27. spots.json読込
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


    if (!response.ok) {

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


    let displayedCount = 0;
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


        const added =
          addSpotMarker(
            spot
          );


        if (added) {

          displayedCount++;

        } else {

          skippedCount++;
        }
      }
    );


    console.log(
      spots.length +
      "件のスポットデータを読み込みました。"
    );


    console.log(
      displayedCount +
      "件を地図に表示しています。"
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
  }
}


// ========================================
// 28. 公式 / ナガノ先生フィルター
// ========================================

const officialFilter =
  document.getElementById(
    "filter-official"
  );

const naganoFilter =
  document.getElementById(
    "filter-nagano"
  );


function updateSpotFilters() {

  if (officialFilter) {

    if (
      officialFilter.checked
    ) {

      if (
        !map.hasLayer(
          spotLayers.official
        )
      ) {

        spotLayers.official
          .addTo(map);
      }

    } else {

      if (
        map.hasLayer(
          spotLayers.official
        )
      ) {

        map.removeLayer(
          spotLayers.official
        );
      }
    }
  }


  if (naganoFilter) {

    if (
      naganoFilter.checked
    ) {

      if (
        !map.hasLayer(
          spotLayers.nagano
        )
      ) {

        spotLayers.nagano
          .addTo(map);
      }

    } else {

      if (
        map.hasLayer(
          spotLayers.nagano
        )
      ) {

        map.removeLayer(
          spotLayers.nagano
        );
      }
    }
  }
}


// ========================================
// 29. フィルターイベント
// ========================================

if (officialFilter) {

  officialFilter.addEventListener(
    "change",
    updateSpotFilters
  );
}


if (naganoFilter) {

  naganoFilter.addEventListener(
    "change",
    updateSpotFilters
  );
}


// ========================================
// 30. 起動
// ========================================

loadTileProvider(0);

loadSpots();
