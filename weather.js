// weather.js
// משיכת מזג אוויר + תחזית חודשית לפי open-meteo

const Weather = (() => {

  async function getCoords(city) {
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=he`;
      const r = await fetch(url);
      const data = await r.json();
      if (data.results && data.results.length > 0) {
        return {
          lat: data.results[0].latitude,
          lon: data.results[0].longitude
        };
      }
    } catch {}

    return { lat: 31.878, lon: 34.739 }; // יבנה
  }

  function fmt(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  async function getWeatherForMonth(city, year, monthIndex) {

    const coords = await getCoords(city);
    const start = fmt(new Date(year, monthIndex, 1));
    const end = fmt(new Date(year, monthIndex + 1, 0));

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min` +
      `&timezone=auto&start_date=${start}&end_date=${end}`;

    let data;
    try {
      const res = await fetch(url);
      data = await res.json();
    } catch (e) {
      console.error("Weather error", e);
      return {};
    }

    const map = {};

    if (!data.daily) return map;

    const days = data.daily.time.length;

    for (let i = 0; i < days; i++) {
      const key = data.daily.time[i];
      map[key] = {
        max: data.daily.temperature_2m_max[i],
        min: data.daily.temperature_2m_min[i],
        icon: weatherCodeIcon(data.daily.weathercode[i]),
        desc: weatherDesc(data.daily.weathercode[i])
      };
    }

    return map;
  }

  function weatherCodeIcon(code) {
    if (code === 0) return "☀️";
    if (code <= 3) return "🌤️";
    if (code <= 48) return "🌥️";
    if (code <= 67) return "🌧️";
    if (code <= 77) return "🌨️";
    return "⛈️";
  }

  function weatherDesc(code) {
    if (code === 0) return "בהיר";
    if (code <= 3) return "מעונן חלקית";
    if (code <= 48) return "אבק/ערפל";
    if (code <= 67) return "גשם";
    if (code <= 77) return "שלג";
    return "סערה";
  }

  return { getWeatherForMonth };
})();
