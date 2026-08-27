"use strict";


const CURRENT_DATA_URL =
  "./data/official-spots.json";


const ARCHIVE_DATA_URL =
  "./data/official-events-archive.json";


const FAVORITES_STORAGE_KEY =
  "chiikawa-map-favorites-v1";


const VISITED_STORAGE_KEY =
  "chiikawa-map-visited-v1";


const VALID_VIEWS =
  new Set([
    "current",
    "past",
    "guide"
  ]);


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


const PLACE_TYPE_LABELS = {
  shop:
    "ショップ",
  food:
    "カフェ・フード",
  spot:
    "イベント・体験"
};


const RESERVATION_LABELS = {
  required:
    "予約必要",
  priority:
    "予約優先",
  optional:
    "予約可",
  not_available:
    "予約なし",
  unknown:
    "最新情報を確認"
};


const PREFECTURES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県"
];


const CURRENT_GROUPS = [
  {
    id:
      "permanent-shop",
    icon:
      "🛍",
    title:
      "常設ショップ",
    description:
      "いつでも立ち寄りやすい公式グッズショップ",
    matches:
      spot =>
        spot.periodType === "permanent" &&
        spot.placeType === "shop"
  },
  {
    id:
      "permanent-experience",
    icon:
      "🍽",
    title:
      "常設フード・体験",
    description:
      "食事、スイーツ、展示などを楽しめる常設施設",
    matches:
      spot =>
        spot.periodType === "permanent" &&
        spot.placeType !== "shop"
  },
  {
    id:
      "limited-shop",
    icon:
      "✦",
    title:
      "期間限定ショップ",
    description:
      "POP UP STOREや期間限定の物販企画",
    matches:
      spot =>
        spot.periodType === "limited" &&
        spot.placeType === "shop"
  },
  {
    id:
      "limited-food",
    icon:
      "☕",
    title:
      "期間限定カフェ・フード",
    description:
      "開催期間が決まっているカフェや飲食企画",
    matches:
      spot =>
        spot.periodType === "limited" &&
        spot.placeType === "food"
  },
  {
    id:
      "limited-event",
    icon:
      "🎟",
    title:
      "イベント・体験",
    description:
      "展示、コラボ、謎解きなどの期間限定体験",
    matches:
      spot =>
        spot.periodType === "limited" &&
        spot.placeType === "spot"
  }
];


const ARCHIVE_GROUPS = [
  {
    id:
      "archive-shop",
    icon:
      "🛍",
    title:
      "ショップ",
    description:
      "終了したPOP UP STOREや物販企画",
    matches:
      spot =>
        spot.placeType === "shop"
  },
  {
    id:
      "archive-food",
    icon:
      "☕",
    title:
      "カフェ・フード",
    description:
      "終了したカフェ、レストラン、フード企画",
    matches:
      spot =>
        spot.placeType === "food"
  },
  {
    id:
      "archive-event",
    icon:
      "🎟",
    title:
      "イベント・体験",
    description:
      "終了・中止になった展示や体験イベント",
    matches:
      spot =>
        spot.placeType === "spot"
  }
];


const collator =
  new Intl.Collator(
    "ja",
    {
      numeric: true,
      sensitivity: "base"
    }
  );


const tabs =
  Array.from(
    document.querySelectorAll(
      "[data-view]"
    )
  );


const panels =
  Array.from(
    document.querySelectorAll(
      "[data-panel]"
    )
  );


const currentGroupsElement =
  document.getElementById(
    "current-groups"
  );


const pastGroupsElement =
  document.getElementById(
    "past-groups"
  );


const currentSearch =
  document.getElementById(
    "current-search"
  );


const currentPrefecture =
  document.getElementById(
    "current-prefecture"
  );


const currentKind =
  document.getElementById(
    "current-kind"
  );


const currentBrand =
  document.getElementById(
    "current-brand"
  );


const currentStatus =
  document.getElementById(
    "current-status"
  );


const currentReservation =
  document.getElementById(
    "current-reservation"
  );


const currentSaved =
  document.getElementById(
    "current-saved"
  );


const pastSearch =
  document.getElementById(
    "past-search"
  );


const pastYear =
  document.getElementById(
    "past-year"
  );


const pastKind =
  document.getElementById(
    "past-kind"
  );


const pastPrefecture =
  document.getElementById(
    "past-prefecture"
  );


const pastStatus =
  document.getElementById(
    "past-status"
  );


const pastReservation =
  document.getElementById(
    "past-reservation"
  );


