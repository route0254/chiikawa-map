const FIREBASE_VERSION =
  "12.18.0";

const STORAGE_KEYS = {
  favorites:
    "chiikawa-map-favorites-v1",
  visited:
    "chiikawa-map-visited-v1",
  visitDetails:
    "chiikawa-map-visit-details-v1",
  plan:
    "chiikawa-map-plan-v1"
};

const META_STORAGE_KEY =
  "chiikawa-map-cloud-sync-meta-v1";
const STATE_EVENT =
  "chiikatsu:cloud-sync-state";
const SCHEMA_VERSION = 1;
const MAX_RECORDS = 5000;
const MAX_ID_LENGTH = 200;
const MAX_NOTE_LENGTH = 500;
const LOCAL_CHECK_INTERVAL = 2000;
const REMOTE_CHECK_INTERVAL = 300000;
const SYNC_DEBOUNCE = 5000;

let auth = null;
let database = null;
let firestoreApi = null;
let authApi = null;
let currentUser = null;
let syncInProgress = false;
let syncTimer = null;
let localCheckTimer = null;
let remoteCheckTimer = null;
let metadata = loadMetadata();

let publicState = {
  available: false,
  signedIn: false,
  syncing: false,
  online: navigator.onLine,
  status: "disabled",
  lastSyncedAt:
    metadata.lastSyncedAt || null,
  needsAccountConfirmation: false,
  error: ""
};


function publishState(
  patch = {}
) {
  publicState = {
    ...publicState,
    ...patch
  };
  window.dispatchEvent(
    new CustomEvent(
      STATE_EVENT,
      {
        detail: {
          ...publicState
        }
      }
    )
  );
}


function getDeviceId() {
  if (
    typeof crypto.randomUUID ===
    "function"
  ) {
    return crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random()
      .toString(36)
      .slice(2)
  ].join("-");
}


function readJson(
  key,
  fallback
) {
  try {
    const raw =
      window.localStorage.getItem(
        key
      );
    return raw
      ? JSON.parse(raw)
      : fallback;
  } catch (error) {
    console.warn(
      key +
      "を読み込めませんでした。",
      error
    );
    return fallback;
  }
}


function normalizeIds(
  value,
  limit = MAX_RECORDS,
  sort = true
) {
  if (!Array.isArray(value)) {
    return [];
  }

  const ids = Array.from(
    new Set(
      value.filter(
        id =>
          typeof id === "string" &&
          id.length > 0 &&
          id.length <= MAX_ID_LENGTH
      )
    )
  ).slice(0, limit);

  return sort
    ? ids.sort()
    : ids;
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
      ? value.visitedAt
          .trim()
          .slice(0, 10)
      : "";
  const note =
    typeof value.note === "string"
      ? value.note
          .trim()
          .slice(0, MAX_NOTE_LENGTH)
      : "";

  if (
    visitedAt &&
    !/^\d{4}-\d{2}-\d{2}$/.test(
      visitedAt
    )
  ) {
    return null;
  }

  if (!visitedAt && !note) {
    return null;
  }

  return {
    visitedAt,
    note
  };
}


function normalizeVisitDetails(
  value
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, MAX_RECORDS)
      .flatMap(
        ([id, detail]) => {
          const normalized =
            normalizeVisitDetail(
              detail
            );
          return (
            typeof id === "string" &&
            id.length > 0 &&
            id.length <= MAX_ID_LENGTH &&
            normalized
          )
            ? [[id, normalized]]
            : [];
        }
      )
      .sort(
        ([firstId], [secondId]) =>
          firstId.localeCompare(
            secondId
          )
      )
  );
}


function readLocalSnapshot() {
  return {
    favorites:
      normalizeIds(
        readJson(
          STORAGE_KEYS.favorites,
          []
        )
      ),
    visited:
      normalizeIds(
        readJson(
          STORAGE_KEYS.visited,
          []
        )
      ),
    visitDetails:
      normalizeVisitDetails(
        readJson(
          STORAGE_KEYS.visitDetails,
          {}
        )
      ),
    plan:
      normalizeIds(
        readJson(
          STORAGE_KEYS.plan,
          []
        ),
        8,
        false
      )
  };
}


function createRecord(
  value,
  updatedAt,
  deviceId
) {
  return {
    value,
    updatedAt,
    deviceId
  };
}


