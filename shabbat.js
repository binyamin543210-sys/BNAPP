//
// shabbat.js – גרסה מתוקנת ומלאה
// מערכת שבת/חג חכמה – רק לימים רלוונטיים
//

// **Cache** לשימוש חכם – שלא נטען את Hebcal 31 פעמים כל חודש
const SHABBAT_CACHE = {};

// קבלת זמני שבת/חג לפי העיר ולפי שבוע
async function getShabbatTimes(city, isoDate) {
  if (!city) return null;

  // תאריך
  const d = new Date(isoDate);
  const day = d.getDay(); // 0=ראשון ... 5=שישי, 6=שבת

  // אם זה לא יום שישי או שבת – אין צורך להציג זמני שבת
  if (day !== 5 && day !== 6) return null;

  // נחשב את יום שישי של אותו שבוע
  const friday = new Date(d);
  friday.setDate(friday.getDate() - ((day + 2) % 7)); // Friday index

  const fridayKey = friday.toISOString().split("T")[0];

  // אם כבר שמור בקאש – מחזיר מיד
  if (SHABBAT_CACHE[fridayKey]) return SHABBAT_CACHE[fridayKey];

  try {
    const url =
      `https://www.hebcal.com/shabbat/?cfg=json&geo=city` +
      `&city=${encodeURIComponent(city)}` +
      `&M=on&lg=h&date=${fridayKey}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.items) return null;

    let candleLighting = null;
    let havdalah = null;

    for (const item of data.items) {
      if (item.category === "candles") {
        candleLighting = item.date;
      }
      if (item.category === "havdalah") {
        havdalah = item.date;
      }
    }

    SHABBAT_CACHE[fridayKey] = { candleLighting, havdalah };
    return SHABBAT_CACHE[fridayKey];

  } catch (e) {
    console.error("Shabbat API error:", e);
    return null;
  }
}


// פורמט תצוגה
function formatShabbatLabel(times) {
  if (!times || (!times.candleLighting && !times.havdalah)) return "";

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


// חשיפה
window.Shabbat = {
  getShabbatTimes,
  formatShabbatLabel
};
