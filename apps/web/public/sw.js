const CACHE_VERSION = "v6-no-stale-js";
const CACHE_NAME = `storvex-web-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/pwa-icon-192.png",
  "/pwa-icon-512.png",
  "/pwa-maskable-icon-512.png",
  "/storvex_icon.webp",
  "/storvex_dark.webp",
  "/storvex_white.webp",
];

function shouldSkipCache(requestUrl) {
  return (
    requestUrl.pathname.startsWith("/_next/") ||
    requestUrl.pathname.startsWith("/api/") ||
    requestUrl.pathname.includes("__next")
  );
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    if (response && response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cached = await cache.match(request);

    if (cached) return cached;

    throw new Error("No network or cache response available");
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) return cached;

  const response = await fetch(request);

  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }

  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("storvex-web-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);

  if (requestUrl.origin !== self.location.origin) return;

  if (shouldSkipCache(requestUrl)) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(async () => {
          const offlineResponse = await caches.match(OFFLINE_URL);

          if (offlineResponse) {
            return offlineResponse;
          }

          return new Response("Storvex is offline.", {
            status: 503,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
            },
          });
        }),
    );

    return;
  }

  if (request.destination === "script" || request.destination === "style") {
    event.respondWith(networkFirst(request));
    return;
  }

  const shouldCache =
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "manifest";

  if (!shouldCache) return;

  event.respondWith(cacheFirst(request));
});
