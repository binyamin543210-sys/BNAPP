
// core.js
// מנוע לוח השנה BNAPP ULTRA – עברי, שבת, מזג אוויר וסנכרון בסיסי

const BNAPP = {
  today: new Date(),
  viewYear: null, 
  viewMonth: null,

  settings: {
    city: "Yavne,IL",
    calendarId: "",
  },

  holidays: {},   // per dateKey -> {hebrew, tags[]}
  weather: {},    // per dateKey -> {icon,max,min,desc}
  events: {},     // per dateKey -> [events]
};

let currentDayKey = null;

// ---------- כלי עזר ----------
function fmt(d) {
  return d.toISOString().split("T")[0];
}

function dateFromKey(k) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ---------- לוקל סטורג' ----------
function loadSettings() {
  try {
    const raw = localStorage.getItem("bnapp_settings");
    if (raw) Object.assign(BNAPP.settings, JSON.parse(raw));
  } catch (e) {
    console.warn("settings load error", e);
  }
}

function saveSettings() {
  localStorage.setItem("bnapp_settings", JSON.stringify(BNAPP.settings));
}

function loadLocalEvents() {
  try {
    const raw = localStorage.getItem("bnapp_events");
    if (raw) BNAPP.events = JSON.parse(raw) || {};
  } catch (e) {
    BNAPP.events = {};
  }
}

function saveLocalEvents() {
  localStorage.setItem("bnapp_events", JSON.stringify(BNAPP.events));
}

// ---------- Firebase סנכרון בסיסי ----------
let fbApp = null;
let fbDbRef = null;

function ensureFirebase() {
  if (fbApp || !BNAPP.settings.calendarId) return;
  const firebaseConfig = {
    apiKey: "AIzaSyCa808qwjJ8bayhjkTqZ8P9fRhfgi19xtY",
    authDomain: "bnapp-ddcbf.firebaseapp.com",
    databaseURL: "https://bnapp-ddcbf-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "bnapp-ddcbf",
    storageBucket: "bnapp-ddcbf.firebasestorage.app",
    messagingSenderId: "523128255450",
    appId: "1:523128255450:web:d29cdda3f21435f96686e3",
  };
  fbApp = firebase.initializeApp(firebaseConfig);
  fbDbRef = firebase.database().ref("calendars/" + BNAPP.settings.calendarId);

  fbDbRef.on("value", snap => {
    const data = snap.val() || {};
    BNAPP.events = data;
    saveLocalEvents();
    renderCalendar();
    if (currentDayKey) {
      renderEvents(currentDayKey);
    }
  });
}

function syncAllToCloud() {
  if (!fbDbRef) return;
  fbDbRef.set(BNAPP.events).catch(console.error);
}

// ---------- רינדור לוח שנה ----------
async function loadMonthData() {
  const year = BNAPP.viewYear;
  const month = BNAPP.viewMonth;

  BNAPP.holidays = {};
  BNAPP.weather = {};

  // חגים + תאריך עברי
  const monthHolidays = await Holidays.getHolidaysForMonth(year, month);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const key = fmt(dateObj);

    const heb = await Holidays.getHebrewDate(key);
    const hol = monthHolidays[key];

    const info = {
      hebrew: "",
      tags: [],
    };

    if (heb) {
      // מורידים שנה וחודש, משאירים רק יום וחודש
      const parts = heb.split(" ");
      info.hebrew = parts.slice(0, 2).join(" ");
    }

    if (hol) {
      const type = Holidays.classifyHoliday(hol);
      const tag = Holidays.getHolidayTag(type);
      if (tag) info.tags.push(tag.text);
    }

    BNAPP.holidays[key] = info;
  }

  // מזג אוויר – 7 ימים קדימה בלבד
  try {
    BNAPP.weather = await Weather.getWeatherMap(BNAPP.settings.city);
  } catch (e) {
    console.warn("weather map error", e);
    BNAPP.weather = {};
  }

  renderCalendar();
}

