// ============================================================
// ちい活手帳
// ============================================================

const DATA_SOURCES = [
  {
    url: "./data/official-spots.json",
    archive: false
  },
  {
    url: "./data/nagano-spots.json",
    archive: false
  },
  {
    url: "./data/official-events-archive.json",
    archive: true
  }
];

const FAVORITES_STORAGE_KEY =
  "chiikawa-map-favorites-v1";

const VISITED_STORAGE_KEY =
  "chiikawa-map-visited-v1";

const VISIT_DETAILS_STORAGE_KEY =
  "chiikawa-map-visit-details-v1";

const PLAN_STORAGE_KEY =
  "chiikawa-map-plan-v1";

const PLAN_MAX_SPOTS = 8;

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

const PREFECTURE_REGIONS = [
  ["北海道", ["北海道"]],
  ["東北", ["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"]],
  ["関東", ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県"]],
  ["中部", ["新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県"]],
  ["近畿", ["三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"]],
  ["中国", ["鳥取県", "島根県", "岡山県", "広島県", "山口県"]],
  ["四国", ["徳島県", "香川県", "愛媛県", "高知県"]],
  ["九州・沖縄", ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"]]
];

const BRAND_COLLECTIONS = [
  ["chiikawaland", "ちいかわらんど"],
  ["ramen_buta", "ちいかわラーメン 豚"],
  ["mogumogu", "ちいかわもぐもぐ本舗"],
  ["magical_chiikawa", "まじかるちいかわ"],
  ["chiikawa_yaki", "ちいかわ焼き"],
  ["nagano_market", "ナガノマーケット"],
  ["chiikawa_restaurant", "ちいかわレストラン"],
  ["shisa_store", "シーサーのおみやげやさん"]
];

const params =
  new URLSearchParams(
    window.location.search
  );

const $ =
  selector =>
    document.querySelector(selector);

const $$ =
  selector =>
    Array.from(
      document.querySelectorAll(
        selector
      )
    );

const journalStatus =
  $("#journal-status");

let spots = [];
let spotsById = new Map();
let favoriteSpotIds =
  loadStringSet(
    FAVORITES_STORAGE_KEY
  );
let visitedSpotIds =
  loadStringSet(
    VISITED_STORAGE_KEY
  );
let visitDetailsBySpotId =
  loadVisitDetails();
let localPlanIds =
  loadStringArray(
    PLAN_STORAGE_KEY
  );
let workingPlanIds =
  localPlanIds.slice();
let viewingSharedPlan = false;
let currentView = "calendar";
let statusTimer = null;
let showAllActivityNextEvents = false;


function createElement(
  tagName,
  className = "",
  text = ""
) {
  const element =
    document.createElement(
      tagName
    );

  if (className) {
    element.className =
      className;
  }

  if (text) {
    element.textContent =
      text;
  }

  return element;
}


function showStatus(
  message,
  type = "info",
  persistent = false
) {
  if (!journalStatus) {
    return;
  }

  window.clearTimeout(
    statusTimer
  );

  journalStatus.textContent =
    message;
  journalStatus.className =
    "journal-status" +
    (
      type === "info"
        ? ""
        : " is-" + type
    );
  journalStatus.hidden = false;

  if (!persistent) {
    statusTimer =
      window.setTimeout(
        () => {
          journalStatus.hidden =
            true;
        },
        4000
      );
  }
}


function loadStringSet(
  key
) {
  return new Set(
    loadStringArray(key)
  );
}


function loadStringArray(
  key
) {
  try {
    const parsed =
      JSON.parse(
        window.localStorage.getItem(
          key
        ) ||
        "[]"
      );

    if (!Array.isArray(parsed)) {
      return [];
    }

    return Array.from(
      new Set(
        parsed.filter(
          value =>
            typeof value === "string" &&
            value.length <= 200
        )
      )
    );
  } catch (error) {
    console.warn(
      key +
      "を読み込めませんでした。",
      error
    );
    return [];
  }
}


function loadVisitDetails() {
  try {
    const parsed =
      JSON.parse(
        window.localStorage.getItem(
          VISIT_DETAILS_STORAGE_KEY
        ) ||
        "{}"
      );

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return new Map();
    }

    return new Map(
      Object.entries(parsed)
        .filter(
          ([id, value]) =>
            id &&
            value &&
            typeof value === "object"
        )
    );
  } catch (error) {
    console.warn(
      "訪問記録を読み込めませんでした。",
      error
    );
    return new Map();
  }
}


function savePlan() {
  try {
    window.localStorage.setItem(
      PLAN_STORAGE_KEY,
      JSON.stringify(
        workingPlanIds
      )
    );

    localPlanIds =
      workingPlanIds.slice();
    viewingSharedPlan = false;
    renderSharedPlanBanner();
    updateHeroCounts();
    return true;
  } catch (error) {
    console.warn(
      "ちい活プランを保存できませんでした。",
      error
    );
    showStatus(
      "ちい活プランを端末に保存できませんでした。ブラウザの保存設定をご確認ください。",
      "error",
      true
    );
    return false;
  }
}


function getTodayInJapan() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  ).format(
    new Date()
  );
}


function isDateString(
  value
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    String(value || "")
  );
}


function parseDateString(
  value
) {
  if (!isDateString(value)) {
    return null;
  }

  const [year, month, day] =
    value.split("-")
      .map(Number);

  return Date.UTC(
    year,
    month - 1,
    day
  );
}


function addDays(
  value,
  days
) {
  const timestamp =
    parseDateString(value);

  if (timestamp === null) {
    return value;
  }

  return new Date(
    timestamp +
    days * 86400000
  )
    .toISOString()
    .slice(0, 10);
}


function formatDateJapanese(
  value,
  options = {}
) {
  const timestamp =
    parseDateString(value);

  if (timestamp === null) {
    return value || "日付未定";
  }

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      timeZone: "Asia/Tokyo",
      year:
        options.year === false
          ? undefined
          : "numeric",
      month: "long",
      day:
        options.day === false
          ? undefined
          : "numeric",
      weekday:
        options.weekday === false
          ? undefined
          : "short"
    }
  ).format(
    new Date(timestamp)
  );
}


function normalizeSearchText(
  value
) {
  return String(value || "")
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


function getPrefecture(
  spot
) {
  return PREFECTURE_ORDER.find(
    prefecture =>
      String(
        spot.address || ""
      ).includes(prefecture)
  ) || "";
}


function getSpotMapUrl(
  spot
) {
  const url =
    new URL(
      "./",
      window.location.href
    );

  url.searchParams.set(
    "spot",
    spot.id
  );

  return url.toString();
}


function getSpotPageUrl(
  spot
) {
  return new URL(
    "spot/" +
      encodeURIComponent(spot.id) +
      "/",
    new URL(
      "./",
      window.location.href
    )
  ).toString();
}


function getPlaceTypeLabel(
  value
) {
  return {
    food: "食べる",
    spot: "観光・体験",
    shop: "買う",
    lodging: "泊まる",
    other: "その他"
  }[value] || "その他";
}


function getPeriodLabel(
  spot
) {
  if (
    spot.periodType !==
    "limited"
  ) {
    return "常設";
  }

  const start =
    spot.startDate
      ? formatDateJapanese(
          spot.startDate,
          {
            weekday: false
          }
        )
      : "開始日未定";

  const end =
    spot.endDate
      ? formatDateJapanese(
          spot.endDate,
          {
            weekday: false
          }
        )
      : "終了日未定";

  return start + "〜" + end;
}


function getDistanceMeters(
  first,
  second
) {
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

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(first.lat)) *
    Math.cos(toRadians(second.lat)) *
    Math.sin(longitudeDelta / 2) ** 2;

  return 6371000 * 2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );
}


function formatDistance(
  meters
) {
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


async function shareUrl(
  title,
  text,
  url,
  copiedMessage
) {
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url
      });
      return;
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }
    }
  }

  try {
    await navigator.clipboard.writeText(
      url
    );
    showStatus(
      copiedMessage,
      "success"
    );
  } catch (error) {
    window.prompt(
      "このURLをコピーして共有してください。",
      url
    );
  }
}


function setJournalView(
  view,
  options = {}
) {
  const allowed =
    new Set([
      "calendar",
      "plan",
      "activity"
    ]);

  currentView =
    allowed.has(view)
      ? view
      : "calendar";

  $$('[data-journal-view]')
    .forEach(
      button => {
        const active =
          button.dataset.journalView ===
          currentView;

        button.classList.toggle(
          "is-active",
          active
        );
        button.setAttribute(
          "aria-selected",
          String(active)
        );
      }
    );

  $$('[data-journal-panel]')
    .forEach(
      panel => {
        panel.hidden =
          panel.dataset.journalPanel !==
          currentView;
      }
    );

  if (options.history !== false) {
    const url =
      new URL(
        window.location.href
      );
    url.searchParams.set(
      "view",
      currentView
    );

    window.history.pushState(
      null,
      "",
      url
    );
  }

  if (currentView === "calendar") {
    renderCalendar();
  } else if (currentView === "plan") {
    renderPlan();
  } else {
    renderActivity();
  }
}


