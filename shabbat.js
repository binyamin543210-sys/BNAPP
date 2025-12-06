// shabbat.js
// זמני כניסת/יציאת שבת לכל שבתות החודש לפי עיר
// משתמש ב-hebcal "Jewish calendar" עם geo=city כדי לקבל זמנים אמיתיים לעיר

// פורמט תאריך מקומי כמו ב-core.js: YYYY-MM-DD בלי בעיות UTC
function shFmt(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// מחזיר מפה: YYYY-MM-DD -> { candle, havdalah, full }
// full: "🕯️ כניסת שבת: HH:MM • ⭐ צאת שבת: HH:MM"
async function getShabbatForMonth(city, year, month, daysInMonth) {
  if (!city) return {};

  // hebcal מקבל חודש 1–12
  const m = month + 1;

  const url =
    "https://www.hebcal.com/hebcal" +
    `?cfg=json&v=1` +
    `&maj=on&min=on&mod=on&nx=on&mf=on&ss=on&c=on&M=on` +
    `&year=${year}&month=${m}` +
    `&geo=city&city=${encodeURIComponent(city)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const items = data.items || [];

    // candles = כניסת שבת/חג, havdalah = צאת שבת/חג
    const candles = items.filter((it) => it.category === "candles");
    const havdalot = items.filter((it) => it.category === "havdalah");

    const out = {};

    const pairs = Math.min(candles.length, havdalot.length);
    for (let i = 0; i < pairs; i++) {
      const c = candles[i];
      const h = havdalot[i];

      const cDate = new Date(c.date);
      const hDate = new Date(h.date);

      const candleKey = shFmt(cDate); // בדרך כלל שישי
      const havdalahKey = shFmt(hDate); // בדרך כלל שבת

      const candleTime =
        cDate.getHours().toString().padStart(2, "0") +
        ":" +
        cDate.getMinutes().toString().padStart(2, "0");
      const havdalahTime =
        hDate.getHours().toString().padStart(2, "0") +
        ":" +
        hDate.getMinutes().toString().padStart(2, "0");

      const full =
        `🕯️ כניסת שבת: ${candleTime} • ⭐ צאת שבת: ${havdalahTime}`;

      // אותו אובייקט גם לשישי וגם לשבת – כדי שבחלונית של יום שיש גם וגם,
      // וגם אם לוחצים על שבת רואים אותו טקסט מלא.
      const obj = { candle: candleTime, havdalah: havdalahTime, full };

      out[candleKey] = obj;
      out[havdalahKey] = obj;
    }

    return out;
  } catch (e) {
    console.error("Shabbat month error:", e);
    return {};
  }
}

window.Shabbat = {
  getShabbatForMonth,
};
