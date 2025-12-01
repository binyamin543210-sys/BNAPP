// holidays.js – חגים, חנוכה, סוכות, פסח וכו'

const israeliDays = [
  { m: 'ניסן', d: 27, name: 'יום הזיכרון לשואה ולגבורה', type: 'israeli' },
  { m: 'אייר', d: 4,  name: 'יום הזיכרון לחללי צה״ל', type: 'israeli' },
  { m: 'אייר', d: 5,  name: 'יום העצמאות', type: 'israeli' },
  { m: 'אייר', d: 28, name: 'יום ירושלים', type: 'israeli' }
];

const foreignHolidaysGreg = [
  { m: 1, d: 1,  name: 'New Year', type: 'foreign' },
  { m: 12, d: 25, name: 'Christmas', type: 'foreign' },
  { m: 10, d: 31, name: 'Halloween', type: 'foreign' }
];

const hanukkahAnchorByYear = {}; // yearHeb -> Date

// חיפוש תאריך 25 כסלו בשנה העברית המתאימה
function findHanukkahAnchor(hebrewYear) {
  if (hanukkahAnchorByYear[hebrewYear]) return hanukkahAnchorByYear[hebrewYear];

  const approx = new Date(new Date().getFullYear(), 10, 25); // סביב סוף נובמבר
  for (let offset = -40; offset <= 60; offset++) {
    const d = new Date(approx);
    d.setDate(approx.getDate() + offset);
    const h = getHebrewParts(d);
    if (!h) continue;
    if (h.year === hebrewYear && h.monthName === 'כסלו' && h.day === 25) {
      hanukkahAnchorByYear[hebrewYear] = d;
      return d;
    }
  }
  return null;
}

