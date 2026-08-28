// ============================================================
// ちいかわ推し活（ちい活）MAP
// ============================================================


// ============================================================
// 基本設定
// ============================================================

const DATA_AS_OF =
  "2026-08-27";


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


const SHARED_SPOT_ID =
  params.get(
    "spot"
  );


const SOON_ENDING_DAYS =
  7;


const SHARE_FILTER_PARAM_KEYS = [
  "q", "pref", "cat", "type", "period", "reservation",
  "official", "nagano", "evidence", "brand", "soon", "when", "past", "view"
];


const HAS_SHARED_FILTERS =
  SHARE_FILTER_PARAM_KEYS.some(
    key => params.has(key)
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


const appStatus =
  document.getElementById(
    "app-status"
  );


const appStatusMessage =
  document.getElementById(
    "app-status-message"
  );


const dataRetryButton =
  document.getElementById(
    "data-retry-button"
  );


const resultCount =
  document.getElementById(
    "result-count"
  );


const activeFilterSummary =
  document.getElementById(
    "active-filter-summary"
  );


const activeFilterList =
  document.getElementById(
    "active-filter-list"
  );


const activeFilterReset =
  document.getElementById(
    "active-filter-reset"
  );


const noResults =
  document.getElementById(
    "no-results"
  );


const noResultsReset =
  document.getElementById(
    "no-results-reset"
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


let activeSearchSuggestionIndex =
  -1;


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


const listNearbySortButton =
  document.getElementById(
    "list-nearby-sort-button"
  );


const listBoundsFilterButton =
  document.getElementById(
    "list-bounds-filter-button"
  );


const listEndingSortButton =
  document.getElementById(
    "list-ending-sort-button"
  );


const listNameSortButton =
  document.getElementById(
    "list-name-sort-button"
  );


const favoriteFilterButton =
  document.getElementById(
    "favorite-filter-button"
  );


const favoriteCount =
  document.getElementById(
    "favorite-count"
  );


const visitedFilterButton =
  document.getElementById(
    "visited-filter-button"
  );


const visitedCount =
  document.getElementById(
    "visited-count"
  );


const planCount =
  document.getElementById(
    "plan-count"
  );


const shareFiltersButton =
  document.getElementById(
    "share-filters-button"
  );


const soonEndingFilter =
  document.getElementById(
    "filter-soon-ending"
  );


const dateQuickButtons =
  Array.from(
    document.querySelectorAll(
      "[data-date-quick]"
    )
  );


const endedFilter =
  document.getElementById(
    "filter-ended"
  );


const archiveYearFilterWrap =
  document.getElementById(
    "archive-year-filter-wrap"
  );


const archiveYearFilter =
  document.getElementById(
    "filter-event-year"
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


const savedDataToggle =
  document.getElementById(
    "saved-data-toggle"
  );


const savedDataPanel =
  document.getElementById(
    "saved-data-panel"
  );


const savedDataClose =
  document.getElementById(
    "saved-data-close"
  );


const savedDataExport =
  document.getElementById(
    "saved-data-export"
  );


const savedDataImport =
  document.getElementById(
    "saved-data-import"
  );


const savedDataFile =
  document.getElementById(
    "saved-data-file"
  );


const savedDataImportPreview =
  document.getElementById(
    "saved-data-import-preview"
  );


const savedDataImportFile =
  document.getElementById(
    "saved-data-import-file"
  );


const savedDataImportSummary =
  document.getElementById(
    "saved-data-import-summary"
  );


const savedDataImportConflict =
  document.getElementById(
    "saved-data-import-conflict"
  );


const savedDataImportConfirm =
  document.getElementById(
    "saved-data-import-confirm"
  );


const savedDataImportCancel =
  document.getElementById(
    "saved-data-import-cancel"
  );


const savedDataFavoriteCount =
  document.getElementById(
    "saved-data-favorite-count"
  );


const savedDataVisitedCount =
  document.getElementById(
    "saved-data-visited-count"
  );


const savedDataPlanCount =
  document.getElementById(
    "saved-data-plan-count"
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


let appStatusTimer =
  null;


function showAppStatus(
  message,
  options = {}
) {

  if (
    !appStatus ||
    !appStatusMessage
  ) {
    return;
  }

  const type =
    options.type ||
    "info";

  window.clearTimeout(
    appStatusTimer
  );

  appStatusMessage.textContent =
    message;

  appStatus.className =
    "app-status" +
    (
      type === "info"
        ? ""
        : " is-" + type
    );

  appStatus.setAttribute(
    "role",
    type === "error"
      ? "alert"
      : "status"
  );

  if (
    dataRetryButton
  ) {
    dataRetryButton.hidden =
      !options.retry;
  }

  appStatus.hidden =
    false;

  if (
    !options.persistent
  ) {
    appStatusTimer =
      window.setTimeout(
        () => {
          appStatus.hidden =
            true;
        },
        options.duration ||
          5000
      );
  }
}


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


function parseJapanDateString(
  dateString
) {

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      String(dateString || "")
    )
  ) {
    return null;
  }

  const [year, month, day] =
    dateString.split("-").map(Number);

  return Date.UTC(
    year,
    month - 1,
    day
  );
}


function getDaysBetweenDateStrings(
  fromDate,
  toDate
) {

  const from =
    parseJapanDateString(fromDate);

  const to =
    parseJapanDateString(toDate);

  if (
    from === null ||
    to === null
  ) {
    return null;
  }

  return Math.round(
    (to - from) /
    86400000
  );
}


function isCancelledEvent(
  spot
) {

  return (
    spot?.eventStatus ===
    "cancelled"
  );
}


function addDaysToDateString(
  dateString,
  days
) {

  const timestamp =
    parseJapanDateString(
      dateString
    );

  if (
    timestamp === null ||
    !Number.isInteger(days)
  ) {
    return "";
  }

  return new Date(
    timestamp +
    days * 86400000
  )
    .toISOString()
    .slice(0, 10);
}


function getWeekendDateRange(
  today = getTodayInJapan()
) {

  const timestamp =
    parseJapanDateString(today);

  if (timestamp === null) {
    return {
      start: today,
      end: today
    };
  }

  const dayOfWeek =
    new Date(timestamp)
      .getUTCDay();

  const daysUntilSaturday =
    dayOfWeek === 6
      ? 0
      : dayOfWeek === 0
        ? 0
        : 6 - dayOfWeek;

  const start =
    addDaysToDateString(
      today,
      daysUntilSaturday
    );

  return {
    start,
    end:
      dayOfWeek === 0
        ? today
        : addDaysToDateString(
            start,
            1
          )
  };
}


function doesSpotOverlapDateRange(
  spot,
  rangeStart,
  rangeEnd
) {

  if (
    spot.periodType ===
    "permanent"
  ) {
    return true;
  }

  if (
    spot.periodType !==
    "limited"
  ) {
    return false;
  }

  const spotStart =
    spot.startDate ||
    "0000-01-01";

  const spotEnd =
    spot.endDate ||
    "9999-12-31";

  return (
    spotStart <= rangeEnd &&
    spotEnd >= rangeStart
  );
}


function getDateQuickLabel(
  mode
) {
  return {
    today: "今日の候補",
    weekend: "今週末の候補",
    upcoming: "近日開催",
    ending: "まもなく終了"
  }[mode] || "";
}


function spotMatchesDateQuickMode(
  spot,
  mode
) {

  if (!mode) {
    return true;
  }

  const today =
    getTodayInJapan();

  if (mode === "today") {
    return doesSpotOverlapDateRange(
      spot,
      today,
      today
    );
  }

  if (mode === "weekend") {
    const weekend =
      getWeekendDateRange(today);

    return doesSpotOverlapDateRange(
      spot,
      weekend.start,
      weekend.end
    );
  }

  if (mode === "upcoming") {
    if (
      spot.periodType !== "limited" ||
      !spot.startDate
    ) {
      return false;
    }

    const days =
      getDaysBetweenDateStrings(
        today,
        spot.startDate
      );

    return (
      typeof days === "number" &&
      days > 0 &&
      days <= 14
    );
  }

  if (mode === "ending") {
    return isSpotEndingSoon(spot);
  }

  return true;
}


function syncDateQuickButtons() {
  dateQuickButtons.forEach(
    button => {
      const active =
        button.dataset.dateQuick ===
        dateQuickMode;

      button.classList.toggle(
        "is-active",
        active
      );

      button.setAttribute(
        "aria-pressed",
        String(active)
      );
    }
  );
}


function setDateQuickMode(
  mode,
  options = {}
) {
  const allowedModes =
    new Set([
      "today",
      "weekend",
      "upcoming",
      "ending"
    ]);

  dateQuickMode =
    allowedModes.has(mode)
      ? mode
      : "";

  if (soonEndingFilter) {
    soonEndingFilter.checked =
      dateQuickMode === "ending";
  }

  syncDateQuickButtons();

  if (options.update !== false) {
    updateSpotFilters();
    renderSearchSuggestions();
  }
}


function getSpotTimingInfo(
  spot
) {

  if (
    isCancelledEvent(spot)
  ) {
    return {
      type: "cancelled",
      label: "開催中止"
    };
  }

  const status =
    getSpotPeriodStatus(spot);

  const today =
    getTodayInJapan();

  if (
    status === "ended"
  ) {
    return {
      type: "ended",
      label: "終了済み"
    };
  }

  if (
    status === "upcoming" &&
    spot.startDate
  ) {
    const days =
      getDaysBetweenDateStrings(
        today,
        spot.startDate
      );

    if (days === 1) {
      return {
        type: "upcoming",
        days,
        label: "明日から開催"
      };
    }

    if (
      typeof days === "number" &&
      days > 1
    ) {
      return {
        type: "upcoming",
        days,
        label: "あと" + days + "日で開催"
      };
    }
  }

  if (
    status === "active" &&
    spot.periodType === "limited" &&
    spot.endDate
  ) {
    const days =
      getDaysBetweenDateStrings(
        today,
        spot.endDate
      );

    if (days === 0) {
      return {
        type: "ending",
        days,
        soon: true,
        label: "本日終了"
      };
    }

    if (
      typeof days === "number" &&
      days > 0
    ) {
      return {
        type: "ending",
        days,
        soon: days <= SOON_ENDING_DAYS,
        label: "あと" + days + "日"
      };
    }
  }

  return null;
}


function isSpotEndingSoon(
  spot
) {

  const timing =
    getSpotTimingInfo(spot);

  return Boolean(
    timing &&
    timing.type === "ending" &&
    timing.soon
  );
}


function createSpotTimingBadge(
  spot,
  baseClass = "spot-timing-badge"
) {

  const timing =
    getSpotTimingInfo(spot);

  if (!timing) {
    return null;
  }

  const className =
    baseClass +
    " timing-" +
    timing.type +
    (timing.soon ? " is-soon" : "");

  return createDiv(
    className,
    (
      timing.type === "ending"
        ? "⌛ "
        : timing.type === "cancelled"
          ? "⚠ "
          : "🗓 "
    ) +
    timing.label
  );
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
    .replace(
      /[ァ-ヶ]/g,
      character =>
        String.fromCharCode(
          character.charCodeAt(0) -
          0x60
        )
    )
    .replace(/\s+/g, "");
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
            record.prefecture
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


function renderArchiveYearOptions() {

  if (!archiveYearFilter) {
    return;
  }

  const currentValue =
    archiveYearFilter.value;

  const years =
    Array.from(
      new Set(
        spotRecords
          .filter(
            record =>
              getSpotPeriodStatus(
                record.spot
              ) === "ended"
          )
          .map(
            record =>
              record.spot.startDate
                ?.slice(0, 4)
          )
          .filter(
            year =>
              /^\d{4}$/.test(year)
          )
      )
    ).sort(
      (a, b) =>
        Number(b) - Number(a)
    );

  archiveYearFilter.replaceChildren();

  const allOption =
    document.createElement("option");

  allOption.value = "";
  allOption.textContent = "すべての年";
  archiveYearFilter.appendChild(allOption);

  years.forEach(
    year => {
      const option =
        document.createElement("option");

      option.value = year;
      option.textContent = year + "年";
      archiveYearFilter.appendChild(option);
    }
  );

  if (
    Array.from(archiveYearFilter.options)
      .some(
        option =>
          option.value === currentValue
      )
  ) {
    archiveYearFilter.value = currentValue;
  }
}


function syncArchiveYearFilter() {

  if (
    !archiveYearFilterWrap ||
    !archiveYearFilter
  ) {
    return;
  }

  const active =
    Boolean(endedFilter?.checked);

  archiveYearFilterWrap.hidden =
    !active;

  archiveYearFilter.disabled =
    !active || !archiveDataLoaded;
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

  activeSearchSuggestionIndex =
    -1;

  spotSearch?.setAttribute(
    "aria-expanded",
    "false"
  );

  spotSearch?.removeAttribute(
    "aria-activedescendant"
  );
}


function getSearchSuggestionButtons() {
  return Array.from(
    spotSearchSuggestions
      ?.querySelectorAll(
        ".search-suggestion"
      ) ||
      []
  );
}


function setActiveSearchSuggestion(
  index
) {

  const buttons =
    getSearchSuggestionButtons();

  if (
    !spotSearch ||
    buttons.length === 0
  ) {
    return;
  }

  const normalizedIndex =
    (
      index +
      buttons.length
    ) %
    buttons.length;

  activeSearchSuggestionIndex =
    normalizedIndex;

  buttons.forEach(
    (button, buttonIndex) => {
      const active =
        buttonIndex === normalizedIndex;

      button.classList.toggle(
        "is-keyboard-active",
        active
      );

      button.setAttribute(
        "aria-selected",
        String(active)
      );
    }
  );

  const activeButton =
    buttons[normalizedIndex];

  spotSearch.setAttribute(
    "aria-activedescendant",
    activeButton.id
  );

  activeButton.scrollIntoView({
    block: "nearest"
  });
}


function focusSpotRecord(
  record,
  options = {}
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
        record,
        {
          scrollOnMobile:
            true,
          returnFocusTo:
            options.returnFocusTo
        }
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

  activeSearchSuggestionIndex =
    -1;

  spotSearch.removeAttribute(
    "aria-activedescendant"
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

  const includeEnded =
    Boolean(
      endedFilter?.checked
    );

  const matches =
    spotRecords
      .filter(
        record => {

          if (
            getSpotPeriodStatus(
              record.spot
            ) === "ended" &&
            !includeEnded
          ) {
            return false;
          }

          if (
            selectedPrefecture &&
            record.prefecture !==
            selectedPrefecture
          ) {
            return false;
          }

          return record.searchText.includes(
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

    spotSearch.setAttribute(
      "aria-expanded",
      "true"
    );

    return;
  }

  matches.forEach(
    (record, index) => {

      const button =
        document.createElement(
          "button"
        );

      button.type =
        "button";

      button.className =
        "search-suggestion";

      button.id =
        `spot-search-suggestion-${index}`;

      button.setAttribute(
        "role",
        "option"
      );

      button.setAttribute(
        "aria-selected",
        "false"
      );

      const name =
        createDiv(
          "search-suggestion-name",
          record.spot.name
        );

      const metaParts = [
        record.prefecture,
        getPlaceTypeLabel(
          record.spot.placeType
        ),
        getEvidenceCompactLabel(
          record.spot
        )
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
          focusSpotRecord(
            record,
            {
              returnFocusTo:
                spotSearch
            }
          );
        }
      );

      spotSearchSuggestions.appendChild(
        button
      );
    }
  );

  spotSearchSuggestions.hidden =
    false;

  spotSearch.setAttribute(
    "aria-expanded",
    "true"
  );
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

    cancelled:
      "開催中止",

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
      "買う",

    food:
      "食べる",

    spot:
      "観光・体験",

    lodging:
      "泊まる",

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
      "ナガノ先生が紹介（訪問未確認）",

    visited:
      "ナガノ先生が訪問・利用",

    related:
      "ナガノ先生が制作・公式に関与"
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


function getEvidenceLevel(
  spot
) {

  if (
    spot?.category !== "nagano"
  ) {
    return "";
  }

  if (
    spot.evidenceStatus ===
    "confirmed"
  ) {
    return "confirmed";
  }

  return String(
    spot.evidenceNote || ""
  ).startsWith("【推定・高確度】")
    ? "high"
    : "caution";
}


function getEvidenceLevelLabel(
  evidenceLevel
) {

  const labels = {

    confirmed:
      "確定",

    high:
      "推定・高確度",

    caution:
      "要注意候補"
  };


  return (
    labels[
      evidenceLevel
    ] ||
    "未判定"
  );
}


function getEvidenceLevelIcon(
  evidenceLevel
) {

  return {
    confirmed: "✓",
    high: "△",
    caution: "？"
  }[evidenceLevel] || "";
}


function getEvidenceCompactLabel(
  spot
) {

  const evidenceLevel =
    getEvidenceLevel(spot);

  if (!evidenceLevel) {
    return null;
  }

  return (
    getEvidenceLevelIcon(
      evidenceLevel
    ) +
    getEvidenceLevelLabel(
      evidenceLevel
    )
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
// 地図ラベル用HTMLエスケープ
// ============================================================

function escapeHtml(
  value
) {

  return String(
    value ?? ""
  )
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// ============================================================
// クラスタアイコン
// 6件以下ならスポット名も地図上へ表示
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


  let nameListHtml =
    "";


  if (
    count <=
    6
  ) {

    const names =
      markers
        .map(
          marker =>
            marker.options
              .spotName ||
            "スポット"
        )
        .sort(
          (a, b) =>
            String(a)
              .localeCompare(
                String(b),
                "ja"
              )
        );


    nameListHtml =
      '<div class="cluster-name-list" aria-hidden="true">' +
      names
        .map(
          name =>
            '<div class="cluster-name-item">' +
            escapeHtml(name) +
            "</div>"
        )
        .join("") +
      "</div>";
  }


  return L.divIcon({

    className:
      "marker-cluster-custom",

    html:
      '<div class="cluster-label-wrap">' +
      '<div class="cluster-bubble ' +
      colorClass +
      '">' +
      '<span class="cluster-count">' +
      count +
      "</span>" +
      "</div>" +
      nameListHtml +
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


let detailReturnFocusElement =
  null;


// ============================================================
// 現在地・一覧表示・行きたい保存
// ============================================================

const FAVORITES_STORAGE_KEY =
  "chiikawa-map-favorites-v1";


const VISITED_STORAGE_KEY =
  "chiikawa-map-visited-v1";


const VISIT_DETAILS_STORAGE_KEY =
  "chiikawa-map-visit-details-v1";


const PLAN_STORAGE_KEY =
  "chiikawa-map-plan-v1";


const PLAN_MAX_SPOTS =
  8;


const VISIT_NOTE_MAX_LENGTH =
  500;


let favoriteSpotIds =
  loadFavoriteSpotIds();


let visitedSpotIds =
  loadStringSetFromStorage(
    VISITED_STORAGE_KEY,
    "行った！スポット"
  );


let visitDetailsBySpotId =
  loadVisitDetails();


let planSpotIds =
  loadPlanSpotIds();


let favoriteOnly =
  false;


let visitedOnly =
  false;


let currentViewMode =
  "map";


let dateQuickMode =
  "";


let listSortMode =
  "default";


let listWithinMapBounds =
  false;


let lastUserLocation =
  null;


let lastFilteredRecords =
  [];


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
      showAppStatus(
        "行きたいスポットの保存データを読み込めなかったため、空の状態で表示しています。",
        {
          type: "warning"
        }
      );
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

    showAppStatus(
      "行きたいスポットの保存データを読み込めなかったため、空の状態で表示しています。",
      {
        type: "warning"
      }
    );

    return new Set();
  }
}


function loadStringSetFromStorage(
  storageKey,
  label
) {

  try {
    const value =
      window.localStorage.getItem(
        storageKey
      );

    if (!value) {
      return new Set();
    }

    const parsed =
      JSON.parse(value);

    if (!Array.isArray(parsed)) {
      showAppStatus(
        label +
        "の保存データを読み込めなかったため、空の状態で表示しています。",
        {
          type: "warning"
        }
      );
      return new Set();
    }

    return new Set(
      parsed.filter(
        id =>
          typeof id === "string"
      )
    );

  } catch (error) {
    console.warn(
      label +
      "の保存データを読み込めませんでした。",
      error
    );

    showAppStatus(
      label +
      "の保存データを読み込めなかったため、空の状態で表示しています。",
      {
        type: "warning"
      }
    );

    return new Set();
  }
}


function saveStringSetToStorage(
  storageKey,
  values,
  label
) {

  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify(
        Array.from(values)
      )
    );

    return true;

  } catch (error) {
    console.warn(
      label +
      "を保存できませんでした。",
      error
    );

    showAppStatus(
      label +
      "を端末に保存できませんでした。ブラウザの保存設定や空き容量をご確認ください。",
      {
        type: "error",
        persistent: true
      }
    );

    return false;
  }
}


function saveFavoriteSpotIds() {

  return saveStringSetToStorage(
    FAVORITES_STORAGE_KEY,
    favoriteSpotIds,
    "行きたいスポット"
  );
}


function loadPlanSpotIds() {
  try {
    const parsed =
      JSON.parse(
        window.localStorage.getItem(
          PLAN_STORAGE_KEY
        ) ||
        "[]"
      );

    if (!Array.isArray(parsed)) {
      return [];
    }

    return Array.from(
      new Set(
        parsed.filter(
          id =>
            typeof id === "string" &&
            id.length <= 200
        )
      )
    ).slice(
      0,
      PLAN_MAX_SPOTS
    );
  } catch (error) {
    console.warn(
      "今日のプランを読み込めませんでした。",
      error
    );
    showAppStatus(
      "今日のプランを読み込めなかったため、空の状態で表示しています。",
      {
        type: "warning"
      }
    );
    return [];
  }
}


function savePlanSpotIds() {
  try {
    window.localStorage.setItem(
      PLAN_STORAGE_KEY,
      JSON.stringify(
        planSpotIds
      )
    );
    return true;
  } catch (error) {
    console.warn(
      "今日のプランを保存できませんでした。",
      error
    );
    showAppStatus(
      "今日のプランを端末に保存できませんでした。ブラウザの保存設定や空き容量をご確認ください。",
      {
        type: "error",
        persistent: true
      }
    );
    return false;
  }
}


function isValidVisitDate(
  value
) {

  if (
    value === ""
  ) {
    return true;
  }

  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date =
    new Date(
      value + "T00:00:00Z"
    );

  return !Number.isNaN(
    date.getTime()
  ) &&
    date.toISOString()
      .slice(0, 10) === value;
}


function normalizeVisitDetail(
  value
) {

  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const visitedAt =
    typeof value.visitedAt ===
      "string"
      ? value.visitedAt.trim()
      : "";

  const note =
    typeof value.note ===
      "string"
      ? value.note.trim()
      : "";

  if (
    !isValidVisitDate(visitedAt) ||
    note.length >
      VISIT_NOTE_MAX_LENGTH
  ) {
    return null;
  }

  if (
    !visitedAt &&
    !note
  ) {
    return null;
  }

  return {
    visitedAt,
    note
  };
}


function loadVisitDetails() {

  try {
    const value =
      window.localStorage.getItem(
        VISIT_DETAILS_STORAGE_KEY
      );

    if (!value) {
      return new Map();
    }

    const parsed =
      JSON.parse(value);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new Error(
        "保存形式が正しくありません。"
      );
    }

    const entries =
      Object.entries(parsed);

    if (
      entries.length > 10000
    ) {
      throw new Error(
        "保存件数が上限を超えています。"
      );
    }

    const details =
      new Map();

    entries.forEach(
      ([id, detail]) => {
        const normalized =
          normalizeVisitDetail(
            detail
          );

        if (
          id &&
          id.length <= 200 &&
          normalized
        ) {
          details.set(
            id,
            normalized
          );
        }
      }
    );

    return details;

  } catch (error) {
    console.warn(
      "訪問日・メモの保存データを読み込めませんでした。",
      error
    );

    showAppStatus(
      "訪問日・メモの保存データを読み込めなかったため、空の状態で表示しています。",
      {
        type: "warning"
      }
    );

    return new Map();
  }
}


function getVisitDetailsForExport() {

  return Object.fromEntries(
    Array.from(
      visitDetailsBySpotId.entries()
    )
      .sort(
        ([firstId], [secondId]) =>
          firstId.localeCompare(
            secondId
          )
      )
  );
}


function saveVisitDetails() {

  try {
    window.localStorage.setItem(
      VISIT_DETAILS_STORAGE_KEY,
      JSON.stringify(
        getVisitDetailsForExport()
      )
    );

    return true;

  } catch (error) {
    console.warn(
      "訪問日・メモを保存できませんでした。",
      error
    );

    showAppStatus(
      "訪問日・メモを端末に保存できませんでした。ブラウザの保存設定や空き容量をご確認ください。",
      {
        type: "error",
        persistent: true
      }
    );

    return false;
  }
}


const SAVED_DATA_FORMAT =
  "chiikatsu-map-saved-spots";


const SAVED_DATA_VERSION =
  1;


let pendingSavedDataImport =
  null;


function exportSavedSpotData() {

  const exportedData = {
    format:
      SAVED_DATA_FORMAT,
    version:
      SAVED_DATA_VERSION,
    exportedAt:
      new Date().toISOString(),
    favorites:
      Array.from(
        favoriteSpotIds
      ).sort(),
    plan:
      planSpotIds.slice(),
    visited:
      Array.from(
        visitedSpotIds
      ).sort(),
    visitDetails:
      getVisitDetailsForExport()
  };

  const file =
    new Blob(
      [
        JSON.stringify(
          exportedData,
          null,
          2
        ) + "\n"
      ],
      {
        type:
          "application/json"
      }
    );

  const downloadUrl =
    URL.createObjectURL(
      file
    );

  const downloadLink =
    document.createElement(
      "a"
    );

  downloadLink.href =
    downloadUrl;

  downloadLink.download =
    "chiikatsu-map-saved-" +
    getTodayInJapan() +
    ".json";

  document.body.appendChild(
    downloadLink
  );

  downloadLink.click();
  downloadLink.remove();

  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        downloadUrl
      );
    },
    0
  );

  showAppStatus(
    "行きたい・今日のプラン・行った！・訪問記録の保存データを書き出しました。",
    {
      type: "success"
    }
  );
}


function getImportedSpotIds(
  value,
  label
) {

  if (
    !Array.isArray(value) ||
    value.length > 10000 ||
    value.some(
      id =>
        typeof id !== "string" ||
        !id.trim() ||
        id.length > 200
    )
  ) {
    throw new Error(
      label +
      "の形式が正しくありません。"
    );
  }

  return value.map(
    id =>
      id.trim()
  );
}


function getImportedVisitDetails(
  value
) {

  if (
    value === undefined
  ) {
    return new Map();
  }

  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      "訪問日・メモの形式が正しくありません。"
    );
  }

  const entries =
    Object.entries(value);

  if (
    entries.length > 10000
  ) {
    throw new Error(
      "訪問日・メモの件数が上限を超えています。"
    );
  }

  const importedDetails =
    new Map();

  entries.forEach(
    ([id, detail]) => {
      const normalized =
        normalizeVisitDetail(
          detail
        );

      if (
        !id.trim() ||
        id.length > 200 ||
        !normalized
      ) {
        throw new Error(
          "訪問日・メモの形式が正しくありません。"
        );
      }

      importedDetails.set(
        id.trim(),
        normalized
      );
    }
  );

  return importedDetails;
}


function getMergedVisitDetail(
  current,
  imported
) {
  return {
    visitedAt:
      current?.visitedAt ||
      imported.visitedAt,
    note:
      current?.note ||
      imported.note
  };
}


function getVisitImportPreview(
  importedVisitDetails
) {
  let updateCount = 0;
  let conflictCount = 0;

  importedVisitDetails.forEach(
    (detail, id) => {
      const current =
        visitDetailsBySpotId.get(id);
      const merged =
        getMergedVisitDetail(
          current,
          detail
        );
      const hasConflict =
        Boolean(
          current?.visitedAt &&
          detail.visitedAt &&
          current.visitedAt !==
            detail.visitedAt
        ) ||
        Boolean(
          current?.note &&
          detail.note &&
          current.note !==
            detail.note
        );

      if (
        !current ||
        current.visitedAt !==
          merged.visitedAt ||
        current.note !==
          merged.note
      ) {
        updateCount += 1;
      }

      if (hasConflict) {
        conflictCount += 1;
      }
    }
  );

  return {
    updateCount,
    conflictCount
  };
}


function clearSavedDataImportPreview(
  options = {}
) {
  pendingSavedDataImport =
    null;

  if (savedDataImportPreview) {
    savedDataImportPreview.hidden =
      true;
  }

  savedDataImportSummary
    ?.replaceChildren();

  if (savedDataImportConflict) {
    savedDataImportConflict.hidden =
      true;
    savedDataImportConflict.textContent =
      "";
  }

  if (savedDataFile) {
    savedDataFile.value =
      "";
  }

  if (options.focusImport) {
    savedDataImport?.focus();
  }
}


function appendSavedDataImportSummary(
  text
) {
  if (!savedDataImportSummary) {
    return;
  }

  const item =
    document.createElement("li");
  item.textContent = text;
  savedDataImportSummary.appendChild(
    item
  );
}


function renderSavedDataImportPreview() {
  if (
    !pendingSavedDataImport ||
    !savedDataImportPreview
  ) {
    return;
  }

  const preview =
    pendingSavedDataImport.preview;

  if (savedDataImportFile) {
    savedDataImportFile.textContent =
      "ファイル: " +
      pendingSavedDataImport.fileName;
  }

  savedDataImportSummary
    ?.replaceChildren();

  appendSavedDataImportSummary(
    "行きたい: +" +
    preview.addedFavorites +
    "件（既に保存済み " +
    preview.duplicateFavorites +
    "件）"
  );
  appendSavedDataImportSummary(
    "今日のプラン: +" +
    preview.addedPlanSpots +
    "件（既に追加済み " +
    preview.duplicatePlanSpots +
    "件）"
  );
  appendSavedDataImportSummary(
    "行った！: +" +
    preview.addedVisited +
    "件（既に保存済み " +
    preview.duplicateVisited +
    "件）"
  );
  appendSavedDataImportSummary(
    "訪問日・メモ: " +
    preview.visitUpdates +
    "件を追加・補完"
  );

  if (savedDataImportConflict) {
    savedDataImportConflict.hidden =
      preview.visitConflicts === 0;
    savedDataImportConflict.textContent =
      preview.visitConflicts +
      "件の訪問記録に内容の違いがあります。" +
      "競合する訪問日・メモは、この端末の現在の内容を優先します。";
  }

  savedDataImportPreview.hidden =
    false;
  savedDataImportConfirm?.focus();
}


async function prepareSavedSpotDataImport(
  file
) {
  if (!file) {
    return;
  }

  try {
    if (
      file.size >
      1024 * 1024
    ) {
      throw new Error(
        "ファイルサイズは1MB以下にしてください。"
      );
    }

    const importedData =
      JSON.parse(
        await file.text()
      );

    if (
      !importedData ||
      importedData.format !==
        SAVED_DATA_FORMAT ||
      importedData.version !==
        SAVED_DATA_VERSION
    ) {
      throw new Error(
        "ちい活マップから書き出した保存データではありません。"
      );
    }

    const importedFavorites =
      new Set(
        getImportedSpotIds(
          importedData.favorites,
          "行きたいスポット"
        )
      );
    const importedVisited =
      new Set(
        getImportedSpotIds(
          importedData.visited,
          "行った！スポット"
        )
      );
    const importedPlan =
      getImportedSpotIds(
        importedData.plan || [],
        "今日のプラン"
      ).slice(
        0,
        PLAN_MAX_SPOTS
      );
    const importedVisitDetails =
      getImportedVisitDetails(
        importedData.visitDetails
      );
    const visitPreview =
      getVisitImportPreview(
        importedVisitDetails
      );
    const addedFavorites =
      Array.from(
        importedFavorites
      ).filter(
        id =>
          !favoriteSpotIds.has(id)
      ).length;
    const addedVisited =
      Array.from(
        importedVisited
      ).filter(
        id =>
          !visitedSpotIds.has(id)
      ).length;
    const addedPlanSpots =
      importedPlan.filter(
        id =>
          !planSpotIds.includes(id)
      ).length;

    pendingSavedDataImport = {
      fileName:
        file.name ||
        "保存データ.json",
      favorites:
        importedFavorites,
      visited:
        importedVisited,
      plan:
        importedPlan,
      visitDetails:
        importedVisitDetails,
      preview: {
        addedFavorites,
        duplicateFavorites:
          importedFavorites.size -
          addedFavorites,
        addedPlanSpots,
        duplicatePlanSpots:
          importedPlan.length -
          addedPlanSpots,
        addedVisited,
        duplicateVisited:
          importedVisited.size -
          addedVisited,
        visitUpdates:
          visitPreview.updateCount,
        visitConflicts:
          visitPreview.conflictCount
      }
    };

    renderSavedDataImportPreview();
  } catch (error) {
    clearSavedDataImportPreview();

    console.warn(
      "保存データをインポートできませんでした。",
      error
    );

    showAppStatus(
      "保存データを読み込めませんでした。" +
      (
        error instanceof Error
          ? " " + error.message
          : ""
      ),
      {
        type: "error",
        persistent: true
      }
    );
  } finally {
    if (savedDataFile) {
      savedDataFile.value =
        "";
    }
  }
}


function applySavedSpotDataImport() {
  if (!pendingSavedDataImport) {
    return;
  }

  const favoriteCountBefore =
    favoriteSpotIds.size;
  const visitedCountBefore =
    visitedSpotIds.size;
  const planCountBefore =
    planSpotIds.length;
  let addedVisitDetails = 0;

  pendingSavedDataImport.favorites
    .forEach(
      id =>
        favoriteSpotIds.add(id)
    );
  pendingSavedDataImport.visited
    .forEach(
      id =>
        visitedSpotIds.add(id)
    );
  pendingSavedDataImport.plan
    .forEach(
      id => {
        if (
          planSpotIds.length <
            PLAN_MAX_SPOTS &&
          !planSpotIds.includes(id)
        ) {
          planSpotIds.push(id);
        }
      }
    );
  pendingSavedDataImport.visitDetails
    .forEach(
      (detail, id) => {
        const current =
          visitDetailsBySpotId.get(id);
        const merged =
          getMergedVisitDetail(
            current,
            detail
          );

        if (
          !current ||
          current.visitedAt !==
            merged.visitedAt ||
          current.note !==
            merged.note
        ) {
          visitDetailsBySpotId.set(
            id,
            merged
          );
          addedVisitDetails += 1;
        }
      }
    );

  const favoriteSaved =
    saveFavoriteSpotIds();
  const visitedSaved =
    saveStringSetToStorage(
      VISITED_STORAGE_KEY,
      visitedSpotIds,
      "行った！スポット"
    );
  const planSaved =
    savePlanSpotIds();
  const visitDetailsSaved =
    saveVisitDetails();

  updateFavoriteCount();
  updateVisitedCount();
  updatePlanCount();
  updateSpotFilters();

  if (
    favoriteSaved &&
    visitedSaved &&
    planSaved &&
    visitDetailsSaved
  ) {
    const addedFavorites =
      favoriteSpotIds.size -
      favoriteCountBefore;
    const addedVisited =
      visitedSpotIds.size -
      visitedCountBefore;
    const addedPlanSpots =
      planSpotIds.length -
      planCountBefore;

    clearSavedDataImportPreview({
      focusImport: true
    });
    showAppStatus(
      "保存データを追加統合しました（行きたい +" +
      addedFavorites +
      "件、行った！ +" +
      addedVisited +
      "件、今日のプラン +" +
      addedPlanSpots +
      "件、訪問記録 +" +
      addedVisitDetails +
      "件）。",
      {
        type: "success"
      }
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
    !favoriteCount &&
    !savedDataFavoriteCount
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

  if (
    favoriteCount
  ) {
    favoriteCount.textContent =
      String(count);
  }

  if (
    savedDataFavoriteCount
  ) {
    savedDataFavoriteCount.textContent =
      String(count);
  }
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
    recordMatchesFilters(
      selectedRecord,
      getCurrentFilterState()
    )
  ) {

    detailBody.replaceChildren(
      createSpotDetail(
        selectedRecord.spot
      )
    );
  }
}


function isPlanSpot(
  spot
) {
  return Boolean(
    spot?.id &&
    planSpotIds.includes(
      spot.id
    )
  );
}


function updatePlanCount() {
  const count =
    spotRecords.length
      ? planSpotIds.filter(
          id =>
            spotRecords.some(
              record =>
                record.spot.id === id
            )
        ).length
      : planSpotIds.length;

  if (planCount) {
    planCount.textContent =
      String(count);
  }

  if (savedDataPlanCount) {
    savedDataPlanCount.textContent =
      String(count);
  }
}


function togglePlanSpot(
  spot
) {
  if (!spot?.id) {
    return;
  }

  if (isPlanSpot(spot)) {
    planSpotIds =
      planSpotIds.filter(
        id => id !== spot.id
      );
  } else {
    if (
      planSpotIds.length >=
      PLAN_MAX_SPOTS
    ) {
      showAppStatus(
        "今日のプランへ追加できるのは" +
        PLAN_MAX_SPOTS +
        "件までです。手帳で不要なスポットを外してから追加してください。",
        {
          type: "warning"
        }
      );
      return;
    }

    planSpotIds.push(
      spot.id
    );
  }

  savePlanSpotIds();
  updatePlanCount();
  updateSpotFilters();

  if (
    selectedRecord &&
    selectedRecord.spot.id ===
      spot.id &&
    recordMatchesFilters(
      selectedRecord,
      getCurrentFilterState()
    )
  ) {
    detailBody.replaceChildren(
      createSpotDetail(
        selectedRecord.spot
      )
    );
  }
}


function isVisitedSpot(
  spot
) {
  return Boolean(
    spot?.id &&
    visitedSpotIds.has(spot.id)
  );
}


function updateVisitedCount() {

  if (
    !visitedCount &&
    !savedDataVisitedCount
  ) {
    return;
  }

  const count =
    spotRecords.length
      ? spotRecords.filter(
          record =>
            isVisitedSpot(record.spot)
        ).length
      : visitedSpotIds.size;

  if (
    visitedCount
  ) {
    visitedCount.textContent =
      String(count);
  }

  if (
    savedDataVisitedCount
  ) {
    savedDataVisitedCount.textContent =
      String(count);
  }
}


function syncVisitedFilterButton() {

  if (!visitedFilterButton) {
    return;
  }

  visitedFilterButton.classList.toggle(
    "is-active",
    visitedOnly
  );

  visitedFilterButton.setAttribute(
    "aria-pressed",
    String(visitedOnly)
  );
}


function toggleVisitedSpot(
  spot
) {

  if (!spot?.id) {
    return;
  }

  if (visitedSpotIds.has(spot.id)) {
    visitedSpotIds.delete(spot.id);
  } else {
    visitedSpotIds.add(spot.id);
  }

  saveStringSetToStorage(
    VISITED_STORAGE_KEY,
    visitedSpotIds,
    "行った！スポット"
  );

  updateVisitedCount();
  updateSpotFilters();

  if (
    selectedRecord &&
    selectedRecord.spot.id === spot.id &&
    recordMatchesFilters(
      selectedRecord,
      getCurrentFilterState()
    )
  ) {
    detailBody.replaceChildren(
      createSpotDetail(
        selectedRecord.spot
      )
    );
  }
}


function toRadians(
  degrees
) {
  return degrees *
    Math.PI /
    180;
}


function getDistanceMeters(
  lat1,
  lng1,
  lat2,
  lng2
) {

  const earthRadius =
    6371000;

  const dLat =
    toRadians(
      lat2 - lat1
    );

  const dLng =
    toRadians(
      lng2 - lng1
    );

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) ** 2;

  return earthRadius *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );
}


