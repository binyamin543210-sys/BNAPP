//
// shabbat.js — זמני שבת על בסיס Hebcal
//

async function getShabbatTimes(city, isoDate) {
  if (!city) return null;

  try {
    const url =
      `https://www.hebcal.com/shabbat/?cfg=json&geo=city&city=${encodeURIComponent(city)}&M=on&lg=h&start=${isoDate}&end=${isoDate}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error("Shabbat API HTTP error:", res.status);
      return null;
    }

    const data = await res.json();
    if (!data.items) return null;

    let candle = null;   // כניסת שבת (שישי)
    let havdalah = null; // צאת שבת (שבת)

    for (const item of data.items) {
      if (item.category === "candles") {
        const d = new Date(item.date);
        if (d.getDay() === 5) candle = item.date;
      }
      if (item.category === "havdalah") {
        const d = new Date(item.date);
        if (d.getDay() === 6) havdalah = item.date;
      }
    }

    return { candle, havdalah };

  } catch (e) {
    console.error("Shabbat API error:", e);
    return null;
  }
}

function formatShabbatForDay(dateObj, times) {
  if (!times) return "";

  const weekday = dateObj.getDay();
  let txt = "";

  if (weekday === 5 && times.candle) {
    const t = new Date(times.candle);
    txt = `🕯️ כניסת שבת: ${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`;
  }

  if (weekday === 6 && times.havdalah) {
    const t = new Date(times.havdalah);
    txt = `⭐ צאת שבת: ${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`;
  }

  return txt;
}

window.Shabbat = {
  getShabbatTimes,
  formatShabbatForDay
};