function updateHeroCounts() {
  const knownFavorites =
    spots.length
      ? spots.filter(
          spot =>
            favoriteSpotIds.has(
              spot.id
            )
        ).length
      : favoriteSpotIds.size;

  const knownVisited =
    spots.length
      ? spots.filter(
          spot =>
            visitedSpotIds.has(
              spot.id
            )
        ).length
      : visitedSpotIds.size;

  $("#journal-favorite-count").textContent =
    String(knownFavorites);
  $("#journal-plan-count").textContent =
    String(localPlanIds.length);
  $("#journal-visited-count").textContent =
    String(knownVisited);
}


// ============================================================
// カレンダー
// ============================================================

let selectedDate =
  isDateString(
    params.get("date")
  )
    ? params.get("date")
    : getTodayInJapan();

let calendarMonth =
  selectedDate.slice(0, 7);


function spotOverlapsDate(
  spot,
  date
) {
  if (
    spot.periodType !== "limited" ||
    !spot.startDate
  ) {
    return false;
  }

  return (
    spot.startDate <= date &&
    (
      !spot.endDate ||
      spot.endDate >= date
    )
  );
}


function getCalendarFilteredSpots() {
  const search =
    normalizeSearchText(
      $("#calendar-search")?.value
    );
  const prefecture =
    $("#calendar-prefecture")?.value ||
    "";
  const category =
    $("#calendar-category")?.value ||
    "";
  const saved =
    $("#calendar-saved")?.value ||
    "";

  return spots.filter(
    spot => {
      if (
        spot.periodType !== "limited" ||
        !spot.startDate
      ) {
        return false;
      }

      if (
        search &&
        !spot._searchText.includes(
          search
        )
      ) {
        return false;
      }

      if (
        prefecture &&
        spot._prefecture !==
        prefecture
      ) {
        return false;
      }

      if (
        category &&
        spot.category !== category
      ) {
        return false;
      }

      if (
        saved === "favorite" &&
        !favoriteSpotIds.has(spot.id)
      ) {
        return false;
      }

      if (
        saved === "visited" &&
        !visitedSpotIds.has(spot.id)
      ) {
        return false;
      }

      return true;
    }
  );
}


function getCalendarEventsForDate(
  date,
  filteredSpots =
    getCalendarFilteredSpots()
) {
  return filteredSpots
    .filter(
      spot =>
        spotOverlapsDate(
          spot,
          date
        )
    )
    .sort(
      (first, second) => {
        const firstPriority =
          first.startDate === date
            ? 0
            : first.endDate === date
              ? 1
              : 2;
        const secondPriority =
          second.startDate === date
            ? 0
            : second.endDate === date
              ? 1
              : 2;

        return firstPriority -
          secondPriority ||
          first.name.localeCompare(
            second.name,
            "ja"
          );
      }
    );
}


function writeCalendarUrl() {
  if (currentView !== "calendar") {
    return;
  }

  const url =
    new URL(
      window.location.href
    );

  url.searchParams.set(
    "view",
    "calendar"
  );
  url.searchParams.set(
    "date",
    selectedDate
  );

  const values = [
    ["q", $("#calendar-search")?.value.trim()],
    ["pref", $("#calendar-prefecture")?.value],
    ["category", $("#calendar-category")?.value],
    ["saved", $("#calendar-saved")?.value]
  ];

  values.forEach(
    ([key, value]) => {
      if (value) {
        url.searchParams.set(
          key,
          value
        );
      } else {
        url.searchParams.delete(key);
      }
    }
  );

  window.history.replaceState(
    null,
    "",
    url
  );
}


function createCalendarEventCard(
  spot,
  date
) {
  const card =
    createElement(
      "article",
      "calendar-event-card" +
      (
        spot.eventStatus ===
        "cancelled"
          ? " is-cancelled"
          : ""
      )
    );

  const top =
    createElement(
      "div",
      "calendar-event-top"
    );

  if (
    spot.eventStatus ===
    "cancelled"
  ) {
    top.appendChild(
      createElement(
        "span",
        "calendar-event-badge is-end",
        "開催中止"
      )
    );
  } else if (
    spot.startDate === date &&
    spot.endDate === date
  ) {
    top.appendChild(
      createElement(
        "span",
        "calendar-event-badge is-start",
        "1日開催"
      )
    );
  } else {
    if (spot.startDate === date) {
      top.appendChild(
        createElement(
          "span",
          "calendar-event-badge is-start",
          "開催開始"
        )
      );
    }

    if (spot.endDate === date) {
      top.appendChild(
        createElement(
          "span",
          "calendar-event-badge is-end",
          "最終日"
        )
      );
    }

    if (
      spot.startDate !== date &&
      spot.endDate !== date
    ) {
      top.appendChild(
        createElement(
          "span",
          "calendar-event-badge",
          "開催中"
        )
      );
    }
  }

  top.appendChild(
    createElement(
      "span",
      "calendar-event-badge",
      spot.category === "nagano"
        ? "ナガノ先生"
        : "ちいかわ公式"
    )
  );

  card.appendChild(top);
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
      "",
      (
        spot.address ||
        "住所要確認"
      ) +
      "\n" +
      getPeriodLabel(spot)
    )
  );

  const actions =
    createElement(
      "div",
      "calendar-event-actions"
    );
  const detailLink =
    createElement(
      "a",
      "",
      "詳しい情報"
    );
  detailLink.href =
    getSpotPageUrl(spot);
  actions.appendChild(
    detailLink
  );

  const mapLink =
    createElement(
      "a",
      "",
      "地図で見る"
    );
  mapLink.href =
    getSpotMapUrl(spot);
  actions.appendChild(mapLink);

  const planButton =
    createElement(
      "button",
      "",
      workingPlanIds.includes(
        spot.id
      )
        ? "プランに追加済み"
        : "＋ プランに追加"
    );
  planButton.type = "button";
  planButton.disabled =
    workingPlanIds.includes(
      spot.id
    );
  planButton.addEventListener(
    "click",
    () => {
      addSpotToPlan(spot.id);
      renderCalendarDayList();
    }
  );
  actions.appendChild(planButton);
  card.appendChild(actions);

  return card;
}


function renderCalendarDayList() {
  const list =
    $("#calendar-day-list");
  const events =
    getCalendarEventsForDate(
      selectedDate
    );

  $("#calendar-day-title").textContent =
    formatDateJapanese(
      selectedDate
    );
  $("#calendar-day-count").textContent =
    events.length + "件";

  list.replaceChildren();

  if (!events.length) {
    list.appendChild(
      createElement(
        "p",
        "calendar-empty",
        "この日に該当する期間限定イベントはありません。前後の日や絞り込み条件もお試しください。"
      )
    );
    return;
  }

  list.append(
    ...events.map(
      spot =>
        createCalendarEventCard(
          spot,
          selectedDate
        )
    )
  );
}


