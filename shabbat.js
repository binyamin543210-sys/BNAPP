//
// shabbat.js – חישוב אמיתי לכל שבת בנפרד
//

async function getShabbatTimes(city, isoDate) {
  if (!city) return null;

  const d = new Date(isoDate);
  const day = d.getDay(); // 5=Friday, 6=Saturday

  // אם זה שבת – מביאים לשישי שלפני
  let friday = new Date(d);
  if (day === 6) friday.setDate(friday.getDate() - 1);

  // אם זה שישי – משתמשים בתאריך עצמו
  if (day === 5) friday = d;

  // אם זה לא שישי/שבת – אין נתון
  if (day !== 5 && day !== 6) return null;

  const key = friday.toISOString().split("T")[0];

  try {
    const url =
      `https://www.hebcal.com/shabbat/?cfg=json&geo=city&city=${encodeURIComponent(city)}&M=on&lg=h&date=${key}`;

    const res = await fetch(url);
    const data = await res.json();

    let candle = null;
    let havdalah = null;

    for (const item of data.items) {
      if (item.category === "candles") candle = item.date;
      if (item.category === "havdalah") havdalah = item.date;
    }

    return { candleLighting: candle, havdalah };

  } catch {
    return null;
  }
}

function formatShabbatLabel(t) {
  if (!t) return "";
  let out = "";

  if (t.candleLighting) {
    const d = new Date(t.candleLighting);
    out += `🕯️ ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
  }

  if (t.havdalah) {
    const d = new Date(t.havdalah);
    out += ` • ⭐ ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
  }

  return out;
}

window.Shabbat = { getShabbatTimes, formatShabbatLabel };
