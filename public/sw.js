/* AnatomyLens service worker: offline app shell + cache-first static anatomy assets.
 * Never caches user reports: they are processed in memory and never fetched from the network. */
const VERSION = "v3";
// Served from the site root or a sub-path (GitHub Pages): derive it from the scope.
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const SHELL_CACHE = `shell-${VERSION}`;
const ASSET_CACHE = `anatomy-${VERSION}`;
const SHELL_URLS = [`${BASE}/`, `${BASE}/manifest.webmanifest`, `${BASE}/icons/icon.svg`];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pages: network first so updates arrive, fall back to cached shell offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match(`${BASE}/`))),
    );
    return;
  }

  // Report readers (pdf.js worker, OCR engine and model): file names carry no version,
  // so network first (always matches the app build), cached copy when offline.
  // Public static files only; the user's PDF is never fetched, so it never lands here.
  if (url.pathname.startsWith(`${BASE}/vendor/`)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then((cache) =>
        fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cache.match(request).then((hit) => hit || Response.error())),
      ),
    );
    return;
  }

  // Hashed build assets and anatomy models: cache first (immutable).
  if (url.pathname.startsWith(`${BASE}/_next/static/`) || url.pathname.startsWith(`${BASE}/anatomy/`)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then((cache) =>
        cache.match(request).then(
          (hit) =>
            hit ||
            fetch(request).then((res) => {
              if (res.ok) cache.put(request, res.clone());
              return res;
            }),
        ),
      ),
    );
  }
});