function getRecordDistance(
  record
) {

  if (
    !lastUserLocation
  ) {
    return null;
  }

  return getDistanceMeters(
    lastUserLocation.lat,
    lastUserLocation.lng,
    record.spot.lat,
    record.spot.lng
  );
}


function formatDistance(
  meters
) {

  if (
    typeof meters !==
      "number" ||
    !Number.isFinite(meters)
  ) {
    return "";
  }

  if (
    meters < 1000
  ) {
    return Math.max(
      10,
      Math.round(
        meters / 10
      ) * 10
    ) + "m";
  }

  const kilometers =
    meters / 1000;

  return (
    kilometers < 10
      ? kilometers.toFixed(1)
      : Math.round(kilometers).toString()
  ) + "km";
}


function getListRecords(
  records
) {

  let listRecords =
    records.slice();

  if (
    listWithinMapBounds
  ) {

    const bounds =
      map.getBounds();

    listRecords =
      listRecords.filter(
        record =>
          bounds.contains(
            record.marker.getLatLng()
          )
      );
  }

  if (
    listSortMode === "distance" &&
    lastUserLocation
  ) {
    listRecords.sort(
      (a, b) =>
        getRecordDistance(a) -
        getRecordDistance(b)
    );
  } else if (
    listSortMode === "ending"
  ) {
    listRecords.sort(
      (a, b) => {
        const aEnd =
          a.spot.endDate || "9999-12-31";
        const bEnd =
          b.spot.endDate || "9999-12-31";
        return aEnd.localeCompare(bEnd) ||
          a.spot.name.localeCompare(
            b.spot.name,
            "ja"
          );
      }
    );
  } else if (
    listSortMode === "name"
  ) {
    listRecords.sort(
      (a, b) =>
        a.spot.name.localeCompare(
          b.spot.name,
          "ja"
        )
    );
  }

  return listRecords;
}