function renderCalendar() {
  if (!spots.length) {
    return;
  }

  const [year, month] =
    calendarMonth.split("-")
      .map(Number);
  const firstDate =
    `${calendarMonth}-01`;
  const firstWeekday =
    new Date(
      parseDateString(firstDate)
    ).getUTCDay();
  const daysInMonth =
    new Date(
      Date.UTC(year, month, 0)
    ).getUTCDate();
  const previousMonthDays =
    new Date(
      Date.UTC(year, month - 1, 0)
    ).getUTCDate();
  const filteredSpots =
    getCalendarFilteredSpots();
  const grid =
    $("#calendar-grid");

  $("#calendar-month-label").textContent =
    `${year}年${month}月`;
  grid.replaceChildren();

  for (
    let index = 0;
    index < 42;
    index += 1
  ) {
    const dayOffset =
      index - firstWeekday + 1;
    let date;
    let dayNumber;
    let outside = false;

    if (dayOffset < 1) {
      date = addDays(
        firstDate,
        dayOffset - 1
      );
      dayNumber =
        previousMonthDays +
        dayOffset;
      outside = true;
    } else if (
      dayOffset > daysInMonth
    ) {
      date = addDays(
        `${calendarMonth}-${String(daysInMonth).padStart(2, "0")}`,
        dayOffset - daysInMonth
      );
      dayNumber =
        dayOffset - daysInMonth;
      outside = true;
    } else {
      date =
        `${calendarMonth}-${String(dayOffset).padStart(2, "0")}`;
      dayNumber = dayOffset;
    }

    const events =
      getCalendarEventsForDate(
        date,
        filteredSpots
      );
    const starts =
      events.filter(
        spot =>
          spot.startDate === date
      ).length;
    const ends =
      events.filter(
        spot =>
          spot.endDate === date
      ).length;
    const button =
      createElement(
        "button",
        "calendar-day" +
        (outside ? " is-empty" : "") +
        (date === getTodayInJapan() ? " is-today" : "") +
        (date === selectedDate ? " is-selected" : "")
      );
    button.type = "button";
    button.setAttribute(
      "aria-label",
      formatDateJapanese(date) +
      "、" +
      events.length +
      "件"
    );
    button.appendChild(
      createElement(
        "span",
        "calendar-day-number",
        String(dayNumber)
      )
    );

    if (events.length) {
      button.appendChild(
        createElement(
          "span",
          "calendar-day-count",
          events.length + "件"
        )
      );
    }

    if (starts || ends) {
      const meta =
        createElement(
          "span",
          "calendar-day-meta"
        );

      if (starts) {
        meta.appendChild(
          createElement(
            "span",
            "starts",
            "開始" + starts
          )
        );
      }

      if (ends) {
        meta.appendChild(
          createElement(
            "span",
            "ends",
            "最終" + ends
          )
        );
      }

      button.appendChild(meta);
    }

    button.addEventListener(
      "click",
      () => {
        selectedDate = date;
        calendarMonth =
          date.slice(0, 7);
        renderCalendar();
        writeCalendarUrl();
        $("#calendar-day-title")
          ?.scrollIntoView({
            behavior:
              window.matchMedia(
                "(prefers-reduced-motion: reduce)"
              ).matches
                ? "auto"
                : "smooth",
            block: "start"
          });
      }
    );

    grid.appendChild(button);
  }

  renderCalendarDayList();
}


function changeCalendarMonth(
  amount
) {
  const [year, month] =
    calendarMonth.split("-")
      .map(Number);
  const date =
    new Date(
      Date.UTC(
        year,
        month - 1 + amount,
        1
      )
    );

  calendarMonth =
    date.toISOString()
      .slice(0, 7);
  selectedDate =
    calendarMonth + "-01";
  renderCalendar();
  writeCalendarUrl();
}


function populateCalendarPrefectures() {
  const select =
    $("#calendar-prefecture");
  const prefectures =
    new Set(
      spots.map(
        spot =>
          spot._prefecture
      ).filter(Boolean)
    );

  PREFECTURE_ORDER.forEach(
    prefecture => {
      if (!prefectures.has(prefecture)) {
        return;
      }

      const option =
        document.createElement(
          "option"
        );
      option.value = prefecture;
      option.textContent = prefecture;
      select.appendChild(option);
    }
  );

  if (
    params.get("pref") &&
    Array.from(select.options)
      .some(
        option =>
          option.value ===
          params.get("pref")
      )
  ) {
    select.value =
      params.get("pref");
  }
}


// ============================================================
// 今日のプラン
// ============================================================

function getWorkingPlanSpots() {
  return workingPlanIds
    .map(
      id =>
        spotsById.get(id)
    )
    .filter(Boolean);
}


function getPlanDistance(
  planSpots
) {
  let distance = 0;

  for (
    let index = 1;
    index < planSpots.length;
    index += 1
  ) {
    distance +=
      getDistanceMeters(
        planSpots[index - 1],
        planSpots[index]
      );
  }

  return distance;
}


function persistPlanIfNeeded() {
  if (!viewingSharedPlan) {
    savePlan();
  }

  updateHeroCounts();
}


function addSpotToPlan(
  spotId
) {
  if (
    !spotsById.has(spotId) ||
    workingPlanIds.includes(spotId)
  ) {
    return;
  }

  if (
    workingPlanIds.length >=
    PLAN_MAX_SPOTS
  ) {
    showStatus(
      "1つのプランへ追加できるのは" +
      PLAN_MAX_SPOTS +
      "件までです。",
      "error"
    );
    return;
  }

  workingPlanIds.push(spotId);
  persistPlanIfNeeded();
  renderPlan();
  showStatus(
    "今日のプランへ追加しました。",
    "success"
  );
}


function movePlanSpot(
  index,
  direction
) {
  const target =
    index + direction;

  if (
    target < 0 ||
    target >= workingPlanIds.length
  ) {
    return;
  }

  [
    workingPlanIds[index],
    workingPlanIds[target]
  ] = [
    workingPlanIds[target],
    workingPlanIds[index]
  ];

  persistPlanIfNeeded();
  renderPlan();
}


function removePlanSpot(
  spotId
) {
  workingPlanIds =
    workingPlanIds.filter(
      id => id !== spotId
    );
  persistPlanIfNeeded();
  renderPlan();
}


function getOptimizedPlanOrder(
  planSpots
) {
  if (planSpots.length < 3) {
    return planSpots.slice();
  }

  let bestOrder = null;
  let bestDistance = Infinity;

  const consider =
    order => {
      const distance =
        getPlanDistance(order);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestOrder = order.slice();
      }
    };

  if (planSpots.length <= 8) {
    const permute =
      (remaining, order) => {
        if (!remaining.length) {
          consider(order);
          return;
        }

        remaining.forEach(
          (spot, index) => {
            permute(
              remaining.filter(
                (_, itemIndex) =>
                  itemIndex !== index
              ),
              [...order, spot]
            );
          }
        );
      };

    permute(
      planSpots,
      []
    );
    return bestOrder;
  }

  planSpots.forEach(
    startingSpot => {
      const remaining =
        planSpots.filter(
          spot =>
            spot !== startingSpot
        );
      const order =
        [startingSpot];

      while (remaining.length) {
        const current =
          order[order.length - 1];
        remaining.sort(
          (first, second) =>
            getDistanceMeters(
              current,
              first
            ) -
            getDistanceMeters(
              current,
              second
            )
        );
        order.push(
          remaining.shift()
        );
      }

      consider(order);
    }
  );

  return bestOrder;
}


function getGoogleMapsRouteUrl(
  planSpots
) {
  if (planSpots.length < 2) {
    return "";
  }

  const url =
    new URL(
      "https://www.google.com/maps/dir/"
    );
  url.searchParams.set(
    "api",
    "1"
  );
  url.searchParams.set(
    "origin",
    planSpots[0].lat +
    "," +
    planSpots[0].lng
  );
  url.searchParams.set(
    "destination",
    planSpots.at(-1).lat +
    "," +
    planSpots.at(-1).lng
  );

  if (planSpots.length > 2) {
    url.searchParams.set(
      "waypoints",
      planSpots.slice(1, -1)
        .map(
          spot =>
            spot.lat +
            "," +
            spot.lng
        )
        .join("|")
    );
  }

  url.searchParams.set(
    "travelmode",
    "transit"
  );

  return url.toString();
}


function getPlanShareUrl() {
  const url =
    new URL(
      "./journal.html",
      window.location.href
    );
  url.searchParams.set(
    "view",
    "plan"
  );
  url.searchParams.set(
    "plan",
    workingPlanIds.join(",")
  );
  return url.toString();
}


function renderSharedPlanBanner() {
  const banner =
    $("#shared-plan-banner");

  if (banner) {
    banner.hidden =
      !viewingSharedPlan;
  }
}


function createPlanStop(
  spot,
  index,
  total
) {
  const item =
    createElement(
      "article",
      "plan-stop"
    );
  item.appendChild(
    createElement(
      "span",
      "plan-stop-number",
      String(index + 1)
    )
  );

  const copy =
    createElement(
      "div",
      "plan-stop-copy"
    );
  copy.appendChild(
    createElement(
      "strong",
      "",
      spot.name
    )
  );
  copy.appendChild(
    createElement(
      "span",
      "",
      spot.address ||
      getPlaceTypeLabel(
        spot.placeType
      )
    )
  );
  item.appendChild(copy);

  const actions =
    createElement(
      "div",
      "plan-stop-actions"
    );

  [
    ["↑", -1, index === 0, "1つ前へ"],
    ["↓", 1, index === total - 1, "1つ後へ"]
  ].forEach(
    ([label, direction, disabled, ariaLabel]) => {
      const button =
        createElement(
          "button",
          "",
          label
        );
      button.type = "button";
      button.disabled = disabled;
      button.setAttribute(
        "aria-label",
        spot.name +
        "を" +
        ariaLabel
      );
      button.addEventListener(
        "click",
        () => {
          movePlanSpot(
            index,
            direction
          );
        }
      );
      actions.appendChild(button);
    }
  );

  const mapLink =
    createElement(
      "a",
      "",
      "地図"
    );
  mapLink.href =
    getSpotMapUrl(spot);
  mapLink.setAttribute(
    "aria-label",
    spot.name +
    "を地図で見る"
  );
  mapLink.className =
    "plan-stop-map";
  actions.appendChild(mapLink);

  const detailLink =
    createElement(
      "a",
      "",
      "詳細"
    );
  detailLink.href =
    getSpotPageUrl(spot);
  detailLink.setAttribute(
    "aria-label",
    spot.name +
    "の詳しい情報を見る"
  );
  actions.appendChild(detailLink);

  const removeButton =
    createElement(
      "button",
      "",
      "×"
    );
  removeButton.type = "button";
  removeButton.setAttribute(
    "aria-label",
    spot.name +
    "をプランから外す"
  );
  removeButton.addEventListener(
    "click",
    () => {
      removePlanSpot(spot.id);
    }
  );
  actions.appendChild(removeButton);
  item.appendChild(actions);

  return item;
}