function getHebrewHolidayInfo(date) {
  const h = getHebrewParts(date);
  const info = {
    hebrewDay: null,
    hebrewMonth: null,
    hebrewYear: null,
    isRoshChodesh: false,
    isShabbatEve: false,
    isShabbat: false,
    isFast: false,
    isIsraeli: [],
    foreignHolidays: [],
    labelsShort: [],
    labelsFull: []
  };
  if (!h) return info;

  info.hebrewDay = h.day;
  info.hebrewMonth = h.monthName;
  info.hebrewYear = h.year;

  const dow = date.getDay(); // 0=Sunday ... 6=Saturday
  if (dow === 5) {
    info.isShabbatEve = true;
    info.labelsShort.push('ערב שבת');
    info.labelsFull.push('ערב שבת (כניסת שבת – תל אביב)');
  }
  if (dow === 6) {
    info.isShabbat = true;
    info.labelsShort.push('שבת קודש');
    info.labelsFull.push('שבת קודש (יציאת שבת – תל אביב)');
  }

  if (h.day === 1) {
    info.isRoshChodesh = true;
    info.labelsShort.push('ראש חודש ' + h.monthName);
    info.labelsFull.push('ראש חודש ' + h.monthName);
  }

  // חגים מרכזיים לפי ישראל
  switch (h.monthName) {
    case 'תשרי':
      if (h.day === 1) {
        info.labelsShort.push('ראש השנה (א)');
        info.labelsFull.push('ראש השנה – יום א׳');
      } else if (h.day === 2) {
        info.labelsShort.push('ראש השנה (ב)');
        info.labelsFull.push('ראש השנה – יום ב׳');
      } else if (h.day === 3) {
        info.isFast = true;
        info.labelsShort.push('צום גדליה');
        info.labelsFull.push('צום גדליה');
      } else if (h.day === 10) {
        info.labelsShort.push('יום כיפור');
        info.labelsFull.push('יום הכיפורים');
      } else if (h.day === 14) {
        info.labelsShort.push('ערב סוכות');
        info.labelsFull.push('ערב חג הסוכות');
      } else if (h.day === 15) {
        info.labelsShort.push('חג סוכות (א)');
        info.labelsFull.push('חג הסוכות – יום א׳');
      } else if (h.day === 16) {
        info.labelsShort.push('חג סוכות (ב)');
        info.labelsFull.push('חג הסוכות – יום ב׳');
      } else if (h.day >= 17 && h.day <= 20) {
        info.labelsShort.push('חוה״מ סוכות');
        info.labelsFull.push('חול המועד סוכות');
      } else if (h.day === 21) {
        info.labelsShort.push('הושענא רבה');
        info.labelsFull.push('הושענא רבה');
      } else if (h.day === 22) {
        info.labelsShort.push('שמיני עצרת / שמחת תורה');
        info.labelsFull.push('שמיני עצרת / שמחת תורה');
      }
      break;

    case 'כסלו':
    case 'טבת': {
      const hYear = h.year;
      const anchor = findHanukkahAnchor(hYear);
      if (anchor) {
        const diffDays = Math.round((date - anchor) / 86400000);
        if (diffDays >= 0 && diffDays < 8) {
          const candle = diffDays + 1;
          const labelShort = 'חנוכה – נר ' + toHebrewNum(candle);
          info.labelsShort.push(labelShort);
          info.labelsFull.push(`חנוכה – נר ${toHebrewNum(candle)} (יום ${candle} לחנוכה)`);
        }
      }
      break;
    }

    case 'שבט':
      if (h.day === 15) {
        info.labelsShort.push('ט״ו בשבט');
        info.labelsFull.push('ט״ו בשבט – ראש השנה לאילנות');
      }
      break;

    case 'אדר':
      if (h.day === 13) {
        info.isFast = true;
        info.labelsShort.push('תענית אסתר');
        info.labelsFull.push('תענית אסתר');
      } else if (h.day === 14) {
        info.labelsShort.push('פורים');
        info.labelsFull.push('פורים – יום המשתה והשמחה');
      } else if (h.day === 15) {
        info.labelsShort.push('שושן פורים');
        info.labelsFull.push('שושן פורים');
      }
      break;

    case 'ניסן':
      if (h.day === 14) {
        info.labelsShort.push('ערב פסח');
        info.labelsFull.push('ערב חג הפסח');
      } else if (h.day === 15) {
        info.labelsShort.push('פסח (א)');
        info.labelsFull.push('חג הפסח – יום א׳');
      } else if (h.day >= 16 && h.day <= 20) {
        info.labelsShort.push('חוה״מ פסח');
        info.labelsFull.push('חול המועד פסח');
      } else if (h.day === 21) {
        info.labelsShort.push('שביעי של פסח');
        info.labelsFull.push('שביעי של פסח');
      }
      break;

    case 'אייר':
      if (h.day === 18) {
        info.labelsShort.push('ל״ג בעומר');
        info.labelsFull.push('ל״ג בעומר');
      }
      break;

    case 'סיוון':
    case 'סיון':
      if (h.day === 6) {
        info.labelsShort.push('שבועות');
        info.labelsFull.push('חג השבועות');
      }
      break;

    case 'תמוז':
      if (h.day === 17) {
        info.isFast = true;
        info.labelsShort.push('צום י״ז בתמוז');
        info.labelsFull.push('צום י״ז בתמוז');
      }
      break;

    case 'אב':
      if (h.day === 9) {
        info.isFast = true;
        info.labelsShort.push('תשעה באב');
        info.labelsFull.push('תשעה באב');
      }
      break;

    case 'טבת':
      if (h.day === 10) {
        info.isFast = true;
        info.labelsShort.push('צום י׳ בטבת');
        info.labelsFull.push('צום י׳ בטבת');
      }
      break;
  }

  // ימי מדינה ישראליים
  israeliDays.forEach(hg => {
    if (hg.m === h.monthName && hg.d === h.day) {
      info.isIsraeli.push(hg);
      info.labelsShort.push(hg.name);
      info.labelsFull.push(hg.name);
    }
  });

  // חגים לועזיים
  const gm = date.getMonth()+1;
  const gd = date.getDate();
  foreignHolidaysGreg.forEach(hg => {
    if (hg.m === gm && hg.d === gd) {
      info.foreignHolidays.push(hg);
      info.labelsShort.push(hg.name);
      info.labelsFull.push(hg.name);
    }
  });

  return info;
}
