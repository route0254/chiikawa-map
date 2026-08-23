// ==============================
// ちいかわ推し活MAP
// 地図初期設定
// ==============================

// 初期表示位置：東京
const INITIAL_POSITION = [35.681236, 139.767125];

// 初期ズーム
const INITIAL_ZOOM = 11;

// OpenStreetMap タイル設定
const TILE_URL =
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

// Leaflet地図を作成
const map = L.map("map").setView(
  INITIAL_POSITION,
  INITIAL_ZOOM
);

// OpenStreetMapを背景地図として追加
L.tileLayer(TILE_URL, {
  maxZoom: 19,

  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">' +
    "OpenStreetMap contributors</a>"
}).addTo(map);
