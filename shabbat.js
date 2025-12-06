// shabbat.js
// זמני הדלקת נרות / צאת שבת לפי עיר ולפי כל תאריך בחודש
// משתמש ב- Hebcal Shabbat API

// מביא זמני שבת עבור שבוע שבו נופל התאריך isoDate (YYYY-MM-DD)
async function getShabbatTimes(city, isoDate) {
  if (!city || !isoDate) return null;

  try {
    const [y, m, d] = isoDate.split("-").map(Number);

    const url =
      `https://www.hebcal.com/shabbat?cfg=json&geo=city&city=${encodeURIComponent(
        city
      )}&M=on&gy=${y}&gm=${m}&gd=${d}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.items) return null;

    let candle = null;
    let havdalah = null;

    for (const item of data.items) {
      if (item.category === "candles" && !candle) {
        const t = new Date(item.date);
        candle =
          t.getHours().toString().padStart(2, "0") +
          ":" +
          t.getMinutes().toString().padStart(2, "0");
      }
      if (item.category === "havdalah" && !havdalah) {
        const t = new Date(item.date);
        havdalah =
          t.getHours().toString().padStart(2, "0") +
          ":" +
          t.getMinutes().toString().padStart(2, "0");
      }
    }

    if (!candle && !havdalah) return null;

    return { candle, havdalah };
  } catch (e) {
    console.error("Shabbat API error:", e);
    return null;
  }
}

// מחזיר אובייקט מוכן לתצוגה עבור היום (שישי/שבת)
function formatShabbatForDay(dateObj, times) {
  if (!times) return null;

  const result = {
    candle: times.candle || null,
    havdalah: times.havdalah || null,
    full: "",
  };

  const parts = [];
  if (times.candle) {
    parts.push(`🕯️ כניסת שבת: ${times.candle}`);
  }
  if (times.havdalah) {
    parts.push(`⭐ צאת שבת: ${times.havdalah}`);
  }

  result.full = parts.join(" • ");
  return result;
}

window.Shabbat = {
  getShabbatTimes,
  formatShabbatForDay,
};
