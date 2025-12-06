// holidays.js
// חגים + תאריכים עבריים + שבת

const Holidays = {
  async getHebrewDate(dateKey) {
    try {
      const url = `https://www.hebcal.com/converter?cfg=json&date=${dateKey}`;
      const res = await fetch(url);
      const data = await res.json();
      return data.hebrew || "";
    } catch {
      return "";
    }
  },

  async getHolidaysForMonth(year, month) {
    try {
      const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const end = `${year}-${String(month + 1).padStart(2, "0")}-31`;

      const url =
        `https://www.hebcal.com/hebcal/?v=1&cfg=json&year=${year}&month=${month + 1}&maj=on&min=on&mod=on&i=on`;

      const res = await fetch(url);
      const data = await res.json();
      const out = {};

      data.items.forEach(item => {
        const d = item.date;
        if (!out[d]) out[d] = [];
        out[d].push(item);
      });

      return out;
    } catch {
      return {};
    }
  },

  classifyHoliday(item) {
    if (!item) return null;
    if (item.hebrew.includes("שבת")) return "shabbat";
    if (item.category === "holiday") return "holiday";
    if (item.category === "roshchodesh") return "roshchodesh";
    return null;
  },

  getHolidayTag(type) {
    if (!type) return null;
    return {
      shabbat: { text: "שבת" },
      holiday: { text: "חג" },
      roshchodesh: { text: "ר\"ח" }
    }[type];
  },

  isShabbat(dateObj) {
    return dateObj.getDay() === 6; // שבת
  }
};

window.Holidays = Holidays;
