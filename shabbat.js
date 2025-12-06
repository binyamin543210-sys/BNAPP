// shabbat.js
// זמני כניסת/יציאת שבת – עובד לכל עיר בעולם באמצעות קואורדינטות
// שלב 1: ממירים עיר → קואורדינטות (Nominatim)
// שלב 2: שולחים ל-Hebcal לפי lat/lng

// ---------- כלי עזר ----------
function shFmt(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ---------- הבאת קואורדינטות של עיר ----------
async function resolveCityToCoords(city) {
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&q=" +
      encodeURIComponent(city);

    const res = await fetch(url, {
      headers: { "User-Agent": "BNAPP-Shabbat-Calendar" }
    });

    const data = await res.json();

    if (!data || !data.length) return null;

    return {
      lat: data[0].lat,
      lon: data[0].lon
    };
  } catch (e) {
    console.error("City→coords error:", e);
    return null;
  }
}

// ---------- הבאת זמני שבת לכל חודש ----------
async function getShabbatForMonth(city, year, month, daysInMonth) {
  if (!city) return {};

  // 1) למצוא קואורדינטות
  const coords = await resolveCityToCoords(city);
  if (!coords) {
    console.warn("לא נמצאו קואורדינטות לעיר:", city);
    return {};
  }

  const m = month + 1;

  const url =
    "https://www.hebcal.com/shabbat" +
    `?cfg=json&year=${year}&month=${m}` +
    `&latitude=${coords.lat}&longitude=${coords.lon}` +
    `&tzid=Asia/Jerusalem&M=on`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.items) return {};

    const items = data.items;

    const candles = items.filter((i) => i.category === "candles");
    const havdalot = items.filter((i) => i.category === "havdalah");

    const out = {};
    const pairs = Math.min(candles.length, havdalot.length);

    for (let i = 0; i < pairs; i++) {
      const c = candles[i];
      const h = havdalot[i];

      const dC = new Date(c.date);
      const dH = new Date(h.date);

      const keyC = shFmt(dC);
      const keyH = shFmt(dH);

      const cTime =
        dC.getHours().toString().padStart(2, "0") +
        ":" +
        dC.getMinutes().toString().padStart(2, "0");

      const hTime =
        dH.getHours().toString().padStart(2, "0") +
        ":" +
        dH.getMinutes().toString().padStart(2, "0");

      const full = `🕯️ כניסת שבת: ${cTime} • ⭐ צאת שבת: ${hTime}`;

      const obj = { candle: cTime, havdalah: hTime, full };

      out[keyC] = obj; // יום שישי
      out[keyH] = obj; // שבת
    }

    return out;
  } catch (e) {
    console.error("Hebcal shabbat error:", e);
    return {};
  }
}

window.Shabbat = {
  getShabbatForMonth
};