function syncListControlButtons() {

  listNearbySortButton?.classList.toggle(
    "is-active",
    listSortMode ===
      "distance"
  );

  listNearbySortButton?.setAttribute(
    "aria-pressed",
    String(
      listSortMode ===
        "distance"
    )
  );

  listBoundsFilterButton?.classList.toggle(
    "is-active",
    listWithinMapBounds
  );

  listBoundsFilterButton?.setAttribute(
    "aria-pressed",
    String(
      listWithinMapBounds
    )
  );

  listEndingSortButton?.classList.toggle(
    "is-active",
    listSortMode === "ending"
  );
  listEndingSortButton?.setAttribute(
    "aria-pressed",
    String(listSortMode === "ending")
  );

  listNameSortButton?.classList.toggle(
    "is-active",
    listSortMode === "name"
  );
  listNameSortButton?.setAttribute(
    "aria-pressed",
    String(listSortMode === "name")
  );
}


function getBasePublicUrl() {
  return new URL(
    window.location.origin +
    window.location.pathname
  );
}


function getSpotShareUrl(
  spot
) {
  return new URL(
    "spot/" +
      encodeURIComponent(spot.id) +
      "/",
    getBasePublicUrl()
  ).toString();
}


function getSpotReportUrl(
  spot
) {

  const url =
    new URL(
      "https://github.com/route0254/chiikawa-map/issues/new"
    );

  url.searchParams.set(
    "template",
    "01-spot-correction.yml"
  );

  url.searchParams.set(
    "title",
    "[スポット情報] " +
    spot.name
  );

  url.searchParams.set(
    "spot-id",
    spot.id
  );

  url.searchParams.set(
    "spot-name",
    spot.name
  );

  url.searchParams.set(
    "page-url",
    getSpotShareUrl(spot)
  );

  return url.toString();
}


