import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  getLatestCheckedDate
} from "./lib/data-utils.mjs";
import {
  createSiteMeta
} from "./lib/site-meta.mjs";

const root = process.cwd();
const outputRoot = resolve(root, "spot");
const manifestPath = resolve(root, ".spot-pages-manifest.json");
const writeMode = process.argv.includes("--write");
const checkMode = process.argv.includes("--check");
const siteOrigin = "https://chiikatsu-map.com";
const siteMeta = await createSiteMeta(root);
const pageLastModified = siteMeta.dataAsOf;

if (!writeMode && !checkMode) {
  console.log("Use --write to generate pages or --check to verify them.");
  process.exit(0);
}

const sources = [
  { file: "data/official-spots.json", archive: false },
  { file: "data/official-events-archive.json", archive: true },
  { file: "data/nagano-spots.json", archive: false }
];

const spots = [];
for (const source of sources) {
  const parsed = JSON.parse(await readFile(resolve(root, source.file), "utf8"));
  parsed.forEach(spot => spots.push({ ...spot, isArchive: source.archive }));
}

const duplicateIds = spots
  .map(spot => spot.id)
  .filter((id, index, ids) => ids.indexOf(id) !== index);
if (duplicateIds.length) {
  throw new Error("Duplicate spot IDs: " + Array.from(new Set(duplicateIds)).join(", "));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeJson(value) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
}

function formatDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function formatPeriod(spot) {
  if (spot.periodType === "permanent") return "常設";
  const start = formatDate(spot.startDate);
  const end = formatDate(spot.endDate);
  if (start && end) return `${start}～${end}`;
  if (start) return `${start}～終了日未定`;
  return "期間限定（期間は公式情報をご確認ください）";
}

const placeTypeLabels = {
  shop: "ショップ",
  food: "飲食店・カフェ",
  spot: "施設・スポット",
  lodging: "宿泊施設",
  other: "その他"
};
const relationLabels = {
  official_store: "公式店舗",
  official_facility: "公式施設",
  popup: "POP UP STORE",
  event: "公式イベント",
  collaboration: "公式コラボ",
  introduced: "紹介",
  visited: "訪問",
  related: "ゆかり・関連"
};
const entryLabels = {
  walkin: "通常入場",
  reservation_priority: "予約優先",
  reservation_required: "予約制",
  ticket_required: "チケットが必要",
  other: "企画ごとの案内を確認",
  unknown: "公式情報をご確認ください"
};

function getEvidenceLabel(spot) {
  if (spot.evidenceStatus === "confirmed") return "確定";
  if (spot.evidenceStatus !== "inferred") return null;
  return String(spot.evidenceNote || "").startsWith("【推定・高確度】")
    ? "推定・高確度"
    : "要注意候補";
}