function createMetadata() {
  const snapshot =
    readLocalSnapshot();
  const initialTimestamp = 0;
  const deviceId =
    getDeviceId();

  return {
    version: SCHEMA_VERSION,
    deviceId,
    accountUid: "",
    clock: 0,
    lastSyncedAt: null,
    snapshots: snapshot,
    favorites:
      Object.fromEntries(
        snapshot.favorites.map(
          id => [
            id,
            createRecord(
              true,
              initialTimestamp,
              deviceId
            )
          ]
        )
      ),
    visited:
      Object.fromEntries(
        snapshot.visited.map(
          id => [
            id,
            createRecord(
              true,
              initialTimestamp,
              deviceId
            )
          ]
        )
      ),
    visitDetails:
      Object.fromEntries(
        Object.entries(
          snapshot.visitDetails
        ).map(
          ([id, detail]) => [
            id,
            createRecord(
              detail,
              initialTimestamp,
              deviceId
            )
          ]
        )
      ),
    plan:
      snapshot.plan.length
        ? createRecord(
            snapshot.plan,
            initialTimestamp,
            deviceId
          )
        : null,
    dirty:
      Boolean(
        snapshot.favorites.length ||
        snapshot.visited.length ||
        Object.keys(
          snapshot.visitDetails
        ).length ||
        snapshot.plan.length
      )
  };
}


function loadMetadata() {
  const parsed =
    readJson(
      META_STORAGE_KEY,
      null
    );

  if (
    !parsed ||
    parsed.version !==
      SCHEMA_VERSION ||
    typeof parsed.deviceId !==
      "string"
  ) {
    return createMetadata();
  }

  const fallback =
    createMetadata();

  const payload =
    normalizePayload(parsed);
  const parsedSnapshots =
    parsed.snapshots || {};

  return {
    ...fallback,
    ...parsed,
    deviceId:
      parsed.deviceId.slice(0, 100),
    accountUid:
      typeof parsed.accountUid ===
        "string"
        ? parsed.accountUid.slice(0, 200)
        : "",
    clock:
      Number.isFinite(parsed.clock)
        ? Math.max(
            0,
            Math.round(parsed.clock)
          )
        : 0,
    snapshots: {
      favorites:
        normalizeIds(
          parsedSnapshots.favorites
        ),
      visited:
        normalizeIds(
          parsedSnapshots.visited
        ),
      visitDetails:
        normalizeVisitDetails(
          parsedSnapshots.visitDetails
        ),
      plan:
        normalizeIds(
          parsedSnapshots.plan,
          8,
          false
        )
    },
    favorites:
      payload.favorites,
    visited:
      payload.visited,
    visitDetails:
      payload.visitDetails,
    plan:
      payload.plan,
    dirty:
      Boolean(parsed.dirty)
  };
}


function saveMetadata() {
  try {
    window.localStorage.setItem(
      META_STORAGE_KEY,
      JSON.stringify(metadata)
    );
  } catch (error) {
    console.warn(
      "同期情報を端末へ保存できませんでした。",
      error
    );
  }
}


function sameValue(
  first,
  second
) {
  return JSON.stringify(first) ===
    JSON.stringify(second);
}


function getPayloadMaxUpdatedAt(
  payload
) {
  const records = [
    ...Object.values(
      payload.favorites
    ),
    ...Object.values(
      payload.visited
    ),
    ...Object.values(
      payload.visitDetails
    ),
    payload.plan
  ].filter(Boolean);

  return records.reduce(
    (maximum, record) =>
      Math.max(
        maximum,
        record.updatedAt || 0
      ),
    0
  );
}


function nextUpdatedAt() {
  metadata.clock =
    Math.max(
      Date.now(),
      metadata.clock + 1
    );
  return metadata.clock;
}


function captureSetChanges(
  key,
  currentIds,
  now
) {
  const previousIds =
    new Set(
      normalizeIds(
        metadata.snapshots[key]
      )
    );
  const currentSet =
    new Set(currentIds);
  const allIds =
    new Set([
      ...previousIds,
      ...currentSet
    ]);
  let changed = false;

  allIds.forEach(
    id => {
      const wasPresent =
        previousIds.has(id);
      const isPresent =
        currentSet.has(id);

      if (wasPresent === isPresent) {
        return;
      }

      metadata[key][id] =
        createRecord(
          isPresent,
          now,
          metadata.deviceId
        );
      changed = true;
    }
  );
  metadata.snapshots[key] =
    currentIds;
  return changed;
}