function renderPlanCandidates() {
  const list =
    $("#plan-candidate-list");
  const query =
    normalizeSearchText(
      $("#plan-search")?.value
    );
  const source =
    $("#plan-candidate-source")?.value ||
    "favorite";

  const candidates =
    spots
      .filter(
        spot =>
          !workingPlanIds.includes(
            spot.id
          ) &&
          (
            source !== "favorite" ||
            favoriteSpotIds.has(
              spot.id
            )
          ) &&
          (
            !query ||
            spot._searchText.includes(
              query
            )
          )
      )
      .sort(
        (first, second) =>
          Number(
            favoriteSpotIds.has(
              second.id
            )
          ) -
          Number(
            favoriteSpotIds.has(
              first.id
            )
          ) ||
          first.name.localeCompare(
            second.name,
            "ja"
          )
      )
      .slice(0, 40);

  list.replaceChildren();

  if (!candidates.length) {
    list.appendChild(
      createElement(
        "p",
        "plan-empty",
        source === "favorite"
          ? "追加できる「行きたい」スポットがありません。地図で行きたい場所を保存するか、「すべてのスポットから」に切り替えてください。"
          : "検索条件に合う追加候補がありません。"
      )
    );
    return;
  }

  candidates.forEach(
    spot => {
      const item =
        createElement(
          "article",
          "plan-candidate"
        );
      const copy =
        createElement(
          "div",
          "plan-candidate-copy"
        );
      copy.appendChild(
        createElement(
          "strong",
          "",
          spot.name
        )
      );
      copy.appendChild(
        createElement(
          "span",
          "",
          (
            favoriteSpotIds.has(
              spot.id
            )
              ? "♡ 行きたい・"
              : ""
          ) +
          (
            spot._prefecture ||
            getPlaceTypeLabel(
              spot.placeType
            )
          )
        )
      );
      item.appendChild(copy);

      const addButton =
        createElement(
          "button",
          "",
          "追加"
        );
      addButton.type = "button";
      addButton.addEventListener(
        "click",
        () => {
          addSpotToPlan(spot.id);
        }
      );
      item.appendChild(addButton);
      list.appendChild(item);
    }
  );
}


function renderPlan() {
  if (!spots.length) {
    return;
  }

  const planSpots =
    getWorkingPlanSpots();
  const list =
    $("#plan-list");
  const routeLink =
    $("#plan-route");

  $("#plan-summary-count").textContent =
    String(planSpots.length);
  $("#plan-summary-distance").textContent =
    planSpots.length > 1
      ? formatDistance(
          getPlanDistance(
            planSpots
          )
        )
      : "--";

  list.replaceChildren();

  if (!planSpots.length) {
    list.appendChild(
      createElement(
        "p",
        "plan-empty",
        "まだ今日のプランは空です。右側の「行きたい」から、今日回りたいスポットを追加してください。"
      )
    );
  } else {
    list.append(
      ...planSpots.map(
        (spot, index) =>
          createPlanStop(
            spot,
            index,
            planSpots.length
          )
      )
    );
  }

  const routeUrl =
    getGoogleMapsRouteUrl(
      planSpots
    );
  routeLink.href =
    routeUrl || "#";
  routeLink.setAttribute(
    "aria-disabled",
    String(!routeUrl)
  );

  $("#plan-optimize").disabled =
    planSpots.length < 3;
  $("#plan-share").disabled =
    planSpots.length === 0;

  renderSharedPlanBanner();
  renderPlanCandidates();
}


// ============================================================
// わたしの足あと
// ============================================================

function isActivityEvent(
  spot
) {
  return (
    spot.category === "official" &&
    spot.periodType === "limited" &&
    spot.relationType !== "official_facility" &&
    spot.eventStatus !== "cancelled"
  );
}


function isActiveActivityEvent(
  spot,
  today
) {
  return (
    !spot._archive &&
    isActivityEvent(spot) &&
    (!spot.startDate || spot.startDate <= today) &&
    (!spot.endDate || spot.endDate >= today)
  );
}


function overlapsYear(
  spot,
  year
) {
  const firstDay =
    year + "-01-01";
  const lastDay =
    year + "-12-31";
  const startDate =
    spot.startDate ||
    "0000-01-01";
  const endDate =
    spot.endDate ||
    "9999-12-31";

  return (
    startDate <= lastDay &&
    endDate >= firstDay
  );
}


function getActivityData() {
  const today =
    getTodayInJapan();
  const currentYear =
    today.slice(0, 4);
  const visitedSpots =
    spots.filter(
      spot =>
        visitedSpotIds.has(
          spot.id
        )
    );
  const favoriteSpots =
    spots.filter(
      spot =>
        favoriteSpotIds.has(
          spot.id
        )
    );
  const prefectureCounts =
    new Map();

  visitedSpots.forEach(
    spot => {
      if (!spot._prefecture) {
        return;
      }

      prefectureCounts.set(
        spot._prefecture,
        (
          prefectureCounts.get(
            spot._prefecture
          ) || 0
        ) + 1
      );
    }
  );

  const permanentOfficial =
    spots.filter(
      spot =>
        !spot._archive &&
        spot.category === "official" &&
        spot.periodType === "permanent"
    );
  const naganoSpots =
    spots.filter(
      spot =>
        spot.category === "nagano"
    );
  const activeEvents =
    spots.filter(
      spot =>
        isActiveActivityEvent(
          spot,
          today
        )
    );
  const yearEvents =
    spots.filter(
      spot =>
        isActivityEvent(spot) &&
        overlapsYear(
          spot,
          currentYear
        )
    );
  const pastVisitedEvents =
    visitedSpots.filter(
      spot =>
        spot._archive &&
        isActivityEvent(spot)
    );
  const pastParticipationByYear =
    new Map();

  pastVisitedEvents.forEach(
    spot => {
      const year =
        String(
          spot.startDate ||
          spot.endDate ||
          ""
        ).slice(0, 4);

      if (!/^\d{4}$/.test(year)) {
        return;
      }

      pastParticipationByYear.set(
        year,
        (
          pastParticipationByYear.get(
            year
          ) || 0
        ) + 1
      );
    }
  );

  const brandCollections =
    BRAND_COLLECTIONS.map(
      ([brand, label]) => {
        const brandSpots =
          spots.filter(
            spot =>
              !spot._archive &&
              spot.category === "official" &&
              spot.brand === brand
          );

        return {
          brand,
          label,
          total:
            brandSpots.length,
          visited:
            brandSpots.filter(
              spot =>
                visitedSpotIds.has(
                  spot.id
                )
            ).length
        };
      }
    ).filter(
      collection =>
        collection.total > 0
    );

  return {
    today,
    currentYear,
    visitedSpots,
    favoriteSpots,
    prefectureCounts,
    permanentOfficial,
    permanentOfficialVisited:
      permanentOfficial.filter(
        spot =>
          visitedSpotIds.has(
            spot.id
          )
      ).length,
    naganoSpots,
    naganoVisited:
      naganoSpots.filter(
        spot =>
          visitedSpotIds.has(
            spot.id
          )
      ).length,
    activeEvents,
    activeEventsVisited:
      activeEvents.filter(
        spot =>
          visitedSpotIds.has(
            spot.id
          )
      ).length,
    unvisitedActiveEvents:
      activeEvents.filter(
        spot =>
          !visitedSpotIds.has(
            spot.id
          )
      ).sort(
        (first, second) =>
          (first.endDate || "9999-12-31")
            .localeCompare(
              second.endDate || "9999-12-31"
            ) ||
          first.name.localeCompare(
            second.name,
            "ja"
          )
      ),
    yearEvents,
    yearEventsVisited:
      yearEvents.filter(
        spot =>
          visitedSpotIds.has(
            spot.id
          )
      ).length,
    pastVisitedEvents,
    pastParticipationByYear,
    brandCollections
  };
}


