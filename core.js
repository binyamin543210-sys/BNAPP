//
// core.js
// מנוע לוח השנה BNAPP – חגים, שבת, מזג אוויר, אירועים
//

const BNAPP = {
  today: new Date(),
  viewYear: null,
  viewMonth: null,

  settings: {
    city: "Jerusalem",
  },

  events: {},   // { "YYYY-MM-DD": [ ... ] }
  holidays: {}, // נתוני חג+עברי
  shabbat: {},  // זמני שבת לפי תאריך
  weather: {},  // מזג אוויר
};

// ---------- כלי עזר ----------
function fmt(d) {
  return d.toISOString().split("T")[0];
}

function dateFromKey(k) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ---------- אירועים לוקאליים ----------
function loadLocalEvents() {
  try {
    const raw = localStorage.getItem("bnapp_events");
    if (raw) BNAPP.events = JSON.parse(raw);
  } catch {
    BNAPP.events = {};
  }
}

function saveLocalEvents() {
  localStorage.setItem("bnapp_events", JSON.stringify(BNAPP.events));
}

// ---------- הגדרות ----------
function loadSettings() {
  try {
    const raw = localStorage.getItem("bnapp_settings");
    if (raw) Object.assign(BNAPP.settings, JSON.parse(raw));
  } catch {}
}

function saveSettings() {
  localStorage.setItem("bnapp_settings", JSON.stringify(BNAPP.settings));
}

// ---------- רינדור לוח ----------
async function renderCalendar() {
  const year = BNAPP.viewYear;
  const month = BNAPP.viewMonth;

  const gregLabel = document.getElementById("month-label");
  const hebLabel = document.getElementById("hebrew-month-label");

  gregLabel.textContent =
    `${["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"][month]} ${year}`;

  // נעשה עברי כללי לפי היום הראשון של החודש
  const first = new Date(year, month, 1);
  const firstKey = fmt(first);
  const fullHebMonth = await Holidays.getHebrewDateShort(firstKey);
  hebLabel.textContent = fullHebMonth ? `חודש ${fullHebMonth}` : "";

  const grid = document.getElementById("calendar-grid");
  grid.innerHTML = "";

  const firstDay = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const totalCells = 42;

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement("div");
    cell.className = "day-cell";

    let dNum, dObj;

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

    // מספר יום
    const numDiv = document.createElement("div");
    numDiv.className = "day-number";
    numDiv.textContent = dNum;
    cell.appendChild(numDiv);

    // עברי קטן
    const hebSmall = document.createElement("div");
    hebSmall.className = "hebrew-date-small";
    if (BNAPP.holidays[key]?.hebrew) {
      hebSmall.textContent = BNAPP.holidays[key].hebrew;
    }
    cell.appendChild(hebSmall);

    // תגים: שבת / חג
    if (BNAPP.holidays[key]?.isShabbat) {
      const s = document.createElement("div");
      s.className = "tag-shabbat";
      s.textContent = "שבת";
      cell.appendChild(s);
    }

    if (BNAPP.holidays[key]?.tags?.length) {
      BNAPP.holidays[key].tags.forEach(tg => {
        const h = document.createElement("div");
        h.className = "tag-holiday";
        h.textContent = tg;
        cell.appendChild(h);
      });
    }

    // מזג אוויר קטן
    if (BNAPP.weather[key]) {
      const w = document.createElement("div");
      w.className = "weather-chip";
      w.textContent =
        `${BNAPP.weather[key].icon} ${BNAPP.weather[key].max}°`;
      cell.appendChild(w);
    }

    // היום
    const t = BNAPP.today;
    if (
      dObj.getFullYear() === t.getFullYear() &&
      dObj.getMonth() === t.getMonth() &&
      dObj.getDate() === t.getDate()
    ) {
      cell.classList.add("today");
    }

    cell.dataset.key = key;
    cell.addEventListener("click", () => openDayModal(key));

    grid.appendChild(cell);
  }
}

// ---------- טעינת נתונים לחודש ----------
async function loadMonthData() {
  const y = BNAPP.viewYear;
  const m = BNAPP.viewMonth;

  BNAPP.holidays = {};
  BNAPP.shabbat = {};
  BNAPP.weather = {};

  const holidaysRaw = await Holidays.getHolidaysForMonth(y, m);
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const dObj = new Date(y, m, d);
    const key = fmt(dObj);

    // עברי
    const hebShort = await Holidays.getHebrewDateShort(key);
    const list = holidaysRaw[key] || [];
    const type = Holidays.classifyHoliday(list);
    const tag = Holidays.getHolidayTag(type);

    BNAPP.holidays[key] = {
      hebrew: hebShort,
      tags: tag ? [tag.text] : [],
      isShabbat: Holidays.isShabbat(dObj),
    };

    // זמני שבת – נחשב לפי שישי לכל שבוע
    if (dObj.getDay() === 5) { // שישי
      const fridayKey = key;
      const times = await Shabbat.getShabbatTimes(BNAPP.settings.city, fridayKey);
      if (times) {
        const label = Shabbat.formatShabbatLabel(times);

        // נשמור לשישי
        BNAPP.shabbat[fridayKey] = { label };

        // ונשמור גם לשבת שאחרי
        const sat = new Date(dObj);
        sat.setDate(sat.getDate() + 1);
        const satKey = fmt(sat);
        BNAPP.shabbat[satKey] = { label };
      }
    }

    // מזג אוויר – יעבוד רק לימים בטווח ה־API
    const wx = await Weather.getWeatherForDate(BNAPP.settings.city, key);
    if (wx) BNAPP.weather[key] = wx;
  }

  await renderCalendar();
}

