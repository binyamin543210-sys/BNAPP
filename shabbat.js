//
// shabbat.js
// זמני הדלקת נרות / צאת שבת לפי עיר
//

// מביא זמני שבת לשבוע לפי יום שישי של אותו שבוע
async function getShabbatTimes(city, fridayIso) {
  if (!city) return null;

  try {
    const url =
      `https://www.hebcal.com/shabbat/?cfg=json&geo=city&city=${encodeURIComponent(city)}` +
      `&M=on&lg=h&date=${fridayIso}`;

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

// פורמט טקסט להצגה
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

window.Shabbat = {
  getShabbatTimes,
  formatShabbatLabel,
};
