// shabbat.js
// זמני הדלקת נרות / צאת שבת לפי עיר, לכל החודש

// מחזיר מפה של כל החודש:
// { "YYYY-MM-DD": { candleLighting: "...", havdalah: "..." }, ... }
async function getShabbatMonthTimes(city, year, month) {
  if (!city) return {};

  try {
    // month: 0-11 → ל־Hebcal צריך 1-12
    const m = month + 1;

    const url =
      `https://www.hebcal.com/hebcal?cfg=json&v=1` +
      `&year=${year}&month=${m}` +
      `&geo=city&city=${encodeURIComponent(city)}` +
      `&ss=on&c=on&lg=h`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.items) return {};

    const result = {};

    data.items.forEach(item => {
      const dateKey = item.date.split("T")[0];

      // הדלקת נרות
      if (item.category === "candles") {
        if (!result[dateKey]) result[dateKey] = {};
        result[dateKey].candleLighting = item.date;
      }

      // צאת שבת
      if (item.category === "havdalah") {
        if (!result[dateKey]) result[dateKey] = {};
        result[dateKey].havdalah = item.date;
      }
    });

    return result;

  } catch (e) {
    console.error("Shabbat monthly API error:", e);
    return {};
  }
}

// מייצר טקסט יפה מתזמני שבת ליום מסוים
function formatShabbatLabel(times) {
  if (!times) return "";

  let txt = "";

  if (times.candleLighting) {
    const t = new Date(times.candleLighting);
    const hh = t.getHours().toString().padStart(2, "0");
    const mm = t.getMinutes().toString().padStart(2, "0");
    txt += `🕯️ כניסת שבת: ${hh}:${mm}`;
  }

  if (times.havdalah) {
    const t = new Date(times.havdalah);
    const hh = t.getHours().toString().padStart(2, "0");
    const mm = t.getMinutes().toString().padStart(2, "0");
    if (txt) txt += " • ";
    txt += `⭐ צאת שבת: ${hh}:${mm}`;
  }

  return txt.trim();
}

window.Shabbat = {
  getShabbatMonthTimes,
  formatShabbatLabel,
};
