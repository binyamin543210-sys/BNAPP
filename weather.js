//
// weather.js
// מבוסס OpenWeatherMap – מדויק, יציב, כולל אייקונים
//

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

// מביא קואורדינטות של עיר
async function getCityCoords(city) {
  try {
    const url =
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${WEATHER_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data || !data.length) return null;

    return {
      lat: data[0].lat,
      lon: data[0].lon,
    };
  } catch (e) {
    console.error("Weather coords error:", e);
    return null;
  }
}

// מביא מזג אוויר ליום מסוים
async function getWeatherForDate(city, isoDate) {
  try {
    const coords = await getCityCoords(city);
    if (!coords) return null;

    // forecast ל־7 ימים – ממנו ניקח את התאריך המתאים
    const url =
      `https://api.openweathermap.org/data/2.5/onecall?lat=${coords.lat}&lon=${coords.lon}` +
      `&exclude=minutely,hourly,alerts&units=metric&appid=${WEATHER_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.daily) return null;

    const target = new Date(isoDate);
    target.setHours(12); // מייצב השוואות

    // מוצא את היום המתאים מהתחזית
    const match = data.daily.find(d => {
      const dt = new Date(d.dt * 1000);
      return (
        dt.getFullYear() === target.getFullYear() &&
        dt.getMonth() === target.getMonth() &&
        dt.getDate() === target.getDate()
      );
    });

    if (!match) return null;

    return {
      icon: WEATHER_ICONS[match.weather[0].icon] || "⛅",
      max: Math.round(match.temp.max),
      min: Math.round(match.temp.min),
      desc: match.weather[0].description,
    };

  } catch (e) {
    console.error("Weather fetch error:", e);
    return null;
  }
}

window.Weather = {
  getWeatherForDate
};