function captureVisitDetailChanges(
  currentDetails,
  now
) {
  const previous =
    normalizeVisitDetails(
      metadata.snapshots.visitDetails
    );
  const ids =
    new Set([
      ...Object.keys(previous),
      ...Object.keys(currentDetails)
    ]);
  let changed = false;

  ids.forEach(
    id => {
      const previousValue =
        previous[id] || null;
      const currentValue =
        currentDetails[id] || null;

      if (
        sameValue(
          previousValue,
          currentValue
        )
      ) {
        return;
      }

      metadata.visitDetails[id] =
        createRecord(
          currentValue,
          now,
          metadata.deviceId
        );
      changed = true;
    }
  );
  metadata.snapshots.visitDetails =
    currentDetails;
  return changed;
}


function captureLocalChanges() {
  if (syncInProgress) {
    return false;
  }

  const snapshot =
    readLocalSnapshot();
  const now =
    nextUpdatedAt();
  let changed = false;

  changed =
    captureSetChanges(
      "favorites",
      snapshot.favorites,
      now
    ) || changed;
  changed =
    captureSetChanges(
      "visited",
      snapshot.visited,
      now
    ) || changed;
  changed =
    captureVisitDetailChanges(
      snapshot.visitDetails,
      now
    ) || changed;

  if (
    !sameValue(
      metadata.snapshots.plan,
      snapshot.plan
    )
  ) {
    metadata.plan =
      createRecord(
        snapshot.plan,
        now,
        metadata.deviceId
      );
    metadata.snapshots.plan =
      snapshot.plan;
    changed = true;
  }

  if (changed) {
    metadata.dirty = true;
    saveMetadata();
    scheduleSync();
  }

  return changed;
}


function normalizeRecord(
  record,
  normalizeValue
) {
  if (
    !record ||
    typeof record !== "object" ||
    !Number.isFinite(
      record.updatedAt
    ) ||
    typeof record.deviceId !==
      "string"
  ) {
    return null;
  }

  const value =
    normalizeValue(record.value);

  if (value === undefined) {
    return null;
  }

  return createRecord(
    value,
    Math.max(
      0,
      Math.round(
        record.updatedAt
      )
    ),
    record.deviceId.slice(0, 100)
  );
}


function normalizeRecordMap(
  value,
  normalizeValue
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, MAX_RECORDS)
      .flatMap(
        ([id, record]) => {
          const normalized =
            normalizeRecord(
              record,
              normalizeValue
            );
          return (
            id.length > 0 &&
            id.length <= MAX_ID_LENGTH &&
            normalized
          )
            ? [[id, normalized]]
            : [];
        }
      )
      .sort(
        ([firstId], [secondId]) =>
          firstId.localeCompare(
            secondId
          )
      )
  );
}


function normalizePayload(
  value
) {
  const payload =
    value &&
    typeof value === "object"
      ? value
      : {};

  return {
    favorites:
      normalizeRecordMap(
        payload.favorites,
        item =>
          typeof item === "boolean"
            ? item
            : undefined
      ),
    visited:
      normalizeRecordMap(
        payload.visited,
        item =>
          typeof item === "boolean"
            ? item
            : undefined
      ),
    visitDetails:
      normalizeRecordMap(
        payload.visitDetails,
        item =>
          item === null
            ? null
            : normalizeVisitDetail(
                item
              ) || undefined
      ),
    plan:
      normalizeRecord(
        payload.plan,
        item =>
          Array.isArray(item)
            ? normalizeIds(
                item,
                8,
                false
              )
            : undefined
      )
  };
}


function chooseNewestRecord(
  first,
  second
) {
  if (!first) {
    return second || null;
  }
  if (!second) {
    return first;
  }
  if (
    first.updatedAt !==
      second.updatedAt
  ) {
    return first.updatedAt >
      second.updatedAt
      ? first
      : second;
  }
  return first.deviceId >=
    second.deviceId
    ? first
    : second;
}


function mergeRecordMaps(
  first,
  second
) {
  const ids =
    new Set([
      ...Object.keys(first),
      ...Object.keys(second)
    ]);

  return Object.fromEntries(
    Array.from(ids)
      .sort()
      .map(
        id => [
          id,
          chooseNewestRecord(
            first[id],
            second[id]
          )
        ]
      )
  );
}


