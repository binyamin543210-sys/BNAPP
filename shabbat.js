// shabbat.js
// זמנים מדויקים לפי Hebcal, עם תמיכה בעיר משתנה

const ShabbatAPI = {
  baseUrl: "https://www.hebcal.com/shabbat/",
};

// מחזיר אובייקט עם candleLighting / havdalah ליום מסוים
async function getShabbatTimes(city, isoDate) {
  try {
    const url =
      `${ShabbatAPI.baseUrl}?cfg=json&geo=city` +
      `&city=${encodeURIComponent(city)}` +
      `&M=on&lg=h&start=${isoDate}&end=${isoDate}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error("Shabbat API status", res.status);
      return null;
    }
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

    return { candleLighting, havdalah };
  } catch (e) {
    console.error("Shabbat API error", e);
    return null;
  }
}

// עוזר להוציא שעה יפה מ־ISO
function shabbatTimeLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

// טקסט עבור יום בודד – משמש גם בחלון וגם בתא
function formatShabbatForDay(dateObj, times) {
  if (!times) return "";

  const dow = dateObj.getDay(); // 5=שישי, 6=שבת
  if (dow === 5 && times.candleLighting) {
    return `🕯️ כניסת שבת: ${shabbatTimeLabel(times.candleLighting)}`;
  }
  if (dow === 6 && times.havdalah) {
    return `⭐ צאת שבת: ${shabbatTimeLabel(times.havdalah)}`;
  }
  return "";
}

window.Shabbat = {
  getShabbatTimes,
  formatShabbatForDay,
};