function renderCalendar() {
  const year = BNAPP.viewYear;
  const month = BNAPP.viewMonth;

  const monthNames = [
    "ינואר","פברואר","מרץ","אפריל","מאי","יוני",
    "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"
  ];

  document.getElementById("month-label").textContent =
    monthNames[month] + " " + year;

  document.getElementById("hebrew-month-label").textContent = ""; // אופציונלי לעתיד

  const grid = document.getElementById("calendar-grid");
  grid.innerHTML = "";

  const first = new Date(year, month, 1);
  const firstDay = (first.getDay() + 6) % 7; // החל מיום א'
  const days = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const totalCells = 42;

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement("div");
    cell.className = "day-cell";

    let dNum;
    let dObj;

    if (i < firstDay) {
      dNum = prevDays - (firstDay - i - 1);
      dObj = new Date(year, month - 1, dNum);
      cell.classList.add("other-month");
    } else if (i >= firstDay + days) {
      dNum = i - (firstDay + days) + 1;
      dObj = new Date(year, month + 1, dNum);
      cell.classList.add("other-month");
    } else {
      dNum = i - firstDay + 1;
      dObj = new Date(year, month, dNum);
    }

    const key = fmt(dObj);

    // header
    const header = document.createElement("div");
    header.className = "day-header";

    const num = document.createElement("div");
    num.className = "day-number";
    num.textContent = dNum;

    const heb = document.createElement("div");
    heb.className = "hebrew-date";
    if (BNAPP.holidays[key]?.hebrew) {
      heb.textContent = BNAPP.holidays[key].hebrew;
    }

    header.appendChild(num);
    header.appendChild(heb);
    cell.appendChild(header);

    // tags
    const tags = document.createElement("div");
    tags.className = "day-tags";

    if (Holidays.isShabbat(dObj)) {
      const t = document.createElement("span");
      t.className = "tag-pill tag-shabbat";
      t.textContent = "שבת";
      tags.appendChild(t);
    }

    const info = BNAPP.holidays[key];
    if (info && info.tags && info.tags.length) {
      info.tags.forEach(tg => {
        const t = document.createElement("span");
        t.className = "tag-pill tag-holiday";
        t.textContent = tg;
        tags.appendChild(t);
      });
    }

    cell.appendChild(tags);

    // footer – מזג אוויר + נקודת אירועים
    const footer = document.createElement("div");
    footer.className = "day-footer";

    if (BNAPP.weather[key]) {
      const w = BNAPP.weather[key];
      const chip = document.createElement("div");
      chip.className = "weather-chip";
      chip.textContent = `${w.icon} ${w.max}°`;
      footer.appendChild(chip);
    } else {
      footer.appendChild(document.createElement("div"));
    }

    if (BNAPP.events[key]?.length) {
      const dot = document.createElement("div");
      dot.className = "events-dot";
      footer.appendChild(dot);
    }

    cell.appendChild(footer);

    // היום
    const t = BNAPP.today;
    if (
      dObj.getFullYear() === t.getFullYear() &&
      dObj.getMonth() === t.getMonth() &&
      dObj.getDate() === t.getDate()
    ) {
      cell.classList.add("day-today");
    }

    cell.dataset.key = key;
    cell.addEventListener("click", () => openDayModal(key));

    grid.appendChild(cell);
  }
}

// ---------- חלון יום ----------
async function openDayModal(key) {
  currentDayKey = key;
  const d = dateFromKey(key);

  document.getElementById("day-modal").dataset.key = key;

  document.getElementById("modal-date-label").textContent =
    d.toLocaleDateString("he-IL", { weekday: "long", month: "long", day: "numeric" });

  document.getElementById("modal-hebrew-label").textContent =
    BNAPP.holidays[key]?.hebrew || "";

  // זמני שבת – רק אם יום שישי או שבת
  const dow = d.getDay();
  if (dow === 5 || dow === 6) {
    const times = await Shabbat.getShabbatTimes(BNAPP.settings.city, key);
    document.getElementById("modal-shabbat-label").textContent =
      Shabbat.formatShabbatLabel(times);
  } else {
    document.getElementById("modal-shabbat-label").textContent = "";
  }

  // מזג אוויר בסיסי
  if (BNAPP.weather[key]) {
    const w = BNAPP.weather[key];
    document.getElementById("modal-weather-label").textContent =
      `${w.icon} מקס' ${w.max}° / מינ' ${w.min}°`;
    fillWeatherDetails(key, w);
  } else {
    document.getElementById("modal-weather-label").textContent = "";
    fillWeatherDetails(key, null);
  }

  renderEvents(key);

  document.getElementById("day-modal").classList.remove("hidden");
}

function closeDayModal() {
  document.getElementById("day-modal").classList.add("hidden");
  currentDayKey = null;
}

function fillWeatherDetails(key, wx) {
  const box = document.getElementById("weather-details");
  if (!wx) {
    box.innerHTML = "אין תחזית זמינה ליום זה.";
    return;
  }
  box.innerHTML =
    `<div><strong>תחזית מפורטת:</strong></div>
     <div>${wx.icon} ${wx.desc}</div>
     <div>טמפרטורה: ${wx.min}°–${wx.max}°</div>`;
}

// ---------- אירועים ----------
function renderEvents(key) {
  const list = document.getElementById("events-list");
  const emptyHint = document.getElementById("empty-day-hint");

  list.innerHTML = "";
  const arr = (BNAPP.events[key] || []).slice();

  // מיון לפי שעה
  arr.sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });

  if (!arr.length) {
    emptyHint.classList.remove("hidden");
  } else {
    emptyHint.classList.add("hidden");
  }

  arr.forEach(ev => {
    const li = document.createElement("li");
    li.className = "event-item";

    const title = document.createElement("div");
    title.className = "event-title";
    title.textContent = ev.title;

    const meta = document.createElement("div");
    meta.className = "event-meta";

    const parts = [];
    if (ev.time) parts.push(`שעה: ${ev.time}`);
    if (ev.address) parts.push(`כתובת: ${ev.address}`);
    meta.textContent = parts.join(" • ");

    const actions = document.createElement("div");
    actions.className = "event-actions";

    if (ev.address) {
      const wz = document.createElement("button");
      wz.className = "event-action-btn";
      wz.textContent = "Waze";
      wz.onclick = () => {
        window.open(
          `https://waze.com/ul?q=${encodeURIComponent(ev.address)}`,
          "_blank"
        );
      };
      actions.appendChild(wz);
    }

    const done = document.createElement("button");
    done.className = "event-action-btn done";
    done.textContent = ev.done ? "בוצע" : "סמן בוצע";
    done.onclick = () => toggleDone(key, ev.id);

    const del = document.createElement("button");
    del.className = "event-action-btn delete";
    del.textContent = "מחק";
    del.onclick = () => deleteEvent(key, ev.id);

    actions.appendChild(done);
    actions.appendChild(del);

    li.appendChild(title);
    li.appendChild(meta);
    li.appendChild(actions);

    list.appendChild(li);
  });
}