function getActivityMessage(
  data
) {
  const visitedCount =
    data.visitedSpots.length;
  const prefectureCount =
    data.prefectureCounts.size;

  if (!visitedCount) {
    return {
      title: "まだ訪問記録はありません。",
      text: "訪問記録から、あなたのちい活を自動で集計します。訪れたスポットで「行った！」を登録してみましょう。"
    };
  }

  return {
    title: `${visitedCount}スポットのちい活記録`,
    text: `訪問記録から、あなたのちい活を自動で集計します。現在は${prefectureCount}都道府県に記録があります。`
  };
}


function renderPrefectureFootprints(
  data
) {
  const container =
    $("#activity-prefecture-map");
  container.replaceChildren();

  PREFECTURE_REGIONS.forEach(
    ([regionName, prefectures]) => {
      const region =
        createElement(
          "section",
          "prefecture-region"
        );
      region.appendChild(
        createElement(
          "span",
          "prefecture-region-name",
          regionName
        )
      );

      const list =
        createElement(
          "div",
          "prefecture-region-list"
        );

      prefectures.forEach(
        prefecture => {
          const count =
            data.prefectureCounts.get(
              prefecture
            ) || 0;
          const chip =
            createElement(
              "span",
              "prefecture-chip" +
              (
                count
                  ? " is-visited"
                  : ""
              ),
              prefecture.replace(
                /[都道府県]$/,
                ""
              )
            );

          if (count) {
            chip.appendChild(
              createElement(
                "strong",
                "",
                count + "件"
              )
            );
          }

          list.appendChild(chip);
        }
      );

      region.appendChild(list);
      container.appendChild(region);
    }
  );
}


function appendProgressItem(
  container,
  label,
  current,
  total,
  suffix = "",
  options = {}
) {
  const item =
    createElement(
      options.targetId
        ? "button"
        : "div",
      "activity-progress-item"
    );

  if (options.targetId) {
    item.type = "button";
    item.addEventListener(
      "click",
      () => {
        const target =
          document.getElementById(
            options.targetId
          );
        target?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
        target?.focus({
          preventScroll: true
        });
      }
    );
  }
  const copy =
    createElement(
      "div",
      "activity-progress-copy"
    );
  copy.appendChild(
    createElement(
      "span",
      "",
      label
    )
  );
  copy.appendChild(
    createElement(
      "strong",
      "",
      current +
      (total ? " / " + total : "") +
      suffix
    )
  );
  item.appendChild(copy);

  const track =
    createElement(
      "div",
      "activity-progress-track"
    );
  const bar =
    createElement(
      "div",
      "activity-progress-bar"
    );
  bar.style.width =
    Math.min(
      100,
      total
        ? current / total * 100
        : current
          ? 100
          : 0
    ) + "%";
  track.appendChild(bar);
  item.appendChild(track);

  if (options.actionLabel) {
    item.appendChild(
      createElement(
        "span",
        "activity-progress-action",
        options.actionLabel
      )
    );
  }

  container.appendChild(item);
}


function renderActivityProgress(
  data
) {
  const container =
    $("#activity-progress");
  container.replaceChildren();

  appendProgressItem(
    container,
    "常設の公式スポット",
    data.permanentOfficialVisited,
    data.permanentOfficial.length,
    "件"
  );
  appendProgressItem(
    container,
    "現在開催中の期間限定イベント",
    data.activeEventsVisited,
    data.activeEvents.length,
    "件",
    {
      targetId:
        "activity-next-events",
      actionLabel:
        data.unvisitedActiveEvents.length
          ? `未訪問の${data.unvisitedActiveEvents.length}件を見る ↓`
          : "開催中イベントをすべて訪問済みです"
    }
  );
  appendProgressItem(
    container,
    `${data.currentYear}年開催イベント`,
    data.yearEventsVisited,
    data.yearEvents.length,
    "件"
  );
  appendProgressItem(
    container,
    "ナガセン関連スポット",
    data.naganoVisited,
    data.naganoSpots.length,
    "件"
  );
}


function getActivityEventTimingLabel(
  spot,
  today
) {
  if (!spot.endDate) {
    return "終了日未定";
  }

  const endDate =
    parseDateString(
      spot.endDate
    );
  const currentDate =
    parseDateString(today);

  if (!endDate || !currentDate) {
    return spot.endDate;
  }

  const days =
    Math.round(
      (endDate - currentDate) /
      86400000
    );

  if (days === 0) {
    return "本日まで";
  }

  if (days > 0 && days <= 14) {
    return `あと${days}日`;
  }

  return `${spot.endDate.replaceAll("-", "/")}まで`;
}


function renderActivityNextEvents(
  data
) {
  const container =
    $("#activity-next-list");
  const summary =
    $("#activity-next-summary");
  const moreButton =
    $("#activity-next-more");
  const events =
    data.unvisitedActiveEvents;
  const visibleEvents =
    showAllActivityNextEvents
      ? events
      : events.slice(0, 6);

  container.replaceChildren();
  summary.textContent =
    events.length
      ? `${events.length}件の候補があります`
      : "開催中イベントはすべて訪問済みです";

  if (!events.length) {
    container.appendChild(
      createElement(
        "p",
        "activity-empty",
        data.activeEvents.length
          ? "現在開催中の期間限定イベントはすべて「行った！」に登録されています。"
          : "現在開催中として登録されている期間限定イベントはありません。"
      )
    );
    moreButton.hidden = true;
    return;
  }

  visibleEvents.forEach(
    spot => {
      const card =
        createElement(
          "article",
          "activity-next-card"
        );
      const meta =
        createElement(
          "div",
          "activity-next-card-meta"
        );

      if (spot._prefecture) {
        meta.appendChild(
          createElement(
            "span",
            "",
            spot._prefecture
          )
        );
      }

      meta.appendChild(
        createElement(
          "span",
          "",
          getActivityEventTimingLabel(
            spot,
            data.today
          )
        )
      );
      card.appendChild(meta);
      card.appendChild(
        createElement(
          "strong",
          "",
          spot.name
        )
      );

      const link =
        createElement(
          "a",
          "",
          "地図で確認する →"
        );
      link.href =
        getSpotMapUrl(spot);
      card.appendChild(link);
      container.appendChild(card);
    }
  );

  moreButton.hidden =
    events.length <= 6;
  moreButton.textContent =
    showAllActivityNextEvents
      ? "表示を少なくする"
      : `残り${events.length - 6}件も表示`;
}


function renderBrandCollections(
  data
) {
  const container =
    $("#activity-brand-collections");
  container.replaceChildren();

  data.brandCollections.forEach(
    collection => {
      const card =
        createElement(
          "div",
          "activity-brand-card"
        );
      const copy =
        createElement(
          "div",
          "activity-brand-copy"
        );
      copy.appendChild(
        createElement(
          "span",
          "",
          collection.label
        )
      );
      copy.appendChild(
        createElement(
          "strong",
          "",
          `${collection.visited} / ${collection.total}`
        )
      );
      card.appendChild(copy);

      const track =
        createElement(
          "div",
          "activity-progress-track"
        );
      const bar =
        createElement(
          "div",
          "activity-progress-bar"
        );
      bar.style.width =
        Math.min(
          100,
          collection.visited /
            collection.total *
            100
        ) + "%";
      track.appendChild(bar);
      card.appendChild(track);
      container.appendChild(card);
    }
  );
}


function renderPastParticipation(
  data
) {
  const container =
    $("#activity-event-history");
  container.replaceChildren();

  const total =
    createElement(
      "div",
      "activity-history-total"
    );
  total.appendChild(
    createElement(
      "span",
      "",
      "過去イベント累計参加数"
    )
  );
  total.appendChild(
    createElement(
      "strong",
      "",
      data.pastVisitedEvents.length +
        "件"
    )
  );
  container.appendChild(total);

  const years =
    Array.from(
      data.pastParticipationByYear.entries()
    ).sort(
      ([firstYear], [secondYear]) =>
        secondYear.localeCompare(
          firstYear
        )
    );

  if (!years.length) {
    container.appendChild(
      createElement(
        "p",
        "activity-empty",
        "過去の店舗・イベントで「行った！」を登録すると、年ごとの参加数を確認できます。"
      )
    );
    return;
  }

  const list =
    createElement(
      "div",
      "activity-history-years"
    );
  years.forEach(
    ([year, count]) => {
      const row =
        createElement(
          "div",
          "activity-history-year"
        );
      row.appendChild(
        createElement(
          "span",
          "",
          year + "年"
        )
      );
      row.appendChild(
        createElement(
          "strong",
          "",
          count + "件"
        )
      );
      list.appendChild(row);
    }
  );
  container.appendChild(list);
}


