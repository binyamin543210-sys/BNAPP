//
// weather.js
// תחזית לפי שם עיר – OpenWeatherMap 5-day/3h
//

const WEATHER_API_KEY = "aa23ce141d8b2aa46e8cfcae221850a7";

const WEATHER_ICONS = {
  "01d": "☀️", "01n": "🌕",
  "02d": "⛅", "02n": "☁️",
  "03d": "☁️", "03n": "☁️",
  "04d": "☁️", "04n": "☁️",
  "09d": "🌧️", "09n": "🌧️",
  "10d": "🌦️", "10n": "🌧️",
  "11d": "⛈️", "11n": "⛈️",
  "13d": "❄️", "13n": "❄️",
  "50d": "🌫️", "50n": "🌫️"
};

// מביא תחזית ליום מסוים (ISO YYYY-MM-DD)
async function getWeatherForDate(city, isoDate) {
  if (!city || !WEATHER_API_KEY) return null;

  try {
    const url =
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}` +
      `&units=metric&appid=${WEATHER_API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error("Weather HTTP error:", res.status);
      return null;
    }

    const data = await res.json();
    if (!data.list) return null;

    const target = new Date(isoDate);

    // ננסה למצוא נקודה סביב 12:00
    let exact = data.list.find(e => {
      const dt = new Date(e.dt * 1000);
      return (
        dt.getFullYear() === target.getFullYear() &&
        dt.getMonth() === target.getMonth() &&
        dt.getDate() === target.getDate() &&
        dt.getHours() === 12
      );
    });

    // אם אין 12:00 ליום הזה – נחשב לבד מכל הקריאות של אותו יום
    if (!exact) {
      const sameDay = data.list.filter(e => {
        const dt = new Date(e.dt * 1000);
        return (
          dt.getFullYear() === target.getFullYear() &&
          dt.getMonth() === target.getMonth() &&
          dt.getDate() === target.getDate()
        );
      });

      if (!sameDay.length) return null;

      const temps = sameDay.map(e => e.main.temp);
      const max = Math.round(Math.max(...temps));
      const min = Math.round(Math.min(...temps));
      const iconCode = sameDay[0].weather[0].icon;
      const icon = WEATHER_ICONS[iconCode] || "⛅";

      return {
        icon,
        max,
        min,
        desc: sameDay[0].weather[0].description
      };
    }

    // יש נקודת 12:00
    const iconCode = exact.weather[0].icon;
    return {
      icon: WEATHER_ICONS[iconCode] || "⛅",
      max: Math.round(exact.main.temp_max),
      min: Math.round(exact.main.temp_min),
      desc: exact.weather[0].description
    };

  } catch (e) {
    console.error("Weather fetch error:", e);
    return null;
  }
}

window.Weather = {
  getWeatherForDate,
};
