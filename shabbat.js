// shabbat.js
// חישוב זמני שבת לכל החודש לפי קואורדינטות (geo=pos)

const Shabbat = (() => {

  const CITY_COORDS = {
    "יבנה": { lat: 31.878, lon: 34.739 },
    "yavne": { lat: 31.878, lon: 34.739 },

    "תל אביב": { lat: 32.0853, lon: 34.7818 },
    "תל-אביב": { lat: 32.0853, lon: 34.7818 },
    "tel aviv": { lat: 32.0853, lon: 34.7818 },

    "ירושלים": { lat: 31.778, lon: 35.235 },
    "jerusalem": { lat: 31.778, lon: 35.235 },

    "בני ברק": { lat: 32.095, lon: 34.825 },
    "bnei brak": { lat: 32.095, lon: 34.825 },

    "אשדוד": { lat: 31.792, lon: 34.648 },
    "ashdod": { lat: 31.792, lon: 34.648 },

    "חיפה": { lat: 32.794, lon: 34.989 },
    "haifa": { lat: 32.794, lon: 34.989 },

    "ניו יורק": { lat: 40.7128, lon: -74.0060 },
    "new york": { lat: 40.7128, lon: -74.0060 },

    "מיאמי": { lat: 25.7617, lon: -80.1918 },
    "miami": { lat: 25.7617, lon: -80.1918 },

    "לוס אנג'לס": { lat: 34.0522, lon: -118.2437 },
    "los angeles": { lat: 34.0522, lon: -118.2437 },

    "לונדון": { lat: 51.5074, lon: -0.1278 },
    "london": { lat: 51.5074, lon: -0.1278 },

    "פריז": { lat: 48.8566, lon: 2.3522 },
    "paris": { lat: 48.8566, lon: 2.3522 }
  };

  const DEFAULT_COORDS = CITY_COORDS["יבנה"];

  function normalizeCity(name) {
    return name.toString().trim().toLowerCase().replace(/[\"׳״']/g, "");
  }

  function getCoordsForCity(city) {
    const norm = normalizeCity(city);
    if (CITY_COORDS[norm]) return CITY_COORDS[norm];
    return DEFAULT_COORDS;
  }

  function fmt(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  async function getShabbatForMonth(city, year, monthIndex, daysInMonth) {

    const { lat, lon } = getCoordsForCity(city);

    const start = fmt(new Date(year, monthIndex, 1));
    const end = fmt(new Date(year, monthIndex, daysInMonth));

    const url =
      `https://www.hebcal.com/shabbat?cfg=json&geo=pos&latitude=${lat}&longitude=${lon}` +
      `&start=${start}&end=${end}`;

    let data;
    try {
      const res = await fetch(url);
      if (!res.ok) return {};
      data = await res.json();
    } catch {
      return {};
    }

    if (!data.items) return {};

    const map = {};

    for (const it of data.items) {
      const key = it.date?.split("T")[0];
      if (!key) continue;

      if (!map[key]) map[key] = { candle: "", havdalah: "", full: "" };

      if (it.category === "candles") {
        map[key].candle = it.candles || it.title.replace(/.*:\s*/, "");
      }

      if (it.category === "havdalah") {
        map[key].havdalah = it.havdalah || it.title.replace(/.*:\s*/, "");
      }
    }

    for (const key in map) {
      const o = map[key];
      const arr = [];
      if (o.candle) arr.push(`🕯️ כניסת שבת: ${o.candle}`);
      if (o.havdalah) arr.push(`⭐ צאת שבת: ${o.havdalah}`);
      o.full = arr.join(" • ");
    }

    return map;
  }

  return { getShabbatForMonth };
})();