function renderRecentActivity(
  data
) {
  const container =
    $("#recent-activity-list");
  const recent =
    data.visitedSpots
      .map(
        spot => ({
          spot,
          detail:
            visitDetailsBySpotId.get(
              spot.id
            ) || null
        })
      )
      .filter(
        item =>
          isDateString(
            item.detail?.visitedAt
          )
      )
      .sort(
        (first, second) =>
          second.detail.visitedAt
            .localeCompare(
              first.detail.visitedAt
            )
      )
      .slice(0, 6);

  container.replaceChildren();

  if (!recent.length) {
    container.appendChild(
      createElement(
        "p",
        "activity-empty",
        data.visitedSpots.length
          ? "「行った！」スポットの詳細から訪問日を登録すると、最近の思い出がここに並びます。"
          : "訪れたスポットで「行った！」を登録すると、思い出がここに並びます。"
      )
    );
    return;
  }

  recent.forEach(
    ({ spot, detail }) => {
      const card =
        createElement(
          "article",
          "recent-activity-card"
        );
      const time =
        createElement(
          "time",
          "",
          formatDateJapanese(
            detail.visitedAt,
            {
              weekday: false
            }
          )
        );
      time.dateTime =
        detail.visitedAt;
      card.appendChild(time);
      card.appendChild(
        createElement(
          "strong",
          "",
          spot.name
        )
      );

      if (detail.note) {
        card.appendChild(
          createElement(
            "p",
            "",
            detail.note
          )
        );
      }

      const link =
        createElement(
          "a",
          "",
          "思い出を開く"
        );
      link.href =
        getSpotMapUrl(spot);
      card.appendChild(link);
      container.appendChild(card);
    }
  );
}


function renderActivity() {
  if (!spots.length) {
    return;
  }

  const data =
    getActivityData();
  const message =
    getActivityMessage(data);

  $("#activity-message").textContent =
    message.title;
  $("#activity-submessage").textContent =
    message.text;
  $("#activity-visited-total").textContent =
    String(data.visitedSpots.length);
  $("#activity-prefecture-total").textContent =
    String(data.prefectureCounts.size);
  $("#activity-favorite-total").textContent =
    String(data.favoriteSpots.length);

  renderPrefectureFootprints(data);
  renderActivityProgress(data);
  renderActivityNextEvents(data);
  renderBrandCollections(data);
  renderPastParticipation(data);
  renderRecentActivity(data);
}


function drawRoundRect(
  context,
  x,
  y,
  width,
  height,
  radius,
  color
) {
  context.beginPath();
  context.roundRect(
    x,
    y,
    width,
    height,
    radius
  );
  context.fillStyle = color;
  context.fill();
}


function drawWrappedText(
  context,
  text,
  x,
  y,
  maxWidth,
  lineHeight,
  maxLines = 3
) {
  const characters =
    Array.from(text);
  let line = "";
  let lineIndex = 0;

  characters.forEach(
    character => {
      if (lineIndex >= maxLines) {
        return;
      }

      const candidate =
        line + character;

      if (
        context.measureText(candidate)
          .width > maxWidth &&
        line
      ) {
        context.fillText(
          line,
          x,
          y + lineIndex * lineHeight
        );
        line = character;
        lineIndex += 1;
      } else {
        line = candidate;
      }
    }
  );

  if (
    line &&
    lineIndex < maxLines
  ) {
    context.fillText(
      line,
      x,
      y + lineIndex * lineHeight
    );
  }
}


async function createActivityImage() {
  const data =
    getActivityData();
  const canvas =
    document.createElement(
      "canvas"
    );
  canvas.width = 1200;
  canvas.height = 675;
  const context =
    canvas.getContext("2d");

  await document.fonts?.ready;

  const background =
    context.createLinearGradient(
      0,
      0,
      1200,
      675
    );
  background.addColorStop(
    0,
    "#fff4fa"
  );
  background.addColorStop(
    0.52,
    "#f8f5ff"
  );
  background.addColorStop(
    1,
    "#effbf5"
  );
  context.fillStyle = background;
  context.fillRect(
    0,
    0,
    1200,
    675
  );

  context.fillStyle =
    "rgba(233, 121, 165, 0.18)";
  context.beginPath();
  context.arc(
    90,
    70,
    150,
    0,
    Math.PI * 2
  );
  context.fill();

  context.fillStyle =
    "rgba(100, 179, 139, 0.17)";
  context.beginPath();
  context.arc(
    1100,
    610,
    190,
    0,
    Math.PI * 2
  );
  context.fill();

  drawRoundRect(
    context,
    54,
    44,
    1092,
    587,
    36,
    "rgba(255,255,255,0.88)"
  );

  context.fillStyle = "#8a72dc";
  context.font =
    '900 20px "Zen Maru Gothic", sans-serif';
  context.fillText(
    "CHIIKATSU MAP",
    96,
    105
  );

  context.fillStyle = "#4d4050";
  context.font =
    '900 43px "Zen Maru Gothic", sans-serif';
  context.fillText(
    "わたしのちい活記録",
    96,
    162
  );

  const stats = [
    [data.visitedSpots.length, "行ったスポット", "#c95f8c"],
    [data.prefectureCounts.size, "訪問都道府県", "#6a59c8"],
    [data.favoriteSpots.length, "次に行きたい", "#3f8965"]
  ];

  stats.forEach(
    ([number, label, color], index) => {
      const x =
        96 + index * 320;
      drawRoundRect(
        context,
        x,
        192,
        292,
        126,
        24,
        index === 0
          ? "#fff0f6"
          : index === 1
            ? "#f1edff"
            : "#eaf8f1"
      );
      context.fillStyle = color;
      context.font =
        '900 52px "Zen Maru Gothic", sans-serif';
      context.fillText(
        String(number),
        x + 24,
        253
      );
      context.fillStyle = "#766a78";
      context.font =
        '700 17px "Zen Maru Gothic", sans-serif';
      context.fillText(
        label,
        x + 24,
        292
      );
    }
  );

  const progress = [
    ["常設スポット", data.permanentOfficialVisited, data.permanentOfficial.length, "#c95f8c"],
    ["開催中イベント", data.activeEventsVisited, data.activeEvents.length, "#6a59c8"],
    [`${data.currentYear}年イベント`, data.yearEventsVisited, data.yearEvents.length, "#d08448"],
    ["ナガセン", data.naganoVisited, data.naganoSpots.length, "#3f8965"]
  ];

  progress.forEach(
    ([label, current, total, color], index) => {
      const x =
        96 + index * 250;
      drawRoundRect(
        context,
        x,
        350,
        230,
        134,
        20,
        "#fffafd"
      );
      context.fillStyle = "#6f6272";
      context.font =
        '800 15px "Zen Maru Gothic", sans-serif';
      context.fillText(
        label,
        x + 18,
        382
      );
      context.fillStyle = color;
      context.font =
        '900 31px "Zen Maru Gothic", sans-serif';
      context.fillText(
        `${current} / ${total}`,
        x + 18,
        428
      );

      drawRoundRect(
        context,
        x + 18,
        450,
        194,
        10,
        5,
        "#eee8ef"
      );
      const progressWidth =
        Math.max(
          0,
          Math.min(
            194,
            total
              ? 194 * current / total
              : 0
          )
        );

      if (progressWidth > 0) {
        drawRoundRect(
          context,
          x + 18,
          450,
          progressWidth,
          10,
          5,
          color
        );
      }
    }
  );

  const brandHighlights =
    data.brandCollections
      .filter(
        collection =>
          collection.visited > 0
      )
      .sort(
        (first, second) =>
          second.visited / second.total -
            first.visited / first.total ||
          second.visited -
            first.visited
      )
      .slice(0, 3);

  context.fillStyle = "#4e4251";
  context.font =
    '900 17px "Zen Maru Gothic", sans-serif';
  context.fillText(
    "ブランド別コレクション",
    96,
    526
  );
  context.fillStyle = "#796d7b";
  context.font =
    '700 15px "Zen Maru Gothic", sans-serif';
  context.fillText(
    brandHighlights.length
      ? brandHighlights.map(
          collection =>
            `${collection.label} ${collection.visited}/${collection.total}`
        ).join("  ・  ")
      : "訪問記録を追加すると、ブランド別の進捗が表示されます。",
    96,
    558,
    1000
  );

  context.fillStyle = "#9a8e9b";
  context.font =
    '700 15px "Zen Maru Gothic", sans-serif';
  context.fillText(
    "行った場所を記録して、自分だけのちい活記録をつくろう。",
    96,
    598,
    565
  );
  context.fillStyle = "#8a72dc";
  context.font =
    '900 15px "Zen Maru Gothic", sans-serif';
  context.fillText(
    "chiikatsu-map.com  #ちい活MAP  |  非公式ファンサイト",
    674,
    598,
    430
  );

  return new Promise(
    resolve => {
      canvas.toBlob(
        resolve,
        "image/png"
      );
    }
  );
}


