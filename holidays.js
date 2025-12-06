//
// holidays.js
// מודול חגים ותאריך עברי עבור BNAPP
//

// תאריך עברי ל־ISODate (YYYY-MM-DD)
async function getHebrewDate(isoDate) {
  try {
    const url = `https://www.hebcal.com/converter?cfg=json&date=${isoDate}&g2h=1&strict=1`;
    const res = await fetch(url);
    const data = await res.json();
    return data.hebrew || "";
  } catch (e) {
    console.error("Hebrew date error:", e);
    return "";
  }
}

// חגים לחודש (year, month = 0-11)
async function getHolidaysForMonth(year, month) {
  const m = month + 1;
  const url =
    `https://www.hebcal.com/hebcal?cfg=json&v=1&maj=on&min=on&mod=on&nx=on&mf=on&ss=on&c=on&year=${year}&month=${m}&geo=none`;

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
        category: item.category
      });
    });

    return holidays;
  } catch (e) {
    console.error("Holiday fetch error:", e);
    return {};
  }
}

function classifyHoliday(holidayList) {
  if (!holidayList || !holidayList.length) return null;

  for (const h of holidayList) {
    if (h.category === "holiday" || h.category === "major") return "holiday";
    if (h.category === "minor") return "special";
    if (h.category === "fast") return "fast";
    if (h.category === "roshchodesh") return "roshchodesh";
  }
  return "special";
}

function getHolidayTag(type) {
  if (!type) return null;

  switch (type) {
    case "holiday":
      return { text: "חג" };
    case "fast":
      return { text: "צום" };
    case "roshchodesh":
      return { text: "ראש חודש" };
    case "special":
      return { text: "מועד" };
    default:
      return null;
  }
}

function isShabbat(dateObj) {
  return dateObj.getDay() === 6;
}

window.Holidays = {
  getHebrewDate,
  getHolidaysForMonth,
  classifyHoliday,
  getHolidayTag,
  isShabbat
};
