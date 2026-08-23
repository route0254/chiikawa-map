// ========================================
// ちいかわ推し活MAP
// 地図 + タイルフォールバック + スポット表示
// ========================================


// ----------------------------------------
// 初期表示
// ----------------------------------------

const INITIAL_POSITION = [35.681236, 139.767125];
const INITIAL_ZOOM = 11;


// ----------------------------------------
// タイルプロバイダー設定
// ----------------------------------------

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


// ----------------------------------------
// 障害試験用
// ----------------------------------------

const params =
  new URLSearchParams(window.location.search);

const TILE_TEST_MODE =
  params.get("tileTest");


// ----------------------------------------
// 地図作成
// ----------------------------------------

const map =
  L.map("map").setView(
    INITIAL_POSITION,
    INITIAL_ZOOM
  );


// ----------------------------------------
// タイル状態管理
// ----------------------------------------

let currentProviderIndex = 0;
let currentTileLayer = null;

let tileErrorTimes = [];

let switchingProvider = false;
let allProvidersFailed = false;

const TILE_ERROR_THRESHOLD = 3;
const TILE_ERROR_WINDOW = 5000;


// ----------------------------------------
// 状態表示
// ----------------------------------------

const mapStatus =
  document.getElementById("map-status");


function showMapStatus(message) {

  mapStatus.textContent = message;
  mapStatus.hidden = false;

}


function hideMapStatus() {

  mapStatus.hidden = true;

}


// ----------------------------------------
// テスト用タイルURL
// ----------------------------------------

function getTileUrl(providerIndex) {

  if (TILE_TEST_MODE === "all-fail") {

    return "https://invalid.example.com/{z}/{x}/{y}.png";

  }


  if (
    TILE_TEST_MODE === "osm-fail" &&
    providerIndex === 0
  ) {

    return "https://invalid.example.com/{z}/{x}/{y}.png";

  }


  return TILE_PROVIDERS[providerIndex].url;

}


// ----------------------------------------
// タイルプロバイダー読込
// ----------------------------------------

function loadTileProvider(providerIndex) {

  const provider =
    TILE_PROVIDERS[providerIndex];


  if (currentTileLayer) {

    currentTileLayer.off();

    map.removeLayer(currentTileLayer);

  }


  currentProviderIndex = providerIndex;

  tileErrorTimes = [];

  switchingProvider = false;


  const tileUrl =
    getTileUrl(providerIndex);


  currentTileLayer =
    L.tileLayer(
      tileUrl,
      provider.options
    );


  currentTileLayer.once(
    "tileload",

    function () {

      if (currentProviderIndex === 0) {

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


// ----------------------------------------
// タイルエラー
// ----------------------------------------

function handleTileError() {

  if (
    switchingProvider ||
    allProvidersFailed
  ) {

    return;

  }


  const now = Date.now();


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


// ----------------------------------------
// 次の地図へ切替
// ----------------------------------------

function switchToNextProvider() {

  switchingProvider = true;


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


  allProvidersFailed = true;


  console.error(
    "すべての地図サービスの読み込みに失敗しました。"
  );


  showMapStatus(
    "現在、背景地図を読み込めません。" +
    "スポット情報は引き続き利用できます。"
  );

}


// ========================================
// スポット表示
// ========================================


// ----------------------------------------
// カテゴリ別レイヤー
// ----------------------------------------

const spotLayers = {

  official:
    L.layerGroup().addTo(map),

  nagano:
    L.layerGroup().addTo(map)

};


// ----------------------------------------
// マーカーアイコン作成
// ----------------------------------------

function createSpotIcon(category) {

  let label = "?";
  let className = "";


  if (category === "official") {

    label = "公";
    className =
      "spot-pin-official";

  }


  if (category === "nagano") {

    label = "ナ";
    className =
      "spot-pin-nagano";

  }


  return L.divIcon({

    className: "spot-marker",

    html:
      '<div class="spot-pin ' +
      className +
      '">' +
      label +
      "</div>",

    iconSize: [34, 34],

    iconAnchor: [17, 17],

    popupAnchor: [0, -18]

  });

}


// ----------------------------------------
// カテゴリ名
// ----------------------------------------

function getCategoryLabel(category) {

  if (category === "official") {

    return "ちいかわ公式関連";

  }


  if (category === "nagano") {

    return "ナガノ先生関連";

  }


  return "その他";

}


// ----------------------------------------
// URL安全確認
// ----------------------------------------

function getSafeUrl(url) {

  if (!url) {

    return null;

  }


  try {

    const parsed =
      new URL(url);


    if (
      parsed.protocol === "https:" ||
      parsed.protocol === "http:"
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


// ----------------------------------------
// ポップアップ生成
// ----------------------------------------

function createSpotPopup(spot) {

  const container =
    document.createElement("div");

  container.className =
    "spot-popup";


  const title =
    document.createElement("div");

  title.className =
    "spot-popup-title";

  title.textContent =
    spot.name;


  const category =
    document.createElement("div");

  category.className =
    "spot-popup-category";

  category.textContent =
    getCategoryLabel(
      spot.category
    );


  const address =
    document.createElement("div");

  address.className =
    "spot-popup-address";

  address.textContent =
    spot.address || "";


  const description =
    document.createElement("div");

  description.className =
    "spot-popup-description";

  description.textContent =
    spot.description || "";


  container.appendChild(title);
  container.appendChild(category);


  if (spot.address) {

    container.appendChild(address);

  }


  if (spot.description) {

    container.appendChild(description);

  }


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
      document.createElement("div");

    links.className =
      "spot-popup-links";


    if (sourceUrl) {

      const sourceLink =
        document.createElement("a");

      sourceLink.href =
        sourceUrl;

      sourceLink.target =
        "_blank";

      sourceLink.rel =
        "noopener noreferrer";

      sourceLink.textContent =
        "紹介元を見る";

      links.appendChild(
        sourceLink
      );

    }


    if (mapUrl) {

      const mapLink =
        document.createElement("a");

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


// ----------------------------------------
// スポット1件を地図へ追加
// ----------------------------------------

function addSpotMarker(spot) {

  if (
    typeof spot.lat !== "number" ||
    typeof spot.lng !== "number"
  ) {

    console.warn(
      "緯度経度が不正なためスキップ:",
      spot
    );

    return;

  }


  const layer =
    spotLayers[
      spot.category
    ];


  if (!layer) {

    console.warn(
      "未対応カテゴリのためスキップ:",
      spot.category
    );

    return;

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
    createSpotPopup(spot)
  );


  marker.addTo(layer);

}


// ----------------------------------------
// JSON読込
// ----------------------------------------

async function loadSpots() {

  try {

    const response =
      await fetch(
        "./data/spots.json"
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
      !Array.isArray(spots)
    ) {

      throw new Error(
        "spots.json が配列ではありません。"
      );

    }


    spots.forEach(
      addSpotMarker
    );


    console.log(
      spots.length +
      "件のスポットを読み込みました。"
    );


  } catch (error) {

    console.error(
      "スポットデータの読み込みに失敗しました。",
      error
    );

  }

}


// ========================================
// 起動
// ========================================

loadTileProvider(0);

loadSpots();
