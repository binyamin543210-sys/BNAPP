// holidays.js
// חגים + תאריכים עבריים + שבת (בלי שגיאות 400)

// אובייקט ניהול חגים ותאריך עברי
const Holidays = {
  // תאריך עברי ל־YYYY-MM-DD
  async getHebrewDate(dateKey) {
    try {
      const [gy, gm, gd] = dateKey.split("-").map(Number);
      const url =
        `https://www.hebcal.com/converter?cfg=json&gy=${gy}&gm=${gm}&gd=${gd}&g2h=1`;
      const res = await fetch(url);
      const data = await res.json();
      return data.hebrew || "";
    } catch (e) {
      console.error("Hebrew date error:", e);
      return "";
    }
  },

  // חגים לחודש נתון
  async getHolidaysForMonth(year, month) {
    try {
      const url =
        `https://www.hebcal.com/hebcal/?v=1&cfg=json&year=${year}` +
        `&month=${month + 1}&maj=on&min=on&mod=on&i=on&c=on&geo=none`;

      const res = await fetch(url);
      const data = await res.json();
      const out = {};

      if (!data.items) return out;

      data.items.forEach(item => {
        // item.date מגיע בדרך כלל עם T ושעה – נחתוך רק את התאריך
        const key = (item.date || "").split("T")[0]; // YYYY-MM-DD
        if (!key) return;
        if (!out[key]) out[key] = [];
        out[key].push(item);
      });

      return out;
    } catch (e) {
      console.error("Holidays API error:", e);
      return {};
    }
  },

  // קובע סוג חג מתוך רשימת אירועים של אותו יום
  classifyHoliday(list) {
    if (!list || !list.length) return null;

    // קודם מחפשים חגים "אמיתיים"
    for (const item of list) {
      if (item.category === "holiday" || item.category === "major") {
        return "holiday";
      }
      if (item.category === "roshchodesh") {
        return "roshchodesh";
      }
    }

    // אם יש אירוע שמכיל "שבת" בשם – נסמן כשבת
    if (list.some(i => (i.hebrew || "").includes("שבת"))) {
      return "shabbat";
    }

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

  // שבת – יום שבת בשבוע
  isShabbat(dateObj) {
    return dateObj.getDay() === 6;
  }
};

window.Holidays = Holidays;
