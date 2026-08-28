const SITE_URL =
  process.env.CHIIKATSU_SITE_URL ||
  "https://chiikatsu-map.com/";


const HTTP_URL =
  "http://chiikatsu-map.com/";


const WWW_URL =
  "https://www.chiikatsu-map.com/";


const EXPECTED_CANONICAL =
  "https://chiikatsu-map.com/";


const TIMEOUT_MS =
  20000;


const results = [];


function pass(
  name,
  detail
) {
  results.push({
    ok: true,
    name,
    detail
  });
}


function fail(
  name,
  detail
) {
  results.push({
    ok: false,
    name,
    detail
  });
}


async function fetchWithTimeout(
  url,
  options = {}
) {
  return fetch(
    url,
    {
      ...options,
      headers: {
        "user-agent":
          "chiikatsu-map-site-health/1.0",
        ...options.headers
      },
      signal:
        AbortSignal.timeout(
          TIMEOUT_MS
        )
    }
  );
}


function isRedirectStatus(
  status
) {
  return [
    301,
    302,
    303,
    307,
    308
  ].includes(status);
}


function getRedirectUrl(
  response,
  requestUrl
) {
  const location =
    response.headers.get(
      "location"
    );

  if (!location) {
    return null;
  }

  return new URL(
    location,
    requestUrl
  ).href;
}


async function checkRedirect(
  name,
  requestUrl
) {
  try {
    const response =
      await fetchWithTimeout(
        requestUrl,
        {
          redirect: "manual"
        }
      );

    const redirectUrl =
      getRedirectUrl(
        response,
        requestUrl
      );

    if (
      !isRedirectStatus(
        response.status
      ) ||
      redirectUrl !==
        EXPECTED_CANONICAL
    ) {
      fail(
        name,
        "status=" +
          response.status +
          ", location=" +
          (redirectUrl || "なし")
      );
      return;
    }

    pass(
      name,
      response.status +
        " → " +
        redirectUrl
    );
  } catch (error) {
    fail(
      name,
      error instanceof Error
        ? error.message
        : String(error)
    );
  }
}


async function checkPublicPage() {
  try {
    const response =
      await fetchWithTimeout(
        SITE_URL
      );

    if (
      response.status !== 200 ||
      response.url !==
        EXPECTED_CANONICAL
    ) {
      fail(
        "HTTPSトップページ",
        "status=" +
          response.status +
          ", finalUrl=" +
          response.url
      );
      return;
    }

    pass(
      "HTTPSトップページ",
      "200 " + response.url
    );

    const html =
      await response.text();

    const expectedValues = [
      {
        name: "canonical URL",
        value:
          '<link rel="canonical" href="' +
          EXPECTED_CANONICAL +
          '">'
      },
      {
        name: "og:url",
        value:
          '<meta property="og:url" content="' +
          EXPECTED_CANONICAL +
          '">'
      },
      {
        name: "og:image",
        value:
          "https://chiikatsu-map.com/assets/ogp.png"
      }
    ];

    expectedValues.forEach(
      ({ name, value }) => {
        if (html.includes(value)) {
          pass(name, value);
        } else {
          fail(
            name,
            "期待する値がHTMLにありません: " +
              value
          );
        }
      }
    );
  } catch (error) {
    fail(
      "HTTPSトップページ",
      error instanceof Error
        ? error.message
        : String(error)
    );
  }
}


async function checkPublishedAsset(
  path,
  options = {}
) {
  const url =
    new URL(
      path,
      SITE_URL
    ).href;

  try {
    const response =
      await fetchWithTimeout(url);

    if (response.status !== 200) {
      fail(
        path,
        "status=" + response.status
      );
      return;
    }

    if (options.json) {
      const value =
        await response.json();

      if (
        !Array.isArray(value) ||
        value.length === 0
      ) {
        fail(
          path,
          "空または配列以外のJSONです。"
        );
        return;
      }

      pass(
        path,
        "200 / " +
          value.length +
          "件"
      );
      return;
    }

    pass(path, "200");
  } catch (error) {
    fail(
      path,
      error instanceof Error
        ? error.message
        : String(error)
    );
  }
}


await Promise.all([
  checkPublicPage(),
  checkRedirect(
    "HTTPからHTTPSへの転送",
    HTTP_URL
  ),
  checkRedirect(
    "wwwから正規ドメインへの転送",
    WWW_URL
  ),
  checkPublishedAsset("app.js"),
  checkPublishedAsset("official.html"),
  checkPublishedAsset("official.css"),
  checkPublishedAsset("official.js"),
  checkPublishedAsset("journal.html"),
  checkPublishedAsset("journal.css"),
  checkPublishedAsset("journal.js"),
  checkPublishedAsset("manifest.webmanifest"),
  checkPublishedAsset("service-worker.js"),
  checkPublishedAsset("sitemap.xml"),
  checkPublishedAsset(
    "spot/chiikawaland-osaka-umeda/"
  ),
  checkPublishedAsset(
    "data/official-spots.json",
    { json: true }
  ),
  checkPublishedAsset(
    "data/official-events-archive.json",
    { json: true }
  ),
  checkPublishedAsset(
    "data/nagano-spots.json",
    { json: true }
  )
]);


results
  .sort(
    (first, second) =>
      first.name.localeCompare(
        second.name,
        "ja"
      )
  )
  .forEach(
    result => {
      const prefix =
        result.ok ? "PASS" : "FAIL";

      console.log(
        prefix +
        "  " +
        result.name +
        " — " +
        result.detail
      );
    }
  );


const failures =
  results.filter(
    result => !result.ok
  );


if (failures.length) {
  failures.forEach(
    result => {
      console.error(
        "::error title=" +
          result.name +
          "::" +
          result.detail
      );
    }
  );

  console.error(
    "\n公開サイトの監視で" +
      failures.length +
      "件の問題を検出しました。"
  );
  process.exitCode = 1;
} else {
  console.log(
    "\n公開サイトのHTTPS・転送・正規URL・主要ファイルは正常です。"
  );
}
