// core.js
// מנוע הלוח שנה BNAPP ULTRA – גרסה נקייה ומתוקנת

const BNAPP = {
  today: new Date(),
  viewYear: null,
  viewMonth: null,

  settings: {
    city: "Yavne",
    calendarId: "",
    defaultReminder: 30
  },

  events: {}, 
  holidays: {},
  shabbat: {},
  weather: {},
};

// ----------------------------------------------------
// כלים כלליים
// ----------------------------------------------------

function fmt(d) {
  return d.toISOString().split("T")[0];
}

function dateFromKey(k) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

// ----------------------------------------------------
// טעינה ושמירה של הגדרות ואירועים
// ----------------------------------------------------

function loadSettings() {
  try {
    const raw = localStorage.getItem("bnapp_settings");
    if (raw) Object.assign(BNAPP.settings, JSON.parse(raw));
  } catch {}
}

function saveSettings() {
  localStorage.setItem("bnapp_settings", JSON.stringify(BNAPP.settings));
}

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

// ----------------------------------------------------
// יצירת לוח השנה
// ----------------------------------------------------

function renderCalendar() {
  const year = BNAPP.viewYear;
  const month = BNAPP.viewMonth;

  document.getElementById("month-label").textContent =
    `${["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"][month]} ${year}`;

  const grid = document.getElementById("calendar-grid");
  grid.innerHTML = "";

  const first = new Date(year, month, 1);
  const firstDay = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const total = 42;

  for (let i = 0; i < total; i++) {
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

    const header = document.createElement("div");
    header.className = "day-header";

    const num = document.createElement("div");
    num.className = "day-number";
    num.textContent = dNum;

    const heb = document.createElement("div");
    heb.className = "hebrew-date";
    if (BNAPP.holidays[key]?.hebrew) heb.textContent = BNAPP.holidays[key].hebrew;

    header.appendChild(num);
    header.appendChild(heb);
    cell.appendChild(header);

    const tags = document.createElement("div");
    tags.className = "day-tags";

    if (BNAPP.holidays[key]?.isShabbat) {
      const t = document.createElement("span");
      t.className = "tag-pill tag-shabbat";
      t.textContent = "שבת";
      tags.appendChild(t);
    }

    if (BNAPP.holidays[key]?.tags?.length) {
      BNAPP.holidays[key].tags.forEach(tg => {
        const t = document.createElement("span");
        t.className = "tag-pill tag-holiday";
        t.textContent = tg;
        tags.appendChild(t);
      });
    }

    cell.appendChild(tags);

    const footer = document.createElement("div");
    footer.className = "day-footer";

    if (BNAPP.weather[key]) {
      const chip = document.createElement("div");
      chip.className = "weather-chip";
      chip.textContent = `${BNAPP.weather[key].icon} ${BNAPP.weather[key].max}°`;
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

    if (
      dObj.getFullYear() === BNAPP.today.getFullYear() &&
      dObj.getMonth() === BNAPP.today.getMonth() &&
      dObj.getDate() === BNAPP.today.getDate()
    ) {
      cell.classList.add("day-today");
    }

    cell.dataset.key = key;
    cell.onclick = () => openDayModal(key);

    grid.appendChild(cell);
  }
}

// ----------------------------------------------------
// מודאל יום
// ----------------------------------------------------

function openDayModal(key) {
  const d = dateFromKey(key);

  document.getElementById("modal-date-label").textContent =
    d.toLocaleDateString("he-IL", { weekday: "long", month: "long", day: "numeric" });

  document.getElementById("modal-hebrew-label").textContent =
    BNAPP.holidays[key]?.hebrew || "";

  document.getElementById("modal-shabbat-label").textContent =
    BNAPP.shabbat[key]?.label || "";

  if (BNAPP.weather[key]) {
    document.getElementById("modal-weather-label").textContent =
      `${BNAPP.weather[key].icon} מקס' ${BNAPP.weather[key].max}°`;
  } else {
    document.getElementById("modal-weather-label").textContent = "";
  }

  renderEvents(key);

  const modal = document.getElementById("day-modal");
  modal.dataset.key = key;
  modal.classList.remove("hidden");
}

function closeDayModal() {
  document.getElementById("day-modal").classList.add("hidden");
}

// ----------------------------------------------------
// אירועים
// ----------------------------------------------------

function renderEvents(key) {
  const list = document.getElementById("events-list");
  list.innerHTML = "";

  const arr = BNAPP.events[key] || [];

  arr.forEach(ev => {
    const li = document.createElement("li");
    li.className = "event-item";

    const title = document.createElement("div");
    title.className = "event-title";
    title.textContent = ev.title;

    const meta = document.createElement("div");
    meta.className = "event-meta";
    meta.textContent =
      (ev.time ? `שעה: ${ev.time} • ` : "") +
      (ev.address ? `כתובת: ${ev.address}` : "");

    const actions = document.createElement("div");
    actions.className = "event-actions";

    const del = document.createElement("button");
    del.className = "event-action-btn delete";
    del.textContent = "מחק";
    del.onclick = () => deleteEvent(key, ev.id);

    const done = document.createElement("button");
    done.className = "event-action-btn done";
    done.textContent = ev.done ? "בטל" : "בוצע";
    done.onclick = () => toggleDone(key, ev.id);

    if (ev.address) {
      const wz = document.createElement("button");
      wz.className = "event-action-btn";
      wz.textContent = "Waze";
      wz.onclick = () =>
        window.open(`https://waze.com/ul?q=${encodeURIComponent(ev.address)}`, "_blank");
      actions.appendChild(wz);
    }

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

  renderCalendar();
  renderEvents(key);
}

function deleteEvent(key, id) {
  BNAPP.events[key] = (BNAPP.events[key] || []).filter(e => e.id !== id);
  saveLocalEvents();
  renderCalendar();
  renderEvents(key);
}

function toggleDone(key, id) {
  const arr = BNAPP.events[key];
  arr.forEach(e => {
    if (e.id === id) e.done = !e.done;
  });
  saveLocalEvents();

  renderCalendar();
  renderEvents(key);
}

document.getElementById("event-form").onsubmit = e => {
  e.preventDefault();

  const key = document.querySelector("#day-modal").dataset.key;

  const ev = {
    id: Date.now(),
    title: event-title.value.trim(),
    time: event-time.value,
    address: event-address.value.trim(),
    notes: event-notes.value.trim(),
    reminder: Number(event-reminder-mins.value) || 0,
    done: false
  };

  if (!ev.title) return;
  addEvent(key, ev);

  document.getElementById("event-form").reset();
};

// ----------------------------------------------------
// טעינת נתוני עברי / חגים / שבת / מזג אוויר
// ----------------------------------------------------

async function loadMonthData() {
  const y = BNAPP.viewYear;
  const m = BNAPP.viewMonth;

  // חגים ותאריך עברי
  const h = await Holidays.getHolidaysForMonth(y, m);
  BNAPP.holidays = {};

  for (let d = 1; d <= 31; d++) {
    const key = dateKey(y, m, d);
    const dObj = new Date(y, m, d);
    if (isNaN(dObj)) continue;

    const heb = await Holidays.getHebrewDate(key);

    BNAPP.holidays[key] = {
      hebrew: heb,
      tags: [],
      isShabbat: Holidays.isShabbat(dObj),
    };

    if (h[key]) {
      const type = Holidays.classifyHoliday(h[key]);
      const tag = Holidays.getHolidayTag(type);
      if (tag) BNAPP.holidays[key].tags.push(tag.text);
    }
  }

  // זמני שבת
  BNAPP.shabbat = {};
  for (let d = 1; d <= 31; d++) {
    const key = dateKey(y, m, d);
    const dObj = new Date(y, m, d);
    if (isNaN(dObj)) continue;

    const sh = await Shabbat.getShabbatTimes(BNAPP.settings.city, key);
    if (sh) {
      BNAPP.shabbat[key] = {
        candle: sh.candleLighting,
        havdalah: sh.havdalah,
        label: Shabbat.formatShabbatLabel(sh),
      };
    }
  }

  // מזג אוויר
  BNAPP.weather = {};
  for (let d = 1; d <= 31; d++) {
    const key = dateKey(y, m, d);
    const w = await Weather.getWeatherForDate(BNAPP.settings.city, key);
    if (w) BNAPP.weather[key] = w;
  }

  renderCalendar();
}

// ----------------------------------------------------
// הגדרות
// ----------------------------------------------------

settings-btn.onclick = () =>
  settings-modal.classList.remove("hidden");

close-settings-modal.onclick = () =>
  settings-modal.classList.add("hidden");

settings-save.onclick = () => {
  BNAPP.settings.city = settings-city.value.trim() || "Yavne";
  saveSettings();
  loadMonthData();
  settings-modal.classList.add("hidden");
};

// ----------------------------------------------------
// ניווט חודשים
// ----------------------------------------------------

prev-month.onclick = () => {
  BNAPP.viewMonth--;
  if (BNAPP.viewMonth < 0) {
    BNAPP.viewMonth = 11;
    BNAPP.viewYear--;
  }
  loadMonthData();
};

next-month.onclick = () => {
  BNAPP.viewMonth++;
  if (BNAPP.viewMonth > 11) {
    BNAPP.viewMonth = 0;
    BNAPP.viewYear++;
  }
  loadMonthData();
};

today-btn.onclick = () => {
  BNAPP.viewYear = BNAPP.today.getFullYear();
  BNAPP.viewMonth = BNAPP.today.getMonth();
  loadMonthData();
};

// ----------------------------------------------------
// INIT
// ----------------------------------------------------

async function initBNAPP() {
  loadSettings();
  loadLocalEvents();

  BNAPP.viewYear = BNAPP.today.getFullYear();
  BNAPP.viewMonth = BNAPP.today.getMonth();

  close-day-modal.onclick = closeDayModal;

  await loadMonthData();
}

initBNAPP();