function mergePayloads(
  first,
  second
) {
  return {
    favorites:
      mergeRecordMaps(
        first.favorites,
        second.favorites
      ),
    visited:
      mergeRecordMaps(
        first.visited,
        second.visited
      ),
    visitDetails:
      mergeRecordMaps(
        first.visitDetails,
        second.visitDetails
      ),
    plan:
      chooseNewestRecord(
        first.plan,
        second.plan
      )
  };
}


function promoteInitialRecords(
  payload
) {
  const now = Date.now();
  const promoteMap =
    recordMap =>
      Object.fromEntries(
        Object.entries(recordMap)
          .map(
            ([id, record]) => [
              id,
              record.updatedAt === 0
                ? {
                    ...record,
                    updatedAt: now
                  }
                : record
            ]
          )
      );

  return {
    favorites:
      promoteMap(
        payload.favorites
      ),
    visited:
      promoteMap(payload.visited),
    visitDetails:
      promoteMap(
        payload.visitDetails
      ),
    plan:
      payload.plan?.updatedAt === 0
        ? {
            ...payload.plan,
            updatedAt: now
          }
        : payload.plan
  };
}


function getLocalPayload() {
  return normalizePayload(metadata);
}


function getSnapshotFromPayload(
  payload
) {
  const activeIds =
    recordMap =>
      Object.entries(recordMap)
        .filter(
          ([, record]) =>
            record.value === true
        )
        .map(([id]) => id)
        .sort();

  const visitDetails =
    Object.fromEntries(
      Object.entries(
        payload.visitDetails
      )
        .filter(
          ([, record]) =>
            record.value !== null
        )
        .map(
          ([id, record]) => [
            id,
            record.value
          ]
        )
        .sort(
          ([firstId], [secondId]) =>
            firstId.localeCompare(
              secondId
            )
        )
    );

  return {
    favorites:
      activeIds(payload.favorites),
    visited:
      activeIds(payload.visited),
    visitDetails,
    plan:
      payload.plan?.value || []
  };
}


function writeLocalValue(
  key,
  value
) {
  const serialized =
    JSON.stringify(value);

  if (
    window.localStorage.getItem(key) ===
      serialized
  ) {
    return;
  }

  const oldValue =
    window.localStorage.getItem(key);
  window.localStorage.setItem(
    key,
    serialized
  );
  let storageEvent;

  try {
    storageEvent =
      new StorageEvent(
        "storage",
        {
          key,
          oldValue,
          newValue: serialized,
          storageArea:
            window.localStorage,
          url:
            window.location.href
        }
      );
  } catch (error) {
    storageEvent =
      new Event("storage");
    Object.defineProperties(
      storageEvent,
      {
        key: { value: key },
        oldValue: {
          value: oldValue
        },
        newValue: {
          value: serialized
        }
      }
    );
  }

  window.dispatchEvent(
    storageEvent
  );
}


function applyPayloadLocally(
  payload
) {
  const snapshot =
    getSnapshotFromPayload(
      payload
    );
  metadata.favorites =
    payload.favorites;
  metadata.visited =
    payload.visited;
  metadata.visitDetails =
    payload.visitDetails;
  metadata.plan =
    payload.plan;
  metadata.clock =
    Math.max(
      metadata.clock,
      getPayloadMaxUpdatedAt(
        payload
      )
    );
  metadata.snapshots =
    snapshot;

  writeLocalValue(
    STORAGE_KEYS.favorites,
    snapshot.favorites
  );
  writeLocalValue(
    STORAGE_KEYS.visited,
    snapshot.visited
  );
  writeLocalValue(
    STORAGE_KEYS.visitDetails,
    snapshot.visitDetails
  );
  writeLocalValue(
    STORAGE_KEYS.plan,
    snapshot.plan
  );
}


function scheduleSync(
  delay = SYNC_DEBOUNCE
) {
  if (
    !currentUser ||
    publicState.needsAccountConfirmation
  ) {
    return;
  }

  window.clearTimeout(syncTimer);
  syncTimer =
    window.setTimeout(
      () => {
        syncNow();
      },
      delay
    );
}


