/* Reading layout only. Existing datasets, filters and saved-state modules remain authoritative. */
(function () {
  const main = document.querySelector("#main-content");
  if (!main) return;

  const groups = document.body.classList.contains("official-page")
    ? [".official-hero"]
    : document.body.classList.contains("collaborations-page")
      ? [".collaboration-hero", ".collaboration-about"]
      : [".nagano-hero"];
  const sections = groups.map(selector => main.querySelector(selector)).filter(Boolean);
  if (sections.length) {
    const overview = document.createElement("details");
    overview.className = "site-overview";
    const summary = document.createElement("summary");
    summary.append(ChiikatsuUI.icon("info"), document.createTextNode(
      document.body.classList.contains("nagano-page")
        ? "このページについて"
        : "この一覧について・掲載件数"
    ));
    overview.append(summary, ...sections);
    const cta = main.querySelector(".official-bottom-cta");
    if (cta) cta.before(overview);
    else main.append(overview);
  }

  const header = document.querySelector(".site-header-top");
  if (header && !header.querySelector(".unofficial-badge")) {
    const badge = document.createElement("span");
    badge.className = "unofficial-badge";
    badge.textContent = "非公式";
    header.append(badge);
  }

  for (const link of document.querySelectorAll(".site-nav-link")) {
    const href = link.getAttribute("href") || "";
    ChiikatsuUI.decorateAction(link,
      href === "./" ? "location" : href.includes("journal") ? "bookmark"
        : href.includes("official-links") ? "globe" : "info");
    if (link.classList.contains("is-active")) link.setAttribute("aria-current", "page");
  }

  // Keep mobile search available while the existing official filter panel is closed.
  for (const view of ["current", "past"]) {
    const search = document.getElementById(view + "-search");
    const toggle = document.getElementById(view + "-filter-toggle");
    const label = search?.closest("label");
    if (label && toggle) {
      const panel = document.getElementById(view + "-filters");
      const mobile = window.matchMedia("(max-width:680px)");
      function placeSearch() {
        label.classList.toggle("site-primary-search", mobile.matches);
        if (mobile.matches) toggle.before(label);
        else panel?.prepend(label);
      }
      placeSearch();
      mobile.addEventListener("change", placeSearch);
    }
  }

  // Secondary collaboration controls remain native controls with their original listeners.
  const extraFilters = [];
  for (const filters of document.querySelectorAll(".collaboration-filters")) {
    const secondary = [...filters.querySelectorAll("label")].filter(label =>
      label.querySelector("[data-filter='channel'],[data-filter='sort']"));
    if (!secondary.length) continue;
    const details = document.createElement("details");
    details.className = "site-extra-filters";
    const summary = document.createElement("summary");
    const count = document.createElement("span");
    count.className = "site-extra-filter-count";
    summary.append(document.createTextNode("利用場所・並び順"), count);
    const fields = document.createElement("div");
    fields.className = "site-extra-filter-fields";
    fields.append(...secondary);
    details.append(summary, fields);
    filters.insertBefore(details, filters.querySelector("[data-reset]"));
    extraFilters.push({ details, count });
  }

  function decorate() {
    for (const { details, count } of extraFilters) {
      const active = [...details.querySelectorAll("select")].filter(select =>
        select.value !== select.options[0]?.value).length;
      const text = active ? active + "条件を適用中" : "";
      if (count.textContent !== text) count.textContent = text;
    }
    for (const [selector, icon] of [
      [".catalog-tab[data-view='current'],.collaboration-tab[data-list='current']", "calendar"],
      [".catalog-tab[data-view='past'],.collaboration-tab[data-list='archive']", "clock"],
      [".catalog-tab[data-view='guide'],.collaboration-tab[data-list='partners']", "info"],
      [".spot-card-save-favorite", "bookmark"],
      [".spot-card-save-visited", "visit"],
      [".spot-card-save-plan", "plan"],
      [".spot-card-action-map,.collaboration-card-action.is-map", "location"],
      [".catalog-share-button,.spot-card-action-share", "share"]
    ]) document.querySelectorAll(selector).forEach(element => ChiikatsuUI.decorateAction(element, icon));
  }
  decorate();
  main.addEventListener("change", decorate);
  const catalog = main.querySelector(".official-catalog,.collaboration-catalog");
  if (catalog) {
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      queueMicrotask(() => { pending = false; decorate(); });
    }).observe(catalog, { childList: true, subtree: true });
  }
})();
