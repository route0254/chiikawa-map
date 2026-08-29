"use strict";

const CLOUD_STATE_EVENT =
  "chiikatsu:cloud-sync-state";

let currentCloudState = {
  available: false,
  signedIn: false,
  syncing: false,
  status: "disabled",
  needsAccountConfirmation: false,
  error: ""
};


function getJournalUrl() {
  return new URL(
    "./journal.html?view=activity",
    import.meta.url
  ).href;
}


function formatSyncTime(
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


function createHeaderCloudUi() {
  const headerTop =
    document.querySelector(
      ".site-header-top"
    );

  if (
    !headerTop ||
    headerTop.querySelector(
      "[data-cloud-header-account]"
    )
  ) {
    return null;
  }

  const wrapper =
    document.createElement("div");
  const popoverId =
    "cloud-header-popover";
  wrapper.className =
    "cloud-header-account";
  wrapper.dataset.cloudHeaderAccount =
    "";
  wrapper.hidden = true;
  wrapper.innerHTML = `
    <button
      class="cloud-header-button"
      type="button"
      data-cloud-header-button
      aria-expanded="false"
      aria-controls="${popoverId}"
    >
      <span class="cloud-header-icon" aria-hidden="true">☁</span>
      <span class="cloud-header-copy">
        <strong data-cloud-header-label>Googleで保存</strong>
        <small data-cloud-header-detail>行きたい・行った！を守る</small>
      </span>
    </button>
    <div
      class="cloud-header-popover"
      id="${popoverId}"
      data-cloud-header-popover
      role="dialog"
      aria-label="Googleクラウド保存"
      hidden
    >
      <strong>Googleクラウド保存</strong>
      <p>
        端末を丸ごと上書きせず、スポットごとの新しい変更を統合します。空の端末でログインしても、クラウドの記録は消えません。
      </p>
      <span
        class="cloud-header-status"
        data-cloud-header-status
        role="status"
        aria-live="polite"
      ></span>
      <div class="cloud-header-actions">
        <button type="button" data-cloud-header-sync>今すぐ同期</button>
        <a data-cloud-header-journal>ちい活手帳で確認</a>
        <button type="button" data-cloud-header-sign-out>ログアウト</button>
      </div>
    </div>
  `;
  headerTop.appendChild(wrapper);

  const button =
    wrapper.querySelector(
      "[data-cloud-header-button]"
    );
  const popover =
    wrapper.querySelector(
      "[data-cloud-header-popover]"
    );
  const label =
    wrapper.querySelector(
      "[data-cloud-header-label]"
    );
  const detail =
    wrapper.querySelector(
      "[data-cloud-header-detail]"
    );
  const status =
    wrapper.querySelector(
      "[data-cloud-header-status]"
    );
  const syncButton =
    wrapper.querySelector(
      "[data-cloud-header-sync]"
    );
  const signOutButton =
    wrapper.querySelector(
      "[data-cloud-header-sign-out]"
    );
  const journalLink =
    wrapper.querySelector(
      "[data-cloud-header-journal]"
    );
  journalLink.href = getJournalUrl();

  function closePopover() {
    popover.hidden = true;
    button.setAttribute(
      "aria-expanded",
      "false"
    );
  }

  function openPopover() {
    popover.hidden = false;
    button.setAttribute(
      "aria-expanded",
      "true"
    );
  }

  function getStatusText(
    state
  ) {
    if (
      state.needsAccountConfirmation
    ) {
      return "別のGoogleアカウントです。確認するまで端末の記録は送信しません。";
    }

    const syncedAt =
      formatSyncTime(
        state.lastSyncedAt
      );
    const labels = {
      loading:
        "ログイン状態を確認しています…",
      "signed-out":
        "この端末だけに保存しています。",
      pending:
        "端末へ保存済みです。クラウド同期を待っています。",
      syncing:
        "端末とクラウドの記録を統合しています…",
      synced:
        syncedAt
          ? `${syncedAt}に同期済みです。`
          : "クラウドへ同期済みです。",
      offline:
        "オフラインです。接続後に自動同期します。",
      error:
        "同期を確認できませんでした。端末内の記録は保持されています。"
    };

    return labels[state.status] ||
      "この端末だけに保存しています。";
  }

  function render(
    state
  ) {
    currentCloudState = {
      ...currentCloudState,
      ...state
    };
    wrapper.hidden =
      !currentCloudState.available;

    if (
      !currentCloudState.available
    ) {
      closePopover();
      return;
    }

    const signedIn =
      currentCloudState.signedIn;
    const confirming =
      currentCloudState
        .needsAccountConfirmation;

    button.disabled =
      currentCloudState.status ===
        "loading" ||
      (
        currentCloudState.status ===
          "error" &&
        !signedIn
      );
    button.classList.toggle(
      "is-signed-in",
      signedIn
    );
    button.classList.toggle(
      "is-warning",
      confirming ||
      currentCloudState.status ===
        "offline" ||
      currentCloudState.status ===
        "error"
    );

    if (!signedIn) {
      label.textContent =
        currentCloudState.status ===
          "loading"
          ? "Google保存を準備中"
          : currentCloudState.status ===
              "error"
            ? "Google保存を確認"
            : "Googleで保存";
      detail.textContent =
        currentCloudState.status ===
          "error"
          ? "再読込してお試しください"
          : "行きたい・行った！を守る";
      closePopover();
    } else if (confirming) {
      label.textContent =
        "統合の確認";
      detail.textContent =
        "別のGoogleアカウントです";
    } else if (
      currentCloudState.syncing ||
      currentCloudState.status ===
        "syncing"
    ) {
      label.textContent = "同期中…";
      detail.textContent =
        "端末とクラウドを統合";
    } else if (
      currentCloudState.status ===
        "offline"
    ) {
      label.textContent =
        "端末に保存中";
      detail.textContent =
        "接続後に自動同期";
    } else {
      label.textContent =
        "Google保存中";
      detail.textContent =
        "端末間で自動同期";
    }

    if (signedIn) {
      button.setAttribute(
        "aria-haspopup",
        "dialog"
      );
    } else {
      button.removeAttribute(
        "aria-haspopup"
      );
    }

    status.textContent =
      getStatusText(
        currentCloudState
      );
    status.dataset.state =
      currentCloudState.status;
    syncButton.hidden = !signedIn;
    signOutButton.hidden = !signedIn;
    syncButton.disabled =
      currentCloudState.syncing;
    signOutButton.disabled =
      currentCloudState.syncing;
    syncButton.textContent =
      confirming
        ? "このアカウントに統合"
        : "今すぐ同期";
  }

  async function runAction(
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
      status.textContent =
        failureMessage +
        " 端末内の記録は保持されています。";
      status.dataset.state = "error";
      openPopover();
    }
  }

  button.addEventListener(
    "click",
    () => {
      const sync =
        window.ChiikatsuCloudSync;

      if (!sync) {
        return;
      }

      if (!currentCloudState.signedIn) {
        runAction(
          () => sync.signIn(),
          "Googleログインを開始できませんでした。"
        );
        return;
      }

      if (popover.hidden) {
        openPopover();
      } else {
        closePopover();
      }
    }
  );

  syncButton.addEventListener(
    "click",
    () => {
      const sync =
        window.ChiikatsuCloudSync;

      if (!sync) {
        return;
      }

      if (
        currentCloudState
          .needsAccountConfirmation
      ) {
        if (
          !window.confirm(
            "この端末の記録を、現在選択している別のGoogleアカウントへ追加統合しますか？クラウド側の別スポットの記録は保持されます。"
          )
        ) {
          return;
        }
        runAction(
          () =>
            sync.confirmAccountSwitch(),
          "記録を統合できませんでした。"
        );
        return;
      }

      runAction(
        () => sync.syncNow(),
        "クラウドへ同期できませんでした。"
      );
    }
  );

  signOutButton.addEventListener(
    "click",
    () => {
      const sync =
        window.ChiikatsuCloudSync;
      runAction(
        () => sync?.signOut(),
        "ログアウトできませんでした。"
      );
      closePopover();
    }
  );

  document.addEventListener(
    "pointerdown",
    event => {
      if (
        !popover.hidden &&
        !wrapper.contains(
          event.target
        )
      ) {
        closePopover();
      }
    }
  );

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Escape" &&
        !popover.hidden
      ) {
        closePopover();
        button.focus();
      }
    }
  );

  window.addEventListener(
    CLOUD_STATE_EVENT,
    event => {
      render(event.detail || {});
    }
  );

  render(
    window.ChiikatsuCloudSync
      ?.getState?.() ||
      currentCloudState
  );

  return {
    render
  };
}


createHeaderCloudUi();
