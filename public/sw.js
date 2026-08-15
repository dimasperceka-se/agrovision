/*
 * Service worker AgroVision — caching yang jujur:
 *  - HANYA GET yang boleh masuk cache. POST (Server Actions, mutasi) dilewatkan.
 *  - /api/* dilewatkan (baca & tulis) → tidak pernah menyajikan data basi.
 *  - Aset statis (_next/static, ikon, overlay, gambar, font/css/js) → cache-first.
 *  - Tile ortho GCS → cache-first (immutable).
 *  - Basemap pihak ketiga (esri/osm) → dilewatkan (hemat kuota cache).
 *  - Navigasi HTML → network-first, fallback ke halaman /offline.
 * Naikkan VERSION untuk memicu pembersihan cache lama.
 */
const VERSION = "v1";
const STATIC = `agrovision-static-${VERSION}`;
const TILES = `agrovision-tiles-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const keep = [STATIC, TILES];
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // mutasi & Server Actions → browser default
  const url = new URL(req.url);

  // Tile ortho di GCS → cache-first.
  if (url.hostname === "storage.googleapis.com" && url.pathname.includes("/tiles/")) {
    event.respondWith(cacheFirst(req, TILES));
    return;
  }
  // Origin lain (basemap esri/osm, font Google, dll.) → biarkan browser.
  if (url.origin !== self.location.origin) return;
  // API (baca/tulis) → jangan cache; selalu jaringan.
  if (url.pathname.startsWith("/api/")) return;

  // Aset statis → cache-first.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/overlays/") ||
    url.pathname.startsWith("/images/") ||
    /\.(css|js|mjs|woff2?|ttf|png|jpe?g|webp|svg|ico|json)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(req, STATIC));
    return;
  }

  // Navigasi HTML → network-first, fallback offline.
  if (req.mode === "navigate") {
    event.respondWith(networkThenOffline(req));
    return;
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return hit || Response.error();
  }
}

async function networkThenOffline(req) {
  try {
    return await fetch(req);
  } catch {
    const cache = await caches.open(STATIC);
    return (await cache.match(OFFLINE_URL)) || Response.error();
  }
}