function getActivityShareUrl() {
  return new URL(
    "./journal.html?view=activity",
    window.location.href
  ).toString();
}


function getActivityShareText() {
  const data =
    getActivityData();

  return [
    "ちい活MAPで、これまでのちい活をまとめてみました📍",
    `行ったスポット ${data.visitedSpots.length}件・訪問都道府県 ${data.prefectureCounts.size}`,
    "自分だけのちい活記録もつくれます。",
    "#ちい活MAP #ちいかわ"
  ].join("\n");
}


function downloadActivityImage(
  blob
) {
  const downloadUrl =
    URL.createObjectURL(blob);
  const link =
    document.createElement("a");
  link.href = downloadUrl;
  link.download =
    "watashi-no-chiikatsu-" +
    getTodayInJapan() +
    ".png";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        downloadUrl
      );
    },
    0
  );
}


async function shareActivityImage() {
  const button =
    $("#activity-share-image");
  button.disabled = true;
  button.textContent =
    "画像を作成中…";

  try {
    const blob =
      await createActivityImage();

    if (!blob) {
      throw new Error(
        "CanvasからPNGを生成できませんでした。"
      );
    }

    const file =
      new File(
        [blob],
        "watashi-no-chiikatsu.png",
        {
          type: "image/png"
        }
      );

    if (
      navigator.share &&
      navigator.canShare?.({
        files: [file]
      })
    ) {
      try {
        await navigator.share({
          title: "わたしのちい活記録",
          text: getActivityShareText(),
          files: [file],
          url: getActivityShareUrl()
        });
        return;
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }
      }
    }

    downloadActivityImage(blob);
    showStatus(
      "共有用画像を保存しました。Xなどの投稿画面から画像を選んでご利用ください。",
      "success"
    );
  } catch (error) {
    console.error(
      "共有画像を作成できませんでした。",
      error
    );
    showStatus(
      "共有画像を作成できませんでした。もう一度お試しください。",
      "error"
    );
  } finally {
    button.disabled = false;
    button.textContent =
      "画像を作る・共有";
  }
}


function getXIntentUrl() {
  const intent =
    new URL(
      "https://twitter.com/intent/tweet"
    );
  intent.searchParams.set(
    "text",
    getActivityShareText()
  );
  intent.searchParams.set(
    "url",
    getActivityShareUrl()
  );
  return intent.toString();
}


async function postActivityToX() {
  const button =
    $("#activity-share-x");
  const isTouchDevice =
    window.matchMedia?.(
      "(pointer: coarse)"
    ).matches;
  const intentWindow =
    !isTouchDevice
      ? window.open(
          "about:blank",
          "chiikatsu-x-share"
        )
      : null;

  button.disabled = true;
  button.textContent =
    "投稿を準備中…";

  try {
    const blob =
      await createActivityImage();

    if (!blob) {
      throw new Error(
        "CanvasからPNGを生成できませんでした。"
      );
    }

    const file =
      new File(
        [blob],
        "watashi-no-chiikatsu.png",
        {
          type: "image/png"
        }
      );

    if (
      isTouchDevice &&
      navigator.share &&
      navigator.canShare?.({
        files: [file]
      })
    ) {
      try {
        await navigator.share({
          title: "わたしのちい活記録",
          text: getActivityShareText(),
          files: [file],
          url: getActivityShareUrl()
        });
        return;
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }
      }
    }

    let imageCopied = false;

    if (
      window.isSecureContext &&
      navigator.clipboard?.write &&
      typeof ClipboardItem ===
        "function"
    ) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob
          })
        ]);
        imageCopied = true;
      } catch (error) {
        console.info(
          "共有画像をクリップボードへコピーできませんでした。",
          error
        );
      }
    }

    if (!imageCopied) {
      downloadActivityImage(blob);
    }

    const intentUrl =
      getXIntentUrl();

    if (intentWindow) {
      intentWindow.location.replace(
        intentUrl
      );
    } else {
      window.open(
        intentUrl,
        "_blank",
        "noopener,noreferrer"
      );
    }

    showStatus(
      imageCopied
        ? "共有画像をコピーしてXの投稿画面を開きました。投稿画面で画像を貼り付けてください。"
        : "共有画像を保存してXの投稿画面を開きました。保存した画像を添付してください。",
      "success"
    );
  } catch (error) {
    intentWindow?.close();
    console.error(
      "Xへの投稿を準備できませんでした。",
      error
    );
    showStatus(
      "Xへの投稿を準備できませんでした。もう一度お試しください。",
      "error"
    );
  } finally {
    button.disabled = false;
    button.textContent =
      "Xに投稿";
  }
}


function formatCloudSyncTime(
  value
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(date);
}


function renderCloudSyncState(
  state
) {
  const card =
    $("#cloud-sync-card");

  if (!card) {
    return;
  }

  card.hidden =
    !state.available;

  if (!state.available) {
    return;
  }

  const signInButton =
    $("#cloud-sync-sign-in");
  const syncButton =
    $("#cloud-sync-now");
  const signOutButton =
    $("#cloud-sync-sign-out");
  const deleteButton =
    $("#cloud-sync-delete");
  const status =
    $("#cloud-sync-status");
  const description =
    $("#cloud-sync-description");
  const hasImportantRecords =
    visitedSpotIds.size >= 3 ||
    visitDetailsBySpotId.size > 0;

  signInButton.hidden =
    state.signedIn;
  syncButton.hidden =
    !state.signedIn;
  signOutButton.hidden =
    !state.signedIn;
  deleteButton.hidden =
    !state.signedIn ||
    state.needsAccountConfirmation;

  [
    signInButton,
    syncButton,
    signOutButton,
    deleteButton
  ].forEach(
    button => {
      button.disabled =
        state.syncing;
    }
  );

  if (state.needsAccountConfirmation) {
    description.textContent =
      "以前とは別のGoogleアカウントです。この端末の記録を統合する場合だけ続けてください。";
    syncButton.textContent =
      "このアカウントに統合";
    status.textContent =
      "確認待ち（まだ送信していません）";
    status.dataset.state =
      "warning";
    return;
  }

  syncButton.textContent =
    "今すぐ同期";
  description.textContent =
    state.signedIn
      ? "操作は先にこの端末へ保存し、その後クラウドへ同期します。オフラインでも記録できます。"
      : hasImportantRecords
        ? "記録が増えてきました。Googleで保存すると、機種変更やホーム画面の再追加後も復元できます。"
        : "Googleで保存すると、この端末の記録をクラウドにも残せます。ログインしなくても今までどおり使えます。";

  const lastSynced =
    formatCloudSyncTime(
      state.lastSyncedAt
    );
  const labels = {
    loading:
      "ログイン状態を確認しています…",
    "signed-out":
      "この端末だけに保存しています",
    pending:
      "端末へ保存済み・同期を待っています",
    syncing:
      "クラウドへ同期しています…",
    synced:
      lastSynced
        ? `${lastSynced}に同期済み`
        : "クラウドへ同期済み",
    offline:
      "オフラインです。端末へ保存し、接続後に同期します",
    error:
      "同期できませんでした。端末の記録は保持されています"
  };
  status.textContent =
    labels[state.status] ||
    "この端末だけに保存しています";
  status.dataset.state =
    state.status === "error"
      ? "error"
      : state.status === "offline" ||
          state.status === "pending"
        ? "warning"
        : "ok";
}


async function runCloudSyncAction(
  action,
  failureMessage
) {
  try {
    await action();
  } catch (error) {
    console.warn(
      failureMessage,
      error
    );
    showStatus(
      failureMessage +
      " 端末内の記録は保持されています。",
      "error"
    );
  }
}


window.addEventListener(
  "chiikatsu:cloud-sync-state",
  event => {
    renderCloudSyncState(
      event.detail || {}
    );
  }
);


// ============================================================
// 読み込み・イベント
// ============================================================