function getFilterGroupValuesForShare(
  name
) {
  const inputs =
    Array.from(
      document.querySelectorAll(
        'input[name="' +
        name +
        '"]'
      )
    );

  if (!inputs.length) {
    return null;
  }

  const selected =
    inputs.filter(input => input.checked)
      .map(input => input.value);

  if (selected.length === inputs.length) {
    return null;
  }

  return selected.length
    ? selected.join(",")
    : "__none__";
}


function setSharedGroupParam(
  url,
  paramName,
  inputName
) {
  const value =
    getFilterGroupValuesForShare(
      inputName
    );
  if (value !== null) {
    url.searchParams.set(
      paramName,
      value
    );
  }
}


function getCurrentFiltersShareUrl() {

  const url =
    getBasePublicUrl();

  const query =
    spotSearch?.value.trim();
  if (query) {
    url.searchParams.set("q", query);
  }

  const prefecture =
    prefectureFilter?.value;
  if (prefecture) {
    url.searchParams.set("pref", prefecture);
  }

  setSharedGroupParam(url, "cat", "filter-category");
  setSharedGroupParam(url, "type", "filter-place");
  setSharedGroupParam(url, "period", "filter-period");
  setSharedGroupParam(url, "reservation", "filter-reservation");
  setSharedGroupParam(url, "official", "filter-official-relation");
  setSharedGroupParam(url, "nagano", "filter-nagano-relation");
  setSharedGroupParam(url, "evidence", "filter-nagano-evidence");
  setSharedGroupParam(url, "brand", "filter-brand");

  if (dateQuickMode) {
    url.searchParams.set(
      "when",
      dateQuickMode
    );
  }

  if (soonEndingFilter?.checked) {
    url.searchParams.set("soon", "1");
  }

  if (endedFilter?.checked) {
    url.searchParams.set("past", "1");

    if (archiveYearFilter?.value) {
      url.searchParams.set(
        "year",
        archiveYearFilter.value
      );
    }
  }

  if (currentViewMode === "list") {
    url.searchParams.set("view", "list");
  }

  return url.toString();
}


function applySharedGroupParam(
  paramName,
  inputName
) {

  if (!params.has(paramName)) {
    return;
  }

  const raw =
    params.get(paramName) || "";

  const wanted =
    raw === "__none__"
      ? new Set()
      : new Set(
          raw.split(",")
            .filter(Boolean)
        );

  document.querySelectorAll(
    'input[name="' + inputName + '"]'
  ).forEach(
    input => {
      input.checked =
        wanted.has(input.value);
    }
  );
}


function applySharedEvidenceParam() {

  if (!params.has("evidence")) {
    return;
  }

  const raw =
    params.get("evidence") || "";

  const wanted =
    raw === "__none__"
      ? new Set()
      : new Set(
          raw.split(",")
            .filter(Boolean)
        );

  if (wanted.has("inferred")) {
    wanted.delete("inferred");
    wanted.add("high");
    wanted.add("caution");
  }

  document.querySelectorAll(
    'input[name="filter-nagano-evidence"]'
  ).forEach(
    input => {
      input.checked =
        wanted.has(input.value);
    }
  );
}


function applySharedFilterState() {

  if (params.has("q") && spotSearch) {
    spotSearch.value = params.get("q") || "";
  }

  if (params.has("pref") && prefectureFilter) {
    const value = params.get("pref") || "";
    const hasOption =
      Array.from(prefectureFilter.options)
        .some(option => option.value === value);
    if (hasOption) {
      prefectureFilter.value = value;
    }
  }

  applySharedGroupParam("cat", "filter-category");
  applySharedGroupParam("type", "filter-place");
  applySharedGroupParam("period", "filter-period");
  applySharedGroupParam("reservation", "filter-reservation");
  applySharedGroupParam("official", "filter-official-relation");
  applySharedGroupParam("nagano", "filter-nagano-relation");
  applySharedEvidenceParam();
  applySharedGroupParam("brand", "filter-brand");

  const sharedDateQuickMode =
    params.get("when") ||
    (
      params.get("soon") === "1"
        ? "ending"
        : ""
    );

  setDateQuickMode(
    sharedDateQuickMode,
    {
      update: false
    }
  );

  if (soonEndingFilter) {
    soonEndingFilter.checked =
      sharedDateQuickMode ===
      "ending";
  }

  if (endedFilter) {
    endedFilter.checked =
      params.get("past") === "1";
  }

  if (
    endedFilter?.checked &&
    archiveYearFilter &&
    /^\d{4}$/.test(
      params.get("year") || ""
    )
  ) {
    const year = params.get("year");
    const hasOption =
      Array.from(archiveYearFilter.options)
        .some(
          option =>
            option.value === year
        );

    if (hasOption) {
      archiveYearFilter.value = year;
    }
  }

  syncArchiveYearFilter();

  if (params.get("view") === "list") {
    currentViewMode = "list";
  }
}


async function shareCurrentFilters() {

  const url =
    getCurrentFiltersShareUrl();

  const shareData = {
    title: "ちいかわ推し活（ちい活）MAP",
    text: "この条件でスポットを表示しています",
    url
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
    await navigator.clipboard.writeText(url);
    showTransientMapStatus(
      "検索・絞り込み条件のURLをコピーしました。"
    );
  } catch (error) {
    window.prompt(
      "このURLをコピーしてください。",
      url
    );
  }
}


