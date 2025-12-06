// weather.js
// תחזית יומית לפי open-meteo (ללא API KEY)

const Weather = {
  async getWeatherForDate(city, dateKey) {
    try {
      // קבוע: יהבנה – אפשר לשנות אוטומטית בהמשך לפי עיר
      const coords = {
        Yavne: { lat: 31.878, lon: 34.738 }
      }[city] || { lat: 31.878, lon: 34.738 };

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=weathercode,temperature_2m_max&timezone=Asia/Jerusalem`;

      const res = await fetch(url);
      const data = await res.json();

      const idx = data.daily.time.indexOf(dateKey);
      if (idx === -1) return null;

      const code = data.daily.weathercode[idx];
      const temp = data.daily.temperature_2m_max[idx];

      const icon =
        code === 0 ? "☀️" :
        code <= 3 ? "⛅" :
        code <= 61 ? "🌧️" :
        "🌩️";

      return {
        icon,
        max: Math.round(temp)
      };
    } catch {
      return null;
    }
  }
};

window.Weather = Weather;
