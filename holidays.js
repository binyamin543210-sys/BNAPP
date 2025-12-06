// shabbat.js
// זמני שבת

const Shabbat = {
  async getShabbatTimes(city, dateKey) {
    try {
      const url = `https://www.hebcal.com/shabbat/?cfg=json&city=${city}&geo=city&year=${dateKey.slice(0,4)}&month=${dateKey.slice(5,7)}&m=${dateKey.slice(8,10)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.items) return null;

      let candle = null, havdalah = null;

      data.items.forEach(i => {
        if (i.category === "candles") candle = i.title;
        if (i.category === "havdalah") havdalah = i.title;
      });

      return { candleLighting: candle, havdalah };
    } catch {
      return null;
    }
  },

  formatShabbatLabel(obj) {
    if (!obj || (!obj.candleLighting && !obj.havdalah)) return "";
    return `כניסה: ${obj.candleLighting || "-"} | יציאה: ${obj.havdalah || "-"}`;
  }
};

window.Shabbat = Shabbat;
