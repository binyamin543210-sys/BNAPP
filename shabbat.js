// shabbat.js
// חישוב זמני שבת לכל החודש לפי קואורדינטות (geo=pos) + מיפוי ערים נפוצות

const Shabbat = (() => {
  // ------ מיפוי שם עיר -> קואורדינטות ------
  // אפשר להוסיף פה עוד ערים כשתרצה
  const CITY_COORDS = {
    // ישראל
    "יבנה": { lat: 31.878, lon: 34.739 },
    "yavne": { lat: 31.878, lon: 34.739 },

    "תל אביב": { lat: 32.0853, lon: 34.7818 },
    "tel aviv": { lat: 32.0853, lon: 34.7818 },
    "תל-אביב": { lat: 32.0853, lon: 34.7818 },

    "ירושלים": { lat: 31.778, lon: 35.235 },
    "jerusalem": { lat: 31.778, lon: 35.235 },

    "בני ברק": { lat: 32.095, lon: 34.825 },
    "bnei brak": { lat: 32.095, lon: 34.825 },

    "אשדוד": { lat: 31.792, lon: 34.648 },
    "ashdod": { lat: 31.792, lon: 34.648 },

    "חיפה": { lat: 32.794, lon: 34.989 },
    "haifa": { lat: 32.794, lon: 34.989 },

    // חו"ל בסיסי
    "ניו יורק": { lat: 40.7128, lon: -74.0060 },
    "new york": { lat: 40.7128, lon: -74.0060 },

    "מיאמי": { lat: 25.7617, lon: -80.1918 },
    "miami": { lat: 25.7617, lon: -80.1918 },

    "לוס אנג'לס": { lat: 34.0522, lon: -118.2437 },
    "לוס אנגלס": { lat: 34.0522, lon: -118.2437 },
    "los angeles": { lat: 34.0522, lon: -118.2437 },

    "לונדון": { lat: 51.5074, lon: -0.1278 },
    "london": { lat: 51.5074, lon: -0.1278 },

    "פריז": { lat: 48.8566, lon: 2.3522 },
    "paris": { lat: 48.8566, lon: 2.3522 }
  };

  const DEFAULT_COORDS = CITY_COORDS["יבנה"]; // ברירת מחדל – יבנה

  // ניקוי שם עיר (רישיות, רווחים, גרשיים וכו')
  function normalizeCityName(name) {
    if (!name) return "";
    return name
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\"״׳']/g, "")
      .replace(/\s+/g, " ");
  }

  function getCoordsForCity(cityName) {
    const norm = normalizeCityName(cityName);
    if (CITY_COORDS[norm]) {
      return CITY_COORDS[norm];
    }
    // לא מצא – נשתמש בברירת מחדל (יבנה)
    console.warn("Shabbat: unknown city, using default Yavne:", cityName);
    return DEFAULT_COORDS;
  }

  // המרה ל-YYYY-MM-DD בלי ענייני UTC
  function fmtLocalDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // ------------------------------------------------------------------
  // getShabbatForMonth(cityName, year, monthIndex, daysInMonth)
  // מחזיר מפה:
  //  key = "YYYY-MM-DD"  ->  { full, candle, havdalah }
  // ------------------------------------------------------------------
  async function getShabbatForMonth(cityName, year, monthIndex, daysInMonth) {
    const { lat, lon } = getCoordsForCity(cityName || "Yavne");

    // נבנה טווח תאריכים לכל החודש (קצת מרווח בטוח)
    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex, daysInMonth);

    const startStr = fmtLocalDate(startDate);
    const endStr = fmtLocalDate(endDate);

    const url =
      "https://www.hebcal.com/shabbat" +
      `?cfg=json&geo=pos&latitude=${lat}&longitude=${lon}` +
      `&start=${encodeURIComponent(startStr)}` +
      `&end=${encodeURIComponent(endStr)}`;

    let data;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error("Shabbat API HTTP error:", res.status, url);
        return {};
      }
      data = await res.json();
    } catch (e) {
      console.error("Shabbat API fetch error:", e);
      return {};
    }

    const map = {};

    if (!data || !Array.isArray(data.items)) {
      console.warn("Shabbat API: unexpected response", data);
      return {};
    }

    // עוברים על כל האירועים ומסדרים לפי תאריך
    for (const item of data.items) {
      if (!item || !item.date) continue;

      const key = item.date.split("T")[0]; // yyyy-mm-dd
      if (!map[key]) {
        map[key] = { full: "", candle: "", havdalah: "" };
      }

      const cat = item.category;
      const title = item.title || "";

      if (cat === "candles") {
        // למשל "Candle lighting: 16:25"
        const time = (item.candles || title.replace(/.*:\s*/, "")).trim();
        map[key].candle = time;
      } else if (cat === "havdalah") {
        // למשל "Havdalah: 17:32"
        const time = (item.havdalah || title.replace(/.*:\s*/, "")).trim();
        map[key].havdalah = time;
      }
    }

    // בונים טקסט מלא לכל יום שישי/שבת שקיבלנו
    for (const key of Object.keys(map)) {
      const obj = map[key];
      const parts = [];
      if (obj.candle) parts.push(`🕯️ כניסת שבת: ${obj.candle}`);
      if (obj.havdalah) parts.push(`⭐ צאת שבת: ${obj.havdalah}`);
      obj.full = parts.join(" • ");
    }

    return map;
  }

  return {
    getShabbatForMonth
  };
})();