function detailRow(label, value) {
  return value
    ? `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
    : "";
}

function getStatusLabel(spot) {
  if (spot.isArchive) return "終了済みの記録";
  return spot.periodType === "permanent" ? "常設" : "期間限定";
}

function getDescription(spot) {
  const location = spot.address ? ` 所在地は${spot.address}です。` : "";
  const period = spot.periodType === "limited"
    ? ` 開催期間は${formatPeriod(spot)}です。`
    : "";
  return (spot.description || `${spot.name}のスポット情報です。`) + location + period;
}

function createStructuredData(spot) {
  const pageUrl = `${siteOrigin}/spot/${encodeURIComponent(spot.id)}/`;
  const common = {
    "@context": "https://schema.org",
    "@type": spot.periodType === "limited" ? "Event" : "Place",
    name: spot.name,
    description: spot.description || undefined,
    url: pageUrl,
    image: `${siteOrigin}/assets/ogp.png`,
    sameAs: spot.sourceUrl || undefined
  };

  if (spot.periodType === "limited") {
    return {
      ...common,
      startDate: spot.startDate || undefined,
      endDate: spot.endDate || undefined,
      eventStatus: spot.eventStatus === "cancelled"
        ? "https://schema.org/EventCancelled"
        : spot.isArchive
          ? "https://schema.org/EventCompleted"
        : "https://schema.org/EventScheduled",
      location: {
        "@type": "Place",
        name: spot.name,
        address: spot.address || undefined,
        geo: Number.isFinite(spot.lat) && Number.isFinite(spot.lng)
          ? { "@type": "GeoCoordinates", latitude: spot.lat, longitude: spot.lng }
          : undefined
      }
    };
  }

  return {
    ...common,
    address: spot.address || undefined,
    geo: Number.isFinite(spot.lat) && Number.isFinite(spot.lng)
      ? { "@type": "GeoCoordinates", latitude: spot.lat, longitude: spot.lng }
      : undefined
  };
}

function createPage(spot) {
  const title = spot.category === "nagano"
    ? `${spot.name}｜場所・根拠・関連情報｜ちい活MAP`
    : `${spot.name}｜場所・期間・公式情報｜ちい活MAP`;
  const description = getDescription(spot).slice(0, 155);
  const pageUrl = `${siteOrigin}/spot/${encodeURIComponent(spot.id)}/`;
  const mapPageUrl = `../../?spot=${encodeURIComponent(spot.id)}`;
  const categoryLabel = spot.category === "nagano" ? "ナガノ先生関連" : "ちいかわ公式関連";
  const relationLabel = relationLabels[spot.relationType] || categoryLabel;
  const evidence = getEvidenceLabel(spot);
  const robots = spot.isArchive
    ? "noindex,follow"
    : "index,follow,max-image-preview:large";
  const badgeClass = spot.isArchive
    ? " is-ended"
    : spot.category === "nagano" ? " is-nagano" : "";
  const sourceLink = spot.sourceUrl
    ? `<a href="${escapeHtml(spot.sourceUrl)}" target="_blank" rel="noopener noreferrer">公式・根拠情報を見る ↗</a>`
    : "";
  const externalMap = spot.mapUrl
    ? `<a href="${escapeHtml(spot.mapUrl)}" target="_blank" rel="noopener noreferrer">外部地図で開く ↗</a>`
    : "";
  const evidenceRow = spot.evidenceNote ? detailRow("根拠", spot.evidenceNote) : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${pageUrl}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="ja_JP">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:image" content="${siteOrigin}/assets/ogp.png?v=20260826-1">
  <meta property="og:site_name" content="ちいかわ推し活（ちい活）MAP">
  <meta name="twitter:card" content="summary_large_image">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" href="../../favicon.svg" type="image/svg+xml">
  <link rel="manifest" href="../../manifest.webmanifest">
  <link rel="apple-touch-icon" href="../../assets/app-icon-192.png">
  <meta name="theme-color" content="#f477a8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../style.css?v=20260829-1">
  <link rel="stylesheet" href="../../spot.css?v=20260828-1">
  <script type="application/ld+json">${escapeJson(createStructuredData(spot))}</script>
</head>
<body class="spot-page" data-spot-id="${escapeHtml(spot.id)}" data-spot-name="${escapeHtml(spot.name)}">
  <header class="site-header">
    <div class="site-header-inner">
      <div class="site-header-top"><span class="site-kicker">CHIIKATSU MAP</span><span class="unofficial-badge">非公式ファンサイト</span></div>
      <h1>ちいかわ推し活（ちい活）MAP</h1>
      <p class="site-description">スポットの場所・期間・公式情報を確認できます。</p>
      <nav class="site-nav" aria-label="サイト内メニュー">
        <a class="site-nav-link" href="../../"><span aria-hidden="true">🗺</span>地図から探す</a>
        <a class="site-nav-link" href="../../official.html"><span aria-hidden="true">✦</span>公式スポット一覧</a>
        <a class="site-nav-link" href="../../journal.html"><span aria-hidden="true">🌱</span>ちい活手帳</a>
      </nav>
    </div>
  </header>
  <main class="spot-page-shell">
    <nav class="spot-breadcrumbs" aria-label="パンくずリスト"><a href="../../">ちい活MAP</a><span>›</span><span>${escapeHtml(spot.name)}</span></nav>
    <article class="spot-page-card">
      <header class="spot-page-hero">
        <span class="spot-page-kicker">SPOT INFORMATION</span>
        <div class="spot-page-badges">
          <span class="spot-page-badge${badgeClass}">${escapeHtml(getStatusLabel(spot))}</span>
          <span class="spot-page-badge">${escapeHtml(categoryLabel)}</span>
          <span class="spot-page-badge">${escapeHtml(placeTypeLabels[spot.placeType] || "スポット")}</span>
          <span class="spot-page-badge">${escapeHtml(relationLabel)}</span>
          ${evidence ? `<span class="spot-page-badge is-nagano">根拠: ${escapeHtml(evidence)}</span>` : ""}
        </div>
        <h1>${escapeHtml(spot.name)}</h1>
        <p class="spot-page-address">📍 ${escapeHtml(spot.address || "所在地は公式情報をご確認ください")}</p>
      </header>
      <div class="spot-page-content">
        <div>
          <p class="spot-page-description">${escapeHtml(spot.description || `${spot.name}のスポット情報です。`)}</p>
          <dl class="spot-page-details">
            ${detailRow("期間", formatPeriod(spot))}
            ${detailRow("営業時間", spot.hoursText)}
            ${detailRow("休業・休館", spot.closedDaysText)}
            ${detailRow("入場方法", entryLabels[spot.defaultEntryType] || spot.entryNote)}
            ${detailRow("入場案内", spot.entryNote)}
            ${evidenceRow}
          </dl>
          <p class="spot-page-note">ちい活MAPは、ファンが個人で運営する非公式サイトです。公式各社とは関係ありません。営業時間・開催状況・入場方法は変更される場合があるため、訪問前に必ず公式情報をご確認ください。</p>
        </div>
        <aside class="spot-page-actions" aria-label="このスポットの操作">
          <a class="is-primary" href="${mapPageUrl}">🗺 ちい活MAPで見る</a>
          ${externalMap}
          ${sourceLink}
          <button type="button" data-save-type="favorite">♡ 行きたい</button>
          <button type="button" data-save-type="visited">✓ 行った！</button>
          <button type="button" data-save-type="plan">＋ 今日のプラン</button>
          <button type="button" id="spot-page-share">🔗 このスポットを共有</button>
          <p class="spot-page-status" id="spot-page-status" role="status" aria-live="polite"></p>
        </aside>
      </div>
    </article>
    <p class="site-note">ちい活MAPは、ファンが個人で運営する非公式サイトです。公式各社とは関係ありません。</p>
  </main>
  <script src="../../spot-page.js?v=20260829-1" defer></script>
  <script src="../../pwa.js?v=20260828-1" defer></script>
</body>
</html>
`;
}

