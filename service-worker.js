//
// service-worker.js – גרסה מתוקנת ל-GitHub Pages (תיקיית /BNAPP)
//

const CACHE = "bnapp-cache-v3";
const BASE = "/BNAPP";

const ASSETS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/style.css`,
  `${BASE}/core.js`,
  `${BASE}/holidays.js`,
  `${BASE}/shabbat.js`,
  `${BASE}/weather.js`,
  `${BASE}/sync.js`,
  `${BASE}/manifest.json`,
  `${BASE}/icon-192.png`,
  `${BASE}/icon-512.png`
];

// ------------------------------
// INSTALL
// ------------------------------
self.addEventListener("install", evt => {
  evt.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

// ------------------------------
// ACTIVATE – ניקוי CACHE ישנים
// ------------------------------
self.addEventListener("activate", evt => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
});

// ------------------------------
// FETCH – רק מהתיקייה BNAPP
// ------------------------------
self.addEventListener("fetch", evt => {
  const url = new URL(evt.request.url);

  // מגביל לקבצי BNAPP בלבד
  if (!url.pathname.startsWith(BASE)) {
    return; // לא מתערב לבקשות אחרות → מונע שגיאות
  }

  evt.respondWith(
    caches.match(evt.request).then(res => {
      return (
        res ||
        fetch(evt.request).catch(() => {
          // fallback ל־index אם צריך
          return caches.match(`${BASE}/index.html`);
        })
      );
    })
  );
});

// ------------------------------
// PUSH Notifications (מוגן)
// ------------------------------
self.addEventListener("push", evt => {
  let data = {};
  try {
    data = evt.data ? evt.data.json() : {};
  } catch {}

  self.registration.showNotification(
    data.title || "BNAPP",
    {
      body: data.body || "תזכורת חדשה",
      icon: `${BASE}/icon-192.png`
    }
  );
});
