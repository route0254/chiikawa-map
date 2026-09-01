(function attachLocationUtils(globalScope) {
  "use strict";

  function hasCoordinates(point) {
    return (
      Number.isFinite(point?.lat) &&
      Number.isFinite(point?.lng) &&
      point.lat >= -90 &&
      point.lat <= 90 &&
      point.lng >= -180 &&
      point.lng <= 180
    );
  }

  function getDistanceMeters(
    first,
    second
  ) {
    if (
      !hasCoordinates(first) ||
      !hasCoordinates(second)
    ) {
      return Infinity;
    }

    const toRadians =
      value =>
        value * Math.PI / 180;
    const latitudeDelta =
      toRadians(
        second.lat - first.lat
      );
    const longitudeDelta =
      toRadians(
        second.lng - first.lng
      );
    const value =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(toRadians(first.lat)) *
      Math.cos(toRadians(second.lat)) *
      Math.sin(longitudeDelta / 2) ** 2;
    const clamped = Math.min(
      1,
      Math.max(0, value)
    );

    return 6371000 * 2 *
      Math.atan2(
        Math.sqrt(clamped),
        Math.sqrt(1 - clamped)
      );
  }

  function formatDistance(meters) {
    if (
      typeof meters !== "number" ||
      !Number.isFinite(meters)
    ) {
      return "--";
    }

    if (meters < 1000) {
      return Math.round(
        meters / 10
      ) * 10 + "m";
    }

    return (
      meters < 10000
        ? (meters / 1000).toFixed(1)
        : Math.round(
            meters / 1000
          )
    ) + "km";
  }

  function getGeolocationErrorMessage(error) {
    return {
      1: "位置情報の利用が許可されませんでした。ブラウザのサイト設定から許可できます。",
      2: "現在地を取得できませんでした。通信状況や端末の位置情報設定をご確認ください。",
      3: "現在地の取得に時間がかかっています。場所を変えるか、時間をおいて再度お試しください。"
    }[Number(error?.code)] ||
      "この端末では現在地を利用できません。";
  }

  const api = {
    formatDistance,
    getDistanceMeters,
    getGeolocationErrorMessage,
    hasCoordinates
  };

  if (
    typeof module !== "undefined" &&
    module.exports
  ) {
    module.exports = api;
  } else {
    globalScope.ChiikatsuLocation =
      api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
