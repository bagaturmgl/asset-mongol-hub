/*
 * ХХХА Тоног төхөөрөмж бүртгэл — service worker (офлайн горим)
 *
 * Стратеги:
 *  - Хуудас (navigate): network-first. Онлайн үед үргэлж шинэ HTML авч кэшид хадгална,
 *    офлайн үед сүүлд хадгалсан хуудсыг (эсвэл "/"-г) буцаана.
 *  - /assets/* (hash-тай JS/CSS): cache-first. Нэр нь агуулгаараа өөрчлөгддөг тул аюулгүй.
 *  - Бусад өөрийн домэйны статик файл (icon, manifest, favicon): stale-while-revalidate.
 *  - Supabase болон бусад гадаад домэйн, POST, server function: огт оролцохгүй.
 *    Өгөгдлийн офлайн хуулбарыг апп өөрөө IndexedDB-д хадгалдаг (src/lib/offline-cache.ts).
 *
 * Кэшийн бүтцийг өөрчилбөл SW_VERSION-ийг нэмэгдүүлнэ — хуучин кэшүүд activate үед устна.
 */
const SW_VERSION = "v1";
const PAGE_CACHE = `pages-${SW_VERSION}`;
const ASSET_CACHE = `assets-${SW_VERSION}`;
const STATIC_CACHE = `static-${SW_VERSION}`;
const KNOWN_CACHES = [PAGE_CACHE, ASSET_CACHE, STATIC_CACHE];

const MAX_ASSET_ENTRIES = 250;
const PRECACHE_PAGES = ["/", "/dashboard"];
const PRECACHE_STATIC = [
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // Нэг файл амжилтгүй болоход бүх суулгалт унахгүйн тулд тус бүрийг тусад нь кэшилнэ.
      const pages = await caches.open(PAGE_CACHE);
      const statics = await caches.open(STATIC_CACHE);
      await Promise.all([
        ...PRECACHE_PAGES.map((url) => pages.add(url).catch(() => undefined)),
        ...PRECACHE_STATIC.map((url) => statics.add(url).catch(() => undefined)),
      ]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => !KNOWN_CACHES.includes(n)).map((n) => caches.delete(n)),
      );
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable().catch(() => undefined);
      }
      await self.clients.claim();
    })(),
  );
});

// Хуудас SW-ээс өмнө ачаалсан asset-уудыг (анхны зочлолт) кэшлүүлэхийн тулд жагсаалт илгээдэг.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "CACHE_URLS" || !Array.isArray(data.urls)) return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(ASSET_CACHE);
      for (const raw of data.urls) {
        try {
          const url = new URL(raw, self.location.origin);
          if (url.origin !== self.location.origin || !url.pathname.startsWith("/assets/")) continue;
          if (await cache.match(url.href)) continue;
          const res = await fetch(url.href);
          if (res.ok) await cache.put(url.href, res);
        } catch {
          /* дараагийн файл руу */
        }
      }
      await trimCache(ASSET_CACHE, MAX_ASSET_ENTRIES);
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase, CDN гэх мэт — оролцохгүй
  if (url.pathname.startsWith("/_serverFn") || url.pathname.startsWith("/api/")) return;
  if (url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(event, request));
});

async function handleNavigation(event) {
  const { request } = event;
  const cache = await caches.open(PAGE_CACHE);
  try {
    const preloaded = await event.preloadResponse;
    const response = preloaded || (await fetch(request));
    if (response.ok && response.type === "basic") {
      // Query string-гүйгээр хадгална — шүүлтүүрийн параметр бүрт тусдаа хуулбар үүсгэхгүй.
      const key = new URL(request.url);
      key.search = "";
      event.waitUntil(cache.put(key.href, response.clone()));
    }
    return response;
  } catch {
    const cached = (await cache.match(request, { ignoreSearch: true })) || (await cache.match("/"));
    if (cached) return cached;
    return new Response(
      '<!doctype html><html lang="mn"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Офлайн</title>' +
        '<body style="font-family:system-ui,sans-serif;padding:2rem;max-width:32rem;margin:auto;color:#1f2937">' +
        '<h1 style="font-size:1.125rem">Сүлжээгүй байна</h1>' +
        "<p>Энэ хуудсыг өмнө нь онлайнаар нээж байгаагүй тул офлайн хуулбар алга. Холболт сэргэхэд дахин ачаална уу.</p>" +
        "</body></html>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    await trimCache(ASSET_CACHE, MAX_ASSET_ENTRIES);
  }
  return response;
}

async function staleWhileRevalidate(event, request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) return cache.put(request, response.clone()).then(() => response);
      return response;
    })
    .catch(() => undefined);
  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  const response = await network;
  return response || new Response("", { status: 504, statusText: "Offline" });
}

// cache.keys() оруулсан дарааллаар буцдаг тул хамгийн хуучныг эхэлж устгана.
async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}
