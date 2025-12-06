// shabbat.js
// זמני כניסת / יציאת שבת לכל החודש לפי עיר
// מחזיר מפת תאריכים: YYYY-MM-DD -> { candle, havdalah, full }

function pad(n) {
  return String(n).padStart(2, "0");
}

function timeFromISO(iso) {
  const d = new Date(iso);
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${hh}:${mm}`;
}

async function getShabbatForMonth(city, year, month, daysInMonth) {
  if (!city) return {};

  try {
    const start = `${year}-${pad(month + 1)}-01`;
    const end = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`;

    const url =
      `https://www.hebcal.com/shabbat/?cfg=json&geo=city&city=${encodeURIComponent(
        city
      )}` +
      `&start=${start}&end=${end}&M=on&lg=h`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.items) return {};

    const candles = [];
    const havdalot = [];

    for (const item of data.items) {
      if (item.category === "candles") {
        candles.push(item);
      }
      if (item.category === "havdalah") {
        havdalot.push(item);
      }
    }

    const out = {};

    const count = Math.min(candles.length, havdalot.length);

    for (let i = 0; i < count; i++) {
      const c = candles[i];
      const h = havdalot[i];

      const cTime = timeFromISO(c.date);
      const hTime = timeFromISO(h.date);

      const full =
        `🕯️ כניסת שבת: ${cTime}` +
        ` • ⭐ צאת שבת: ${hTime}`;

      const cKey = c.date.split("T")[0]; // יום שישי
      const hKey = h.date.split("T")[0]; // מוצ"ש

      if (!out[cKey]) out[cKey] = { candle: null, havdalah: null, full: "" };
      if (!out[hKey]) out[hKey] = { candle: null, havdalah: null, full: "" };

      out[cKey].candle = cTime;
      out[cKey].full = full;

      out[hKey].havdalah = hTime;
      out[hKey].full = full;
    }

    return out;
  } catch (e) {
    console.error("Shabbat API error:", e);
    return {};
  }
}

window.Shabbat = {
  getShabbatForMonth,
};
