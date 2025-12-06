// shabbat.js – גרסה מתוקנת סופית: מציג את כל שבתות החודש ללא תלות בסדר מה-API

function shFmt(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ---------- המרת עיר -> קואורדינטות ----------
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

    return { lat: data[0].lat, lon: data[0].lon };
  } catch (e) {
    console.error("coords error:", e);
    return null;
  }
}

// ---------- זמני שבת לכל החודש ----------
async function getShabbatForMonth(city, year, month, daysInMonth) {
  const coords = await resolveCityToCoords(city);
  if (!coords) return {};

  const url =
    "https://www.hebcal.com/shabbat" +
    `?cfg=json&year=${year}&month=${month + 1}` +
    `&latitude=${coords.lat}&longitude=${coords.lon}` +
    `&tzid=Asia/Jerusalem&M=on`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.items) return {};

    const candles = data.items.filter((i) => i.category === "candles");
    const havdalot = data.items.filter((i) => i.category === "havdalah");

    // --- הכנה ---
    const out = {};

    candles.forEach((c) => {
      const cDate = new Date(c.date);
      const friKey = shFmt(cDate);

      // חפש havdalah של מחר (שבת)
      const satKey = shFmt(new Date(cDate.getTime() + 24 * 3600 * 1000));

      const hav = havdalot.find((h) => shFmt(new Date(h.date)) === satKey);

      const cTime =
        cDate.getHours().toString().padStart(2, "0") +
        ":" +
        cDate.getMinutes().toString().padStart(2, "0");

      let hTime = "";
      if (hav) {
        const hDate = new Date(hav.date);
        hTime =
          hDate.getHours().toString().padStart(2, "0") +
          ":" +
          hDate.getMinutes().toString().padStart(2, "0");
      }

      const full = `🕯️ כניסת שבת: ${cTime} • ⭐ צאת שבת: ${hTime || "—"}`;

      const obj = { candle: cTime, havdalah: hTime, full };

      // Friday
      out[friKey] = obj;

      // Saturday
      if (hav) out[satKey] = obj;
    });

    return out;
  } catch (e) {
    console.error("shabbat fetch error:", e);
    return {};
  }
}

window.Shabbat = {
  getShabbatForMonth
};
