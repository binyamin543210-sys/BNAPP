//
// sync.js – גרסה מתוקנת לחלוטין
// סנכרון בין מכשירים – Firebase Realtime Database
//

// -------------------------------------------------
// ⚠️ חובה למלא את פרטי Firebase שלך כאן:
// -------------------------------------------------
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ---------------------------------------------
// משתנים פנימיים
// ---------------------------------------------
let firebaseApp = null;
let calendarDB = null;

// ---------------------------------------------
// טעינת פיירבייס בצורה בטוחה
// ---------------------------------------------
function initFirebaseIfNeeded(calendarId) {
  if (!calendarId) return;

  // אם firebase לא קיים בכלל → לא לנסות
  if (typeof firebase === "undefined") {
    console.warn("Firebase script missing – sync disabled");
    return;
  }

  // טעינה פעם אחת בלבד
  if (!firebaseApp) {
    try {
      firebaseApp = firebase.initializeApp(firebaseConfig);
    } catch (e) {
      console.warn("Firebase already initialized, ignoring…");
    }
  }

  calendarDB = firebase.database().ref("calendars/" + calendarId);
}

// ---------------------------------------------
// שמירת אירועים בענן
// ---------------------------------------------
async function syncSave(dateKey, events) {
  if (!calendarDB) return;
  try {
    await calendarDB.child(dateKey).set(events);
  } catch (e) {
    console.error("syncSave error:", e);
  }
}

// ---------------------------------------------
// טעינת חודש שלם מהענן
// ---------------------------------------------
async function syncLoadMonth(year, month, onData) {
  if (!calendarDB) return;

  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  try {
    calendarDB.once("value", snapshot => {
      const all = snapshot.val() || {};

      // מחזיר רק תאריכים של אותו חודש
      const filtered = {};
      for (const key of Object.keys(all)) {
        if (key.startsWith(prefix)) {
          filtered[key] = all[key];
        }
      }

      onData(filtered);
    });
  } catch (e) {
    console.error("syncLoadMonth error:", e);
  }
}

// ---------------------------------------------
// ייצוא
// ---------------------------------------------
window.Sync = {
  initFirebaseIfNeeded,
  syncSave,
  syncLoadMonth
};