async function loadSpots() {
  const results =
    await Promise.allSettled(
      DATA_SOURCES.map(
        async source => {
          const response =
            await fetch(
              source.url,
              {
                cache: "no-store"
              }
            );

          if (!response.ok) {
            throw new Error(
              source.url +
              ": HTTP " +
              response.status
            );
          }

          const values =
            await response.json();

          if (!Array.isArray(values)) {
            throw new Error(
              source.url +
              "が配列ではありません。"
            );
          }

          return values.map(
            spot => ({
              ...spot,
              _archive:
                source.archive,
              _prefecture:
                getPrefecture(spot),
              _searchText:
                normalizeSearchText(
                  [
                    spot.name,
                    spot.address,
                    spot.description,
                    spot.brand
                  ].join(" ")
                )
            })
          );
        }
      )
    );

  const failed =
    results.filter(
      result =>
        result.status ===
        "rejected"
    );

  spots =
    results.flatMap(
      result =>
        result.status === "fulfilled"
          ? result.value
          : []
    );

  if (!spots.length) {
    throw new Error(
      "スポットデータを読み込めませんでした。"
    );
  }

  spotsById =
    new Map(
      spots.map(
        spot => [
          spot.id,
          spot
        ]
      )
    );

  const sharedPlanIds =
    (params.get("plan") || "")
      .split(",")
      .filter(
        (id, index, ids) =>
          id &&
          spotsById.has(id) &&
          ids.indexOf(id) === index
      )
      .slice(
        0,
        PLAN_MAX_SPOTS
      );

  if (sharedPlanIds.length) {
    workingPlanIds =
      sharedPlanIds;
    viewingSharedPlan = true;
  } else {
    workingPlanIds =
      localPlanIds.filter(
        id =>
          spotsById.has(id)
      );
  }

  populateCalendarPrefectures();
  updateHeroCounts();

  if (failed.length) {
    showStatus(
      "一部のスポットデータを読み込めませんでした。読み込めた内容で表示しています。",
      "error",
      true
    );
  }

  setJournalView(
    params.get("view") ||
    "calendar",
    {
      history: false
    }
  );
}


$$('[data-journal-view]')
  .forEach(
    button => {
      button.addEventListener(
        "click",
        () => {
          setJournalView(
            button.dataset.journalView
          );
        }
      );
    }
  );

$("#calendar-previous")
  ?.addEventListener(
    "click",
    () => {
      changeCalendarMonth(-1);
    }
  );

$("#calendar-next")
  ?.addEventListener(
    "click",
    () => {
      changeCalendarMonth(1);
    }
  );

$("#calendar-today")
  ?.addEventListener(
    "click",
    () => {
      selectedDate =
        getTodayInJapan();
      calendarMonth =
        selectedDate.slice(0, 7);
      renderCalendar();
      writeCalendarUrl();
    }
  );

[
  "#calendar-search",
  "#calendar-prefecture",
  "#calendar-category",
  "#calendar-saved"
].forEach(
  selector => {
    const element = $(selector);
    element?.addEventListener(
      element.matches(
        'input[type="search"]'
      )
        ? "input"
        : "change",
      () => {
        renderCalendar();
        writeCalendarUrl();
      }
    );
  }
);

$("#calendar-share")
  ?.addEventListener(
    "click",
    () => {
      writeCalendarUrl();
      shareUrl(
        "ちい活イベントカレンダー",
        formatDateJapanese(
          selectedDate
        ) +
        "の開催情報を表示しています",
        window.location.href,
        "カレンダーのURLをコピーしました。"
      );
    }
  );

$("#plan-search")
  ?.addEventListener(
    "input",
    renderPlanCandidates
  );

$("#plan-candidate-source")
  ?.addEventListener(
    "change",
    renderPlanCandidates
  );

$("#plan-optimize")
  ?.addEventListener(
    "click",
    () => {
      const optimized =
        getOptimizedPlanOrder(
          getWorkingPlanSpots()
        );
      workingPlanIds =
        optimized.map(
          spot => spot.id
        );
      persistPlanIfNeeded();
      renderPlan();
      showStatus(
        "スポット間の直線距離が短くなる順番を提案しました。必要に応じて上下ボタンで調整してください。",
        "success"
      );
    }
  );

$("#plan-share")
  ?.addEventListener(
    "click",
    () => {
      const planSpots =
        getWorkingPlanSpots();
      shareUrl(
        "今日のちい活プラン",
        planSpots.map(
          (spot, index) =>
            `${index + 1}. ${spot.name}`
        ).join(" / "),
        getPlanShareUrl(),
        "ちい活プランのURLをコピーしました。"
      );
    }
  );

$("#save-shared-plan")
  ?.addEventListener(
    "click",
    () => {
      if (savePlan()) {
        showStatus(
          "共有プランをこの端末へ保存しました。",
          "success"
        );
        renderPlan();
      }
    }
  );

$("#activity-share-image")
  ?.addEventListener(
    "click",
    shareActivityImage
  );

$("#activity-share-x")
  ?.addEventListener(
    "click",
    postActivityToX
  );

$("#activity-next-more")
  ?.addEventListener(
    "click",
    () => {
      showAllActivityNextEvents =
        !showAllActivityNextEvents;
      renderActivity();
    }
  );

$("#cloud-sync-sign-in")
  ?.addEventListener(
    "click",
    () => {
      runCloudSyncAction(
        () =>
          window.ChiikatsuCloudSync
            ?.signIn(),
        "Googleログインを開始できませんでした。"
      );
    }
  );

$("#cloud-sync-now")
  ?.addEventListener(
    "click",
    () => {
      const sync =
        window.ChiikatsuCloudSync;
      const state =
        sync?.getState();

      if (
        state
          ?.needsAccountConfirmation
      ) {
        if (
          !window.confirm(
            "この端末の記録を、現在選択している別のGoogleアカウントへ統合しますか？"
          )
        ) {
          return;
        }
        runCloudSyncAction(
          () =>
            sync.confirmAccountSwitch(),
          "記録を統合できませんでした。"
        );
        return;
      }

      runCloudSyncAction(
        () => sync?.syncNow(),
        "クラウドへ同期できませんでした。"
      );
    }
  );

$("#cloud-sync-sign-out")
  ?.addEventListener(
    "click",
    () => {
      runCloudSyncAction(
        () =>
          window.ChiikatsuCloudSync
            ?.signOut(),
        "ログアウトできませんでした。"
      );
    }
  );

$("#cloud-sync-delete")
  ?.addEventListener(
    "click",
    () => {
      if (
        !window.confirm(
          "クラウド上のちい活記録を削除しますか？この端末内の記録は残ります。"
        )
      ) {
        return;
      }

      runCloudSyncAction(
        async () => {
          await window
            .ChiikatsuCloudSync
            ?.deleteCloudData();
          showStatus(
            "クラウド上の記録を削除しました。この端末内の記録は残っています。",
            "success"
          );
        },
        "クラウド上の記録を削除できませんでした。"
      );
    }
  );

window.addEventListener(
  "popstate",
  () => {
    const nextParams =
      new URLSearchParams(
        window.location.search
      );
    setJournalView(
      nextParams.get("view") ||
      "calendar",
      {
        history: false
      }
    );
  }
);

window.addEventListener(
  "storage",
  event => {
    if (
      event.key === FAVORITES_STORAGE_KEY ||
      event.key === VISITED_STORAGE_KEY ||
      event.key === VISIT_DETAILS_STORAGE_KEY ||
      event.key === PLAN_STORAGE_KEY
    ) {
      favoriteSpotIds =
        loadStringSet(
          FAVORITES_STORAGE_KEY
        );
      visitedSpotIds =
        loadStringSet(
          VISITED_STORAGE_KEY
        );
      visitDetailsBySpotId =
        loadVisitDetails();
      localPlanIds =
        loadStringArray(
          PLAN_STORAGE_KEY
        );

      if (!viewingSharedPlan) {
        workingPlanIds =
          localPlanIds.filter(
            id =>
              spotsById.has(id)
          );
      }

      updateHeroCounts();
      renderCalendar();
      renderPlan();
      renderActivity();
    }
  }
);


if (params.get("q")) {
  $("#calendar-search").value =
    params.get("q");
}

if (["official", "nagano"].includes(
  params.get("category")
)) {
  $("#calendar-category").value =
    params.get("category");
}

if (["favorite", "visited"].includes(
  params.get("saved")
)) {
  $("#calendar-saved").value =
    params.get("saved");
}


loadSpots().catch(
  error => {
    console.error(
      "ちい活手帳を読み込めませんでした。",
      error
    );
    showStatus(
      "ちい活手帳を読み込めませんでした。通信状況をご確認のうえ、ページを再読み込みしてください。",
      "error",
      true
    );
  }
);

const journalScriptUrl =
  Array.from(document.scripts)
    .find(
      script =>
        /\/journal\.js(?:\?|$)/.test(
          script.src
        )
    )?.src;

if (journalScriptUrl) {
  import(
    new URL(
      "./cloud-sync-loader.js",
      journalScriptUrl
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
