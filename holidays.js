// holidays.js – לוגיקת חגים + אייקונים + זמני שבת מתל אביב (Hebcal API)

// אייקונים לפי מחרוזת
function withIcon(label) {
  if (!label) return label;
  if (label.includes('שבת')) return '🕯️ ' + label;
  if (label.includes('חנוכה')) return '🕯️ ' + label;
  if (label.includes('סוכות')) return '🏕️ ' + label;
  if (label.includes('פסח')) return '🍞🚫 ' + label;
  if (label.includes('שבועות')) return '📜🥛 ' + label;
  if (label.includes('פורים')) return '🎭 ' + label;
  if (label.includes('ט״ו בשבט') || label.includes('טו בשבט')) return '🌳 ' + label;
  if (label.includes('צום')) return '⚠️ ' + label;
  if (label.includes('יום הזיכרון')) return '🕯️ ' + label;
  if (label.includes('יום העצמאות')) return '🇮🇱 ' + label;
  return label;
}

// ימים לאומיים
const israeliDays = [
  { m: 'ניסן', d: 27, name: 'יום הזיכרון לשואה ולגבורה', type: 'israeli' },
  { m: 'אייר', d: 4,  name: 'יום הזיכרון לחללי צה״ל', type: 'israeli' },
  { m: 'אייר', d: 5,  name: 'יום העצמאות', type: 'israeli' },
  { m: 'אייר', d: 28, name: 'יום ירושלים', type: 'israeli' }
];

// חגים לועזיים לדוגמה
const foreignHolidaysGreg = [
  { m: 1, d: 1,  name: '🎉 New Year', type: 'foreign' },
  { m: 12, d: 25, name: '🎄 Christmas', type: 'foreign' },
  { m: 10, d: 31, name: '🎃 Halloween', type: 'foreign' }
];

// חנוכה – עוגן 25 בכסלו לכל שנה
const hanukkahAnchorByYear = {};

