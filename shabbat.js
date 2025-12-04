//
// shabbat.js – זמני הדלקת נרות / צאת שבת לכל שבוע
//

// מביא זמני שבת/חג עבור שבוע מסוים לפי תאריך (שישי/שבת)
async function getShabbatTimes(city, isoDate) {
  if (!city) return null;

  try {
    const d = new Date(isoDate);
    const day = d.getDay(); // 5=Fri, 6=Sat

    // אם זה שבת – נוריד יום אחורה לשישי
    let friday = new Date(d);
    if (day === 6) friday.setDate(friday.getDate() - 1);

    // אם זה לא שישי ולא שבת – אין מה להחזיר
    if (day !== 5 && day !== 6) return null;

    const key = friday.toISOString().split("T")[0];

    const url =
      `https://www.hebcal.com/shabbat/?cfg=json&geo=city&city=${encodeURIComponent(city)}` +
      `&M=on&lg=h&date=${key}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error("Shabbat HTTP error:", res.status);
      return null;
    }

    const data = await res.json();
    if (!data.items) return null;

    let candleLighting = null;
    let havdalah = null;

    for (const item of data.items) {
      if (item.category === "candles") candleLighting = item.date;
      if (item.category === "havdalah") havdalah = item.date;
    }

    if (!candleLighting && !havdalah) return null;

    return { candleLighting, havdalah };

  } catch (e) {
    console.error("Shabbat API error:", e);
    return null;
  }
}

// פורמט יפה לתצוגה
function formatShabbatLabel(times) {
  if (!times) return "";

  let txt = "";

  if (times.candleLighting) {
    const t = new Date(times.candleLighting);
    txt += `🕯️ כניסת שבת: ${t.getHours().toString().padStart(2,"0")}:${t.getMinutes().toString().padStart(2,"0")}`;
  }

  if (times.havdalah) {
    const t = new Date(times.havdalah);
    txt += ` • ⭐ צאת שבת: ${t.getHours().toString().padStart(2,"0")}:${t.getMinutes().toString().padStart(2,"0")}`;
  }

  return txt.trim();
}

window.Shabbat = { getShabbatTimes, formatShabbatLabel };
