// shabbat.js
// זמני כניסת / יציאת שבת לכל החודש לפי עיר

function pad(n) {
  return String(n).padStart(2, "0");
}

// מחזיר מפה: YYYY-MM-DD -> טקסט מוכן לתצוגה
async function getShabbatForMonth(city, year, month, daysInMonth) {
  if (!city) return {};

  try {
    const start = `${year}-${pad(month + 1)}-01`;
    const end = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`;

    const url =
      `https://www.hebcal.com/shabbat/?cfg=json&geo=city&city=${encodeURIComponent(
        city
      )}` +
      `&start=${start}&end=${end}&M=on&lg=h`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.items) return {};

    // dateKey -> { candle?: iso, havdalah?: iso }
    const map = {};

    for (const item of data.items) {
      if (item.category !== "candles" && item.category !== "havdalah") continue;

      const dateKey = item.date.split("T")[0]; // YYYY-MM-DD

      if (!map[dateKey]) map[dateKey] = {};

      if (item.category === "candles") {
        map[dateKey].candle = item.date;
      }
      if (item.category === "havdalah") {
        map[dateKey].havdalah = item.date;
      }
    }

    // בונים טקסט מוכן לכל יום
    const out = {};

    Object.keys(map).forEach((key) => {
      const info = map[key];
      let txt = "";

      if (info.candle) {
        const t = new Date(info.candle);
        txt += `🕯️ כניסת שבת: ${t
          .getHours()
          .toString()
          .padStart(2, "0")}:${t
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;
      }

      if (info.havdalah) {
        const t = new Date(info.havdalah);
        if (txt) txt += " • ";
        txt += `⭐ צאת שבת: ${t
          .getHours()
          .toString()
          .padStart(2, "0")}:${t
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;
      }

      out[key] = txt;
    });

    return out;
  } catch (e) {
    console.error("Shabbat API error:", e);
    return {};
  }
}

window.Shabbat = {
  getShabbatForMonth,
};
