//
// weather.js
// מזג אוויר – OpenWeatherMap, תחזית ל־7 ימים
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

const _weatherCache = {
  coords: null,
  lastCity: null,
  daily: null
};

async function getCityCoords(city) {
  try {
    if (_weatherCache.coords && _weatherCache.lastCity === city) {
      return _weatherCache.coords;
    }

    const url =
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${WEATHER_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data || !data.length) return null;

    const coords = { lat: data[0].lat, lon: data[0].lon };
    _weatherCache.coords = coords;
    _weatherCache.lastCity = city;
    return coords;
  } catch (e) {
    console.error("Weather coords error:", e);
    return null;
  }
}

async function getForecastForCity(city) {
  try {
    if (_weatherCache.daily && _weatherCache.lastCity === city) {
      return _weatherCache.daily;
    }

    const coords = await getCityCoords(city);
    if (!coords) return null;

    const url =
      `https://api.openweathermap.org/data/2.5/onecall?lat=${coords.lat}&lon=${coords.lon}` +
      `&exclude=minutely,hourly,alerts&units=metric&appid=${WEATHER_API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error("Weather API error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    if (!data.daily) return null;

    _weatherCache.daily = data.daily;
    return data.daily;
  } catch (e) {
    console.error("Weather fetch error:", e);
    return null;
  }
}

// מחזיר מפה: isoDate → { icon, max, min, desc }
async function getWeatherForMonth(city, year, month) {
  const daily = await getForecastForCity(city);
  if (!daily) return {};

  const result = {};

  daily.forEach(d => {
    const dt = new Date(d.dt * 1000);
    const iso = dt.toISOString().split("T")[0];

    if (dt.getFullYear() === year && dt.getMonth() === month) {
      result[iso] = {
        icon: WEATHER_ICONS[d.weather[0].icon] || "⛅",
        max: Math.round(d.temp.max),
        min: Math.round(d.temp.min),
        desc: d.weather[0].description
      };
    }
  });

  return result;
}

window.Weather = {
  getWeatherForMonth
};
