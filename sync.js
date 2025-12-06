// sync.js
// סנכרון אירועים בין מכשירים דרך Firebase Realtime Database

// קונפיג פיירבייז שלך
const firebaseConfig = {
  apiKey: "AIzaSyCa808qwjJ8bayhjkTqZ8P9fRhfgi19xtY",
  authDomain: "bnapp-ddcbf.firebaseapp.com",
  databaseURL: "https://bnapp-ddcbf-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "bnapp-ddcbf",
  storageBucket: "bnapp-ddcbf.firebasestorage.app",
  messagingSenderId: "523128255450",
  appId: "1:523128255450:web:d29cdda3f21435f96686e3",
  measurementId: "G-61DKZ1B5L2"
};

let _firebaseApp = null;
let _dbRef = null;
let _currentCalendarId = null;

// הפעלה ראשונית / החלפת קוד לוח שנה
function initFirebaseIfNeeded(calendarId) {
  if (!calendarId) return;

  if (!_firebaseApp) {
    _firebaseApp = firebase.initializeApp(firebaseConfig);
  }

  _currentCalendarId = calendarId;
  _dbRef = firebase.database().ref("calendars/" + calendarId);
}

// שמירת אירועים לתאריך מסוים
async function syncSave(dateKey, events) {
  if (!_dbRef || !_currentCalendarId) return;
  // אם אין אירועים – נמחק את הצומת
  if (!events || !events.length) {
    await _dbRef.child(dateKey).remove();
  } else {
    await _dbRef.child(dateKey).set(events);
  }
}

// טעינת חודש שלם מהענן
async function syncLoadMonth(year, month) {
  if (!_dbRef || !_currentCalendarId) return {};

  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  const snap = await _dbRef
    .orderByKey()
    .startAt(prefix)
    .endAt(prefix + "\uf8ff")
    .once("value");

  return snap.val() || {};
}

window.Sync = {
  initFirebaseIfNeeded,
  syncSave,
  syncLoadMonth
};