async function syncNow() {
  if (
    syncInProgress ||
    !currentUser ||
    !database ||
    publicState.needsAccountConfirmation
  ) {
    return;
  }

  if (!navigator.onLine) {
    publishState({
      online: false,
      status: "offline"
    });
    return;
  }

  captureLocalChanges();
  syncInProgress = true;
  publishState({
    syncing: true,
    status: "syncing",
    error: ""
  });

  const localAtStart =
    readLocalSnapshot();
  const localPayload =
    getLocalPayload();
  const reference =
    firestoreApi.doc(
      database,
      "users",
      currentUser.uid,
      "private",
      "chiikatsu"
    );
  let mergedPayload =
    localPayload;

  try {
    await firestoreApi.runTransaction(
      database,
      async transaction => {
        const snapshot =
          await transaction.get(
            reference
          );
        const remotePayload =
          normalizePayload(
            snapshot.exists()
              ? snapshot.data()
              : null
          );
        mergedPayload =
          mergePayloads(
            localPayload,
            remotePayload
          );

        if (!snapshot.exists()) {
          mergedPayload =
            promoteInitialRecords(
              mergedPayload
            );
        }

        if (
          !snapshot.exists() ||
          !sameValue(
            mergedPayload,
            remotePayload
          )
        ) {
          transaction.set(
            reference,
            {
              schemaVersion:
                SCHEMA_VERSION,
              ownerUid:
                currentUser.uid,
              updatedAt:
                Date.now(),
              ...mergedPayload
            }
          );
        }
      }
    );

    syncInProgress = false;

    if (
      !sameValue(
        localAtStart,
        readLocalSnapshot()
      )
    ) {
      metadata.favorites =
        mergedPayload.favorites;
      metadata.visited =
        mergedPayload.visited;
      metadata.visitDetails =
        mergedPayload.visitDetails;
      metadata.plan =
        mergedPayload.plan;
      metadata.clock =
        Math.max(
          metadata.clock,
          getPayloadMaxUpdatedAt(
            mergedPayload
          )
        );
      captureLocalChanges();
      metadata.dirty = true;
      saveMetadata();
      scheduleSync(1000);
      publishState({
        syncing: false,
        status: "pending"
      });
      return;
    }

    applyPayloadLocally(
      mergedPayload
    );
    metadata.dirty = false;
    metadata.lastSyncedAt =
      new Date().toISOString();
    saveMetadata();
    publishState({
      syncing: false,
      online: true,
      status: "synced",
      lastSyncedAt:
        metadata.lastSyncedAt,
      error: ""
    });
  } catch (error) {
    syncInProgress = false;
    console.warn(
      "クラウド同期に失敗しました。",
      error
    );
    publishState({
      syncing: false,
      status:
        navigator.onLine
          ? "error"
          : "offline",
      online:
        navigator.onLine,
      error:
        error?.message ||
        "クラウド同期に失敗しました。"
    });
  }
}


function startMonitoring() {
  window.clearInterval(
    localCheckTimer
  );
  window.clearInterval(
    remoteCheckTimer
  );
  localCheckTimer =
    window.setInterval(
      captureLocalChanges,
      LOCAL_CHECK_INTERVAL
    );
  remoteCheckTimer =
    window.setInterval(
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          syncNow();
        }
      },
      REMOTE_CHECK_INTERVAL
    );
}


function stopMonitoring() {
  window.clearInterval(
    localCheckTimer
  );
  window.clearInterval(
    remoteCheckTimer
  );
  window.clearTimeout(syncTimer);
}


async function handleUser(
  user
) {
  currentUser = user;

  if (!user) {
    stopMonitoring();
    publishState({
      signedIn: false,
      syncing: false,
      status: "signed-out",
      needsAccountConfirmation:
        false,
      error: ""
    });
    return;
  }

  if (
    metadata.accountUid &&
    metadata.accountUid !== user.uid
  ) {
    publishState({
      signedIn: true,
      syncing: false,
      status: "account-confirmation",
      needsAccountConfirmation:
        true,
      error: ""
    });
    return;
  }

  metadata.accountUid =
    user.uid;
  saveMetadata();
  publishState({
    signedIn: true,
    status: "pending",
    needsAccountConfirmation:
      false,
    error: ""
  });
  startMonitoring();
  await syncNow();
}


async function signIn() {
  if (!auth || !authApi) {
    throw new Error(
      "Googleログインを利用できません。"
    );
  }

  const provider =
    new authApi.GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account"
  });
  await authApi.signInWithPopup(
    auth,
    provider
  );
}


