//
// sync.js
// סנכרון בין מכשירים – Firebase Realtime Database
//

// ------- פיירבייס – שים כאן את הפרטים שלך -------
const firebaseConfig = {
  apiKey: "YOUR-KEY",
  authDomain: "YOUR-DOMAIN",
  databaseURL: "https://YOUR-PROJECT.firebaseio.com",
  projectId: "YOUR-ID",
  storageBucket: "YOUR-BUCKET",
  messagingSenderId: "ID",
  appId: "APP-ID"
};

// נטען רק אם המשתמש הגדיר קוד לוח שנה
let calendarDB = null;

// ---------------------------------------------
// הפעלת פיירבייס
// ---------------------------------------------
function initFirebaseIfNeeded(calendarId) {
  if (!calendarId) return;

  if (!window._firebaseLoaded) {
    firebase.initializeApp(firebaseConfig);
    window._firebaseLoaded = true;
  }

  calendarDB = firebase.database().ref("calendars/" + calendarId);
}

// ---------------------------------------------
// שמירת אירועים בענן
// ---------------------------------------------
async function syncSave(dateKey, events) {
  if (!calendarDB) return;
  await calendarDB.child(dateKey).set(events);
}

// ---------------------------------------------
// טעינת חודש שלם
// ---------------------------------------------
async function syncLoadMonth(year, month, onData) {
  if (!calendarDB) return;

  const prefix = `${year}-${String(month+1).padStart(2,"0")}`;

  calendarDB.once("value", snapshot => {
    const all = snapshot.val() || {};

    const filtered = {};
    Object.keys(all).forEach(k => {
      if (k.startsWith(prefix)) filtered[k] = all[k];
    });

    onData(filtered);
  });
}

window.Sync = {
  initFirebaseIfNeeded,
  syncSave,
  syncLoadMonth
};
