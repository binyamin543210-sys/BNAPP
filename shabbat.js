// shabbat.js
// זמני הדלקת נרות / צאת שבת לפי קואורדינטות (Yavne כבר בפנים)

const CITY_COORDS = {
  "Yavne":        { lat: 31.8833, lon: 34.7333, tzid: "Asia/Jerusalem" },
  "Jerusalem":    { lat: 31.7833, lon: 35.2167, tzid: "Asia/Jerusalem" },
  "Tel Aviv":     { lat: 32.0809, lon: 34.7806, tzid: "Asia/Jerusalem" }
};

// קבלת זמני שבת/חג לפי עיר
async function getShabbatTimes(city, isoDate) {
  const cfg = CITY_COORDS[city] || CITY_COORDS["Jerusalem"];

  try {
    const url =
      `https://www.hebcal.com/shabbat/?cfg=json` +
      `&geo=pos&latitude=${cfg.lat}&longitude=${cfg.lon}` +
      `&tzid=${encodeURIComponent(cfg.tzid)}` +
      `&M=on&lg=h&start=${isoDate}&end=${isoDate}`;

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

    if (!candleLighting && !havdalah) return null;

    return { candleLighting, havdalah };
  } catch (e) {
    console.error("Shabbat API error:", e);
    return null;
  }
}

// טקסט תצוגה
function formatShabbatLabel(times) {
  if (!times) return "";

  let txt = "";

  if (times.candleLighting) {
    const t = new Date(times.candleLighting);
    txt += `🕯️ כניסת שבת/חג: ${t.getHours().toString().padStart(2,"0")}:${t.getMinutes().toString().padStart(2,"0")}`;
  }

  if (times.havdalah) {
    const t = new Date(times.havdalah);
    txt += ` • ⭐ צאת שבת/חג: ${t.getHours().toString().padStart(2,"0")}:${t.getMinutes().toString().padStart(2,"0")}`;
  }

  return txt.trim();
}

window.Shabbat = {
  getShabbatTimes,
  formatShabbatLabel,
};
