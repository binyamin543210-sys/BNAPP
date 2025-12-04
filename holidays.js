//
// holidays.js
// חגים + תאריך עברי (ללא שנה), ראש חודש, שבת
//

// —————————————————————
// 1) מביא תאריך עברי (בלי שנה!)
// —————————————————————
async function getHebrewDateShort(isoDate) {
  try {
    const url =
      `https://www.hebcal.com/converter?cfg=json&date=${isoDate}&g2h=1&strict=1`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.hebrew) return "";

    // מונעים הופעת שנה עברית
    // דוגמה: "י״ד שבט תשפ״ה" → "י״ד שבט"
    const parts = data.hebrew.split(" ");
    return parts.slice(0, 2).join(" ");

  } catch (e) {
    console.error("Hebrew date error:", e);
    return "";
  }
}

// —————————————————————
// 2) רשימת חגים לחודש
// —————————————————————
async function getHolidaysForMonth(year, month) {
  const m = month + 1;

  const url =
    `https://www.hebcal.com/hebcal?cfg=json&v=1&maj=on&min=on&mod=on&nx=on&mf=on&ss=on&c=on` +
    `&year=${year}&month=${m}&geo=none&lg=h`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const holidays = {};

    if (!data.items) return holidays;

    data.items.forEach(item => {
      const date = item.date.split("T")[0];
      if (!holidays[date]) holidays[date] = [];

      holidays[date].push({
        title: item.title,
        category: item.category,
      });
    });

    return holidays;

  } catch (e) {
    console.error("Holiday fetch error:", e);
    return {};
  }
}

// —————————————————————
// 3) הגדרת סוג חג → תווית
// —————————————————————
function classifyHoliday(list) {
  if (!list || list.length === 0) return null;

  for (const h of list) {
    if (h.category === "holiday") return "holiday";
    if (h.category === "major") return "holiday";
    if (h.category === "minor") return "special";
    if (h.category === "fast") return "fast";
    if (h.category === "roshchodesh") return "roshchodesh";
  }
  return "special";
}

function getHolidayTag(type) {
  if (!type) return null;
  switch (type) {
    case "holiday": return { text: "חג" };
    case "fast": return { text: "צום" };
    case "roshchodesh": return { text: "ראש חודש" };
    case "special": return { text: "מועד" };
    default: return null;
  }
}

// —————————————————————
// 4) זיהוי שבת לפי היום (יום שבת בלבד)
// —————————————————————
function isShabbat(dateObj) {
  return dateObj.getDay() === 6; // שבת
}

// —————————————————————
// חשיפה לשאר המערכת
// —————————————————————
window.Holidays = {
  getHebrewDateShort,
  getHolidaysForMonth,
  classifyHoliday,
  getHolidayTag,
  isShabbat,
};
