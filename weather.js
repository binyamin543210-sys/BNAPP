//
// weather.js
// מזג אוויר לפי עיר – Open-Meteo API
//

const WEATHER_ICONS = {
  sun: "☀️",
  partly: "⛅",
  cloud: "☁️",
  rain: "🌧️",
  storm: "⛈️"
};

function getWeatherIcon(code) {
  if (code === 0) return WEATHER_ICONS.sun;
  if ([1,2].includes(code)) return WEATHER_ICONS.partly;
  if ([3].includes(code)) return WEATHER_ICONS.cloud;
  if ([51,53,55,61,63,65,80,81,82].includes(code)) return WEATHER_ICONS.rain;
  if ([95,96,99].includes(code)) return WEATHER_ICONS.storm;
  return WEATHER_ICONS.cloud;
}

// קואורדינטות של עיר
async function getCityCoords(city) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&language=he&count=1`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data || !data.results || data.results.length === 0) return null;

    return {
      name: data.results[0].name,
      lat: data.results[0].latitude,
      lon: data.results[0].longitude,
    };
  } catch (e) {
    console.error("Coords error:", e);
    return null;
  }
}

// מזג אוויר ליום מסוים
async function getWeatherForDate(city, isoDate) {
  if (!city) return null;

  const coords = await getCityCoords(city);
  if (!coords) return null;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto` +
    `&start_date=${isoDate}&end_date=${isoDate}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.daily || !data.daily.weathercode || !data.daily.weathercode.length) {
      return null;
    }

    const wCode = data.daily.weathercode[0];
    const tMax = data.daily.temperature_2m_max[0];
    const tMin = data.daily.temperature_2m_min[0];

    return {
      icon: getWeatherIcon(wCode),
      max: tMax,
      min: tMin
    };

  } catch (e) {
    console.error("Weather error:", e);
    return null;
  }
}

window.Weather = {
  getWeatherForDate
};
