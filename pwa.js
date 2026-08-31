"use strict";

let deferredInstallPrompt = null;

const homeScreenCards =
  Array.from(
    document.querySelectorAll(
      "[data-home-screen-card]"
    )
  );
const homeScreenButtons =
  Array.from(
    document.querySelectorAll(
      "[data-home-screen]"
    )
  );

function isStandalone() {
  return window.matchMedia(
    "(display-mode: standalone)"
  ).matches ||
    window.navigator.standalone ===
      true;
}

function setInstallStatus(message) {
  document.querySelectorAll(
    "[data-home-screen-status]"
  ).forEach(element => {
    element.textContent = message;
  });
}

function hideInstallCards() {
  homeScreenCards.forEach(card => {
    card.hidden = true;
  });
}

function getDeviceHelp() {
  const userAgent =
    window.navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(
      userAgent
    );

  if (isIos) {
    return {
      title: "iPhone・iPadで追加する",
      steps: [
        "Safariでこのページを開きます。",
        "画面下の共有ボタン（□から↑）を押します。",
        "「ホーム画面に追加」を選びます。"
      ]
    };
  }

  if (/Android/i.test(userAgent)) {
    return {
      title: "Androidで追加する",
      steps: [
        "Chromeの右上メニュー（︙）を開きます。",
        "「ホーム画面に追加」または「アプリをインストール」を選びます。",
        "画面の案内に沿って追加します。"
      ]
    };
  }

  return {
    title: "ホーム画面・アプリ一覧に追加する",
    steps: [
      "ブラウザのメニューを開きます。",
      "「アプリをインストール」または「ショートカットを作成」を選びます。",
      "項目がない場合は、このページをブックマークしてください。"
    ]
  };
}

function showInstallHelp() {
  const existing =
    document.getElementById(
      "home-screen-help"
    );
  if (existing) {
    existing.showModal();
    return;
  }

  const help = getDeviceHelp();
  const dialog =
    document.createElement("dialog");
  dialog.id = "home-screen-help";
  dialog.className =
    "home-screen-dialog";

  const heading =
    document.createElement("h2");
  heading.textContent = help.title;

  const intro =
    document.createElement("p");
  intro.textContent =
    "ホーム画面から、ちい活MAPをアプリのようにすぐ開けます。";

  const list =
    document.createElement("ol");
  help.steps.forEach(step => {
    const item =
      document.createElement("li");
    item.textContent = step;
    list.appendChild(item);
  });

  const closeButton =
    document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "閉じる";
  closeButton.addEventListener(
    "click",
    () => dialog.close()
  );

  dialog.append(
    heading,
    intro,
    list,
    closeButton
  );
  document.body.appendChild(dialog);
  dialog.showModal();
}

async function requestInstall() {
  if (isStandalone()) {
    hideInstallCards();
    return;
  }

  if (!deferredInstallPrompt) {
    showInstallHelp();
    return;
  }

  deferredInstallPrompt.prompt();
  const choice =
    await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;

  if (choice.outcome === "accepted") {
    setInstallStatus(
      "ホーム画面への追加を開始しました。"
    );
  }
}

window.addEventListener(
  "beforeinstallprompt",
  event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    setInstallStatus(
      "この端末では、ボタンから追加できます。"
    );
  }
);

window.addEventListener(
  "appinstalled",
  () => {
    deferredInstallPrompt = null;
    hideInstallCards();
  }
);

homeScreenButtons.forEach(button => {
  button.addEventListener(
    "click",
    requestInstall
  );
});

if (isStandalone()) {
  hideInstallCards();
}

if (
  "serviceWorker" in navigator &&
  (
    window.location.protocol === "https:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  )
) {
  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker.register(
        new URL(
          "./service-worker.js",
          new URL(
            document.querySelector(
              'link[rel="manifest"]'
            )?.href ||
              window.location.href
          )
        )
      ).catch(error => {
        console.warn(
          "ホーム画面向け機能を準備できませんでした。",
          error
        );
      });
    }
  );
}
