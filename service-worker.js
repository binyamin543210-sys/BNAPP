
const CACHE = "bnapp-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/core.js",
  "/holidays.js",
  "/shabbat.js",
  "/weather.js",
  "/manifest.json"
];

self.addEventListener("install", evt => {
  evt.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", evt => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", evt => {
  evt.respondWith(
    caches.match(evt.request).then(res => res || fetch(evt.request))
  );
});
