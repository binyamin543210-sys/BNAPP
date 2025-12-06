//
// shabbat.js — FIXED
//

async function getShabbatTimes(city, isoDate) {
  if (!city) return null;

  try {
    const url =
      `https://www.hebcal.com/shabbat/?cfg=json&geo=city&city=${encodeURIComponent(city)}` +
      `&start=${isoDate}&end=${isoDate}&M=on&lg=h`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.items) return null;

    let candle = null;
    let havdalah = null;

    for (const item of data.items) {
      if (item.category === "candles") candle = item.date;
      if (item.category === "havdalah") havdalah = item.date;
    }

    return { candleLighting: candle, havdalah: havdalah };

  } catch (e) {
    console.error("Shabbat API error:", e);
    return null;
  }
}

function formatShabbatLabel(times) {
  if (!times) return "";

  let out = "";

  if (times.candleLighting) {
    const t = new Date(times.candleLighting);
    out += `🕯️ כניסת שבת: ${t.getHours().toString().padStart(2,"0")}:${t.getMinutes().toString().padStart(2,"0")}`;
  }

  if (times.havdalah) {
    const t = new Date(times.havdalah);
    out += ` • ⭐ יציאת שבת: ${t.getHours().toString().padStart(2,"0")}:${t.getMinutes().toString().padStart(2,"0")}`;
  }

  return out;
}

window.Shabbat = {
  getShabbatTimes,
  formatShabbatLabel
};