function addEvent(key, obj) {
  if (!BNAPP.events[key]) BNAPP.events[key] = [];
  BNAPP.events[key].push(obj);
  saveLocalEvents();
  syncAllToCloud();
  renderCalendar();
  renderEvents(key);
}

function deleteEvent(key, id) {
  BNAPP.events[key] = (BNAPP.events[key] || []).filter(e => e.id !== id);
  saveLocalEvents();
  syncAllToCloud();
  renderCalendar();
  renderEvents(key);
}

function toggleDone(key, id) {
  const arr = BNAPP.events[key] || [];
  arr.forEach(e => {
    if (e.id === id) e.done = !e.done;
  });
  saveLocalEvents();
  syncAllToCloud();
  renderCalendar();
  renderEvents(key);
}

// ---------- שמירת אירוע חדש ----------
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("event-form");
  form.addEventListener("submit", e => {
    e.preventDefault();
    const key = currentDayKey || document.querySelector("#day-modal").dataset.key;

    const ev = {
      id: Date.now(),
      title: document.getElementById("event-title").value.trim(),
      time: document.getElementById("event-time").value,
      address: document.getElementById("event-address").value.trim(),
      notes: document.getElementById("event-notes").value.trim(),
      reminder: Number(document.getElementById("event-reminder-mins").value) || 0,
      done: false,
    };

    if (!ev.title) return;

    addEvent(key, ev);
    form.reset();
  });

  // כפתורי מודל
  document.getElementById("close-day-modal").onclick = closeDayModal;
  document.querySelector("#day-modal .modal-backdrop").onclick = closeDayModal;

  // כפתור הוספת אירוע
  document.getElementById("toggle-add-form").onclick = () => {
    const sec = document.getElementById("event-form-section");
    sec.classList.toggle("hidden");
  };

  // כפתור הצגת מזג אוויר מפורט
  document.getElementById("toggle-weather-details").onclick = () => {
    const wd = document.getElementById("weather-details");
    wd.classList.toggle("hidden");
  };

  // הגדרות
  document.getElementById("settings-btn").onclick = () =>
    document.getElementById("settings-modal").classList.remove("hidden");

  document.getElementById("close-settings-modal").onclick = () =>
    document.getElementById("settings-modal").classList.add("hidden");

  document.querySelector("#settings-modal .modal-backdrop").onclick = () =>
    document.getElementById("settings-modal").classList.add("hidden");

  document.getElementById("settings-save").onclick = async () => {
    BNAPP.settings.city =
      document.getElementById("settings-city").value.trim() || "Yavne,IL";
    const newCalId =
      document.getElementById("settings-calendar-id").value.trim();
    BNAPP.settings.calendarId = newCalId;

    saveSettings();

    if (BNAPP.settings.calendarId) {
      ensureFirebase();
      syncAllToCloud();
    }

    await loadMonthData();
    document.getElementById("settings-modal").classList.add("hidden");
  };

  // ניווט חודשים
  document.getElementById("prev-month").onclick = async () => {
    BNAPP.viewMonth--;
    if (BNAPP.viewMonth < 0) {
      BNAPP.viewMonth = 11;
      BNAPP.viewYear--;
    }
    await loadMonthData();
  };

  document.getElementById("next-month").onclick = async () => {
    BNAPP.viewMonth++;
    if (BNAPP.viewMonth > 11) {
      BNAPP.viewMonth = 0;
      BNAPP.viewYear++;
    }
    await loadMonthData();
  };

  document.getElementById("today-btn").onclick = async () => {
    BNAPP.viewYear = BNAPP.today.getFullYear();
    BNAPP.viewMonth = BNAPP.today.getMonth();
    await loadMonthData();
  };

  // INIT
  initBNAPP();
});

async function initBNAPP() {
  loadSettings();
  loadLocalEvents();

  BNAPP.viewYear = BNAPP.today.getFullYear();
  BNAPP.viewMonth = BNAPP.today.getMonth();

  if (BNAPP.settings.calendarId) {
    ensureFirebase();
  }

  await loadMonthData();

  // הגדרות ברירת מחדל בטופס
  document.getElementById("settings-city").value = BNAPP.settings.city || "Yavne,IL";
  document.getElementById("settings-calendar-id").value = BNAPP.settings.calendarId || "";
}