function findHanukkahAnchor(hebrewYear) {
  if (hanukkahAnchorByYear[hebrewYear]) return hanukkahAnchorByYear[hebrewYear];
  const approx = new Date(new Date().getFullYear(), 10, 25); // סביב נובמבר
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

// זמני שבת מתל אביב (Hebcal Shabbat API)
window.shabbatTimes = { candles: {}, havdalah: {} };
let shabbatLoaded = false;

function loadShabbatTimes() {
  if (shabbatLoaded) return;
  shabbatLoaded = true;

  fetch('https://www.hebcal.com/shabbat?cfg=json&geonameid=293397&M=on&b=18')
    .then(res => res.json())
    .then(data => {
      const items = data.items || [];
      items.forEach(item => {
        if (!item.date || !item.category) return;
        const key = item.date.substring(0,10); // YYYY-MM-DD
        const time = item.date.substring(11,16); // HH:MM
        if (item.category === 'candles') {
          window.shabbatTimes.candles[key] = time;
        } else if (item.category === 'havdalah') {
          window.shabbatTimes.havdalah[key] = time;
        }
      });
    })
    .catch(err => {
      console.warn('Shabbat times fetch failed', err);
    });
}

// קריאה מרכזית – מחזירה אובייקט חגים ליום מסוים
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

  const dow = date.getDay();
  if (dow === 5) {
    info.isShabbatEve = true;
    info.labelsShort.push('ערב שבת');
    info.labelsFull.push(withIcon('ערב שבת (כניסת שבת – תל אביב)'));
  }
  if (dow === 6) {
    info.isShabbat = true;
    info.labelsShort.push('שבת קודש');
    info.labelsFull.push(withIcon('שבת קודש (יציאת שבת – תל אביב)'));
  }

  if (h.day === 1) {
    info.isRoshChodesh = true;
    const txt = 'ראש חודש ' + h.monthName;
    info.labelsShort.push(txt);
    info.labelsFull.push(withIcon(txt));
  }

  switch (h.monthName) {
    case 'תשרי':
      if (h.day === 1) {
        info.labelsShort.push('ראש השנה (א)');
        info.labelsFull.push(withIcon('ראש השנה – יום א׳'));
      } else if (h.day === 2) {
        info.labelsShort.push('ראש השנה (ב)');
        info.labelsFull.push(withIcon('ראש השנה – יום ב׳'));
      } else if (h.day === 3) {
        info.isFast = true;
        info.labelsShort.push('צום גדליה');
        info.labelsFull.push(withIcon('צום גדליה'));
      } else if (h.day === 10) {
        info.labelsShort.push('יום כיפור');
        info.labelsFull.push(withIcon('יום הכיפורים'));
      } else if (h.day === 14) {
        info.labelsShort.push('ערב סוכות');
        info.labelsFull.push(withIcon('ערב חג הסוכות'));
      } else if (h.day === 15) {
        info.labelsShort.push('חג סוכות (א)');
        info.labelsFull.push(withIcon('חג הסוכות – יום א׳'));
      } else if (h.day === 16) {
        info.labelsShort.push('חג סוכות (ב)');
        info.labelsFull.push(withIcon('חג הסוכות – יום ב׳'));
      } else if (h.day >= 17 && h.day <= 20) {
        info.labelsShort.push('חוה״מ סוכות');
        info.labelsFull.push(withIcon('חול המועד סוכות'));
      } else if (h.day === 21) {
        info.labelsShort.push('הושענא רבה');
        info.labelsFull.push(withIcon('הושענא רבה'));
      } else if (h.day === 22) {
        info.labelsShort.push('שמיני עצרת / שמחת תורה');
        info.labelsFull.push(withIcon('שמיני עצרת / שמחת תורה'));
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
          const base = `חנוכה – נר ${toHebrewNum(candle)}`;
          info.labelsShort.push(base);
          info.labelsFull.push(withIcon(`${base} (יום ${candle} לחנוכה)`));
        }
      }
      break;
    }

    case 'שבט':
      if (h.day === 15) {
        const base = 'ט״ו בשבט';
        info.labelsShort.push(base);
        info.labelsFull.push(withIcon(base + ' – ראש השנה לאילנות'));
      }
      break;

    case 'אדר':
      if (h.day === 13) {
        info.isFast = true;
        info.labelsShort.push('תענית אסתר');
        info.labelsFull.push(withIcon('תענית אסתר'));
      } else if (h.day === 14) {
        info.labelsShort.push('פורים');
        info.labelsFull.push(withIcon('פורים – יום המשתה והשמחה'));
      } else if (h.day === 15) {
        info.labelsShort.push('שושן פורים');
        info.labelsFull.push(withIcon('שושן פורים'));
      }
      break;

    case 'ניסן':
      if (h.day === 14) {
        info.labelsShort.push('ערב פסח');
        info.labelsFull.push(withIcon('ערב חג הפסח'));
      } else if (h.day === 15) {
        info.labelsShort.push('פסח (א)');
        info.labelsFull.push(withIcon('חג הפסח – יום א׳'));
      } else if (h.day >= 16 && h.day <= 20) {
        info.labelsShort.push('חוה״מ פסח');
        info.labelsFull.push(withIcon('חול המועד פסח'));
      } else if (h.day === 21) {
        info.labelsShort.push('שביעי של פסח');
        info.labelsFull.push(withIcon('שביעי של פסח'));
      }
      break;

    case 'אייר':
      if (h.day === 18) {
        const base = 'ל״ג בעומר';
        info.labelsShort.push(base);
        info.labelsFull.push(withIcon(base));
      }
      break;

    case 'סיוון':
    case 'סיון':
      if (h.day === 6) {
        info.labelsShort.push('שבועות');
        info.labelsFull.push(withIcon('חג השבועות'));
      }
      break;

    case 'תמוז':
      if (h.day === 17) {
        info.isFast = true;
        info.labelsShort.push('צום י״ז בתמוז');
        info.labelsFull.push(withIcon('צום י״ז בתמוז'));
      }
      break;

    case 'אב':
      if (h.day === 9) {
        info.isFast = true;
        info.labelsShort.push('תשעה באב');
        info.labelsFull.push(withIcon('תשעה באב'));
      }
      break;

    case 'טבת':
      if (h.day === 10) {
        info.isFast = true;
        info.labelsShort.push('צום י׳ בטבת');
        info.labelsFull.push(withIcon('צום י׳ בטבת'));
      }
      break;
  }

  israeliDays.forEach(hg => {
    if (hg.m === h.monthName && hg.d === h.day) {
      info.isIsraeli.push(hg);
      info.labelsShort.push(hg.name);
      info.labelsFull.push(withIcon(hg.name));
    }
  });

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
