//
// core.js
// מנוע הלוח שנה BNAPP ULTRA
//

const BNAPP = {
  today: new Date(),
  viewYear: null,
  viewMonth: null,

  settings: {
    city: "Jerusalem",
    calendarId: "",
    defaultReminder: 30
  },

  events: {},   // כל האירועים לפי תאריך YYYY-MM-DD
  holidays: {}, // חגים/עברי לכל יום
  shabbat: {},  // זמני שבת לכל יום רלוונטי
  weather: {},  // מזג אוויר לכל יום
};

// ----------------------------------------------------
// כלי עזר
// ----------------------------------------------------
function fmt(d) {
  return d.toISOString().split("T")[0];
}

function dateFromKey(k) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function hebDateKey(y, m, d) {
  return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

// ----------------------------------------------------
// טעינת הגדרות
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

// ----------------------------------------------------
// טעינת אירועים
// ----------------------------------------------------
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

  // כותרת חודש לועזי
  document.getElementById("month-label").textContent =
    `${["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"][month]} ${year}`;

  // כותרת חודש עברי (רק פעם אחת למעלה)
  const hebLabelEl = document.getElementById("hebrew-month-label");
  if (hebLabelEl) {
    const keyFirst = fmt(new Date(year, month, 1));
    const fullHeb = BNAPP.holidays[keyFirst]?.hebrew || "";
    const parts = fullHeb.split(" ");
    hebLabelEl.textContent = parts.length > 1 ? parts.slice(1).join(" ") : "";
  }

  const grid = document.getElementById("calendar-grid");
  grid.innerHTML = "";

  const first = new Date(year, month, 1);
  const firstDay = (first.getDay() + 6) % 7;
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

    // HEADER
    const header = document.createElement("div");
    header.className = "day-header";

    const num = document.createElement("div");
    num.className = "day-number";
    num.textContent = dNum;

    const heb = document.createElement("div");
    heb.className = "hebrew-date";
    const fullHeb = BNAPP.holidays[key]?.hebrew || "";
    if (fullHeb) {
      // רק היום העברי (המילה הראשונה) בלי חודש ושנה
      heb.textContent = fullHeb.split(" ")[0] || "";
    }

    header.appendChild(num);
    header.appendChild(heb);
    cell.appendChild(header);

    // TAGS
    const tags = document.createElement("div");
    tags.className = "day-tags";

    // שבת
    if (BNAPP.holidays[key]?.isShabbat) {
      const t = document.createElement("span");
      t.className = "tag-pill tag-shabbat";
      t.textContent = "שבת";
      tags.appendChild(t);
    }

    // חג/מועד
    if (BNAPP.holidays[key]?.tags) {
      BNAPP.holidays[key].tags.forEach(tg => {
        const t = document.createElement("span");
        t.className = "tag-pill tag-holiday";
        t.textContent = tg;
        tags.appendChild(t);
      });
    }

    cell.appendChild(tags);

    // FOOTER — מזג אוויר / אירועים
    const footer = document.createElement("div");
    footer.className = "day-footer";

    // מזג אוויר – צ'יפ קטן
    if (BNAPP.weather[key]) {
      const chip = document.createElement("div");
      chip.className = "weather-chip";
      chip.textContent =
        `${BNAPP.weather[key].icon} ${BNAPP.weather[key].max}°`;
      footer.appendChild(chip);
    } else {
      footer.appendChild(document.createElement("div"));
    }

    // נקודה לאירועים
    if (BNAPP.events[key]?.length) {
      const dot = document.createElement("div");
      dot.className = "events-dot";
      footer.appendChild(dot);
    }

    cell.appendChild(footer);

    // היום הנוכחי
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

// ----------------------------------------------------
// חלון יום
// ----------------------------------------------------
function openDayModal(key) {
  const d = dateFromKey(key);
  const modal = document.getElementById("day-modal");
  modal.dataset.key = key;

  document.getElementById("modal-date-label").textContent =
    d.toLocaleDateString("he-IL", {
      weekday: "long",
      month: "long",
      day: "numeric"
    });

  document.getElementById("modal-hebrew-label").textContent =
    BNAPP.holidays[key]?.hebrew || "";

  document.getElementById("modal-shabbat-label").textContent =
    BNAPP.shabbat[key]?.label || "";

  const wx = BNAPP.weather[key];
  const chip = document.getElementById("modal-weather-chip");
  if (wx) {
    chip.textContent = `${wx.icon} מקס' ${wx.max}° / מינ' ${wx.min}°`;
  } else {
    chip.textContent = "";
  }

  // ברירת מחדל – טופס סגור, מזג אוויר סגור
  document.getElementById("event-form-section").classList.add("hidden");
  document.getElementById("day-weather-panel").classList.add("hidden");

  renderEvents(key);

  modal.classList.remove("hidden");
}

function closeDayModal() {
  document.getElementById("day-modal").classList.add("hidden");
}

// ----------------------------------------------------
// אירועים
// ----------------------------------------------------
function parseTimeToMinutes(t) {
  if (!t) return 24 * 60 + 1; // בלי שעה – בסוף
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return 24 * 60 + 1;
  return h * 60 + m;
}

function renderEvents(key) {
  const list = document.getElementById("events-list");
  list.innerHTML = "";

  let arr = BNAPP.events[key] || [];

  // מיון לפי זמן
  arr = arr.slice().sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

  if (!arr.length) {
    // אין אירועים – אם יש מזג אוויר, נציג הודעה + לחצן
    const wx = BNAPP.weather[key];
    const li = document.createElement("li");
    li.className = "event-item";
    if (wx) {
      li.textContent = "אין אירועים ביום זה. מזג האוויר זמין בלחיצה על כפתור הענן ☁️ למעלה.";
    } else {
      li.textContent = "אין אירועים או משימות ביום זה.";
    }
    list.appendChild(li);
    return;
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
  if (BNAPP.settings.calendarId) Sync.syncSave(key, BNAPP.events[key]);
  renderCalendar();
  renderEvents(key);
}

function deleteEvent(key, id) {
  BNAPP.events[key] = (BNAPP.events[key] || []).filter(e => e.id !== id);
  saveLocalEvents();
  if (BNAPP.settings.calendarId) Sync.syncSave(key, BNAPP.events[key]);
  renderCalendar();
  renderEvents(key);
}

function toggleDone(key, id) {
  const arr = BNAPP.events[key] || [];
  arr.forEach(e => {
    if (e.id === id) e.done = !e.done;
  });
  saveLocalEvents();
  if (BNAPP.settings.calendarId) Sync.syncSave(key, BNAPP.events[key]);
  renderCalendar();
  renderEvents(key);
}

// ----------------------------------------------------
// שמירת אירוע חדש
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("event-form").addEventListener("submit", e => {
    e.preventDefault();

    const key = document.querySelector("#day-modal").dataset.key;

    const ev = {
      id: Date.now(),
      type: document.getElementById("event-type").value,
      title: document.getElementById("event-title").value.trim(),
      time: document.getElementById("event-time").value,
      address: document.getElementById("event-address").value.trim(),
      notes: document.getElementById("event-notes").value.trim(),
      reminder: Number(document.getElementById("event-reminder-mins").value),
      done: false
    };

    addEvent(key, ev);

    document.getElementById("event-form").reset();
    document.getElementById("event-form-section").classList.add("hidden");
  });

  // כפתור סגירת מודל יום
  document.getElementById("close-day-modal").onclick = closeDayModal;

  // כפתור פלוס – פותח טופס
  document.getElementById("day-add-btn").onclick = () => {
    const sec = document.getElementById("event-form-section");
    sec.classList.toggle("hidden");
  };

  // כפתור מזג אוויר – מציג/מסתיר פירוט
  document.getElementById("day-weather-btn").onclick = () => {
    const panel = document.getElementById("day-weather-panel");
    const modal = document.getElementById("day-modal");
    const key = modal.dataset.key;
    renderDayWeather(key);
    panel.classList.toggle("hidden");
  };
});