async function shareSpot(
  spot
) {

  if (
    !spot?.id
  ) {
    return;
  }

  const url =
    getSpotShareUrl(
      spot
    );

  const shareData = {
    title:
      spot.name +
      " | ちいかわ推し活（ちい活）MAP",
    text:
      spot.name,
    url
  };

  if (
    navigator.share
  ) {

    try {
      await navigator.share(
        shareData
      );
      return;
    } catch (error) {
      if (
        error?.name ===
        "AbortError"
      ) {
        return;
      }
    }
  }

  if (
    navigator.clipboard?.writeText
  ) {

    try {
      await navigator.clipboard.writeText(
        url
      );

      showTransientMapStatus(
        "スポット共有URLをコピーしました。"
      );
      return;
    } catch (error) {
      console.warn(
        "共有URLをクリップボードへコピーできませんでした。",
        error
      );
    }
  }

  window.prompt(
    "このURLをコピーして共有してください。",
    url
  );
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

    spotList?.replaceChildren();

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

  if (
    isVisitedSpot(spot)
  ) {
    card.classList.add(
      "is-visited"
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
        record.prefecture,
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

  const visitedButton =
    document.createElement(
      "button"
    );

  visitedButton.type =
    "button";

  visitedButton.className =
    "spot-list-visited-button" +
    (
      isVisitedSpot(spot)
        ? " is-active"
        : ""
    );

  visitedButton.textContent =
    isVisitedSpot(spot)
      ? "✓"
      : "○";

  visitedButton.setAttribute(
    "aria-label",
    isVisitedSpot(spot)
      ? "行った！から削除"
      : "行った！に登録"
  );

  visitedButton.addEventListener(
    "click",
    () => {
      toggleVisitedSpot(spot);
    }
  );

  const shareButton =
    document.createElement(
      "button"
    );

  shareButton.type =
    "button";

  shareButton.className =
    "spot-list-share-button";

  shareButton.textContent =
    "🔗";

  shareButton.setAttribute(
    "aria-label",
    "このスポットを共有"
  );

  shareButton.addEventListener(
    "click",
    () => {
      shareSpot(spot);
    }
  );

  const planButton =
    document.createElement(
      "button"
    );

  planButton.type =
    "button";

  planButton.className =
    "spot-list-plan-button" +
    (
      isPlanSpot(spot)
        ? " is-active"
        : ""
    );

  planButton.textContent =
    isPlanSpot(spot)
      ? "👜"
      : "＋";

  planButton.setAttribute(
    "aria-label",
    isPlanSpot(spot)
      ? "今日のプランから外す"
      : "今日のプランに追加"
  );

  planButton.addEventListener(
    "click",
    () => {
      togglePlanSpot(spot);
    }
  );

  const headerActions =
    createDiv(
      "spot-list-card-actions"
    );

  headerActions.appendChild(
    shareButton
  );

  headerActions.appendChild(
    planButton
  );

  headerActions.appendChild(
    visitedButton
  );

  headerActions.appendChild(
    favoriteButton
  );

  header.appendChild(
    headingWrap
  );

  header.appendChild(
    headerActions
  );

  card.appendChild(
    header
  );

  const evidenceLevel =
    getEvidenceLevel(spot);

  if (evidenceLevel) {

    card.appendChild(
      createDiv(
        "spot-list-evidence evidence-" +
        evidenceLevel,
        getEvidenceLevelIcon(
          evidenceLevel
        ) +
        " ナガセン関連：" +
        getEvidenceLevelLabel(
          evidenceLevel
        )
      )
    );
  }

  const timingBadge =
    createSpotTimingBadge(
      spot,
      "spot-list-timing"
    );

  if (timingBadge) {
    card.appendChild(
      timingBadge
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

  const distance =
    getRecordDistance(
      record
    );

  if (
    distance !== null
  ) {
    card.appendChild(
      createDiv(
        "spot-list-distance",
        "◎ 現在地から約" +
        formatDistance(
          distance
        )
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
                record,
                {
                  returnFocusTo:
                    mapViewButton
                }
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
  records,
  totalFilteredCount =
    records.length
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

    const parts =
      [];

    if (
      listWithinMapBounds
    ) {
      parts.push(
        "地図範囲内 " +
        records.length +
        "件 / 条件一致 " +
        totalFilteredCount +
        "件"
      );
    } else {
      parts.push(
        records.length +
        "件のスポット"
      );
    }

    if (
      listSortMode ===
        "distance" &&
      lastUserLocation
    ) {
      parts.push(
        "現在地から近い順"
      );
    }

    spotListSummary.textContent =
      parts.join(
        " ・ "
      );
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


function setLocationLoading(
  loading
) {

  locationButton?.classList.toggle(
    "is-loading",
    loading
  );

  listNearbySortButton?.classList.toggle(
    "is-loading",
    loading
  );

  if (
    loading
  ) {
    locationButton?.setAttribute(
      "aria-busy",
      "true"
    );
    listNearbySortButton?.setAttribute(
      "aria-busy",
      "true"
    );
  } else {
    locationButton?.removeAttribute(
      "aria-busy"
    );
    listNearbySortButton?.removeAttribute(
      "aria-busy"
    );
  }
}


function applyUserLocation(
  position,
  options = {}
) {

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

  lastUserLocation = {
    lat,
    lng,
    accuracy
  };

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

  if (
    options.focusMap
  ) {

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
  }

  if (
    listSortMode ===
      "distance"
  ) {
    updateSpotFilters();
  }
}


function requestUserLocation(
  options = {}
) {

  if (
    !navigator.geolocation
  ) {
    showTransientMapStatus(
      "このブラウザでは現在地を取得できません。"
    );
    return;
  }

  setLocationLoading(
    true
  );

  showMapStatus(
    "現在地を取得しています…"
  );

  navigator.geolocation.getCurrentPosition(
    position => {

      setLocationLoading(
        false
      );

      applyUserLocation(
        position,
        options
      );

      options.onSuccess?.(
        position
      );

      showTransientMapStatus(
        options.successMessage ||
        "現在地を表示しました。位置情報は保存・送信しません。"
      );
    },
    error => {

      setLocationLoading(
        false
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


function locateUser() {
  requestUserLocation({
    focusMap: true
  });
}


// ============================================================
// 全スポットを初期表示
// ============================================================

function fitMapToRecords(
  records,
  options = {}
) {

  const maxZoom =
    options.maxZoom ?? 12;

  const singleZoom =
    options.singleZoom ?? 13;

  const animate =
    options.animate ?? false;

  const latLngs =
    records.map(
      record => [
        record.spot.lat,
        record.spot.lng
      ]
    );

  if (!latLngs.length) {
    return;
  }

  requestAnimationFrame(
    () => {
      map.invalidateSize({
        pan: false,
        animate: false
      });

      if (latLngs.length === 1) {
        map.setView(
          latLngs[0],
          singleZoom,
          { animate }
        );
        return;
      }

      const padding =
        window.innerWidth <= 650
          ? [24, 24]
          : [40, 40];

      map.fitBounds(
        L.latLngBounds(latLngs),
        {
          padding,
          maxZoom,
          animate
        }
      );
    }
  );
}


function focusMapOnPrefecture(
  prefecture
) {

  if (!prefecture) {
    return;
  }

  if (prefecture === "北海道") {
    requestAnimationFrame(
      () => {
        map.invalidateSize({
          pan: false,
          animate: false
        });

        map.setView(
          [43.0618, 141.3545],
          9,
          { animate: true }
        );
      }
    );

    return;
  }

  const visibleRecords =
    lastFilteredRecords.filter(
      record =>
        record.prefecture ===
        prefecture
    );

  const prefectureRecords =
    spotRecords.filter(
      record =>
        record.prefecture ===
          prefecture &&
        getSpotPeriodStatus(
          record.spot
        ) !== "ended"
    );

  fitMapToRecords(
    visibleRecords.length
      ? visibleRecords
      : prefectureRecords,
    {
      maxZoom: 10,
      singleZoom: 10,
      animate: true
    }
  );
}


function fitMapToAllSpots() {

  const records =
    lastFilteredRecords.length
      ? lastFilteredRecords
      : spotRecords.filter(
          record =>
            getSpotPeriodStatus(
              record.spot
            ) !== "ended"
        );

  const latLngs =
    records.map(
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

    const evidenceLevel =
      getEvidenceLevel(spot);

    if (
      evidenceLevel ===
      "high"
    ) {

      label =
        "ナ△";

      className =
        "spot-pin-nagano-high";

    } else if (
      evidenceLevel ===
      "caution"
    ) {

      label =
        "ナ?";

      className =
        "spot-pin-nagano-caution";

    } else {

      label =
        "ナ✓";

      className =
        "spot-pin-nagano-confirmed";
    }
  }


  if (
    isCancelledEvent(spot)
  ) {
    label = "中止";
    className =
      "spot-pin-cancelled";
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
  text,
  className = ""
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


  if (
    className
  ) {
    link.className =
      className;
  }


  parent.appendChild(
    link
  );
}


function createVisitDetailsCard(
  spot
) {

  if (
    !isVisitedSpot(spot)
  ) {
    return null;
  }

  const savedDetail =
    visitDetailsBySpotId.get(
      spot.id
    ) || {
      visitedAt: "",
      note: ""
    };

  const card =
    createDiv(
      "spot-info-card spot-visit-card"
    );

  card.appendChild(
    createDiv(
      "spot-info-title",
      "📝 訪問記録"
    )
  );

  card.appendChild(
    createDiv(
      "spot-visit-intro",
      "訪問日と自分用メモをこの端末に保存できます。"
    )
  );

  const form =
    document.createElement(
      "form"
    );

  form.className =
    "spot-visit-form";

  const dateLabel =
    document.createElement(
      "label"
    );

  dateLabel.className =
    "spot-visit-field";

  dateLabel.appendChild(
    createDiv(
      "spot-visit-label",
      "訪問日"
    )
  );

  const dateInput =
    document.createElement(
      "input"
    );

  dateInput.type =
    "date";
  dateInput.className =
    "spot-visit-date";
  dateInput.max =
    getTodayInJapan();
  dateInput.value =
    savedDetail.visitedAt;

  dateLabel.appendChild(
    dateInput
  );

  const noteLabel =
    document.createElement(
      "label"
    );

  noteLabel.className =
    "spot-visit-field";

  noteLabel.appendChild(
    createDiv(
      "spot-visit-label",
      "メモ"
    )
  );

  const noteInput =
    document.createElement(
      "textarea"
    );

  noteInput.className =
    "spot-visit-note";
  noteInput.maxLength =
    VISIT_NOTE_MAX_LENGTH;
  noteInput.rows = 3;
  noteInput.placeholder =
    "食べたもの、買ったもの、次回のメモなど";
  noteInput.value =
    savedDetail.note;

  noteLabel.appendChild(
    noteInput
  );

  const noteCount =
    createDiv(
      "spot-visit-note-count"
    );

  noteCount.setAttribute(
    "aria-live",
    "polite"
  );

  const updateNoteCount =
    () => {
      noteCount.textContent =
        noteInput.value.length +
        " / " +
        VISIT_NOTE_MAX_LENGTH;
    };

  updateNoteCount();

  noteInput.addEventListener(
    "input",
    updateNoteCount
  );

  const actions =
    createDiv(
      "spot-visit-actions"
    );

  const saveButton =
    document.createElement(
      "button"
    );

  saveButton.type =
    "submit";
  saveButton.className =
    "spot-visit-save";
  saveButton.textContent =
    "訪問記録を保存";

  const clearButton =
    document.createElement(
      "button"
    );

  clearButton.type =
    "button";
  clearButton.className =
    "spot-visit-clear";
  clearButton.textContent =
    "日付・メモを消去";

  const status =
    createDiv(
      "spot-visit-status"
    );

  status.setAttribute(
    "role",
    "status"
  );
  status.setAttribute(
    "aria-live",
    "polite"
  );

  form.addEventListener(
    "submit",
    event => {
      event.preventDefault();

      const visitedAt =
        dateInput.value;
      const note =
        noteInput.value.trim();

      if (
        !visitedAt &&
        !note
      ) {
        visitDetailsBySpotId.delete(
          spot.id
        );
      } else {
        visitDetailsBySpotId.set(
          spot.id,
          {
            visitedAt,
            note
          }
        );
      }

      if (
        saveVisitDetails()
      ) {
        noteInput.value =
          note;
        updateNoteCount();
        status.textContent =
          "この端末に保存しました。";
      }
    }
  );

  clearButton.addEventListener(
    "click",
    () => {
      dateInput.value = "";
      noteInput.value = "";
      updateNoteCount();
      visitDetailsBySpotId.delete(
        spot.id
      );

      if (
        saveVisitDetails()
      ) {
        status.textContent =
          "訪問日・メモを消去しました。";
        dateInput.focus();
      }
    }
  );

  actions.appendChild(
    saveButton
  );
  actions.appendChild(
    clearButton
  );

  form.appendChild(
    dateLabel
  );
  form.appendChild(
    noteLabel
  );
  form.appendChild(
    noteCount
  );
  form.appendChild(
    actions
  );
  form.appendChild(
    status
  );

  card.appendChild(form);

  return card;
}


function getNearbySpotRecords(
  spot,
  limit = 5
) {

  if (
    typeof spot?.lat !== "number" ||
    typeof spot?.lng !== "number"
  ) {
    return [];
  }

  return spotRecords
    .filter(
      record =>
        record.spot.id !== spot.id &&
        getSpotPeriodStatus(
          record.spot
        ) !== "ended"
    )
    .map(
      record => ({
        record,
        distance:
          getDistanceMeters(
            spot.lat,
            spot.lng,
            record.spot.lat,
            record.spot.lng
          )
      })
    )
    .sort(
      (first, second) =>
        first.distance -
          second.distance ||
        first.record.spot.name
          .localeCompare(
            second.record.spot.name,
            "ja"
          )
    )
    .slice(0, limit);
}


function createNearbySpotsCard(
  spot
) {

  const nearbySpots =
    getNearbySpotRecords(spot);

  if (!nearbySpots.length) {
    return null;
  }

  const card =
    createDiv(
      "spot-info-card spot-nearby-card"
    );

  card.appendChild(
    createDiv(
      "spot-info-title",
      "📍 近くのスポット"
    )
  );

  card.appendChild(
    createDiv(
      "spot-nearby-note",
      "終了済みを除き、直線距離が近い順に5件表示しています。"
    )
  );

  const list =
    document.createElement(
      "ul"
    );

  list.className =
    "spot-nearby-list";

  nearbySpots.forEach(
    ({ record, distance }) => {
      const item =
        document.createElement(
          "li"
        );

      const button =
        document.createElement(
          "button"
        );

      button.type =
        "button";
      button.className =
        "spot-nearby-button";
      button.dataset.spotId =
        record.spot.id;

      const name =
        createDiv(
          "spot-nearby-name",
          record.spot.name
        );

      const distanceText =
        distance < 1
          ? "同じ地点"
          : formatDistance(
              distance
            ) +
            "（直線距離）";

      const meta =
        createDiv(
          "spot-nearby-meta",
          distanceText +
          "・" +
          getCategoryLabel(
            record.spot.category
          )
        );

      button.appendChild(name);
      button.appendChild(meta);

      button.addEventListener(
        "click",
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
            record,
            {
              scrollOnMobile:
                true,
              returnFocusTo:
                button
            }
          );
        }
      );

      item.appendChild(button);
      list.appendChild(item);
    }
  );

  card.appendChild(list);

  return card;
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


  title.id =
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

  const visitedButton =
    document.createElement(
      "button"
    );

  visitedButton.type =
    "button";

  visitedButton.className =
    "spot-visited-button" +
    (
      isVisitedSpot(spot)
        ? " is-active"
        : ""
    );

  visitedButton.setAttribute(
    "aria-pressed",
    String(isVisitedSpot(spot))
  );

  visitedButton.textContent =
    isVisitedSpot(spot)
      ? "✓ 行った！登録済み"
      : "○ 行った！に登録";

  visitedButton.addEventListener(
    "click",
    () => {
      toggleVisitedSpot(spot);
    }
  );

  const shareButton =
    document.createElement(
      "button"
    );

  shareButton.type =
    "button";

  shareButton.className =
    "spot-share-button";

  shareButton.textContent =
    "🔗 このスポットを共有";

  shareButton.addEventListener(
    "click",
    () => {
      shareSpot(spot);
    }
  );

  const planButton =
    document.createElement(
      "button"
    );

  planButton.type =
    "button";

  planButton.className =
    "spot-plan-button" +
    (
      isPlanSpot(spot)
        ? " is-active"
        : ""
    );

  planButton.setAttribute(
    "aria-pressed",
    String(
      isPlanSpot(spot)
    )
  );

  planButton.textContent =
    isPlanSpot(spot)
      ? "👜 プランに追加済み"
      : "＋ 今日のプランに追加";

  planButton.addEventListener(
    "click",
    () => {
      togglePlanSpot(spot);
    }
  );

  const safeMapUrl =
    getSafeUrl(
      spot.mapUrl
    );

  const mapButton =
    safeMapUrl
      ? document.createElement(
          "a"
        )
      : null;

  if (
    mapButton
  ) {
    mapButton.className =
      "spot-map-button";

    mapButton.href =
      safeMapUrl;

    mapButton.target =
      "_blank";

    mapButton.rel =
      "noopener noreferrer";

    mapButton.textContent =
      "🗺 地図で開く";
  }

  const spotActions =
    createDiv(
      "spot-detail-actions"
    );

  spotActions.appendChild(
    favoriteButton
  );

  spotActions.appendChild(
    visitedButton
  );

  spotActions.appendChild(
    planButton
  );

  spotActions.appendChild(
    shareButton
  );

  if (
    mapButton
  ) {
    spotActions.appendChild(
      mapButton
    );
  }

  container.appendChild(
    spotActions
  );

  const visitDetailsCard =
    createVisitDetailsCard(spot);

  if (visitDetailsCard) {
    container.appendChild(
      visitDetailsCard
    );
  }


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


  const evidenceLevel =
    getEvidenceLevel(spot);

  if (evidenceLevel) {

    tags.appendChild(
      createDiv(
        "spot-tag tag-evidence-" +
        evidenceLevel,

        getEvidenceLevelIcon(
          evidenceLevel
        ) +
        " " +
        getEvidenceLevelLabel(
          evidenceLevel
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

  if (evidenceLevel) {

    const evidence =
      createDiv(
        "spot-info-card spot-evidence-card evidence-" +
        evidenceLevel
      );


    evidence.appendChild(
      createDiv(
        "spot-info-title",

        getEvidenceLevelIcon(
          evidenceLevel
        ) +
        " ナガセン関連：" +
        getEvidenceLevelLabel(
          evidenceLevel
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

  const displayPeriodStatus =
    isCancelledEvent(spot)
      ? "cancelled"
      : periodStatus;


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
        displayPeriodStatus
      );
  }


  const timingBadge =
    createSpotTimingBadge(spot);

  if (timingBadge) {
    container.appendChild(
      timingBadge
    );
  }

  if (
    isCancelledEvent(spot)
  ) {
    container.appendChild(
      createDiv(
        "spot-cancelled-notice",
        "⚠ このイベントは開催中止となり、実際には開催されませんでした。"
      )
    );
  }

  container.appendChild(
    createDiv(
      "spot-period period-" +
      displayPeriodStatus,

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

  const nearbySpotsCard =
    createNearbySpotsCard(spot);

  if (nearbySpotsCard) {
    container.appendChild(
      nearbySpotsCard
    );
  }


  appendLink(
    container,
    spot.sourceUrl,
    "情報元を見る ↗"
  );


  appendLink(
    container,
    getSpotReportUrl(spot),
    "掲載内容の修正・終了を報告する ↗",
    "spot-report-link"
  );


  return container;
}


// ============================================================
// 詳細表示
// ============================================================

function showSpotDetail(
  record,
  options = {}
) {

  const returnFocusCandidate =
    options.returnFocusTo ||
    document.activeElement;

  if (
    returnFocusCandidate instanceof
      HTMLElement &&
    returnFocusCandidate !==
      document.body
  ) {
    detailReturnFocusElement =
      returnFocusCandidate;
  }

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

      detailPanel.focus({
        preventScroll: true
      });

      map.invalidateSize({
        pan:
          false,

        animate:
          false
      });

    }
  );


  if (
    options.scrollOnMobile &&
    window.matchMedia(
      "(max-width: 899px)"
    ).matches
  ) {

    window.setTimeout(
      () => {

        const reduceMotion =
          window.matchMedia(
            "(prefers-reduced-motion: reduce)"
          ).matches;


        detailPanel.scrollIntoView({
          behavior:
            reduceMotion
              ? "auto"
              : "smooth",

          block:
            "start"
        });

      },
      120
    );
  }
}


// ============================================================
// 詳細閉じる
// ============================================================

function closeSpotDetail(
  options = {}
) {

  const returnFocusElement =
    detailReturnFocusElement;

  detailReturnFocusElement =
    null;

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

      if (
        options.restoreFocus !==
          false
      ) {
        const focusTarget =
          returnFocusElement?.isConnected &&
          returnFocusElement.getClientRects().length
            ? returnFocusElement
            : mapViewButton;

        focusTarget?.focus({
          preventScroll: true
        });
      }

    }
  );
}


// ============================================================
// マーカー生成
// ============================================================

function getSpotCoordinateKey(
  spot
) {
  return spot.lat.toFixed(6) +
    "," +
    spot.lng.toFixed(6);
}


function getDuplicateTooltipDirection(
  index,
  count
) {
  const directionPatterns = {
    2: [
      "left",
      "right"
    ],
    3: [
      "top",
      "bottom",
      "right"
    ],
    4: [
      "top",
      "left",
      "bottom",
      "right"
    ],
    5: [
      "top",
      "left",
      "left",
      "bottom",
      "right"
    ],
    6: [
      "top",
      "left",
      "left",
      "left",
      "bottom",
      "right"
    ]
  };

  const pattern =
    directionPatterns[count];

  if (
    pattern?.[index]
  ) {
    return pattern[index];
  }

  const markerAngle =
    -(
      index + 1
    ) *
    Math.PI * 2 /
    count;

  const horizontal =
    Math.cos(markerAngle);

  const vertical =
    Math.sin(markerAngle);

  if (
    Math.abs(horizontal) >=
    Math.abs(vertical)
  ) {
    return horizontal >= 0
      ? "right"
      : "left";
  }

  return vertical >= 0
    ? "bottom"
    : "top";
}


function createDuplicateTooltipLayoutMap(
  spots
) {

  const coordinateGroups =
    new Map();

  spots.forEach(
    spot => {
      if (
        typeof spot.lat !==
          "number" ||
        typeof spot.lng !==
          "number"
      ) {
        return;
      }

      const coordinateKey =
        getSpotCoordinateKey(spot);

      const group =
        coordinateGroups.get(
          coordinateKey
        ) || [];

      group.push(spot);

      coordinateGroups.set(
        coordinateKey,
        group
      );
    }
  );

  const layouts =
    new Map();

  coordinateGroups.forEach(
    group => {
      if (
        group.length < 2
      ) {
        return;
      }

      group.forEach(
        (spot, index) => {
          const direction =
            getDuplicateTooltipDirection(
              index,
              group.length
            );

          const offsets = {
            top: [0, -80],
            right: [40, 0],
            bottom: [0, 80],
            left: [-40, 0]
          };

          layouts.set(
            spot.id,
            {
              direction,
              offset:
                offsets[direction],
              groupSize:
                group.length,
              groupIndex:
                index
            }
          );
        }
      );
    }
  );

  return layouts;
}


function createSpotRecord(
  spot,
  tooltipLayout = null
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

  const markerLabel =
    isCancelledEvent(spot)
      ? "⚠ 開催中止｜" + spot.name
      : spot.name;


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

        spotName:
          spot.name,

        spotEvidenceStatus:
          spot.evidenceStatus || null,

        title:
          markerLabel,

        alt:
          markerLabel
      }
    );


  const record = {
    spot,
    marker,
    prefecture:
      getSpotPrefecture(spot),
    searchText:
      getSpotSearchText(spot)
  };


  marker.bindTooltip(
    markerLabel,
    {
      permanent:
        true,

      direction:
        tooltipLayout?.direction ||
        "top",

      offset:
        tooltipLayout?.offset ||
        [0, -15],

      opacity:
        1,

      className:
        "spot-name-label" +
        (
          tooltipLayout
            ? " spot-name-label-duplicate " +
              "spot-name-label-" +
              tooltipLayout.direction
            : ""
        ),

      interactive:
        false
    }
  );


  marker.on(
    "add",
    () => {
      marker.getElement()
        ?.setAttribute(
          "data-spot-id",
          spot.id
        );
    }
  );


  marker.on(
    "tooltipopen",
    () => {
      const tooltipElement =
        marker.getTooltip()
          ?.getElement();

      tooltipElement
        ?.setAttribute(
          "data-spot-id",
          spot.id
        );

      if (
        !tooltipLayout ||
        !tooltipElement ||
        tooltipElement.dataset
          .spotActionBound ===
          "true"
      ) {
        return;
      }

      tooltipElement.dataset
        .spotActionBound =
        "true";

      tooltipElement.setAttribute(
        "role",
        "button"
      );

      tooltipElement.setAttribute(
        "tabindex",
        "0"
      );

      tooltipElement.setAttribute(
        "aria-label",
        spot.name +
        "の詳細を開く"
      );

      const openFromTooltip =
        event => {
          event.preventDefault();
          event.stopPropagation();

          showSpotDetail(
            record,
            {
              scrollOnMobile:
                true,
              returnFocusTo:
                tooltipElement
            }
          );
        };

      tooltipElement.addEventListener(
        "click",
        openFromTooltip
      );

      tooltipElement.addEventListener(
        "keydown",
        event => {
          if (
            event.key ===
              "Enter" ||
            event.key ===
              " "
          ) {
            openFromTooltip(
              event
            );
          }
        }
      );
    }
  );


  marker.on(
    "click",
    () => {

      showSpotDetail(
        record,
        {
          scrollOnMobile:
            true,
          returnFocusTo:
            marker.getElement()
        }
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


  const existingInputs =
    Array.from(
      brandFilterList.querySelectorAll(
        'input[name="filter-brand"]'
      )
    );

  const existingSelections =
    new Set(
      existingInputs
        .filter(input => input.checked)
        .map(input => input.value)
    );

  const hasExistingFilters =
    existingInputs.length > 0;

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
        !hasExistingFilters ||
        existingSelections.has(
          brand
        );


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

function getCurrentFilterState() {

  const hasBrandFilters =
    document.querySelector(
      'input[name="filter-brand"]'
    ) !== null;

  return {
    categories:
      getSelectedValues(
        "filter-category"
      ),
    places:
      getSelectedValues(
        "filter-place"
      ),
    periods:
      getSelectedValues(
        "filter-period"
      ),
    reservations:
      getSelectedValues(
        "filter-reservation"
      ),
    evidenceLevels:
      getSelectedValues(
        "filter-nagano-evidence"
      ),
    officialRelations:
      getSelectedValues(
        "filter-official-relation"
      ),
    naganoRelations:
      getSelectedValues(
        "filter-nagano-relation"
      ),
    brands:
      hasBrandFilters
        ? getSelectedValues(
            "filter-brand"
          )
        : null,
    searchQuery:
      normalizeSearchText(
        spotSearch?.value ||
        ""
      ),
    selectedPrefecture:
      prefectureFilter?.value ||
      "",
    favoriteOnly,
    visitedOnly,
    dateQuickMode,
    soonEnding:
      Boolean(
        soonEndingFilter?.checked
      ),
    includeEnded:
      Boolean(
        endedFilter?.checked
      ),
    archiveYear:
      endedFilter?.checked
        ? archiveYearFilter?.value || ""
        : ""
  };
}


function recordMatchesFilters(
  record,
  state
) {

  const spot =
    record.spot;

  const periodStatus =
    getSpotPeriodStatus(spot);

  if (
    periodStatus === "ended" &&
    !state.includeEnded
  ) {
    return false;
  }

  if (
    state.archiveYear &&
    (
      periodStatus !== "ended" ||
      !spot.startDate?.startsWith(
        state.archiveYear + "-"
      )
    )
  ) {
    return false;
  }

  if (
    state.favoriteOnly &&
    !isFavoriteSpot(spot)
  ) {
    return false;
  }

  if (
    state.visitedOnly &&
    !isVisitedSpot(spot)
  ) {
    return false;
  }

  if (
    state.soonEnding &&
    !isSpotEndingSoon(spot)
  ) {
    return false;
  }

  if (
    state.dateQuickMode &&
    !spotMatchesDateQuickMode(
      spot,
      state.dateQuickMode
    )
  ) {
    return false;
  }

  if (
    state.searchQuery &&
    !record.searchText.includes(
      state.searchQuery
    )
  ) {
    return false;
  }

  if (
    state.selectedPrefecture &&
    record.prefecture !==
      state.selectedPrefecture
  ) {
    return false;
  }

  if (
    !state.categories.has(
      spot.category
    ) ||
    !state.places.has(
      spot.placeType
    ) ||
    !state.periods.has(
      spot.periodType
    ) ||
    !state.reservations.has(
      spot.reservationType ||
      "unknown"
    )
  ) {
    return false;
  }

  if (
    state.brands &&
    !state.brands.has(
      spot.brand ||
      "other"
    )
  ) {
    return false;
  }

  if (
    spot.category ===
      "official" &&
    !state.officialRelations.has(
      spot.relationType
    )
  ) {
    return false;
  }

  if (
    spot.category ===
    "nagano"
  ) {
    if (
      !state.naganoRelations.has(
        spot.relationType
      ) ||
      !state.evidenceLevels.has(
        getEvidenceLevel(spot)
      )
    ) {
      return false;
    }
  }

  return true;
}


function getFilterOptionLabel(
  input
) {

  return (
    input
      .closest("label")
      ?.querySelector("span")
      ?.textContent
      ?.replace(/\s+/g, " ")
      .trim() ||
    input.value
  );
}


function describeCheckedFilterGroup(
  name,
  groupLabel
) {

  const inputs =
    Array.from(
      document.querySelectorAll(
        `input[name="${name}"]`
      )
    );

  if (
    inputs.length === 0 ||
    inputs.every(
      input => input.checked
    )
  ) {
    return null;
  }

  const selectedLabels =
    inputs
      .filter(
        input => input.checked
      )
      .map(
        getFilterOptionLabel
      );

  return (
    groupLabel +
    ": " +
    (
      selectedLabels.length > 0
        ? selectedLabels.join("・")
        : "選択なし"
    )
  );
}


function getActiveFilterDescriptions() {

  const descriptions = [];

  const rawSearchQuery =
    spotSearch?.value.trim() ||
    "";

  if (rawSearchQuery) {
    descriptions.push(
      `検索「${rawSearchQuery}」`
    );
  }

  if (prefectureFilter?.value) {
    descriptions.push(
      "都道府県: " +
      prefectureFilter.value
    );
  }

  if (favoriteOnly) {
    descriptions.push(
      "行きたいのみ"
    );
  }

  if (visitedOnly) {
    descriptions.push(
      "行った！のみ"
    );
  }

  if (dateQuickMode) {
    descriptions.push(
      "日付: " +
      getDateQuickLabel(
        dateQuickMode
      )
    );
  } else if (
    soonEndingFilter?.checked
  ) {
    descriptions.push(
      "まもなく終了"
    );
  }

  if (endedFilter?.checked) {
    descriptions.push(
      "過去イベント（終了・中止）を含む"
    );
  }

  if (archiveYearFilter?.value) {
    descriptions.push(
      "開催年: " +
      archiveYearFilter.value +
      "年"
    );
  }

  const filterGroups = [
    ["filter-category", "カテゴリ"],
    ["filter-place", "目的"],
    ["filter-brand", "シリーズ・施設"],
    ["filter-official-relation", "公式関係"],
    ["filter-nagano-relation", "ナガセン関係"],
    ["filter-nagano-evidence", "確度"],
    ["filter-period", "期間"],
    ["filter-reservation", "入店"]
  ];

  filterGroups.forEach(
    ([name, label]) => {

      const description =
        describeCheckedFilterGroup(
          name,
          label
        );

      if (description) {
        descriptions.push(
          description
        );
      }
    }
  );

  return descriptions;
}


function renderFilterFeedback(
  visibleCount
) {

  const descriptions =
    getActiveFilterDescriptions();

  if (
    activeFilterSummary &&
    activeFilterList
  ) {
    activeFilterList.replaceChildren(
      ...descriptions.map(
        description => {

          const item =
            document.createElement(
              "li"
            );

          item.textContent =
            description;

          return item;
        }
      )
    );

    activeFilterSummary.hidden =
      descriptions.length === 0;
  }

  if (noResults) {
    noResults.hidden =
      visibleCount !== 0 ||
      spotRecords.length === 0;
  }
}


// ============================================================
// フィルター反映
// ============================================================

function updateSpotFilters() {

  updateSearchClearButton();

  const filterState =
    getCurrentFilterState();


  if (
    selectedRecord &&
    !recordMatchesFilters(
      selectedRecord,
      filterState
    )
  ) {

    closeSpotDetail({
      restoreFocus: false
    });
  }


  spotLayer.clearLayers();


  let visibleCount =
    0;


  const visibleRecords =
    [];


  spotRecords.forEach(
    record => {

      if (
        recordMatchesFilters(
          record,
          filterState
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


  renderFilterFeedback(
    visibleCount
  );


  lastFilteredRecords =
    visibleRecords;

  if (
    currentViewMode ===
    "list"
  ) {
    renderSpotList(
      getListRecords(
        visibleRecords
      ),
      visibleRecords.length
    );
  } else {
    spotList?.replaceChildren();
  }

  syncListControlButtons();
  updateFavoriteCount();
  updateVisitedCount();
  updatePlanCount();
}



// ============================================================
// パネル開閉
// ============================================================

const PANEL_FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), ' +
  'select:not([disabled]), textarea:not([disabled]), ' +
  '[tabindex]:not([tabindex="-1"])';


function getOpenDialogPanel() {

  return [
    filterPanel,
    savedDataPanel,
    officialHelpPanel,
    naganoHelpPanel
  ].find(
    panel =>
      panel &&
      !panel.hidden
  ) || null;
}


function trapFocusInPanel(
  event,
  panel
) {

  const focusableElements =
    Array.from(
      panel.querySelectorAll(
        PANEL_FOCUSABLE_SELECTOR
      )
    ).filter(
      element =>
        element.getClientRects().length >
        0
    );

  if (
    focusableElements.length ===
    0
  ) {
    return;
  }

  const firstElement =
    focusableElements[0];

  const lastElement =
    focusableElements[
      focusableElements.length - 1
    ];

  if (
    !panel.contains(
      document.activeElement
    )
  ) {
    event.preventDefault();
    firstElement.focus();
    return;
  }

  if (
    event.shiftKey &&
    document.activeElement ===
      firstElement
  ) {
    event.preventDefault();
    lastElement.focus();
  } else if (
    !event.shiftKey &&
    document.activeElement ===
      lastElement
  ) {
    event.preventDefault();
    firstElement.focus();
  }
}

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

    setSavedDataPanelOpen(
      false
    );

    setOfficialHelpPanelOpen(
      false
    );

    setNaganoHelpPanelOpen(
      false
    );
  }


  const restoreFocus =
    !open &&
    filterPanel.contains(
      document.activeElement
    );


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


  if (open) {
    filterClose?.focus();
  } else if (restoreFocus) {
    filterToggle.focus();
  }
}


function setSavedDataPanelOpen(
  open
) {

  if (
    !savedDataPanel ||
    !savedDataToggle
  ) {
    return;
  }

  if (
    open
  ) {
    setFilterPanelOpen(false);
    setOfficialHelpPanelOpen(false);
    setNaganoHelpPanelOpen(false);
    updateFavoriteCount();
    updateVisitedCount();
    updatePlanCount();
  }

  const restoreFocus =
    !open &&
    savedDataPanel.contains(
      document.activeElement
    );

  if (!open) {
    clearSavedDataImportPreview();
  }

  savedDataPanel.hidden =
    !open;

  savedDataToggle.setAttribute(
    "aria-expanded",
    String(open)
  );

  savedDataToggle.classList.toggle(
    "is-active",
    open
  );

  if (
    open
  ) {
    savedDataClose?.focus();
  } else if (
    restoreFocus
  ) {
    savedDataToggle.focus();
  }
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
    setSavedDataPanelOpen(false);
    setNaganoHelpPanelOpen(false);
  }

  const restoreFocus =
    !open &&
    officialHelpPanel.contains(
      document.activeElement
    );

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

  if (open) {
    officialHelpClose?.focus();
  } else if (restoreFocus) {
    officialHelpToggle.focus();
  }
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
    setSavedDataPanelOpen(false);
    setOfficialHelpPanelOpen(false);
  }

  const restoreFocus =
    !open &&
    naganoHelpPanel.contains(
      document.activeElement
    );

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

  if (open) {
    naganoHelpClose?.focus();
  } else if (restoreFocus) {
    naganoHelpToggle.focus();
  }
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

  visitedOnly =
    false;

  dateQuickMode =
    "";

  if (soonEndingFilter) {
    soonEndingFilter.checked = false;
  }

  if (endedFilter) {
    endedFilter.checked = false;
  }

  if (archiveYearFilter) {
    archiveYearFilter.value = "";
  }

  syncArchiveYearFilter();

  listSortMode =
    "default";

  syncFavoriteFilterButton();
  syncVisitedFilterButton();
  syncListControlButtons();
  syncDateQuickButtons();

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
// 現在の公式関連・ナガノ先生関連と過去イベントを別JSONから読み込む
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


const ARCHIVE_DATA_SOURCE = {
  label: "過去イベント",
  url:
    "./data/official-events-archive.json"
};


let archiveDataLoaded =
  false;


let archiveLoadPromise =
  null;


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


function appendSpotRecords(
  spots
) {

  const duplicateTooltipLayouts =
    createDuplicateTooltipLayoutMap(
      spots
    );

  let addedCount = 0;
  let skippedCount = 0;

  spots.forEach(
    spot => {
      if (
        spotRecords.some(
          record =>
            record.spot.id ===
            spot.id
        )
      ) {
        console.warn(
          "重複IDのスポットをスキップ:",
          spot.id
        );
        skippedCount++;
        return;
      }

      const record =
        createSpotRecord(
          spot,
          duplicateTooltipLayouts.get(
            spot.id
          ) || null
        );

      if (record) {
        spotRecords.push(record);
        addedCount++;
      } else {
        skippedCount++;
      }
    }
  );

  return {
    addedCount,
    skippedCount
  };
}


async function ensureArchiveDataLoaded() {

  if (archiveDataLoaded) {
    return true;
  }

  if (archiveLoadPromise) {
    return archiveLoadPromise;
  }

  if (endedFilter) {
    endedFilter.disabled = true;
    endedFilter.setAttribute(
      "aria-busy",
      "true"
    );
  }

  archiveLoadPromise =
    (async () => {
      try {
        const spots =
          await fetchSpotSource(
            ARCHIVE_DATA_SOURCE
          );

        const archiveSpots =
          spots.filter(
            spot => {
              const ended =
                getSpotPeriodStatus(
                  spot
                ) === "ended";

              if (!ended) {
                console.warn(
                  "終了前のため過去イベントからスキップ:",
                  spot?.name || spot?.id
                );
              }

              return ended;
            }
          );

        const result =
          appendSpotRecords(
            archiveSpots
          );

        archiveDataLoaded = true;

        renderBrandFilters();
        renderPrefectureOptions();
        renderArchiveYearOptions();
        updateFavoriteCount();
        updateVisitedCount();
        updatePlanCount();
        syncArchiveYearFilter();

        console.log(
          "過去イベント: " +
          result.addedCount +
          "件を読み込みました。"
        );

        if (result.skippedCount > 0) {
          console.warn(
            result.skippedCount +
            "件の過去イベントをデータ不備または重複によりスキップしました。"
          );
        }

        return true;

      } catch (error) {
        console.error(
          "過去イベントデータの読み込みに失敗しました。",
          error
        );

        showAppStatus(
          "過去イベントを読み込めませんでした。通信状況をご確認のうえ、もう一度お試しください。",
          {
            type: "warning",
            persistent: true
          }
        );

        return false;

      } finally {
        if (endedFilter) {
          endedFilter.disabled = false;
          endedFilter.removeAttribute(
            "aria-busy"
          );
        }

        archiveLoadPromise = null;
      }
    })();

  return archiveLoadPromise;
}


async function loadSpots() {

  try {

    const shouldLoadArchiveInitially =
      params.get("past") === "1";

    const initialSources =
      shouldLoadArchiveInitially
        ? [
            ...SPOT_DATA_SOURCES,
            ARCHIVE_DATA_SOURCE
          ]
        : SPOT_DATA_SOURCES;

    const results =
      await Promise.allSettled(
        initialSources.map(
          fetchSpotSource
        )
      );

    const spots = [];
    let sourceErrorCount = 0;
    let attemptedSourceCount =
      initialSources.length;
    const failedSourceLabels = [];

    results.forEach(
      (result, index) => {

        const source =
          initialSources[index];

        if (
          result.status ===
          "fulfilled"
        ) {

          spots.push(
            ...result.value
          );

          if (
            source ===
            ARCHIVE_DATA_SOURCE
          ) {
            archiveDataLoaded = true;
          }

          console.log(
            source.label +
            ": " +
            result.value.length +
            "件を読み込みました。"
          );

        } else {

          sourceErrorCount++;

          failedSourceLabels.push(
            source.label
          );

          console.error(
            source.label +
            "データの読み込みに失敗しました。",
            result.reason
          );
        }
      }
    );

    const sharedSpotIsInCurrentData =
      Boolean(
        SHARED_SPOT_ID &&
        spots.some(
          spot =>
            spot.id ===
            SHARED_SPOT_ID
        )
      );

    if (
      SHARED_SPOT_ID &&
      !sharedSpotIsInCurrentData &&
      !archiveDataLoaded
    ) {
      attemptedSourceCount++;

      try {
        const archiveSpots =
          await fetchSpotSource(
            ARCHIVE_DATA_SOURCE
          );

        spots.push(
          ...archiveSpots
        );
        archiveDataLoaded = true;

        console.log(
          ARCHIVE_DATA_SOURCE.label +
          ": " +
          archiveSpots.length +
          "件を読み込みました。"
        );
      } catch (error) {
        sourceErrorCount++;
        failedSourceLabels.push(
          ARCHIVE_DATA_SOURCE.label
        );
        console.error(
          "共有スポット確認用の過去イベントデータを読み込めませんでした。",
          error
        );
      }
    }

    if (
      sourceErrorCount ===
      attemptedSourceCount
    ) {
      throw new Error(
        "すべてのスポットデータの読み込みに失敗しました。"
      );
    }

    let endedCount = 0;
    let skippedCount = 0;

    endedCount =
      spots.filter(
        spot =>
          getSpotPeriodStatus(spot) ===
          "ended"
      ).length;

    const appendResult =
      appendSpotRecords(spots);

    skippedCount =
      appendResult.skippedCount;

    // データに合わせてブランド / 都道府県フィルターを生成
    renderBrandFilters();
    renderPrefectureOptions();
    renderArchiveYearOptions();

    // URLで共有された検索・絞り込み条件を、動的フィルター生成後に適用
    if (!SHARED_SPOT_ID) {
      applySharedFilterState();
    }

    const sharedRecord =
      SHARED_SPOT_ID
        ? spotRecords.find(
            record =>
              record.spot.id ===
              SHARED_SPOT_ID
          )
        : null;

    if (
      sharedRecord &&
      getSpotPeriodStatus(
        sharedRecord.spot
      ) === "ended" &&
      endedFilter
    ) {
      endedFilter.checked = true;
    }

    syncArchiveYearFilter();

    updateFavoriteCount();
    updateVisitedCount();
    updatePlanCount();
    syncFavoriteFilterButton();
    syncVisitedFilterButton();
    setViewMode(
      currentViewMode
    );

    // 初期表示（共有条件があればその状態を反映）
    updateSpotFilters();

    // 共有URLでスポット指定がある場合は、そのスポットを優先表示
    if (
      SHARED_SPOT_ID
    ) {

      if (
        sharedRecord
      ) {
        setViewMode(
          "map"
        );

        requestAnimationFrame(
          () => {
            requestAnimationFrame(
              () => {
                focusSpotRecord(
                  sharedRecord
                );
              }
            );
          }
        );
      } else {
        fitMapToAllSpots();
        showTransientMapStatus(
          "共有されたスポットは現在表示対象外、または見つかりませんでした。"
        );
      }

    } else {
      // 条件共有URLでは、共有された条件に一致するスポットへ初期表示を合わせる
      if (
        HAS_SHARED_FILTERS &&
        lastFilteredRecords.length
      ) {
        if (prefectureFilter?.value) {
          focusMapOnPrefecture(
            prefectureFilter.value
          );
        } else {
          fitMapToRecords(
            lastFilteredRecords
          );
        }
      } else {
        // 通常アクセスでは全国の表示対象スポットを収める
        fitMapToAllSpots();
      }
    }

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
      "件の終了済みスポットを読み込みました（初期状態では非表示）。"
    );

    if (
      sourceErrorCount > 0
    ) {
      console.warn(
        sourceErrorCount +
        "個のデータファイルを読み込めませんでしたが、" +
        "読み込めたデータで表示を継続します。"
      );

      showAppStatus(
        failedSourceLabels.join("・") +
        "のデータを読み込めませんでした。読み込めたスポットだけで表示しています。",
        {
          type: "warning",
          persistent: true,
          retry: true
        }
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

    showAppStatus(
      "スポットデータを読み込めませんでした。通信状況をご確認のうえ、再読み込みしてください。",
      {
        type: "error",
        persistent: true,
        retry: true
      }
    );
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
        event.key === "ArrowDown" ||
        event.key === "ArrowUp"
      ) {
        const buttons =
          getSearchSuggestionButtons();

        if (
          spotSearchSuggestions?.hidden ||
          buttons.length === 0
        ) {
          return;
        }

        event.preventDefault();

        const direction =
          event.key === "ArrowDown"
            ? 1
            : -1;

        const nextIndex =
          activeSearchSuggestionIndex === -1
            ? (
                direction === 1
                  ? 0
                  : buttons.length - 1
              )
            : activeSearchSuggestionIndex + direction;

        setActiveSearchSuggestion(
          nextIndex
        );

        return;
      }

      if (
        event.key ===
        "Enter"
      ) {

        const suggestions =
          getSearchSuggestionButtons();

        const selectedSuggestion =
          suggestions[
            activeSearchSuggestionIndex
          ] ||
          suggestions[0];

        if (
          selectedSuggestion
        ) {
          event.preventDefault();
          selectedSuggestion.click();
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
      const prefecture =
        prefectureFilter.value;

      updateSpotFilters();
      renderSearchSuggestions();
      focusMapOnPrefecture(
        prefecture
      );
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
      closeSpotDetail({
        restoreFocus: false
      });
      setViewMode(
        "list"
      );
      updateSpotFilters();
    }
  );


listNearbySortButton
  ?.addEventListener(
    "click",
    () => {

      if (
        listSortMode ===
          "distance"
      ) {
        listSortMode =
          "default";
        syncListControlButtons();
        updateSpotFilters();
        return;
      }

      if (
        lastUserLocation
      ) {
        listSortMode =
          "distance";
        syncListControlButtons();
        updateSpotFilters();
        return;
      }

      requestUserLocation({
        focusMap: false,
        successMessage:
          "現在地を使って近い順に並べ替えました。位置情報は保存・送信しません。",
        onSuccess: () => {
          listSortMode =
            "distance";
          syncListControlButtons();
          updateSpotFilters();
        }
      });
    }
  );


listBoundsFilterButton
  ?.addEventListener(
    "click",
    () => {
      listWithinMapBounds =
        !listWithinMapBounds;
      syncListControlButtons();
      updateSpotFilters();
    }
  );


listEndingSortButton
  ?.addEventListener(
    "click",
    () => {
      listSortMode =
        listSortMode === "ending"
          ? "default"
          : "ending";
      syncListControlButtons();
      updateSpotFilters();
    }
  );


listNameSortButton
  ?.addEventListener(
    "click",
    () => {
      listSortMode =
        listSortMode === "name"
          ? "default"
          : "name";
      syncListControlButtons();
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


visitedFilterButton
  ?.addEventListener(
    "click",
    () => {
      visitedOnly =
        !visitedOnly;
      syncVisitedFilterButton();
      updateSpotFilters();
    }
  );


shareFiltersButton
  ?.addEventListener(
    "click",
    shareCurrentFilters
  );


dateQuickButtons.forEach(
  button => {
    button.addEventListener(
      "click",
      () => {
        const mode =
          button.dataset.dateQuick ||
          "";

        setDateQuickMode(
          dateQuickMode === mode
            ? ""
            : mode
        );
      }
    );
  }
);


soonEndingFilter
  ?.addEventListener(
    "change",
    () => {
      setDateQuickMode(
        soonEndingFilter.checked
          ? "ending"
          : ""
      );
    }
  );


endedFilter
  ?.addEventListener(
    "change",
    async () => {
      if (
        endedFilter.checked
      ) {
        const loaded =
          await ensureArchiveDataLoaded();

        if (!loaded) {
          endedFilter.checked = false;
        }
      } else if (archiveYearFilter) {
        archiveYearFilter.value = "";
      }

      syncArchiveYearFilter();
      updateSpotFilters();
      renderSearchSuggestions();
    }
  );


archiveYearFilter
  ?.addEventListener(
    "change",
    () => {
      updateSpotFilters();
      renderSearchSuggestions();
    }
  );


map.on(
  "moveend",
  () => {
    if (
      currentViewMode ===
        "list" &&
      listWithinMapBounds &&
      lastFilteredRecords.length
    ) {
      renderSpotList(
        getListRecords(
          lastFilteredRecords
        ),
        lastFilteredRecords.length
      );
    }
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


activeFilterReset
  ?.addEventListener(
    "click",
    resetFilters
  );


noResultsReset
  ?.addEventListener(
    "click",
    () => {
      resetFilters();
      spotSearch?.focus();
    }
  );


savedDataToggle
  ?.addEventListener(
    "click",
    () => {
      setSavedDataPanelOpen(
        savedDataPanel.hidden
      );
    }
  );


savedDataClose
  ?.addEventListener(
    "click",
    () => {
      setSavedDataPanelOpen(
        false
      );
    }
  );


savedDataExport
  ?.addEventListener(
    "click",
    exportSavedSpotData
  );


savedDataImport
  ?.addEventListener(
    "click",
    () => {
      savedDataFile?.click();
    }
  );


savedDataFile
  ?.addEventListener(
    "change",
    () => {
      prepareSavedSpotDataImport(
        savedDataFile.files?.[0]
      );
    }
  );


savedDataImportConfirm
  ?.addEventListener(
    "click",
    applySavedSpotDataImport
  );


savedDataImportCancel
  ?.addEventListener(
    "click",
    () => {
      clearSavedDataImportPreview({
        focusImport: true
      });
    }
  );


dataRetryButton
  ?.addEventListener(
    "click",
    () => {
      window.location.reload();
    }
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
    () => {
      closeSpotDetail();
    }
  );


// ESC
document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Tab"
    ) {
      const openPanel =
        getOpenDialogPanel();

      if (
        openPanel
      ) {
        trapFocusInPanel(
          event,
          openPanel
        );
      }

      return;
    }

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
      savedDataPanel &&
      !savedDataPanel.hidden
    ) {

      setSavedDataPanelOpen(
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

const appScriptUrl =
  Array.from(document.scripts)
    .find(
      script =>
        /\/app\.js(?:\?|$)/.test(
          script.src
        )
    )?.src;

if (appScriptUrl) {
  import(
    new URL(
      "./cloud-sync-loader.js",
      appScriptUrl
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
