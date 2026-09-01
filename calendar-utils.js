(function attachCalendarUtils(globalScope) {
  "use strict";

  const BRAND_GROUP_LABELS = {
    chiikawaland: "ちいかわらんど",
    magical_chiikawa: "まじかるちいかわ",
    mogumogu: "もぐもぐ本舗",
    baby_castella: "ベビーカステラ",
    chiikawa_baby: "Chiikawa Baby",
    chiikawa_sanrio: "サンリオコラボ",
    chiikawa_sushi: "ちいかわ寿司",
    tenshi_akuma: "てんし♡あくま",
    wakuwaku_amusement: "ゆうえんち",
    parco_chiikawa_gw: "PARCO G.W.",
    tourism_station: "観光ステーション",
    chiikawa_tigers: "阪神タイガース",
    heroaca_chiikawa: "ヒロアカ×ちいかわ",
    chiikawa_mini_shop: "mini shop",
    chiikawa_park: "ちいかわパーク",
    chiikawa_restaurant: "レストラン",
    chiikawa_bakery: "ベーカリー",
    ramen_buta: "ラーメン豚",
    chiikawa_yaki: "ちいかわ焼き",
    shisa_store: "シーサーのおみやげやさん",
    chiikawa_pocket: "ぽけっと POP UP",
    nagano_market: "ナガノマーケット",
    chiikawa_movie: "ちいかわ映画 POP UP",
    tokyo_banana: "東京ばな奈"
  };

  function getCalendarGroupLabel(spot) {
    const brandLabel =
      BRAND_GROUP_LABELS[spot?.brand];

    if (brandLabel) {
      return brandLabel;
    }

    if (
      spot?.brand === "chiikawa" ||
      spot?.relationType === "popup" ||
      /POP\s*UP/i.test(spot?.name || "")
    ) {
      return "POP UP";
    }

    if (spot?.relationType === "collaboration") {
      return "コラボ";
    }

    if (spot?.category === "nagano") {
      return "ナガノ先生関連";
    }

    return "公式イベント";
  }

  function groupCalendarEvents(events) {
    const groups = new Map();

    events.forEach(spot => {
      const label = getCalendarGroupLabel(spot);
      const key = spot?.brand || label;
      const current = groups.get(key);

      if (current) {
        current.count += 1;
        current.events.push(spot);
        return;
      }

      groups.set(key, {
        key,
        label,
        count: 1,
        events: [spot]
      });
    });

    return Array.from(groups.values())
      .sort(
        (first, second) =>
          second.count - first.count ||
          first.label.localeCompare(
            second.label,
            "ja"
          )
      );
  }

  const api = {
    getCalendarGroupLabel,
    groupCalendarEvents
  };

  if (
    typeof module !== "undefined" &&
    module.exports
  ) {
    module.exports = api;
  } else {
    globalScope.ChiikatsuCalendar = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
