// ============================================================
// ちいかわ推し活（ちい活）MAP
// ============================================================


// ============================================================
// 基本設定
// ============================================================

const DATA_AS_OF =
  "2026-08-24";


const INITIAL_POSITION = [
  35.681236,
  139.767125
];


const INITIAL_ZOOM =
  11;


// ============================================================
// タイルプロバイダー
// ============================================================

const TILE_PROVIDERS = [

  {
    name:
      "OpenStreetMap",

    url:
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",

    options: {

      /*
        OSM公式タイルはz19まで。
        地図自体はz20まで許可し、
        z20ではz19を拡大表示する。
      */
      maxZoom:
        20,

      maxNativeZoom:
        19,

      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">' +
        "OpenStreetMap contributors</a>"
    }
  },


  {
    name:
      "Stadia Maps",

    url:
      "https://tiles.stadiamaps.com/tiles/" +
      "alidade_smooth/{z}/{x}/{y}{r}.png",

    options: {
      maxZoom:
        20,

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


// ============================================================
// ブランド表示名
// ============================================================

const BRAND_LABELS = {

  chiikawaland:
    "ちいかわらんど",

  magical_chiikawa:
    "まじかるちいかわ",

  mogumogu:
    "ちいかわもぐもぐ本舗",

  chiikawa_park:
    "ちいかわパーク",

  chiikawa_restaurant:
    "ちいかわレストラン",

  chiikawa_bakery:
    "ちいかわベーカリー",

  ramen_buta:
    "ちいかわラーメン 豚",

  chiikawa_yaki:
    "ちいかわ焼き",

  shisa_store:
    "シーサーのおみやげやさん",

  chiikawa_pocket:
    "ちいかわぽけっと",

  nagano_market:
    "ナガノマーケット",

  chiikawa_movie:
    "映画ちいかわ",

  tokyo_banana:
    "ちいかわ×東京ばな奈",

  chiikawa:
    "ちいかわ（その他公式・POP UP）",

  other:
    "その他"

};


// ============================================================
// 障害試験
// ============================================================

const params =
  new URLSearchParams(
    window.location.search
  );


const TILE_TEST_MODE =
  params.get(
    "tileTest"
  );


// ============================================================
// Leaflet Map
// MarkerClusterのためMap本体にmaxZoomを明示
// ============================================================

const map =
  L.map(
    "map",
    {
      maxZoom:
        20
    }
  )
  .setView(
    INITIAL_POSITION,
    INITIAL_ZOOM
  );


// ============================================================
// DOM
// ============================================================

const mapStatus =
  document.getElementById(
    "map-status"
  );


const resultCount =
  document.getElementById(
    "result-count"
  );


const spotSearch =
  document.getElementById(
    "spot-search"
  );


const spotSearchClear =
  document.getElementById(
    "spot-search-clear"
  );


const spotSearchSuggestions =
  document.getElementById(
    "spot-search-suggestions"
  );


const prefectureFilter =
  document.getElementById(
    "prefecture-filter"
  );


const locationButton =
  document.getElementById(
    "location-button"
  );


const mapViewButton =
  document.getElementById(
    "map-view-button"
  );


const listViewButton =
  document.getElementById(
    "list-view-button"
  );


const favoriteFilterButton =
  document.getElementById(
    "favorite-filter-button"
  );


const favoriteCount =
  document.getElementById(
    "favorite-count"
  );


const spotListPanel =
  document.getElementById(
    "spot-list-panel"
  );


const spotList =
  document.getElementById(
    "spot-list"
  );


const spotListSummary =
  document.getElementById(
    "spot-list-summary"
  );


const dataAsOf =
  document.getElementById(
    "data-as-of"
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


const brandFilterList =
  document.getElementById(
    "brand-filter-list"
  );


const officialHelpToggle =
  document.getElementById(
    "official-help-toggle"
  );


const officialHelpPanel =
  document.getElementById(
    "official-help-panel"
  );


const officialHelpClose =
  document.getElementById(
    "official-help-close"
  );


const naganoHelpToggle =
  document.getElementById(
    "nagano-help-toggle"
  );


const naganoHelpPanel =
  document.getElementById(
    "nagano-help-panel"
  );


const naganoHelpClose =
  document.getElementById(
    "nagano-help-close"
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


// ============================================================
// 掲載基準日表示
// ============================================================

function formatDateJapanese(
  dateString
) {

  const parts =
    dateString.split("-");


  if (
    parts.length !==
    3
  ) {

    return dateString;
  }


  return (
    Number(parts[0]) +
    "年" +
    Number(parts[1]) +
    "月" +
    Number(parts[2]) +
    "日"
  );
}


if (
  dataAsOf
) {

  dataAsOf.textContent =
    formatDateJapanese(
      DATA_AS_OF
    );
}


// ============================================================
// タイル状態
// ============================================================

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


// ============================================================
// 地図ステータス
// ============================================================

function showMapStatus(
  message
) {

  if (
    !mapStatus
  ) {

    return;
  }


  mapStatus.textContent =
    message;


  mapStatus.hidden =
    false;
}


function hideMapStatus() {

  if (
    !mapStatus
  ) {

    return;
  }


  mapStatus.hidden =
    true;
}


// ============================================================
// 障害試験用URL
// ============================================================

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


// ============================================================
// タイル読込
// ============================================================

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


// ============================================================
// タイルエラー
// ============================================================

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


// ============================================================
// タイルフォールバック
// ============================================================

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


// ============================================================
// 日本時間
// ============================================================

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


// ============================================================
// 開催状態
// ============================================================

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


// ============================================================
// 検索・都道府県
// ============================================================

const PREFECTURE_ORDER = [
  "北海道",
  "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
];


function normalizeSearchText(
  value
) {

  return String(
    value || ""
  )
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/\s+/g, " ")
    .trim();
}


function getSpotPrefecture(
  spot
) {

  const address =
    String(
      spot.address || ""
    );

  return (
    PREFECTURE_ORDER.find(
      prefecture =>
        address.includes(
          prefecture
        )
    ) ||
    ""
  );
}


function getSpotSearchText(
  spot
) {

  return normalizeSearchText(
    [
      spot.name,
      spot.address,
      spot.description,
      getBrandLabel(
        spot.brand
      ),
      getCategoryLabel(
        spot.category
      ),
      getPlaceTypeLabel(
        spot.placeType
      ),
      getRelationTypeLabel(
        spot.category,
        spot.relationType
      ),
      spot.evidenceNote
    ]
      .filter(Boolean)
      .join(" ")
  );
}


function renderPrefectureOptions() {

  if (
    !prefectureFilter
  ) {
    return;
  }

  const currentValue =
    prefectureFilter.value;

  const prefectures =
    new Set(
      spotRecords
        .map(
          record =>
            getSpotPrefecture(
              record.spot
            )
        )
        .filter(Boolean)
    );

  prefectureFilter.replaceChildren();

  const allOption =
    document.createElement(
      "option"
    );

  allOption.value = "";
  allOption.textContent = "全国";

  prefectureFilter.appendChild(
    allOption
  );

  PREFECTURE_ORDER.forEach(
    prefecture => {

      if (
        !prefectures.has(
          prefecture
        )
      ) {
        return;
      }

      const option =
        document.createElement(
          "option"
        );

      option.value =
        prefecture;

      option.textContent =
        prefecture;

      prefectureFilter.appendChild(
        option
      );
    }
  );

  if (
    Array.from(
      prefectureFilter.options
    ).some(
      option =>
        option.value ===
        currentValue
    )
  ) {
    prefectureFilter.value =
      currentValue;
  }
}


function updateSearchClearButton() {

  if (
    !spotSearchClear ||
    !spotSearch
  ) {
    return;
  }

  spotSearchClear.hidden =
    !spotSearch.value;
}


function hideSearchSuggestions() {

  if (
    !spotSearchSuggestions
  ) {
    return;
  }

  spotSearchSuggestions.hidden =
    true;

  spotSearchSuggestions.replaceChildren();
}


function focusSpotRecord(
  record
) {

  if (
    !record
  ) {
    return;
  }

  const openRecord =
    () => {

      map.setView(
        [
          record.spot.lat,
          record.spot.lng
        ],
        Math.max(
          map.getZoom(),
          15
        ),
        {
          animate: true
        }
      );

      showSpotDetail(
        record
      );
    };

  if (
    typeof spotLayer.zoomToShowLayer ===
    "function"
  ) {

    spotLayer.zoomToShowLayer(
      record.marker,
      openRecord
    );

  } else {

    openRecord();
  }
}


function renderSearchSuggestions() {

  if (
    !spotSearch ||
    !spotSearchSuggestions
  ) {
    return;
  }

  const query =
    normalizeSearchText(
      spotSearch.value
    );

  if (
    !query
  ) {
    hideSearchSuggestions();
    return;
  }

  const selectedPrefecture =
    prefectureFilter?.value ||
    "";

  const matches =
    spotRecords
      .filter(
        record => {

          if (
            selectedPrefecture &&
            getSpotPrefecture(
              record.spot
            ) !==
            selectedPrefecture
          ) {
            return false;
          }

          return getSpotSearchText(
            record.spot
          ).includes(
            query
          );
        }
      )
      .sort(
        (a, b) => {

          const aName =
            normalizeSearchText(
              a.spot.name
            );

          const bName =
            normalizeSearchText(
              b.spot.name
            );

          const aStarts =
            aName.startsWith(
              query
            ) ? 0 : 1;

          const bStarts =
            bName.startsWith(
              query
            ) ? 0 : 1;

          if (
            aStarts !==
            bStarts
          ) {
            return aStarts - bStarts;
          }

          return a.spot.name.localeCompare(
            b.spot.name,
            "ja"
          );
        }
      )
      .slice(0, 8);

  spotSearchSuggestions.replaceChildren();

  if (
    matches.length ===
    0
  ) {

    const empty =
      createDiv(
        "search-suggestion-empty",
        "該当するスポットがありません"
      );

    spotSearchSuggestions.appendChild(
      empty
    );

    spotSearchSuggestions.hidden =
      false;

    return;
  }

  matches.forEach(
    record => {

      const button =
        document.createElement(
          "button"
        );

      button.type =
        "button";

      button.className =
        "search-suggestion";

      button.setAttribute(
        "role",
        "option"
      );

      const name =
        createDiv(
          "search-suggestion-name",
          record.spot.name
        );

      const metaParts = [
        getSpotPrefecture(
          record.spot
        ),
        getPlaceTypeLabel(
          record.spot.placeType
        ),
        record.spot.category === "nagano" &&
          record.spot.evidenceStatus
          ? (
              record.spot.evidenceStatus === "confirmed"
                ? "✓確定"
                : "△推定"
            )
          : null
      ].filter(Boolean);

      const meta =
        createDiv(
          "search-suggestion-meta",
          metaParts.join(" ・ ")
        );

      button.appendChild(name);
      button.appendChild(meta);

      button.addEventListener(
        "click",
        () => {

          spotSearch.value =
            record.spot.name;

          updateSearchClearButton();
          hideSearchSuggestions();
          updateSpotFilters();
          focusSpotRecord(record);
        }
      );

      spotSearchSuggestions.appendChild(
        button
      );
    }
  );

  spotSearchSuggestions.hidden =
    false;
}


// ============================================================
// ラベル
// ============================================================

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

  if (
    !dateString
  ) {

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


function getEvidenceStatusLabel(
  evidenceStatus
) {

  const labels = {

    confirmed:
      "確定",

    inferred:
      "推定"
  };


  return (
    labels[
      evidenceStatus
    ] ||
    "未判定"
  );
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


function getBrandLabel(
  brand
) {

  return (
    BRAND_LABELS[
      brand
    ] ||
    brand ||
    "その他"
  );
}


// ============================================================
// URLチェック
// ============================================================

function getSafeUrl(
  url
) {

  if (
    !url
  ) {

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

  } catch (
    error
  ) {

    console.warn(
      "不正なURLを無視しました:",
      url
    );
  }


  return null;
}


// ============================================================
// クラスタアイコン
// ============================================================

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


  let size =
    42;


  if (
    count >=
    10
  ) {

    size =
      48;
  }


  if (
    count >=
    30
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
      "</span>" +
      "</div>",

    iconSize:
      [size, size]

  });
}


// ============================================================
// スポットレイヤー
// MarkerCluster失敗時は通常LayerGroupへ退避
// ============================================================

let spotLayer;


const markerClusterAvailable =
  typeof L.markerClusterGroup ===
  "function";


if (
  markerClusterAvailable
) {

  console.log(
    "MarkerClusterを使用します。"
  );


  spotLayer =
    L.markerClusterGroup({

      showCoverageOnHover:
        false,

      zoomToBoundsOnClick:
        true,

      spiderfyOnMaxZoom:
        true,

      spiderfyDistanceMultiplier:
        1.35,

      maxClusterRadius:
        50,

      removeOutsideVisibleBounds:
        true,

      iconCreateFunction:
        createClusterIcon

    });

} else {

  console.warn(
    "MarkerClusterを読み込めなかったため、" +
    "通常のマーカー表示に切り替えます。"
  );


  spotLayer =
    L.layerGroup();
}


spotLayer.addTo(
  map
);


const spotRecords =
  [];


let selectedRecord =
  null;


// ============================================================
// 現在地・一覧表示・行きたい保存
// ============================================================

const FAVORITES_STORAGE_KEY =
  "chiikawa-map-favorites-v1";


let favoriteSpotIds =
  loadFavoriteSpotIds();


let favoriteOnly =
  false;


let currentViewMode =
  "map";


let userLocationMarker =
  null;


let userAccuracyCircle =
  null;


function loadFavoriteSpotIds() {

  try {

    const value =
      window.localStorage.getItem(
        FAVORITES_STORAGE_KEY
      );

    if (
      !value
    ) {
      return new Set();
    }

    const parsed =
      JSON.parse(value);

    if (
      !Array.isArray(parsed)
    ) {
      return new Set();
    }

    return new Set(
      parsed.filter(
        id =>
          typeof id ===
          "string"
      )
    );

  } catch (error) {

    console.warn(
      "行きたいスポットの保存データを読み込めませんでした。",
      error
    );

    return new Set();
  }
}


function saveFavoriteSpotIds() {

  try {

    window.localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(
        Array.from(
          favoriteSpotIds
        )
      )
    );

  } catch (error) {

    console.warn(
      "行きたいスポットを保存できませんでした。",
      error
    );
  }
}


function isFavoriteSpot(
  spot
) {

  return Boolean(
    spot?.id &&
    favoriteSpotIds.has(
      spot.id
    )
  );
}


function updateFavoriteCount() {

  if (
    !favoriteCount
  ) {
    return;
  }

  const count =
    spotRecords.length
      ? spotRecords.filter(
          record =>
            isFavoriteSpot(
              record.spot
            )
        ).length
      : favoriteSpotIds.size;

  favoriteCount.textContent =
    String(count);
}


function syncFavoriteFilterButton() {

  if (
    !favoriteFilterButton
  ) {
    return;
  }

  favoriteFilterButton.classList.toggle(
    "is-active",
    favoriteOnly
  );

  favoriteFilterButton.setAttribute(
    "aria-pressed",
    String(favoriteOnly)
  );
}


function toggleFavoriteSpot(
  spot
) {

  if (
    !spot?.id
  ) {
    return;
  }

  if (
    favoriteSpotIds.has(
      spot.id
    )
  ) {

    favoriteSpotIds.delete(
      spot.id
    );

  } else {

    favoriteSpotIds.add(
      spot.id
    );
  }

  saveFavoriteSpotIds();
  updateFavoriteCount();
  updateSpotFilters();

  if (
    selectedRecord &&
    selectedRecord.spot.id ===
      spot.id &&
    spotMatchesFilters(
      selectedRecord.spot
    )
  ) {

    detailBody.replaceChildren(
      createSpotDetail(
        selectedRecord.spot
      )
    );
  }
}


function setViewMode(
  mode
) {

  currentViewMode =
    mode ===
    "list"
      ? "list"
      : "map";

  const listMode =
    currentViewMode ===
    "list";

  if (
    mapContent
  ) {
    mapContent.hidden =
      listMode;
  }

  if (
    spotListPanel
  ) {
    spotListPanel.hidden =
      !listMode;
  }

  mapViewButton?.classList.toggle(
    "is-active",
    !listMode
  );

  listViewButton?.classList.toggle(
    "is-active",
    listMode
  );

  mapViewButton?.setAttribute(
    "aria-pressed",
    String(!listMode)
  );

  listViewButton?.setAttribute(
    "aria-pressed",
    String(listMode)
  );

  if (
    !listMode
  ) {

    requestAnimationFrame(
      () => {
        map.invalidateSize({
          pan: false,
          animate: false
        });
      }
    );
  }
}


function createSpotListCard(
  record
) {

  const spot =
    record.spot;

  const card =
    document.createElement(
      "article"
    );

  card.className =
    "spot-list-card";

  if (
    isFavoriteSpot(spot)
  ) {
    card.classList.add(
      "is-favorite"
    );
  }

  const header =
    createDiv(
      "spot-list-card-header"
    );

  const headingWrap =
    createDiv(
      "spot-list-card-heading"
    );

  const title =
    document.createElement(
      "h3"
    );

  title.textContent =
    spot.name;

  headingWrap.appendChild(
    title
  );

  const meta =
    createDiv(
      "spot-list-card-meta",
      [
        getSpotPrefecture(spot),
        getPlaceTypeLabel(
          spot.placeType
        ),
        getRelationTypeLabel(
          spot.category,
          spot.relationType
        )
      ]
        .filter(Boolean)
        .join(" ・ ")
    );

  headingWrap.appendChild(
    meta
  );

  const favoriteButton =
    document.createElement(
      "button"
    );

  favoriteButton.type =
    "button";

  favoriteButton.className =
    "spot-list-favorite-button" +
    (
      isFavoriteSpot(spot)
        ? " is-active"
        : ""
    );

  favoriteButton.textContent =
    isFavoriteSpot(spot)
      ? "♥"
      : "♡";

  favoriteButton.setAttribute(
    "aria-label",
    isFavoriteSpot(spot)
      ? "行きたいから削除"
      : "行きたいに保存"
  );

  favoriteButton.addEventListener(
    "click",
    () => {
      toggleFavoriteSpot(spot);
    }
  );

  header.appendChild(
    headingWrap
  );

  header.appendChild(
    favoriteButton
  );

  card.appendChild(
    header
  );

  if (
    spot.category ===
    "nagano" &&
    spot.evidenceStatus
  ) {

    card.appendChild(
      createDiv(
        "spot-list-evidence evidence-" +
        spot.evidenceStatus,
        spot.evidenceStatus ===
        "confirmed"
          ? "✓ ナガセン関連：確定"
          : "△ ナガセン関連：推定"
      )
    );
  }

  if (
    spot.address
  ) {
    card.appendChild(
      createDiv(
        "spot-list-address",
        "📌 " +
        spot.address
      )
    );
  }

  if (
    spot.hoursText
  ) {
    card.appendChild(
      createDiv(
        "spot-list-hours",
        "🕐 " +
        spot.hoursText
      )
    );
  }

  const openButton =
    document.createElement(
      "button"
    );

  openButton.type =
    "button";

  openButton.className =
    "spot-list-open-button";

  openButton.textContent =
    "地図で詳細を見る →";

  openButton.addEventListener(
    "click",
    () => {

      setViewMode(
        "map"
      );

      requestAnimationFrame(
        () => {
          requestAnimationFrame(
            () => {
              focusSpotRecord(
                record
              );
            }
          );
        }
      );
    }
  );

  card.appendChild(
    openButton
  );

  return card;
}


function renderSpotList(
  records
) {

  if (
    !spotList
  ) {
    return;
  }

  spotList.replaceChildren();

  if (
    spotListSummary
  ) {
    spotListSummary.textContent =
      records.length +
      "件のスポットを表示しています。";
  }

  if (
    records.length ===
    0
  ) {

    spotList.appendChild(
      createDiv(
        "spot-list-empty",
        favoriteOnly
          ? "条件に合う『行きたい』スポットがありません。"
          : "条件に合うスポットがありません。"
      )
    );

    return;
  }

  records.forEach(
    record => {
      spotList.appendChild(
        createSpotListCard(
          record
        )
      );
    }
  );
}


function showTransientMapStatus(
  message
) {

  showMapStatus(
    message
  );

  window.setTimeout(
    () => {

      if (
        allProvidersFailed
      ) {
        showMapStatus(
          "現在、背景地図を読み込めません。" +
          "スポット情報は引き続き利用できます。"
        );
        return;
      }

      if (
        currentProviderIndex >
        0
      ) {
        showMapStatus(
          "バックアップ地図で表示しています：" +
          TILE_PROVIDERS[
            currentProviderIndex
          ].name
        );
        return;
      }

      hideMapStatus();
    },
    2800
  );
}


function locateUser() {

  if (
    !navigator.geolocation
  ) {
    showTransientMapStatus(
      "このブラウザでは現在地を取得できません。"
    );
    return;
  }

  locationButton?.classList.add(
    "is-loading"
  );

  locationButton?.setAttribute(
    "aria-busy",
    "true"
  );

  showMapStatus(
    "現在地を取得しています…"
  );

  navigator.geolocation.getCurrentPosition(
    position => {

      locationButton?.classList.remove(
        "is-loading"
      );

      locationButton?.removeAttribute(
        "aria-busy"
      );

      const lat =
        position.coords.latitude;

      const lng =
        position.coords.longitude;

      const accuracy =
        Math.max(
          position.coords.accuracy ||
          0,
          10
        );

      if (
        userLocationMarker
      ) {
        map.removeLayer(
          userLocationMarker
        );
      }

      if (
        userAccuracyCircle
      ) {
        map.removeLayer(
          userAccuracyCircle
        );
      }

      userAccuracyCircle =
        L.circle(
          [lat, lng],
          {
            radius: accuracy,
            weight: 1,
            opacity: 0.5,
            fillOpacity: 0.08
          }
        ).addTo(map);

      userLocationMarker =
        L.circleMarker(
          [lat, lng],
          {
            radius: 8,
            weight: 3,
            fillOpacity: 0.95
          }
        )
          .bindTooltip(
            "現在地",
            {
              permanent: false,
              direction: "top"
            }
          )
          .addTo(map);

      setViewMode(
        "map"
      );

      requestAnimationFrame(
        () => {
          map.setView(
            [lat, lng],
            Math.max(
              map.getZoom(),
              15
            ),
            {
              animate: true
            }
          );
        }
      );

      showTransientMapStatus(
        "現在地を表示しました。位置情報は保存・送信しません。"
      );
    },
    error => {

      locationButton?.classList.remove(
        "is-loading"
      );

      locationButton?.removeAttribute(
        "aria-busy"
      );

      let message =
        "現在地を取得できませんでした。";

      if (
        error.code ===
        error.PERMISSION_DENIED
      ) {
        message =
          "位置情報の利用が許可されていません。ブラウザの設定をご確認ください。";
      }

      showTransientMapStatus(
        message
      );
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60000
    }
  );
}


// ============================================================
// 全スポットを初期表示
// ============================================================

function fitMapToAllSpots() {

  const latLngs =
    spotRecords.map(
      record => [
        record.spot.lat,
        record.spot.lng
      ]
    );


  if (
    latLngs.length ===
    0
  ) {

    return;
  }


  requestAnimationFrame(
    () => {

      map.invalidateSize({
        pan:
          false,

        animate:
          false
      });


      if (
        latLngs.length ===
        1
      ) {

        map.setView(
          latLngs[0],
          13,
          {
            animate:
              false
          }
        );


        return;
      }


      const bounds =
        L.latLngBounds(
          latLngs
        );


      const padding =
        window.innerWidth <=
        650

          ? [24, 24]

          : [40, 40];


      map.fitBounds(
        bounds,
        {
          padding:
            padding,

          maxZoom:
            12,

          animate:
            false
        }
      );

    }
  );
}


// ============================================================
// 通常ピン
// ============================================================

function createSpotIcon(
  spot
) {

  let label =
    "?";

  let className =
    "";


  if (
    spot.category ===
    "official"
  ) {

    label =
      "公";

    className =
      "spot-pin-official";
  }


  if (
    spot.category ===
    "nagano"
  ) {

    if (
      spot.evidenceStatus ===
      "inferred"
    ) {

      label =
        "ナ△";

      className =
        "spot-pin-nagano-inferred";

    } else {

      label =
        "ナ✓";

      className =
        "spot-pin-nagano-confirmed";
    }
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

// ============================================================
// DOM生成補助
// ============================================================

function createDiv(
  className,
  text =
    null
) {

  const element =
    document.createElement(
      "div"
    );


  element.className =
    className;


  if (
    text !==
    null
  ) {

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
    getSafeUrl(
      url
    );


  if (
    !safeUrl
  ) {

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


// ============================================================
// 詳細DOM
// ============================================================

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


  const favoriteButton =
    document.createElement(
      "button"
    );

  favoriteButton.type =
    "button";

  favoriteButton.className =
    "spot-favorite-button" +
    (
      isFavoriteSpot(spot)
        ? " is-active"
        : ""
    );

  favoriteButton.setAttribute(
    "aria-pressed",
    String(
      isFavoriteSpot(spot)
    )
  );

  favoriteButton.textContent =
    isFavoriteSpot(spot)
      ? "♥ 行きたいに保存済み"
      : "♡ 行きたいに保存";

  favoriteButton.addEventListener(
    "click",
    () => {
      toggleFavoriteSpot(spot);
    }
  );

  container.appendChild(
    favoriteButton
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


  if (
    spot.category ===
      "nagano" &&
    spot.evidenceStatus
  ) {

    tags.appendChild(
      createDiv(
        "spot-tag tag-evidence-" +
        spot.evidenceStatus,

        (
          spot.evidenceStatus ===
          "confirmed"
            ? "✓ "
            : "△ "
        ) +
        getEvidenceStatusLabel(
          spot.evidenceStatus
        )
      )
    );
  }


  container.appendChild(
    tags
  );


  // シリーズ

  if (
    spot.brand
  ) {

    container.appendChild(
      createDiv(
        "spot-relation",

        "✨ " +
        getBrandLabel(
          spot.brand
        )
      )
    );
  }


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


  // ナガセン関連の確度・根拠

  if (
    spot.category ===
      "nagano" &&
    spot.evidenceStatus
  ) {

    const evidence =
      createDiv(
        "spot-info-card spot-evidence-card evidence-" +
        spot.evidenceStatus
      );


    evidence.appendChild(
      createDiv(
        "spot-info-title",

        (
          spot.evidenceStatus ===
          "confirmed"
            ? "✓ ナガセン関連：確定"
            : "△ ナガセン関連：推定"
        )
      )
    );


    if (
      spot.evidenceNote
    ) {

      evidence.appendChild(
        createDiv(
          "spot-info-note spot-evidence-note",
          spot.evidenceNote
        )
      );
    }


    appendLink(
      evidence,
      spot.evidenceUrl,
      "ナガセン関連の根拠を見る ↗"
    );


    if (
      spot.evidenceCheckedAt
    ) {

      evidence.appendChild(
        createDiv(
          "spot-info-checked",

          "根拠確認： " +
          formatDate(
            spot.evidenceCheckedAt
          )
        )
      );
    }


    container.appendChild(
      evidence
    );
  }


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


  // 営業情報

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


  // 入場情報

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
            ? condition +
              "： "
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


// ============================================================
// 詳細表示
// ============================================================

function showSpotDetail(
  record
) {

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


  requestAnimationFrame(
    () => {

      map.invalidateSize({
        pan:
          false,

        animate:
          false
      });

    }
  );
}


// ============================================================
// 詳細閉じる
// ============================================================

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

      map.invalidateSize({
        pan:
          false,

        animate:
          false
      });

    }
  );
}


// ============================================================
// マーカー生成
// ============================================================

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
            spot
          ),

        spotCategory:
          spot.category,

        spotEvidenceStatus:
          spot.evidenceStatus || null,

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


// ============================================================
// ブランドフィルターをスポットデータから自動生成
// ============================================================

function renderBrandFilters() {

  if (
    !brandFilterList
  ) {

    return;
  }


  brandFilterList.replaceChildren();


  const brands =
    Array.from(
      new Set(
        spotRecords.map(
          record =>
            record.spot.brand ||
            "other"
        )
      )
    )
    .sort(
      (a, b) =>
        getBrandLabel(a)
          .localeCompare(
            getBrandLabel(b),
            "ja"
          )
    );


  brands.forEach(
    brand => {

      const label =
        document.createElement(
          "label"
        );


      label.className =
        "filter-chip";


      const input =
        document.createElement(
          "input"
        );


      input.type =
        "checkbox";


      input.className =
        "spot-filter brand-filter";


      input.name =
        "filter-brand";


      input.value =
        brand;


      input.checked =
        true;


      const span =
        document.createElement(
          "span"
        );


      span.textContent =
        getBrandLabel(
          brand
        );


      label.appendChild(
        input
      );


      label.appendChild(
        span
      );


      brandFilterList.appendChild(
        label
      );


      input.addEventListener(
        "change",
        updateSpotFilters
      );

    }
  );
}


// ============================================================
// フィルター値
// ============================================================

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


// ============================================================
// フィルター判定
// ============================================================

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


  const evidenceStatuses =
    getSelectedValues(
      "filter-nagano-evidence"
    );


  const searchQuery =
    normalizeSearchText(
      spotSearch?.value ||
      ""
    );


  const selectedPrefecture =
    prefectureFilter?.value ||
    "";


  if (
    favoriteOnly &&
    !isFavoriteSpot(
      spot
    )
  ) {
    return false;
  }


  if (
    searchQuery &&
    !getSpotSearchText(
      spot
    ).includes(
      searchQuery
    )
  ) {
    return false;
  }


  if (
    selectedPrefecture &&
    getSpotPrefecture(
      spot
    ) !==
    selectedPrefecture
  ) {
    return false;
  }


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


  // ブランドフィルター
  const brandInputs =
    document.querySelectorAll(
      'input[name="filter-brand"]'
    );


  if (
    brandInputs.length >
    0
  ) {

    const brands =
      getSelectedValues(
        "filter-brand"
      );


    if (
      !brands.has(
        spot.brand ||
        "other"
      )
    ) {

      return false;
    }
  }


  // 公式関連
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


  // ナガノ先生関連
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


    if (
      !evidenceStatuses.has(
        spot.evidenceStatus ||
        "confirmed"
      )
    ) {

      return false;
    }
  }


  return true;
}


// ============================================================
// フィルター反映
// ============================================================

function updateSpotFilters() {

  updateSearchClearButton();


  if (
    selectedRecord &&
    !spotMatchesFilters(
      selectedRecord.spot
    )
  ) {

    closeSpotDetail();
  }


  spotLayer.clearLayers();


  let visibleCount =
    0;


  const visibleRecords =
    [];


  spotRecords.forEach(
    record => {

      if (
        spotMatchesFilters(
          record.spot
        )
      ) {

        spotLayer.addLayer(
          record.marker
        );


        visibleCount++;


        visibleRecords.push(
          record
        );


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


  if (
    resultCount
  ) {

    resultCount.textContent =
      visibleCount +
      "件表示";
  }


  renderSpotList(
    visibleRecords
  );

  updateFavoriteCount();
}



// ============================================================
// パネル開閉
// ============================================================

function setFilterPanelOpen(
  open
) {

  if (
    !filterPanel ||
    !filterToggle
  ) {

    return;
  }


  if (
    open
  ) {

    setOfficialHelpPanelOpen(
      false
    );

    setNaganoHelpPanelOpen(
      false
    );
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
}


function setOfficialHelpPanelOpen(
  open
) {

  if (
    !officialHelpPanel ||
    !officialHelpToggle
  ) {
    return;
  }

  if (
    open
  ) {
    setFilterPanelOpen(false);
    setNaganoHelpPanelOpen(false);
  }

  officialHelpPanel.hidden =
    !open;

  officialHelpToggle.setAttribute(
    "aria-expanded",
    String(open)
  );

  officialHelpToggle.classList.toggle(
    "is-active",
    open
  );
}


function setNaganoHelpPanelOpen(
  open
) {

  if (
    !naganoHelpPanel ||
    !naganoHelpToggle
  ) {
    return;
  }

  if (
    open
  ) {
    setFilterPanelOpen(false);
    setOfficialHelpPanelOpen(false);
  }

  naganoHelpPanel.hidden =
    !open;

  naganoHelpToggle.setAttribute(
    "aria-expanded",
    String(open)
  );

  naganoHelpToggle.classList.toggle(
    "is-active",
    open
  );
}


// ============================================================
// フィルターリセット
// ============================================================

function resetFilters() {

  if (
    spotSearch
  ) {
    spotSearch.value =
      "";
  }

  if (
    prefectureFilter
  ) {
    prefectureFilter.value =
      "";
  }

  favoriteOnly =
    false;

  syncFavoriteFilterButton();

  hideSearchSuggestions();
  updateSearchClearButton();

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


// ============================================================
// スポットデータ
// 公式関連とナガノ先生関連を別JSONから読み込む
// ============================================================

const SPOT_DATA_SOURCES = [
  {
    label: "公式関連",
    url: "./data/official-spots.json"
  },
  {
    label: "ナガノ先生関連",
    url: "./data/nagano-spots.json"
  }
];


async function fetchSpotSource(
  source
) {

  const response =
    await fetch(
      source.url,
      {
        cache: "no-store"
      }
    );

  if (
    !response.ok
  ) {
    throw new Error(
      source.label +
      "データ: HTTP " +
      response.status
    );
  }

  const spots =
    await response.json();

  if (
    !Array.isArray(spots)
  ) {
    throw new Error(
      source.url +
      " が配列ではありません。"
    );
  }

  return spots;
}


async function loadSpots() {

  try {

    const results =
      await Promise.allSettled(
        SPOT_DATA_SOURCES.map(
          fetchSpotSource
        )
      );

    const spots = [];
    let sourceErrorCount = 0;

    results.forEach(
      (result, index) => {

        const source =
          SPOT_DATA_SOURCES[index];

        if (
          result.status ===
          "fulfilled"
        ) {

          spots.push(
            ...result.value
          );

          console.log(
            source.label +
            ": " +
            result.value.length +
            "件を読み込みました。"
          );

        } else {

          sourceErrorCount++;

          console.error(
            source.label +
            "データの読み込みに失敗しました。",
            result.reason
          );
        }
      }
    );

    if (
      sourceErrorCount ===
      SPOT_DATA_SOURCES.length
    ) {
      throw new Error(
        "すべてのスポットデータの読み込みに失敗しました。"
      );
    }

    let endedCount = 0;
    let skippedCount = 0;

    spots.forEach(
      spot => {

        const periodStatus =
          getSpotPeriodStatus(spot);

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
          createSpotRecord(spot);

        if (
          record
        ) {
          spotRecords.push(record);
        } else {
          skippedCount++;
        }
      }
    );

    // データに合わせてブランド / 都道府県フィルターを生成
    renderBrandFilters();
    renderPrefectureOptions();
    updateFavoriteCount();
    syncFavoriteFilterButton();
    setViewMode(
      currentViewMode
    );

    // 全チェック状態で初期表示
    updateSpotFilters();

    // 全国の表示対象スポットを収める
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
      sourceErrorCount > 0
    ) {
      console.warn(
        sourceErrorCount +
        "個のデータファイルを読み込めませんでしたが、" +
        "読み込めたデータで表示を継続します。"
      );
    }

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


// ============================================================
// 静的フィルターのイベント
// ============================================================

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


// ============================================================
// 検索・都道府県イベント
// ============================================================

spotSearch
  ?.addEventListener(
    "input",
    () => {
      updateSearchClearButton();
      updateSpotFilters();
      renderSearchSuggestions();
    }
  );


spotSearch
  ?.addEventListener(
    "focus",
    renderSearchSuggestions
  );


spotSearch
  ?.addEventListener(
    "keydown",
    event => {

      if (
        event.key ===
        "Escape"
      ) {
        hideSearchSuggestions();
        return;
      }

      if (
        event.key ===
        "Enter"
      ) {

        const firstSuggestion =
          spotSearchSuggestions
            ?.querySelector(
              ".search-suggestion"
            );

        if (
          firstSuggestion
        ) {
          event.preventDefault();
          firstSuggestion.click();
        }
      }
    }
  );


spotSearchClear
  ?.addEventListener(
    "click",
    () => {
      spotSearch.value = "";
      hideSearchSuggestions();
      updateSearchClearButton();
      updateSpotFilters();
      spotSearch.focus();
    }
  );


prefectureFilter
  ?.addEventListener(
    "change",
    () => {
      updateSpotFilters();
      renderSearchSuggestions();
    }
  );


document.addEventListener(
  "click",
  event => {

    if (
      !spotSearchSuggestions ||
      !spotSearch
    ) {
      return;
    }

    if (
      event.target === spotSearch ||
      spotSearchSuggestions.contains(
        event.target
      )
    ) {
      return;
    }

    hideSearchSuggestions();
  }
);


// ============================================================
// 現在地・表示切替・行きたい
// ============================================================

locationButton
  ?.addEventListener(
    "click",
    locateUser
  );


mapViewButton
  ?.addEventListener(
    "click",
    () => {
      setViewMode(
        "map"
      );
    }
  );


listViewButton
  ?.addEventListener(
    "click",
    () => {
      closeSpotDetail();
      setViewMode(
        "list"
      );
      updateSpotFilters();
    }
  );


favoriteFilterButton
  ?.addEventListener(
    "click",
    () => {
      favoriteOnly =
        !favoriteOnly;
      syncFavoriteFilterButton();
      updateSpotFilters();
    }
  );


// ============================================================
// ボタン
// ============================================================

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


officialHelpToggle
  ?.addEventListener(
    "click",
    () => {

      setOfficialHelpPanelOpen(
        officialHelpPanel.hidden
      );

    }
  );


officialHelpClose
  ?.addEventListener(
    "click",
    () => {

      setOfficialHelpPanelOpen(
        false
      );

    }
  );


naganoHelpToggle
  ?.addEventListener(
    "click",
    () => {

      setNaganoHelpPanelOpen(
        naganoHelpPanel.hidden
      );

    }
  );


naganoHelpClose
  ?.addEventListener(
    "click",
    () => {

      setNaganoHelpPanelOpen(
        false
      );

    }
  );


detailClose
  ?.addEventListener(
    "click",
    closeSpotDetail
  );


// ESC
document.addEventListener(
  "keydown",
  event => {

    if (
      event.key !==
      "Escape"
    ) {

      return;
    }


    if (
      filterPanel &&
      !filterPanel.hidden
    ) {

      setFilterPanelOpen(
        false
      );


      return;
    }


    if (
      officialHelpPanel &&
      !officialHelpPanel.hidden
    ) {

      setOfficialHelpPanelOpen(
        false
      );

      return;
    }


    if (
      naganoHelpPanel &&
      !naganoHelpPanel.hidden
    ) {

      setNaganoHelpPanelOpen(
        false
      );

      return;
    }


    if (
      detailPanel &&
      !detailPanel.hidden
    ) {

      closeSpotDetail();
    }

  }
);


// ============================================================
// 起動
// ============================================================

loadTileProvider(
  0
);


loadSpots();
