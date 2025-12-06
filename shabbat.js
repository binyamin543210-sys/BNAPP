// shabbat.js – FIXED FULL MONTH SHABBAT TIMES

async function getShabbatMonthTimes(city, year, month) {
  try {
    const url =
      `https://www.hebcal.com/hebcal?cfg=json&v=1&year=${year}&month=${month+1}&ss=on&c=on&geo=city&city=${encodeURIComponent(city)}&lg=h`;

    const res = await fetch(url);
    const data = await res.json();
    if (!data.items) return {};

    const result = {};

    data.items.forEach(item => {
      const dateKey = item.date.split("T")[0];

      // הדלקת נרות
      if (item.category === "candles") {
        result[dateKey] = result[dateKey] || {};
        result[dateKey].candleLighting = item.date;
      }

      // צאת שבת
      if (item.category === "havdalah") {
        result[dateKey] = result[dateKey] || {};
        result[dateKey].havdalah = item.date;
      }
    });

    return result;

  } catch (e) {
    console.error("Shabbat monthly error:", e);
    return {};
  }
}

// פורמט תצוגה
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
  getShabbatMonthTimes,
  formatShabbatLabel,
};
