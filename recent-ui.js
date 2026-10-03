(function () {
  let registryPromise;
  window.RecentUI = {
    registry() {
      return registryPromise ||= fetch("data/added-dates.json", {
        cache: "no-store", signal: AbortSignal.timeout(3000)
      }).then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      }).then(value => {
        if (value.schemaVersion !== 1 || !value.firstAdded || typeof value.firstAdded !== "object" ||
            Array.isArray(value.firstAdded) || !value.collaborationFirstAdded ||
            typeof value.collaborationFirstAdded !== "object" || Array.isArray(value.collaborationFirstAdded)) {
          throw new Error("Invalid addition dates");
        }
        return value;
      }).catch(() => ({ firstAdded: {}, collaborationFirstAdded: {} }));
    },
    label(date, showNew) {
      if (!RecentAdditions.validDate(date)) return null;
      const label = document.createElement("p");
      label.className = "spot-added-date";
      if (showNew) {
        const badge = document.createElement("span");
        badge.className = "new-badge";
        badge.textContent = "NEW";
        label.append(badge, " ");
      }
      const time = document.createElement("time");
      time.dateTime = date;
      time.textContent = `${date.replaceAll("-", "/")} 一覧追加`;
      label.append(time);
      return label;
    },
    renderControl(id, count, active) {
      const control = document.getElementById(id);
      control.dataset.active = String(active);
      control.querySelector("[data-catalog-recent]").setAttribute("aria-label", `新着 ${count}件${active ? "（絞り込み中）" : ""}`);
      control.querySelector("[data-catalog-recent]").textContent = `新着 ${count}件`;
      control.querySelector("[data-catalog-recent]").setAttribute("aria-pressed", String(active));
      control.querySelector("[data-catalog-recent-clear]").hidden = !active;
      control.querySelector("small").textContent = control.id === "official-recent"
        ? count ? "一覧への追加から14日間。開催日・情報確認日とは別です。検索条件と組み合わせて絞り込みできます。" : "14日以内の追加はありません"
        : active
        ? "新着で絞り込み中 · 検索条件と組み合わせて表示"
        : count ? "一覧への追加から14日間 · 開催日・情報確認日とは別" : "14日以内の追加はありません";
    }
  };
})();
