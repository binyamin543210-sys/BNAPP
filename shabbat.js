// shabbat.js
// הפעלת זמני שבת דרך פרוקסי שעוקף CORS

const Shabbat = (() => {

  const CITY_COORDS = {
    "יבנה": { lat: 31.878, lon: 34.739 },
    "yavne": { lat: 31.878, lon: 34.739 },

    "תל אביב": { lat: 32.0853, lon: 34.7818 },
    "tel aviv": { lat: 32.0853, lon: 34.7818 },

    "ירושלים": { lat: 31.778, lon: 35.235 },
    "jerusalem": { lat: 31.778, lon: 35.235 },

    "אשדוד": { lat: 31.792, lon: 34.648 },
    "ashdod": { lat: 31.792, lon: 34.648 },

    "חיפה": { lat: 32.794, lon: 34.989 },
    "haifa": { lat: 32.794, lon: 34.989 },

    "בני ברק": { lat: 32.095, lon: 34.825 },
    "bnei brak": { lat: 32.095, lon: 34.825 },

    "ניו יורק": { lat: 40.7128, lon: -74.0060 },
    "new york": { lat: 40.7128, lon: -74.0060 },

    "מיאמי": { lat: 25.7617, lon: -80.1918 },
    "miami": { lat: 25.7617, lon: -80.1918 }
  };

  const DEFAULT = CITY_COORDS["יבנה"];

  function normalize(name) {
    if (!name) return "";
    return name.toString().trim().toLowerCase();
  }

  function getCoords(city) {
    const norm = normalize(city);
    return CITY_COORDS[norm] || DEFAULT;
  }

  function fmt(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }

  async function getShabbatForMonth(cityName, year, monthIndex, daysInMonth) {
    const { lat, lon } = getCoords(cityName);
    const start = fmt(new Date(year, monthIndex, 1));
    const end = fmt(new Date(year, monthIndex, daysInMonth));

    const url =
      `https://bnapp-shabbat-proxy.onrender.com/shabbat` +
      `?lat=${lat}&lon=${lon}&start=${start}&end=${end}`;

    let data;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error("Proxy error", res.status);
        return {};
      }
      data = await res.json();
    } catch (e) {
      console.error("Shabbat proxy fetch error:", e);
      return {};
    }

    const map = {};

    for (const item of data.items || []) {
      const key = item.date.split("T")[0];
      if (!map[key]) map[key] = { candle: "", havdalah: "", full: "" };

      if (item.category === "candles") {
        map[key].candle = item.candles || item.title.replace(/.*:\s*/, "");
      }

      if (item.category === "havdalah") {
        map[key].havdalah = item.havdalah || item.title.replace(/.*:\s*/, "");
      }
    }

    for (const key in map) {
      const o = map[key];
      const parts = [];
      if (o.candle) parts.push(`🕯️ כניסת שבת: ${o.candle}`);
      if (o.havdalah) parts.push(`⭐ צאת שבת: ${o.havdalah}`);
      o.full = parts.join(" • ");
    }

    return map;
  }

  return { getShabbatForMonth };

})();
