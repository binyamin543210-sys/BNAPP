//
// weather.js – תחזית אמינה + Fallback לימים בלי 12:00
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

async function getCityCoords(city) {
  try {
    const url =
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${WEATHER_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data?.length) return null;
    return { lat: data[0].lat, lon: data[0].lon };
  } catch {
    return null;
  }
}

async function getWeatherForDate(city, isoDate) {
  try {
    const coords = await getCityCoords(city);
    if (!coords) return null;

    const url =
      `https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${WEATHER_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();
    if (!data.list) return null;

    const target = new Date(isoDate);

    // 1️⃣ קודם ננסה למצוא תחזית לשעה 12
    let exact = data.list.find(e => {
      const dt = new Date(e.dt * 1000);
      return (
        dt.getFullYear() === target.getFullYear() &&
        dt.getMonth() === target.getMonth() &&
        dt.getDate() === target.getDate() &&
        dt.getHours() === 12
      );
    });

    // 2️⃣ אם אין 12:00 → ניקח "כל מה שיש לאותו יום"
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

      // מחשבים בעצמנו max/min
      const temps = sameDay.map(e => e.main.temp);
      const max = Math.round(Math.max(...temps));
      const min = Math.round(Math.min(...temps));
      const icon = WEATHER_ICONS[sameDay[0].weather[0].icon] || "⛅";

      return {
        icon,
        max,
        min,
        desc: sameDay[0].weather[0].description
      };
    }

    // 3️⃣ אם כן יש 12:00
    return {
      icon: WEATHER_ICONS[exact.weather[0].icon] || "⛅",
      max: Math.round(exact.main.temp_max),
      min: Math.round(exact.main.temp_min),
      desc: exact.weather[0].description
    };

  } catch {
    return null;
  }
}

window.Weather = { getWeatherForDate };