const pastSaved =
  document.getElementById(
    "past-saved"
  );


let currentSpots = [];
let archiveSpots = [];
let currentLoaded = false;
let archiveLoaded = false;
let currentLoadPromise = null;
let archiveLoadPromise = null;
let favoriteSpotIds =
  loadStringSetFromStorage(
    FAVORITES_STORAGE_KEY
  );
let visitedSpotIds =
  loadStringSetFromStorage(
    VISITED_STORAGE_KEY
  );


function createElement(
  tagName,
  className,
  text
) {
  const element =
    document.createElement(
      tagName
    );

  if (className) {
    element.className =
      className;
  }

  if (
    text !== undefined &&
    text !== null
  ) {
    element.textContent =
      text;
  }

  return element;
}


function loadStringSetFromStorage(
  key
) {
  try {
    const value =
      window.localStorage.getItem(
        key
      );

    if (!value) {
      return new Set();
    }

    const parsed =
      JSON.parse(value);

    if (!Array.isArray(parsed)) {
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
      "保存済みスポットを読み込めませんでした。",
      error
    );

    return new Set();
  }
}


function getTodayInJapan() {
  const parts =
    new Intl.DateTimeFormat(
      "ja-JP",
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
    ).formatToParts(
      new Date()
    );

  const values = {};

  parts.forEach(
    part => {
      if (
        part.type === "year" ||
        part.type === "month" ||
        part.type === "day"
      ) {
        values[part.type] =
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


const TODAY_IN_JAPAN =
  getTodayInJapan();


function getPeriodStatus(
  spot
) {
  if (
    spot.eventStatus ===
    "cancelled"
  ) {
    return "cancelled";
  }

  if (
    spot.periodType ===
    "permanent"
  ) {
    return "permanent";
  }

  if (
    spot.startDate &&
    TODAY_IN_JAPAN <
      spot.startDate
  ) {
    return "upcoming";
  }

  if (
    spot.endDate &&
    TODAY_IN_JAPAN >
      spot.endDate
  ) {
    return "ended";
  }

  return "active";
}


function isEndingSoon(
  spot
) {
  if (
    getPeriodStatus(spot) !==
      "active" ||
    !spot.endDate
  ) {
    return false;
  }

  const today =
    Date.parse(
      TODAY_IN_JAPAN +
      "T00:00:00+09:00"
    );

  const end =
    Date.parse(
      spot.endDate +
      "T00:00:00+09:00"
    );

  const remainingDays =
    Math.round(
      (end - today) /
      86400000
    );

  return (
    remainingDays >= 0 &&
    remainingDays <= 7
  );
}


function normalizeSearchText(
  value
) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
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


function getPrefecture(
  address
) {
  const value =
    String(address || "");

  return (
    PREFECTURES.find(
      prefecture =>
        value.includes(prefecture)
    ) ||
    ""
  );
}


function formatDate(
  dateString
) {
  if (!dateString) {
    return "";
  }

  const match =
    dateString.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    return dateString;
  }

  return (
    Number(match[1]) +
    "年" +
    Number(match[2]) +
    "月" +
    Number(match[3]) +
    "日"
  );
}


function formatPeriod(
  spot
) {
  if (
    spot.periodType ===
    "permanent"
  ) {
    return "常設";
  }

  if (
    spot.startDate &&
    spot.endDate
  ) {
    return (
      formatDate(spot.startDate) +
      " ～ " +
      formatDate(spot.endDate)
    );
  }

  if (spot.startDate) {
    return (
      formatDate(spot.startDate) +
      " ～ 終了日未定"
    );
  }

  if (spot.endDate) {
    return (
      "～ " +
      formatDate(spot.endDate)
    );
  }

  return "開催期間は公式情報をご確認ください";
}


function getStatusPresentation(
  spot
) {
  const status =
    getPeriodStatus(spot);

  if (status === "cancelled") {
    return {
      className:
        "status-cancelled",
      label:
        "開催中止"
    };
  }

  if (status === "permanent") {
    return {
      className:
        "status-permanent",
      label:
        "常設"
    };
  }

  if (status === "upcoming") {
    return {
      className:
        "status-upcoming",
      label:
        "開催予定"
    };
  }

  if (status === "ended") {
    return {
      className:
        "status-ended",
      label:
        "開催終了"
    };
  }

  if (isEndingSoon(spot)) {
    return {
      className:
        "status-ending-soon",
      label:
        "まもなく終了"
    };
  }

  return {
    className:
      "status-active",
    label:
      "開催中"
  };
}


function getEntryLabel(
  spot
) {
  if (
    spot.defaultEntryType ===
    "ticket_required"
  ) {
    return "入場チケット必要";
  }

  return (
    RESERVATION_LABELS[
      spot.reservationType
    ] ||
    "最新情報を確認"
  );
}


function getReservationFilterValue(
  spot
) {
  if (
    spot.defaultEntryType ===
    "ticket_required"
  ) {
    return "ticket_required";
  }

  return (
    spot.reservationType ||
    "unknown"
  );
}


function matchesSavedFilter(
  spot,
  selectedValue
) {
  if (!selectedValue) {
    return true;
  }

  if (
    selectedValue ===
    "favorite"
  ) {
    return favoriteSpotIds.has(
      spot.id
    );
  }

  if (
    selectedValue ===
    "visited"
  ) {
    return visitedSpotIds.has(
      spot.id
    );
  }

  return true;
}


function getSelectedOptionLabel(
  select
) {
  if (!select.value) {
    return "";
  }

  return (
    select.selectedOptions[0]
      ?.textContent ||
    select.value
  );
}


function renderActiveFilterChips(
  wrapperId,
  containerId,
  filters
) {
  const wrapper =
    document.getElementById(
      wrapperId
    );

  const container =
    document.getElementById(
      containerId
    );

  container.replaceChildren();

  filters.forEach(
    filter => {
      if (!filter.label) {
        return;
      }

      const button =
        createElement(
          "button",
          "catalog-filter-chip",
          filter.label
        );

      button.type = "button";
      button.setAttribute(
        "aria-label",
        filter.label +
        "を解除"
      );

      button.addEventListener(
        "click",
        filter.reset
      );

      container.appendChild(button);
    }
  );

  wrapper.hidden =
    container.childElementCount === 0;
}


function appendDetail(
  list,
  label,
  value
) {
  if (!value) {
    return;
  }

  const row =
    createElement("div");

  row.appendChild(
    createElement(
      "dt",
      "",
      label
    )
  );

  row.appendChild(
    createElement(
      "dd",
      "",
      value
    )
  );

  list.appendChild(row);
}


function createSpotCard(
  spot
) {
  const card =
    createElement(
      "article",
      "official-spot-card"
    );

  const badges =
    createElement(
      "div",
      "spot-card-badges"
    );

  const status =
    getStatusPresentation(
      spot
    );

  badges.appendChild(
    createElement(
      "span",
      "spot-status-badge " +
        status.className,
      status.label
    )
  );

  badges.appendChild(
    createElement(
      "span",
      "spot-type-badge",
      PLACE_TYPE_LABELS[
        spot.placeType
      ] || "スポット"
    )
  );

  if (
    favoriteSpotIds.has(
      spot.id
    )
  ) {
    badges.appendChild(
      createElement(
        "span",
        "spot-saved-badge spot-saved-favorite",
        "♡ 行きたい"
      )
    );
  }

  if (
    visitedSpotIds.has(
      spot.id
    )
  ) {
    badges.appendChild(
      createElement(
        "span",
        "spot-saved-badge spot-saved-visited",
        "✓ 行った！"
      )
    );
  }

  card.appendChild(badges);

  card.appendChild(
    createElement(
      "h4",
      "",
      spot.name
    )
  );

  card.appendChild(
    createElement(
      "p",
      "spot-card-brand",
      BRAND_LABELS[
        spot.brand
      ] ||
      BRAND_LABELS.other
    )
  );

  const details =
    createElement(
      "dl",
      "spot-card-details"
    );

  appendDetail(
    details,
    "期間",
    formatPeriod(spot)
  );

  appendDetail(
    details,
    "場所",
    spot.address
  );

  appendDetail(
    details,
    "入店",
    getEntryLabel(spot)
  );

  card.appendChild(details);

  const actions =
    createElement(
      "div",
      "spot-card-actions"
    );

  const mapLink =
    createElement(
      "a",
      "spot-card-action spot-card-action-map",
      "🗺 地図で見る"
    );

  mapLink.href =
    "./?spot=" +
    encodeURIComponent(
      spot.id
    );

  actions.appendChild(mapLink);

  const sourceLink =
    createElement(
      "a",
      "spot-card-action",
      "公式情報 ↗"
    );

  sourceLink.href =
    spot.sourceUrl ||
    spot.entryInfoUrl ||
    spot.hoursInfoUrl ||
    "./";

  sourceLink.target =
    "_blank";
  sourceLink.rel =
    "noopener noreferrer";

  actions.appendChild(
    sourceLink
  );

  card.appendChild(actions);

  return card;
}


function sortCurrentSpots(
  first,
  second
) {
  const statusOrder = {
    active: 0,
    permanent: 0,
    upcoming: 1,
    ended: 2,
    cancelled: 3
  };

  const firstStatus =
    getPeriodStatus(first);
  const secondStatus =
    getPeriodStatus(second);

  const statusDifference =
    statusOrder[firstStatus] -
    statusOrder[secondStatus];

  if (statusDifference) {
    return statusDifference;
  }

  if (
    firstStatus === "active" &&
    first.endDate !==
      second.endDate
  ) {
    return (
      first.endDate ||
      "9999-12-31"
    ).localeCompare(
      second.endDate ||
      "9999-12-31"
    );
  }

  if (
    firstStatus === "upcoming" &&
    first.startDate !==
      second.startDate
  ) {
    return (
      first.startDate || ""
    ).localeCompare(
      second.startDate || ""
    );
  }

  return collator.compare(
    first.name,
    second.name
  );
}


function sortArchiveSpots(
  first,
  second
) {
  const dateDifference =
    (
      second.startDate ||
      second.endDate ||
      ""
    ).localeCompare(
      first.startDate ||
      first.endDate ||
      ""
    );

  if (dateDifference) {
    return dateDifference;
  }

  return collator.compare(
    first.name,
    second.name
  );
}


function createSpotGroup(
  definition,
  spots
) {
  const section =
    createElement(
      "section",
      "spot-group"
    );

  section.setAttribute(
    "aria-labelledby",
    definition.id + "-title"
  );

  const heading =
    createElement(
      "div",
      "spot-group-heading"
    );

  heading.appendChild(
    createElement(
      "span",
      "spot-group-icon",
      definition.icon
    )
  );

  const headingCopy =
    createElement("div");

  const title =
    createElement(
      "h3",
      "",
      definition.title
    );

  title.id =
    definition.id +
    "-title";

  title.appendChild(
    createElement(
      "span",
      "",
      spots.length + "件"
    )
  );

  headingCopy.appendChild(title);
  headingCopy.appendChild(
    createElement(
      "p",
      "",
      definition.description
    )
  );
  heading.appendChild(headingCopy);
  section.appendChild(heading);

  const grid =
    createElement(
      "div",
      "spot-card-grid"
    );

  spots.forEach(
    spot => {
      grid.appendChild(
        createSpotCard(spot)
      );
    }
  );

  section.appendChild(grid);

  return section;
}


function renderGroups(
  container,
  definitions,
  spots,
  sortFunction
) {
  container.replaceChildren();

  definitions.forEach(
    definition => {
      const matchingSpots =
        spots
          .filter(
            definition.matches
          )
          .sort(sortFunction);

      if (!matchingSpots.length) {
        return;
      }

      container.appendChild(
        createSpotGroup(
          definition,
          matchingSpots
        )
      );
    }
  );
}


function getSearchableText(
  spot
) {
  return normalizeSearchText(
    [
      spot.name,
      spot.address,
      spot.description,
      BRAND_LABELS[
        spot.brand
      ]
    ].filter(Boolean).join(" ")
  );
}


function getCurrentVisibleSpots() {
  return currentSpots.filter(
    spot =>
      ![
        "ended",
        "cancelled"
      ].includes(
        getPeriodStatus(spot)
      )
  );
}


function renderCurrentSpots() {
  if (!currentLoaded) {
    return;
  }

  const query =
    normalizeSearchText(
      currentSearch.value
    );

  const prefecture =
    currentPrefecture.value;

  const selectedKind =
    currentKind.value;

  const selectedBrand =
    currentBrand.value;

  const selectedStatus =
    currentStatus.value;

  const selectedReservation =
    currentReservation.value;

  const selectedSaved =
    currentSaved.value;

  const selectedGroup =
    CURRENT_GROUPS.find(
      group =>
        group.id === selectedKind
    );

  const visibleSpots =
    getCurrentVisibleSpots();

  const filteredSpots =
    visibleSpots.filter(
      spot =>
        (
          !query ||
          getSearchableText(spot)
            .includes(query)
        ) &&
        (
          !prefecture ||
          getPrefecture(
            spot.address
          ) === prefecture
        ) &&
        (
          !selectedGroup ||
          selectedGroup.matches(spot)
        ) &&
        (
          !selectedBrand ||
          spot.brand === selectedBrand
        ) &&
        (
          !selectedStatus ||
          (
            selectedStatus ===
              "ending-soon"
              ? isEndingSoon(spot)
              : getPeriodStatus(spot) ===
                selectedStatus
          )
        ) &&
        (
          !selectedReservation ||
          getReservationFilterValue(
            spot
          ) === selectedReservation
        ) &&
        matchesSavedFilter(
          spot,
          selectedSaved
        )
    );

  renderActiveFilterChips(
    "current-active-filters",
    "current-filter-chips",
    [
      {
        label:
          currentSearch.value.trim() &&
          "検索: " +
            currentSearch.value.trim(),
        reset: () => {
          currentSearch.value = "";
          renderCurrentSpots();
          currentSearch.focus();
        }
      },
      {
        label:
          prefecture &&
          "都道府県: " + prefecture,
        reset: () => {
          currentPrefecture.value = "";
          renderCurrentSpots();
          currentPrefecture.focus();
        }
      },
      {
        label:
          selectedKind &&
          "種類: " +
            getSelectedOptionLabel(
              currentKind
            ),
        reset: () => {
          currentKind.value = "";
          renderCurrentSpots();
          currentKind.focus();
        }
      },
      {
        label:
          selectedBrand &&
          "ブランド: " +
            getSelectedOptionLabel(
              currentBrand
            ),
        reset: () => {
          currentBrand.value = "";
          renderCurrentSpots();
          currentBrand.focus();
        }
      },
      {
        label:
          selectedStatus &&
          "開催状況: " +
            getSelectedOptionLabel(
              currentStatus
            ),
        reset: () => {
          currentStatus.value = "";
          renderCurrentSpots();
          currentStatus.focus();
        }
      },
      {
        label:
          selectedReservation &&
          "予約・入店: " +
            getSelectedOptionLabel(
              currentReservation
            ),
        reset: () => {
          currentReservation.value = "";
          renderCurrentSpots();
          currentReservation.focus();
        }
      },
      {
        label:
          selectedSaved &&
          "保存状況: " +
            getSelectedOptionLabel(
              currentSaved
            ),
        reset: () => {
          currentSaved.value = "";
          renderCurrentSpots();
          currentSaved.focus();
        }
      }
    ]
  );

  renderGroups(
    currentGroupsElement,
    CURRENT_GROUPS,
    filteredSpots,
    sortCurrentSpots
  );

  document.getElementById(
    "current-result-summary"
  ).textContent =
    filteredSpots.length +
    "件を表示しています。";

  document.getElementById(
    "current-empty"
  ).hidden =
    filteredSpots.length !== 0;
}


function renderPastSpots() {
  if (!archiveLoaded) {
    return;
  }

  const query =
    normalizeSearchText(
      pastSearch.value
    );

  const selectedYear =
    pastYear.value;

  const selectedKind =
    pastKind.value;

  const selectedPrefecture =
    pastPrefecture.value;

  const selectedStatus =
    pastStatus.value;

  const selectedReservation =
    pastReservation.value;

  const selectedSaved =
    pastSaved.value;

  const endedCurrentSpots =
    currentSpots.filter(
      spot =>
        [
          "ended",
          "cancelled"
        ].includes(
          getPeriodStatus(spot)
        )
    );

  const seenIds =
    new Set();

  const allPastSpots =
    [
      ...archiveSpots,
      ...endedCurrentSpots
    ].filter(
      spot => {
        if (
          !spot.id ||
          seenIds.has(spot.id)
        ) {
          return false;
        }

        seenIds.add(spot.id);
        return true;
      }
    );

  const filteredSpots =
    allPastSpots.filter(
      spot =>
        (
          !query ||
          getSearchableText(spot)
            .includes(query)
        ) &&
        (
          !selectedYear ||
          spot.startDate?.startsWith(
            selectedYear + "-"
          )
        ) &&
        (
          !selectedKind ||
          spot.placeType ===
            selectedKind
        ) &&
        (
          !selectedPrefecture ||
          getPrefecture(
            spot.address
          ) === selectedPrefecture
        ) &&
        (
          !selectedStatus ||
          getPeriodStatus(spot) ===
            selectedStatus
        ) &&
        (
          !selectedReservation ||
          getReservationFilterValue(
            spot
          ) === selectedReservation
        ) &&
        matchesSavedFilter(
          spot,
          selectedSaved
        )
    );

  renderActiveFilterChips(
    "past-active-filters",
    "past-filter-chips",
    [
      {
        label:
          pastSearch.value.trim() &&
          "検索: " +
            pastSearch.value.trim(),
        reset: () => {
          pastSearch.value = "";
          renderPastSpots();
          pastSearch.focus();
        }
      },
      {
        label:
          selectedYear &&
          "開催年: " +
            getSelectedOptionLabel(
              pastYear
            ),
        reset: () => {
          pastYear.value = "";
          renderPastSpots();
          pastYear.focus();
        }
      },
      {
        label:
          selectedKind &&
          "種類: " +
            getSelectedOptionLabel(
              pastKind
            ),
        reset: () => {
          pastKind.value = "";
          renderPastSpots();
          pastKind.focus();
        }
      },
      {
        label:
          selectedPrefecture &&
          "都道府県: " +
            selectedPrefecture,
        reset: () => {
          pastPrefecture.value = "";
          renderPastSpots();
          pastPrefecture.focus();
        }
      },
      {
        label:
          selectedStatus &&
          "開催結果: " +
            getSelectedOptionLabel(
              pastStatus
            ),
        reset: () => {
          pastStatus.value = "";
          renderPastSpots();
          pastStatus.focus();
        }
      },
      {
        label:
          selectedReservation &&
          "予約・入店: " +
            getSelectedOptionLabel(
              pastReservation
            ),
        reset: () => {
          pastReservation.value = "";
          renderPastSpots();
          pastReservation.focus();
        }
      },
      {
        label:
          selectedSaved &&
          "保存状況: " +
            getSelectedOptionLabel(
              pastSaved
            ),
        reset: () => {
          pastSaved.value = "";
          renderPastSpots();
          pastSaved.focus();
        }
      }
    ]
  );

  renderGroups(
    pastGroupsElement,
    ARCHIVE_GROUPS,
    filteredSpots,
    sortArchiveSpots
  );

  document.getElementById(
    "past-result-summary"
  ).textContent =
    filteredSpots.length +
    "件を表示しています。";

  document.getElementById(
    "past-empty"
  ).hidden =
    filteredSpots.length !== 0;
}


function populateCurrentSummary() {
  const visibleSpots =
    getCurrentVisibleSpots();

  const statuses =
    visibleSpots.map(
      getPeriodStatus
    );

  document.getElementById(
    "current-total-count"
  ).textContent =
    String(visibleSpots.length);

  document.getElementById(
    "permanent-count"
  ).textContent =
    String(
      statuses.filter(
        status =>
          status === "permanent"
      ).length
    );

  document.getElementById(
    "active-count"
  ).textContent =
    String(
      statuses.filter(
        status =>
          status === "active"
      ).length
    );

  document.getElementById(
    "upcoming-count"
  ).textContent =
    String(
      statuses.filter(
        status =>
          status === "upcoming"
      ).length
    );
}


function populatePrefectures() {
  const availablePrefectures =
    new Set(
      getCurrentVisibleSpots()
        .map(
          spot =>
            getPrefecture(
              spot.address
            )
        )
        .filter(Boolean)
    );

  PREFECTURES.forEach(
    prefecture => {
      if (
        !availablePrefectures.has(
          prefecture
        )
      ) {
        return;
      }

      const option =
        createElement(
          "option",
          "",
          prefecture
        );

      option.value =
        prefecture;

      currentPrefecture.appendChild(
        option
      );
    }
  );
}


function populateBrands() {
  const brands =
    Array.from(
      new Set(
        getCurrentVisibleSpots()
          .map(spot => spot.brand)
          .filter(Boolean)
      )
    ).sort(
      (first, second) =>
        (
          BRAND_LABELS[first] || first
        ).localeCompare(
          BRAND_LABELS[second] || second,
          "ja"
        )
    );

  brands.forEach(
    brand => {
      const option =
        createElement(
          "option",
          "",
          BRAND_LABELS[brand] ||
            brand
        );

      option.value = brand;
      currentBrand.appendChild(option);
    }
  );
}


function populateArchiveYears() {
  const years =
    Array.from(
      new Set(
        archiveSpots
          .map(
            spot =>
              spot.startDate?.slice(
                0,
                4
              )
          )
          .filter(Boolean)
      )
    ).sort(
      (first, second) =>
        second.localeCompare(first)
    );

  years.forEach(
    year => {
      const option =
        createElement(
          "option",
          "",
          year + "年"
        );

      option.value = year;
      pastYear.appendChild(option);
    }
  );
}


function populateArchivePrefectures() {
  pastPrefecture
    .querySelectorAll(
      "option:not(:first-child)"
    )
    .forEach(option => option.remove());

  const availablePrefectures =
    new Set(
      [
        ...archiveSpots,
        ...currentSpots.filter(
          spot =>
            [
              "ended",
              "cancelled"
            ].includes(
              getPeriodStatus(spot)
            )
        )
      ]
        .map(
          spot =>
            getPrefecture(
              spot.address
            )
        )
        .filter(Boolean)
    );

  PREFECTURES.forEach(
    prefecture => {
      if (
        !availablePrefectures.has(
          prefecture
        )
      ) {
        return;
      }

      const option =
        createElement(
          "option",
          "",
          prefecture
        );

      option.value = prefecture;
      pastPrefecture.appendChild(
        option
      );
    }
  );
}


function updateGuideCounts() {
  document.querySelectorAll(
    "[data-guide-brands]"
  ).forEach(
    card => {
      const brands =
        new Set(
          card.dataset.guideBrands
            .split(/\s+/)
            .filter(Boolean)
        );

      const count =
        getCurrentVisibleSpots()
          .filter(
            spot =>
              brands.has(
                spot.brand
              )
          ).length;

      const countElement =
        card.querySelector(
          "[data-guide-count]"
        );

      if (countElement) {
        countElement.textContent =
          count + "件掲載";
      }
    }
  );
}


async function fetchJsonArray(
  url
) {
  const response =
    await fetch(
      url,
      {
        cache:
          "no-store"
      }
    );

  if (!response.ok) {
    throw new Error(
      "HTTP " +
      response.status
    );
  }

  const value =
    await response.json();

  if (!Array.isArray(value)) {
    throw new Error(
      "JSONが配列ではありません。"
    );
  }

  return value;
}


async function loadCurrentSpots() {
  if (currentLoaded) {
    return true;
  }

  if (currentLoadPromise) {
    return currentLoadPromise;
  }

  document.getElementById(
    "current-loading"
  ).hidden = false;

  document.getElementById(
    "current-error"
  ).hidden = true;

  currentLoadPromise =
    (async () => {
      try {
        currentSpots =
          await fetchJsonArray(
            CURRENT_DATA_URL
          );

        currentLoaded = true;

        populateCurrentSummary();
        populatePrefectures();
        populateBrands();
        updateGuideCounts();
        renderCurrentSpots();

        if (archiveLoaded) {
          populateArchivePrefectures();
          renderPastSpots();
        }

        return true;
      } catch (error) {
        console.error(
          "公式スポットの読み込みに失敗しました。",
          error
        );

        document.getElementById(
          "current-error"
        ).hidden = false;

        document.getElementById(
          "current-result-summary"
        ).textContent =
          "公式スポットを読み込めませんでした。";

        return false;
      } finally {
        document.getElementById(
          "current-loading"
        ).hidden = true;

        currentLoadPromise = null;
      }
    })();

  return currentLoadPromise;
}


async function loadArchiveSpots() {
  if (archiveLoaded) {
    return true;
  }

  if (archiveLoadPromise) {
    return archiveLoadPromise;
  }

  document.getElementById(
    "past-loading"
  ).hidden = false;

  document.getElementById(
    "past-error"
  ).hidden = true;

  document.getElementById(
    "past-result-summary"
  ).textContent =
    "過去イベントを読み込んでいます…";

  archiveLoadPromise =
    (async () => {
      try {
        archiveSpots =
          await fetchJsonArray(
            ARCHIVE_DATA_URL
          );

        archiveLoaded = true;

        document.getElementById(
          "past-total-count"
        ).textContent =
          String(archiveSpots.length);

        populateArchiveYears();
        populateArchivePrefectures();
        renderPastSpots();

        return true;
      } catch (error) {
        console.error(
          "過去イベントの読み込みに失敗しました。",
          error
        );

        document.getElementById(
          "past-error"
        ).hidden = false;

        document.getElementById(
          "past-result-summary"
        ).textContent =
          "過去イベントを読み込めませんでした。";

        return false;
      } finally {
        document.getElementById(
          "past-loading"
        ).hidden = true;

        archiveLoadPromise = null;
      }
    })();

  return archiveLoadPromise;
}


function setView(
  requestedView,
  options = {}
) {
  const view =
    VALID_VIEWS.has(
      requestedView
    )
      ? requestedView
      : "current";

  tabs.forEach(
    tab => {
      const active =
        tab.dataset.view ===
        view;

      tab.classList.toggle(
        "is-active",
        active
      );

      tab.setAttribute(
        "aria-selected",
        String(active)
      );

      tab.tabIndex =
        active ? 0 : -1;
    }
  );

  panels.forEach(
    panel => {
      panel.hidden =
        panel.dataset.panel !==
        view;
    }
  );

  if (view === "past") {
    loadArchiveSpots();
  }

  if (options.updateHistory) {
    const url =
      new URL(
        window.location.href
      );

    if (view === "current") {
      url.searchParams.delete(
        "view"
      );
    } else {
      url.searchParams.set(
        "view",
        view
      );
    }

    window.history.pushState(
      { view },
      "",
      url
    );
  }

  if (options.focusPanel) {
    document.querySelector(
      '[data-panel="' +
      view +
      '"]'
    )?.focus({
      preventScroll: true
    });
  }
}


tabs.forEach(
  (tab, index) => {
    tab.addEventListener(
      "click",
      () => {
        setView(
          tab.dataset.view,
          {
            updateHistory: true,
            focusPanel: true
          }
        );
      }
    );

    tab.addEventListener(
      "keydown",
      event => {
        let nextIndex = index;

        if (
          event.key ===
          "ArrowRight"
        ) {
          nextIndex =
            (index + 1) %
            tabs.length;
        } else if (
          event.key ===
          "ArrowLeft"
        ) {
          nextIndex =
            (
              index - 1 +
              tabs.length
            ) % tabs.length;
        } else if (
          event.key === "Home"
        ) {
          nextIndex = 0;
        } else if (
          event.key === "End"
        ) {
          nextIndex =
            tabs.length - 1;
        } else {
          return;
        }

        event.preventDefault();

        tabs[nextIndex].focus();
        setView(
          tabs[nextIndex]
            .dataset.view,
          {
            updateHistory: true
          }
        );
      }
    );
  }
);


currentSearch.addEventListener(
  "input",
  renderCurrentSpots
);


currentPrefecture.addEventListener(
  "change",
  renderCurrentSpots
);


[
  currentKind,
  currentBrand,
  currentStatus,
  currentReservation,
  currentSaved
].forEach(
  control => {
    control.addEventListener(
      "change",
      renderCurrentSpots
    );
  }
);


pastSearch.addEventListener(
  "input",
  renderPastSpots
);


pastYear.addEventListener(
  "change",
  renderPastSpots
);


pastKind.addEventListener(
  "change",
  renderPastSpots
);


[
  pastPrefecture,
  pastStatus,
  pastReservation,
  pastSaved
].forEach(
  control => {
    control.addEventListener(
      "change",
      renderPastSpots
    );
  }
);


document.getElementById(
  "current-filter-reset"
).addEventListener(
  "click",
  () => {
    currentSearch.value = "";
    currentPrefecture.value = "";
    currentKind.value = "";
    currentBrand.value = "";
    currentStatus.value = "";
    currentReservation.value = "";
    currentSaved.value = "";
    renderCurrentSpots();
    currentSearch.focus();
  }
);


document.getElementById(
  "past-filter-reset"
).addEventListener(
  "click",
  () => {
    pastSearch.value = "";
    pastYear.value = "";
    pastKind.value = "";
    pastPrefecture.value = "";
    pastStatus.value = "";
    pastReservation.value = "";
    pastSaved.value = "";
    renderPastSpots();
    pastSearch.focus();
  }
);


document.getElementById(
  "current-retry"
).addEventListener(
  "click",
  loadCurrentSpots
);


document.getElementById(
  "past-retry"
).addEventListener(
  "click",
  loadArchiveSpots
);


window.addEventListener(
  "popstate",
  () => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    setView(
      params.get("view") ||
      "current"
    );
  }
);


function refreshSavedSpotIds() {
  favoriteSpotIds =
    loadStringSetFromStorage(
      FAVORITES_STORAGE_KEY
    );

  visitedSpotIds =
    loadStringSetFromStorage(
      VISITED_STORAGE_KEY
    );

  renderCurrentSpots();
  renderPastSpots();
}


window.addEventListener(
  "storage",
  event => {
    if (
      event.key ===
        FAVORITES_STORAGE_KEY ||
      event.key ===
        VISITED_STORAGE_KEY
    ) {
      refreshSavedSpotIds();
    }
  }
);


window.addEventListener(
  "pageshow",
  refreshSavedSpotIds
);


const initialParams =
  new URLSearchParams(
    window.location.search
  );


setView(
  initialParams.get("view") ||
  "current"
);


loadCurrentSpots();
