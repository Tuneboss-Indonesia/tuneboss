const CACHE = "tuneboss-v3";
const BASE_PATH = "/inventory/";

self.addEventListener("install", (event) => {
  event.waitUntil(
      caches.open(CACHE).then((cache) => cache.addAll([BASE_PATH]).catch(() => {}))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(BASE_PATH))
    );
    return;
  }

  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/inventory/api/") || url.port === "8000" || url.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, clone)).catch(() => {});
        return response;
      }).catch(() => caches.match(request))
  );
});