function createSitemap() {
  const urls = [
    { loc: `${siteOrigin}/`, priority: "1.0", lastmod: pageLastModified },
    { loc: `${siteOrigin}/official.html`, priority: "0.9", lastmod: pageLastModified },
    { loc: `${siteOrigin}/journal.html`, priority: "0.9", lastmod: pageLastModified },
    { loc: `${siteOrigin}/privacy.html`, priority: "0.4", lastmod: pageLastModified },
    ...spots
      .filter(spot => !spot.isArchive)
      .map(spot => ({
        loc: `${siteOrigin}/spot/${encodeURIComponent(spot.id)}/`,
        priority: "0.7",
        lastmod: getLatestCheckedDate(
          [spot],
          pageLastModified
        )
      }))
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${escapeHtml(url.loc)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join("\n")}
</urlset>
`;
}

const manifest = {
  generatedAt: pageLastModified,
  count: spots.length,
  ids: spots.map(spot => spot.id).sort()
};
const expectedManifest = JSON.stringify(manifest, null, 2) + "\n";
const expectedSitemap = createSitemap();

if (writeMode) {
  let previousIds = [];
  try {
    previousIds = JSON.parse(await readFile(manifestPath, "utf8")).ids || [];
  } catch (error) {
    previousIds = [];
  }

  const currentIds = new Set(spots.map(spot => spot.id));
  for (const id of previousIds) {
    if (!currentIds.has(id) && /^[a-z0-9][a-z0-9-]*$/.test(id)) {
      await rm(resolve(outputRoot, id), { recursive: true, force: true });
    }
  }

  for (const spot of spots) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(spot.id)) {
      throw new Error(`Unsafe spot ID: ${spot.id}`);
    }
    const directory = resolve(outputRoot, spot.id);
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, "index.html"), createPage(spot), "utf8");
  }

  await writeFile(manifestPath, expectedManifest, "utf8");
  await writeFile(resolve(root, "sitemap.xml"), expectedSitemap, "utf8");
  console.log(`Generated ${spots.length} spot pages (${spots.filter(spot => !spot.isArchive).length} indexable).`);
}

if (checkMode) {
  const mismatches = [];
  async function expectFile(path, expected) {
    try {
      if (await readFile(path, "utf8") !== expected) mismatches.push(path);
    } catch (error) {
      mismatches.push(path);
    }
  }

  await expectFile(manifestPath, expectedManifest);
  await expectFile(resolve(root, "sitemap.xml"), expectedSitemap);
  for (const spot of spots) {
    await expectFile(resolve(outputRoot, spot.id, "index.html"), createPage(spot));
  }

  if (mismatches.length) {
    console.error("Generated spot pages are stale. Run: npm run build:spot-pages");
    mismatches.slice(0, 20).forEach(path => console.error("- " + path));
    if (mismatches.length > 20) console.error(`...and ${mismatches.length - 20} more`);
    process.exit(1);
  }
  console.log(`Verified ${spots.length} generated spot pages.`);
}
