// holidays.js
// שימוש ב-Hebcal לקבלת תאריכים עבריים וחגים

const HolidaysAPI = {
  baseCal: "https://www.hebcal.com/hebcal/",
  baseConv: "https://www.hebcal.com/converter/",
};

// לוח חגים לחודש מסוים – מחזיר map: YYYY-MM-DD -> [items...]
async function getHolidaysForMonth(year, month) {
  const monthNum = month + 1;
  const url =
    `${HolidaysAPI.baseCal}?v=1&cfg=json&year=${year}&month=${monthNum}` +
    `&maj=on&min=on&mod=on&nx=1&mf=on&ss=on&c=on`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Holidays status", res.status);
      return {};
    }
    const data = await res.json();
    const map = {};

    (data.items || []).forEach((item) => {
      if (!item.date) return;
      const key = item.date.substring(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });

    return map;
  } catch (e) {
    console.error("Holidays fetch error", e);
    return {};
  }
}

// תאריך עברי מלא ליום מסוים
async function getHebrewDate(dateKey) {
  try {
    const url =
      `${HolidaysAPI.baseConv}?cfg=json&date=${dateKey}&g2h=1&strict=1`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Hebrew date status", res.status);
      return "";
    }
    const data = await res.json();
    if (!data.hebrew) return "";
    // לדוגמה: "י\"ד כסלו תשפ\"ו"
    return data.hebrew;
  } catch (e) {
    console.error("Hebrew date error", e);
    return "";
  }
}

// זיהוי שבת – רק לפי יום בשבוע
function isShabbat(dateObj) {
  return dateObj.getDay() === 6;
}

// סוג החג – ממש בגדול, מספיק בשביל טאג אחד
function classifyHoliday(items) {
  if (!items || !items.length) return null;
  const item = items[0];

  if (item.subcat === "roshchodesh") return "ROSH_CHODESH";
  if (item.subcat === "holiday") return "HOLIDAY";
  if (item.subcat === "fast") return "FAST";

  if (item.title && item.title.includes("חול המועד")) return "CHOL_HAMOED";
  if (item.title && item.title.includes("ראש חודש")) return "ROSH_CHODESH";

  return null;
}

function getHolidayTag(type) {
  if (!type) return null;
  switch (type) {
    case "HOLIDAY":
      return { text: "חג" };
    case "CHOL_HAMOED":
      return { text: "חוה״מ" };
    case "ROSH_CHODESH":
      return { text: "ראש חודש" };
    case "FAST":
      return { text: "צום" };
    default:
      return null;
  }
}

window.Holidays = {
  getHolidaysForMonth,
  getHebrewDate,
  isShabbat,
  classifyHoliday,
  getHolidayTag,
};
