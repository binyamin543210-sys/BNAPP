//
// shabbat.js
// כרגע: רק מבנה בסיסי – בלי קריאת API לזמני הדלקה/צאת שבת
//

function getShabbatTimes(city, isoDate) {
  // בהמשך נוסיף חיבור אמיתי לזמני שבת (hebcal או אחר)
  return Promise.resolve(null);
}

function formatShabbatLabel(times) {
  return "";
}

window.Shabbat = {
  getShabbatTimes,
  formatShabbatLabel
};