// ---------- חלון יום ----------
function openDayModal(key) {
  const d = dateFromKey(key);

  document.getElementById("modal-date-label").textContent =
    d.toLocaleDateString("he-IL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  document.getElementById("modal-hebrew-label").textContent =
    BNAPP.holidays[key]?.hebrew || "";

  document.getElementById("modal-shabbat-label").textContent =
    BNAPP.shabbat[key]?.label || "";

  // מזג אוויר לפרטים
  const weatherInfo = document.getElementById("weather-info");
  const wx = BNAPP.weather[key];
  if (wx) {
    weatherInfo.innerHTML =
      `<div><strong>מזג אוויר:</strong> ${wx.icon} ${wx.desc}<br>` +
      `מקסימום: ${wx.max}° • מינימום: ${wx.min}°</div>`;
  } else {
    weatherInfo.innerHTML = `<div>אין נתוני מזג אוויר ליום זה.</div>`;
  }
  weatherInfo.classList.add("hidden");

  // תצוגת אירועים
  renderEvents(key);

  const modal = document.getElementById("day-modal");
  modal.dataset.key = key;
  modal.classList.remove("hidden");
}

function closeDayModal() {
  document.getElementById("day-modal").classList.add("hidden");
}

// ---------- אירועים ----------
function renderEvents(key) {
  const list = document.getElementById("events-list");
  list.innerHTML = "";

  const arr = BNAPP.events[key] || [];
  arr.sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  if (!arr.length) {
    list.innerHTML = `<li>אין אירועים ליום זה.</li>`;
    return;
  }

  arr.forEach(ev => {
    const li = document.createElement("li");
    li.className = "event-item";

    li.innerHTML =
      `<div><strong>${ev.title}</strong></div>` +
      `<div style="font-size:0.8rem;color:#64748b;">` +
      (ev.time ? `שעה: ${ev.time} • ` : "") +
      (ev.address ? `כתובת: ${ev.address}` : "") +
      `</div>`;

    list.appendChild(li);
  });
}

function addEvent(key, obj) {
  if (!BNAPP.events[key]) BNAPP.events[key] = [];
  BNAPP.events[key].push(obj);
  saveLocalEvents();
  renderCalendar();
  renderEvents(key);
}

// ---------- טופס אירוע ----------
document.getElementById("event-form").addEventListener("submit", e => {
  e.preventDefault();

  const modal = document.getElementById("day-modal");
  const key = modal.dataset.key;

  const ev = {
    id: Date.now(),
    title: document.getElementById("event-title").value.trim(),
    time: document.getElementById("event-time").value,
    notes: document.getElementById("event-notes").value.trim(),
    address: document.getElementById("event-address").value.trim(),
  };

  addEvent(key, ev);

  e.target.reset();
  document.getElementById("event-form-section").classList.add("hidden");
});

// ---------- כפתורי מודאל ----------
document.getElementById("close-day-modal").addEventListener("click", closeDayModal);

document.getElementById("add-event-btn").addEventListener("click", () => {
  const sec = document.getElementById("event-form-section");
  sec.classList.toggle("hidden");
});

document.getElementById("weather-info-btn").addEventListener("click", () => {
  const w = document.getElementById("weather-info");
  w.classList.toggle("hidden");
});

// ---------- ניווט חודשים ----------
document.getElementById("prev-month").addEventListener("click", async () => {
  BNAPP.viewMonth--;
  if (BNAPP.viewMonth < 0) {
    BNAPP.viewMonth = 11;
    BNAPP.viewYear--;
  }
  await loadMonthData();
});

document.getElementById("next-month").addEventListener("click", async () => {
  BNAPP.viewMonth++;
  if (BNAPP.viewMonth > 11) {
    BNAPP.viewMonth = 0;
    BNAPP.viewYear++;
  }
  await loadMonthData();
});

document.getElementById("today-btn").addEventListener("click", async () => {
  BNAPP.viewYear = BNAPP.today.getFullYear();
  BNAPP.viewMonth = BNAPP.today.getMonth();
  await loadMonthData();
});

// ---------- INIT ----------
async function initBNAPP() {
  loadSettings();
  loadLocalEvents();

  BNAPP.viewYear = BNAPP.today.getFullYear();
  BNAPP.viewMonth = BNAPP.today.getMonth();

  await loadMonthData();
}

initBNAPP();
