// ========================================
// ちいかわ推し活MAP
// 地図初期設定 + タイルフォールバック
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
//
// 通常アクセス
// ?tileTest=osm-fail
// ?tileTest=all-fail
// ----------------------------------------

const params = new URLSearchParams(window.location.search);
const TILE_TEST_MODE = params.get("tileTest");


// ----------------------------------------
// 地図作成
// ----------------------------------------

const map = L.map("map").setView(
  INITIAL_POSITION,
  INITIAL_ZOOM
);


// ----------------------------------------
// 状態管理
// ----------------------------------------

let currentProviderIndex = 0;
let currentTileLayer = null;

let tileErrorTimes = [];

let switchingProvider = false;
let allProvidersFailed = false;


// 5秒以内に3枚以上失敗したら
// プロバイダー障害とみなす

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
// テスト用URL生成
// ----------------------------------------

function getTileUrl(providerIndex) {

  // 全プロバイダー障害試験

  if (TILE_TEST_MODE === "all-fail") {

    return "https://invalid.example.com/{z}/{x}/{y}.png";

  }


  // OSMだけ障害試験

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


  // 古いタイルレイヤー削除

  if (currentTileLayer) {

    currentTileLayer.off();

    map.removeLayer(currentTileLayer);

  }


  currentProviderIndex = providerIndex;

  tileErrorTimes = [];

  switchingProvider = false;


  const tileUrl =
    getTileUrl(providerIndex);


  currentTileLayer = L.tileLayer(
    tileUrl,
    provider.options
  );


  // 最初のタイル読込成功

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


  // タイルエラー監視

  currentTileLayer.on(
    "tileerror",
    handleTileError
  );


  currentTileLayer.addTo(map);

}


// ----------------------------------------
// タイルエラー処理
// ----------------------------------------

function handleTileError() {

  if (
    switchingProvider ||
    allProvidersFailed
  ) {

    return;

  }


  const now = Date.now();


  // 直近5秒間のエラーだけ残す

  tileErrorTimes =
    tileErrorTimes.filter(
      time =>
        now - time <
        TILE_ERROR_WINDOW
    );


  tileErrorTimes.push(now);


  // 少数のエラーなら様子を見る

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


  // バックアップあり

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


  // 全プロバイダー障害

  allProvidersFailed = true;


  console.error(
    "すべての地図サービスの読み込みに失敗しました。"
  );


  showMapStatus(
    "現在、背景地図を読み込めません。" +
    "スポット情報は引き続き利用できます。"
  );

}


// ----------------------------------------
// 初期読込
// ----------------------------------------

loadTileProvider(0);
