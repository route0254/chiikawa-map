import assert from "node:assert/strict";
import test from "node:test";
import locationUtils from "../../location-utils.js";


const {
  formatDistance,
  getDistanceMeters,
  getGeolocationErrorMessage,
  hasCoordinates
} = locationUtils;


test(
  "2地点間の直線距離を計算して表示する",
  () => {
    const osaka = {
      lat: 34.705,
      lng: 135.498
    };
    const takao = {
      lat: 35.625,
      lng: 139.243
    };
    const distance =
      getDistanceMeters(
        osaka,
        takao
      );

    assert.ok(
      distance > 300000 &&
      distance < 400000
    );
    assert.equal(
      getDistanceMeters(
        osaka,
        osaka
      ),
      0
    );
    assert.equal(
      formatDistance(850),
      "850m"
    );
    assert.equal(
      formatDistance(1250),
      "1.3km"
    );
  }
);


test(
  "不正な座標を距離計算に使わない",
  () => {
    assert.equal(
      hasCoordinates({
        lat: 91,
        lng: 135
      }),
      false
    );
    assert.equal(
      getDistanceMeters(
        { lat: 34, lng: 135 },
        { lat: null, lng: 139 }
      ),
      Infinity
    );
    assert.equal(
      formatDistance(Infinity),
      "--"
    );
  }
);


test(
  "位置情報を取得できない理由を表示する",
  () => {
    assert.match(
      getGeolocationErrorMessage({
        code: 1
      }),
      /許可されませんでした/
    );
    assert.match(
      getGeolocationErrorMessage({
        code: 3
      }),
      /時間がかかっています/
    );
  }
);
