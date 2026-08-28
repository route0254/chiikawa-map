"use strict";

const CACHE_VERSION =
  "chiikatsu-map-v20260828-1";
const CORE_CACHE =
  CACHE_VERSION + "-core";
const RUNTIME_CACHE =
  CACHE_VERSION + "-runtime";

const CORE_FILES = [
  "./",
  "./index.html",
  "./official.html",
  "./journal.html",
  "./offline.html",
  "./style.css",
  "./official.css",
  "./journal.css",
  "./app.js",
  "./official.js",
  "./journal.js",
  "./pwa.js",
  "./manifest.webmanifest",
  "./favicon.svg",
  "./assets/app-icon-192.png",
  "./assets/app-icon-512.png",
  "./data/official-spots.json",
  "./data/nagano-spots.json"
];

self.addEventListener(
  "install",
  event => {
    event.waitUntil(
      caches.open(CORE_CACHE)
        .then(cache =>
          cache.addAll(CORE_FILES)
        )
    );
    self.skipWaiting();
  }
);

self.addEventListener(
  "activate",
  event => {
    event.waitUntil(
      caches.keys()
        .then(keys =>
          Promise.all(
            keys
              .filter(key =>
                key.startsWith("chiikatsu-map-") &&
                ![
                  CORE_CACHE,
                  RUNTIME_CACHE
                ].includes(key)
              )
              .map(key => caches.delete(key))
          )
        )
        .then(() => self.clients.claim())
    );
  }
);

function isDataRequest(url) {
  return url.origin === self.location.origin &&
    url.pathname.includes("/data/") &&
    url.pathname.endsWith(".json");
}

async function networkFirst(request) {
  const cache = await caches.open(
    RUNTIME_CACHE
  );

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(
        request,
        response.clone()
      );
    }
    return response;
  } catch (error) {
    const cached =
      await caches.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

self.addEventListener(
  "fetch",
  event => {
    const request = event.request;

    if (request.method !== "GET") {
      return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
      return;
    }

    if (request.mode === "navigate") {
      event.respondWith(
        networkFirst(request).catch(
          () => caches.match("./offline.html")
        )
      );
      return;
    }

    if (isDataRequest(url)) {
      event.respondWith(
        networkFirst(request)
      );
      return;
    }

    event.respondWith(
      caches.match(request)
        .then(cached => {
          if (cached) {
            return cached;
          }

          return fetch(request)
            .then(response => {
              if (response.ok) {
                const copy =
                  response.clone();
                caches.open(RUNTIME_CACHE)
                  .then(cache =>
                    cache.put(request, copy)
                  );
              }
              return response;
            });
        })
    );
  }
);
