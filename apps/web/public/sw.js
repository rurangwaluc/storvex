const CACHE_VERSION = "v4";
const CACHE_NAME = `storvex-web-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/pwa-icon-192.png",
  "/pwa-icon-512.png",
  "/pwa-maskable-icon-512.png",
  "/storvex_dark.webp",
  "/storvex_white.webp",
  "/storvex_icon.webp"
];

async function addToCache(cache, url) {
  try {
    const response = await fetch(url, {
      cache: "reload",
      credentials: "same-origin"
    });

    if (response && response.ok) {
      await cache.put(url, response);
    }
  } catch {
    // Keep install resilient. One missing asset should not break the whole PWA.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(PRECACHE_URLS.map((url) => addToCache(cache, url)));
      await self.skipWaiting();
    })
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
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);

  if (requestUrl.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });

          return response;
        })
        .catch(async () => {
          const offlineResponse = await caches.match(OFFLINE_URL);
          if (offlineResponse) return offlineResponse;

          const homeResponse = await caches.match("/");
          if (homeResponse) return homeResponse;

          return new Response("Storvex is offline.", {
            status: 503,
            headers: { "Content-Type": "text/plain" }
          });
        })
    );

    return;
  }

  const shouldCache =
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "manifest";

  if (!shouldCache) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkResponsePromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const responseClone = networkResponse.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }

          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkResponsePromise;
    })
  );
});