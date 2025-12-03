//
// service-worker.js
//

const CACHE = "bnapp-cache-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/core.js",
  "/holidays.js",
  "/shabbat.js",
  "/weather.js",
  "/sync.js",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

// התקנה
self.addEventListener("install", evt => {
  evt.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
});

// הפעלה
self.addEventListener("activate", evt => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

// שרת → קאש
self.addEventListener("fetch", evt => {
  evt.respondWith(
    caches.match(evt.request).then(res => res || fetch(evt.request))
  );
});

// התראות PUSH
self.addEventListener("push", evt => {
  const data = evt.data?.json() || {};
  self.registration.showNotification(
    data.title || "BNAPP",
    {
      body: data.body || "תזכורת חדשה מלוח השנה",
      icon: "icon-192.png"
    }
  );
});
