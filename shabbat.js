
// shabbat.js
// זמני כניסת ויציאת שבת/חג לפי Hebcal

async function getShabbatTimes(city, isoDate) {
  if (!city) return null;
  try {
    const url =
      `https://www.hebcal.com/shabbat/?cfg=json&geo=city&city=${encodeURIComponent(city)}&M=on&lg=h&start=${isoDate}&m=1`;
    const res = await fetch(url);
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

function formatShabbatLabel(times) {
  if (!times) return "";
  let txt = "";
  if (times.candleLighting) {
    const t = new Date(times.candleLighting);
    txt += `🕯️ כניסת שבת/חג: ${t.getHours().toString().padStart(2,"0")}:${t.getMinutes().toString().padStart(2,"0")}`;
  }
  if (times.havdalah) {
    const t = new Date(times.havdalah);
    if (txt) txt += " • ";
    txt += `⭐ צאת שבת/חג: ${t.getHours().toString().padStart(2,"0")}:${t.getMinutes().toString().padStart(2,"0")}`;
  }
  return txt;
}

window.Shabbat = {
  getShabbatTimes,
  formatShabbatLabel,
};
