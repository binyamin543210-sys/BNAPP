// weather.js
// OpenWeatherMap – תחזית יומית, נתונים עד כמה ימים קדימה

const WEATHER_API_KEY = "aa23ce141d8b2aa46e8cfcae221850a7";

const WEATHER_ICONS = {
  "01d": "☀️",
  "01n": "🌕",
  "02d": "⛅",
  "02n": "☁️",
  "03d": "☁️",
  "03n": "☁️",
  "04d": "☁️",
  "04n": "☁️",
  "09d": "🌧️",
  "09n": "🌧️",
  "10d": "🌦️",
  "10n": "🌧️",
  "11d": "⛈️",
  "11n": "⛈️",
  "13d": "❄️",
  "13n": "❄️",
  "50d": "🌫️",
  "50n": "🌫️",
};

async function getCityCoords(city) {
  try {
    const url =
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
        city
      )}&limit=1&appid=${WEATHER_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Weather geocode status", res.status);
      return null;
    }
    const data = await res.json();
    if (!data || !data.length) return null;
    return { lat: data[0].lat, lon: data[0].lon };
  } catch (e) {
    console.error("Weather geocode error", e);
    return null;
  }
}

// מחזיר map: YYYY-MM-DD -> { icon, max, min, desc }
async function getWeatherForMonth(city, year, month) {
  const result = {};

  const coords = await getCityCoords(city);
  if (!coords) return result;

  try {
    const url =
      `https://api.openweathermap.org/data/2.5/onecall?lat=${coords.lat}` +
      `&lon=${coords.lon}&exclude=minutely,hourly,alerts&units=metric&appid=${WEATHER_API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error("Weather onecall status", res.status);
      return result;
    }
    const data = await res.json();
    if (!data.daily) return result;

    data.daily.forEach((d) => {
      const dt = new Date(d.dt * 1000);
      const y = dt.getFullYear();
      const m = dt.getMonth();
      const dd = dt.getDate();
      if (y === year && m === month) {
        const key = dt.toISOString().split("T")[0];
        result[key] = {
          icon: WEATHER_ICONS[d.weather[0].icon] || "⛅",
          max: Math.round(d.temp.max),
          min: Math.round(d.temp.min),
          desc: d.weather[0].description,
        };
      }
    });

    return result;
  } catch (e) {
    console.error("Weather fetch error", e);
    return result;
  }
}

window.Weather = {
  getWeatherForMonth,
};