async function signOut() {
  if (auth && authApi) {
    await authApi.signOut(auth);
  }
}


async function confirmAccountSwitch() {
  if (!currentUser) {
    return;
  }

  const accountUid =
    currentUser.uid;
  metadata =
    createMetadata();
  metadata.accountUid =
    accountUid;
  saveMetadata();
  publishState({
    needsAccountConfirmation:
      false,
    status: "pending"
  });
  startMonitoring();
  await syncNow();
}


async function deleteCloudData() {
  if (!currentUser || !database) {
    return;
  }

  const reference =
    firestoreApi.doc(
      database,
      "users",
      currentUser.uid,
      "private",
      "chiikatsu"
    );
  await firestoreApi.deleteDoc(
    reference
  );
  await signOut();
  window.localStorage.removeItem(
    META_STORAGE_KEY
  );
  metadata = createMetadata();
  publishState({
    lastSyncedAt: null,
    status: "signed-out"
  });
}


window.ChiikatsuCloudSync = {
  getState() {
    return {
      ...publicState
    };
  },
  signIn,
  signOut,
  syncNow,
  confirmAccountSwitch,
  deleteCloudData
};


window.addEventListener(
  "online",
  () => {
    publishState({
      online: true,
      status:
        currentUser
          ? "pending"
          : publicState.status
    });
    scheduleSync(250);
  }
);

window.addEventListener(
  "offline",
  () => {
    publishState({
      online: false,
      status:
        currentUser
          ? "offline"
          : publicState.status
    });
  }
);

window.addEventListener(
  "visibilitychange",
  () => {
    if (
      document.visibilityState ===
        "visible" &&
      currentUser
    ) {
      syncNow();
    }
  }
);


async function initializeCloudSync() {
  try {
    let config =
      window
        .__CHIIKATSU_FIREBASE_CONFIG__;

    if (!config) {
      const configUrl =
        new URL(
          "./firebase-config.json",
          import.meta.url
        );
      const response =
        await fetch(
          configUrl,
          {
            cache: "no-store"
          }
        );

      if (!response.ok) {
        return;
      }

      config =
        await response.json();
    }
    const firebaseConfig =
      config.firebase || {};

    if (
      !config.enabled ||
      !firebaseConfig.apiKey ||
      !firebaseConfig.authDomain ||
      !firebaseConfig.projectId ||
      !firebaseConfig.appId
    ) {
      if (config.enabled) {
        publishState({
          available: true,
          status: "error",
          error:
            "Firebaseの設定値が不足しています。"
        });
      }
      return;
    }

    const baseUrl =
      `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
    const [
      appModule,
      loadedAuthApi,
      loadedFirestoreApi
    ] = await Promise.all([
      import(
        `${baseUrl}/firebase-app.js`
      ),
      import(
        `${baseUrl}/firebase-auth.js`
      ),
      import(
        `${baseUrl}/firebase-firestore.js`
      )
    ]);
    const app =
      appModule.initializeApp(
        firebaseConfig
      );

    if (
      config.appCheck?.enabled &&
      config.appCheck.siteKey
    ) {
      const appCheckApi =
        await import(
          `${baseUrl}/firebase-app-check.js`
        );
      appCheckApi.initializeAppCheck(
        app,
        {
          provider:
            new appCheckApi.ReCaptchaEnterpriseProvider(
              config.appCheck.siteKey
            ),
          isTokenAutoRefreshEnabled:
            true
        }
      );
    }

    authApi = loadedAuthApi;
    firestoreApi =
      loadedFirestoreApi;
    auth = authApi.getAuth(app);
    database =
      firestoreApi.getFirestore(
        app
      );
    await authApi.setPersistence(
      auth,
      authApi.browserLocalPersistence
    );
    publishState({
      available: true,
      status: "loading",
      error: ""
    });
    authApi.onAuthStateChanged(
      auth,
      handleUser,
      error => {
        console.warn(
          "ログイン状態を確認できませんでした。",
          error
        );
        publishState({
          status: "error",
          error:
            error?.message ||
            "ログイン状態を確認できませんでした。"
        });
      }
    );
  } catch (error) {
    console.warn(
      "クラウド保存を初期化できませんでした。",
      error
    );
    publishState({
      available: true,
      status: "error",
      error:
        error?.message ||
        "クラウド保存を初期化できませんでした。"
    });
  }
}


initializeCloudSync();