// ----------------------------------------------------
// פירוט מזג אוויר ליום
// ----------------------------------------------------
function renderDayWeather(key) {
  const wx = BNAPP.weather[key];
  const container = document.getElementById("day-weather-content");
  container.innerHTML = "";

  if (!wx) {
    container.textContent = "אין נתוני מזג אוויר זמינים ליום זה.";
    return;
  }

  const line1 = document.createElement("div");
  line1.textContent = `${wx.icon}  טמפרטורה מקסימלית: ${wx.max}°  |  מינימלית: ${wx.min}°`;

  const line2 = document.createElement("div");
  if (wx.desc) line2.textContent = `תיאור: ${wx.desc}`;
  else line2.textContent = "";

  container.appendChild(line1);
  container.appendChild(line2);
}

// ----------------------------------------------------
// טעינת נתוני עברי / חג / שבת / מזג אוויר
// ----------------------------------------------------
async function loadMonthData() {
  const y = BNAPP.viewYear;
  const m = BNAPP.viewMonth;

  const h = await Holidays.getHolidaysForMonth(y, m);
  BNAPP.holidays = {};

  // Hebrew + holiday
  for (let d = 1; d <= 31; d++) {
    const key = hebDateKey(y, m, d);
    const dObj = new Date(y, m, d);
    if (isNaN(dObj)) continue;

    const heb = await Holidays.getHebrewDate(key);
    BNAPP.holidays[key] = {
      hebrew: heb,
      tags: [],
      isShabbat: Holidays.isShabbat(dObj)
    };

    if (h[key]) {
      const type = Holidays.classifyHoliday(h[key]);
      const tag = Holidays.getHolidayTag(type);
      if (tag) BNAPP.holidays[key].tags.push(tag.text);
    }
  }

  // Shabbat times
  BNAPP.shabbat = {};
  for (let d = 1; d <= 31; d++) {
    const key = hebDateKey(y, m, d);
    const dObj = new Date(y, m, d);
    if (isNaN(dObj)) continue;

    const sh = await Shabbat.getShabbatTimes(BNAPP.settings.city, key);
    if (sh) {
      BNAPP.shabbat[key] = {
        candle: sh.candleLighting,
        havdalah: sh.havdalah,
        label: Shabbat.formatShabbatLabel(sh)
      };
    }
  }

  // WEATHER
  BNAPP.weather = {};
  for (let d = 1; d <= 31; d++) {
    const key = hebDateKey(y, m, d);
    const dObj = new Date(y, m, d);
    if (isNaN(dObj)) continue;

    const wx = await Weather.getWeatherForDate(BNAPP.settings.city, key);
    if (wx) BNAPP.weather[key] = wx;
  }

  renderCalendar();
}

