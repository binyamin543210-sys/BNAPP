//
// shabbat.js
// זמני הדלקת נרות / צאת שבת וחג לפי העיר
//

// ------------------------------
// קבלת זמני שבת/חג לפי עיר
// ------------------------------
async function getShabbatTimes(city, isoDate) {
  if (!city) return null;

  try {
    // תאריך בפורמט YYYY-MM-DD
    const url =
      `https://www.hebcal.com/shabbat/?cfg=json&geo=city&city=${encodeURIComponent(city)}&M=on&lg=h&date=${isoDate}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.items) return null;

    let candleLighting = null;
    let havdalah = null;

    for (const item of data.items) {
      if (item.category === "candles") {
        candleLighting = item.date; // כניסת שבת/חג
      }
      if (item.category === "havdalah") {
        havdalah = item.date; // צאת שבת/חג
      }
    }

    return {
      candleLighting,
      havdalah
    };

  } catch (e) {
    console.error("Shabbat API error:", e);
    return null;
  }
}

// ------------------------------
// פונקציה ליצירת טקסט תצוגה
// ------------------------------
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

// ייצוא מודול
window.Shabbat = {
  getShabbatTimes,
  formatShabbatLabel,
};
