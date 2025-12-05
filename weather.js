
// weather.js
// תחזית מזג אוויר באמצעות OpenWeatherMap One Call

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
  "50n": "🌫️"
};

let _weatherCache = {
  cityKey: null,
  fetchedAt: 0,
  daily: [],
};

// קואורדינטות לעיר מסוימת
async function getCityCoords(city) {
  try {
    const url =
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${WEATHER_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data || !data.length) return null;
    return { lat: data[0].lat, lon: data[0].lon };
  } catch (e) {
    console.error("Weather coords error:", e);
    return null;
  }
}

// טוען תחזית יומית ל-7 ימים קדימה לעיר
async function loadWeatherForCity(city) {
  const now = Date.now();
  if (_weatherCache.cityKey === city && (now - _weatherCache.fetchedAt) < 60 * 60 * 1000) {
    return _weatherCache.daily;
  }

  const coords = await getCityCoords(city);
  if (!coords) return [];

  const url =
    `https://api.openweathermap.org/data/2.5/onecall?lat=${coords.lat}&lon=${coords.lon}` +
    `&exclude=minutely,hourly,alerts&units=metric&appid=${WEATHER_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.daily) return [];

    _weatherCache = {
      cityKey: city,
      fetchedAt: now,
      daily: data.daily,
    };

    return data.daily;
  } catch (e) {
    console.error("Weather fetch error:", e);
    return [];
  }
}

// מחזיר map של תחזית לפי תאריך YYYY-MM-DD
async function getWeatherMap(city) {
  const daily = await loadWeatherForCity(city);
  const map = {};
  daily.forEach(d => {
    const dt = new Date(d.dt * 1000);
    const key = dt.toISOString().split("T")[0];
    map[key] = {
      icon: WEATHER_ICONS[d.weather[0].icon] || "⛅",
      max: Math.round(d.temp.max),
      min: Math.round(d.temp.min),
      desc: d.weather[0].description,
    };
  });
  return map;
}

window.Weather = {
  getWeatherMap,
};