// ----------------------------------------------------
// הגדרות
// ----------------------------------------------------
document.getElementById("settings-btn").onclick = () =>
  document.getElementById("settings-modal").classList.remove("hidden");

document.getElementById("close-settings-modal").onclick = () =>
  document.getElementById("settings-modal").classList.add("hidden");

document.getElementById("settings-save").onclick = () => {
  BNAPP.settings.city = document.getElementById("settings-city").value.trim() || "Jerusalem";
  BNAPP.settings.calendarId =
    document.getElementById("settings-calendar-id").value.trim();
  BNAPP.settings.defaultReminder =
    Number(document.getElementById("settings-default-reminder").value) || 30;

  saveSettings();

  if (BNAPP.settings.calendarId) {
    Sync.initFirebaseIfNeeded(BNAPP.settings.calendarId);
  }

  loadMonthData();
  document.getElementById("settings-modal").classList.add("hidden");
};

// ----------------------------------------------------
// הזזת חודש
// ----------------------------------------------------
document.getElementById("prev-month").onclick = () => {
  BNAPP.viewMonth--;
  if (BNAPP.viewMonth < 0) {
    BNAPP.viewMonth = 11;
    BNAPP.viewYear--;
  }
  loadMonthData();
};

document.getElementById("next-month").onclick = () => {
  BNAPP.viewMonth++;
  if (BNAPP.viewMonth > 11) {
    BNAPP.viewMonth = 0;
    BNAPP.viewYear++;
  }
  loadMonthData();
};

document.getElementById("today-btn").onclick = () => {
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

  if (BNAPP.settings.calendarId) {
    Sync.initFirebaseIfNeeded(BNAPP.settings.calendarId);
  }

  await loadMonthData();
}

initBNAPP();
