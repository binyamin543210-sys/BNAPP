//
// core.js — BNAPP ULTRA FINAL FIXED
//

const BNAPP = {
  today: new Date(),
  viewYear: null,
  viewMonth: null,
  settings: {
    city: "Yavne"
  },
  events: {},
  holidays: {},
  weather: {},
  shabbat: {},
  hebrewMonthLabel: ""
};

// --------------------------------------------------
// Utilities
// --------------------------------------------------

function fmt(d) {
  return d.toISOString().split("T")[0];
}

function dateFromKey(k) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function hebDateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// --------------------------------------------------
// Settings Local Storage
// --------------------------------------------------

function loadSettings() {
  try {
    const raw = localStorage.getItem("bnapp_settings_v1");
    if (raw) Object.assign(BNAPP.settings, JSON.parse(raw));
  } catch {}
}

function saveSettings() {
  localStorage.setItem("bnapp_settings_v1", JSON.stringify(BNAPP.settings));
}

// --------------------------------------------------
// Events Local Storage
// --------------------------------------------------

function loadLocalEvents() {
  try {
    const raw = localStorage.getItem("bnapp_events_v1");
    if (raw) BNAPP.events = JSON.parse(raw);
  } catch {
    BNAPP.events = {};
  }
}

function saveLocalEvents() {
  localStorage.setItem("bnapp_events_v1", JSON.stringify(BNAPP.events));
}

// --------------------------------------------------
// Last 3 Used Cities
// --------------------------------------------------

function saveRecentCity(city) {
  if (!city) return;
  let arr = JSON.parse(localStorage.getItem("bnapp_recent_cities") || "[]");

  arr = arr.filter(c => c !== city);
  arr.unshift(city);
  arr = arr.slice(0, 3);

  localStorage.setItem("bnapp_recent_cities", JSON.stringify(arr));
}

function getRecentCities() {
  try {
    return JSON.parse(localStorage.getItem("bnapp_recent_cities") || "[]");
  } catch {
    return [];
  }
}

function renderRecentCities() {
  const box = document.getElementById("recent-cities");
  if (!box) return;

  const arr = getRecentCities();
  box.innerHTML = "";

  arr.forEach(city => {
    const btn = document.createElement("button");
    btn.className = "recent-city-btn";
    btn.textContent = city;
    btn.onclick = () => {
      document.getElementById("settings-city").value = city;
    };
    box.appendChild(btn);
  });
}

// --------------------------------------------------
// Render Calendar Grid
// --------------------------------------------------

function renderCalendar() {
  const year = BNAPP.viewYear;
  const month = BNAPP.viewMonth;

  const monthNames = [
    "ינואר","פברואר","מרץ","אפריל","מאי","יוני",
    "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"
  ];

  document.getElementById("month-label").textContent =
    `${monthNames[month]} ${year}`;

  document.getElementById("hebrew-month-label").textContent =
    BNAPP.hebrewMonthLabel || "";

  const grid = document.getElementById("calendar-grid");
  grid.innerHTML = "";

  const first = new Date(year, month, 1);
 // המרה לימים עבריים: א'–ש' במקום Sunday-first
const jsDay = first.getDay(); // 0=Sunday
const firstDay = (jsDay + 6) % 7; // 0=Monday ... 6=Sunday

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

    // ----- Header -----
    const header = document.createElement("div");
    header.className = "day-header";

    const num = document.createElement("div");
    num.className = "day-number";
    num.textContent = dNum;

    const heb = document.createElement("div");
    heb.className = "hebrew-date";
    heb.textContent = BNAPP.holidays[key]?.hebrew || "";

    header.appendChild(num);
    header.appendChild(heb);
    cell.appendChild(header);

    // ----- Tags -----
    const tags = document.createElement("div");
    tags.className = "day-tags";

    // Show "שבת" ONLY on actual Saturday
    if (dObj.getDay() === 6) {
      const t = document.createElement("span");
      t.className = "tag-pill tag-shabbat";
      t.textContent = "שבת";
      tags.appendChild(t);
    }

    // Holidays
    (BNAPP.holidays[key]?.tags || []).forEach(tg => {
      const t = document.createElement("span");
      t.className = "tag-pill tag-holiday";
      t.textContent = tg;
      tags.appendChild(t);
    });

    cell.appendChild(tags);

    // ----- Footer (Weather + Events) -----
    const footer = document.createElement("div");
    footer.className = "day-footer";
    // --- תצוגת כניסת/יציאת שבת בתוך הלוח ---
const sh = BNAPP.shabbat[key];
if (sh) {
  const shDiv = document.createElement("div");
  shDiv.className = "shabbat-inline";
  
  if (sh.includes("כניסת")) {
    // ביום שישי
    shDiv.textContent = "🕯️ " + sh.split("כניסת שבת: ")[1].split(" ")[0];
  }

  if (sh.includes("צאת")) {
    // ביום שבת
    shDiv.textContent = "⭐ " + sh.split("צאת שבת: ")[1].split(" ")[0];
  }

  footer.appendChild(shDiv);
}


    const wxWrap = document.createElement("div");
    if (BNAPP.weather[key]) {
      const chip = document.createElement("div");
      chip.className = "weather-chip";
      chip.textContent = `${BNAPP.weather[key].icon} ${BNAPP.weather[key].max}°`;
      wxWrap.appendChild(chip);
    }
    footer.appendChild(wxWrap);

    // Events dot
    if (BNAPP.events[key]?.length) {
      const dot = document.createElement("div");
      dot.className = "events-dot";
      footer.appendChild(dot);
    } else {
      footer.appendChild(document.createElement("div"));
    }

    cell.appendChild(footer);

    // Highlight today
    const t = BNAPP.today;
    if (
      dObj.getFullYear() === t.getFullYear() &&
      dObj.getMonth() === t.getMonth() &&
      dObj.getDate() === t.getDate()
    ) {
      cell.classList.add("day-today");
    }

    cell.dataset.key = key;
    cell.onclick = () => openDayModal(key);

    grid.appendChild(cell);
  }
}

// --------------------------------------------------
// Day Modal
// --------------------------------------------------

function openDayModal(key) {
  // תיקון: להפוך את היום ל־12:00 כדי למנוע זליגה בין ימים (timezone fix)
let d = dateFromKey(key);
d.setHours(12, 0, 0, 0);


  document.getElementById("modal-date-label").textContent =
    d.toLocaleDateString("he-IL", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });

  document.getElementById("modal-hebrew-label").textContent =
    BNAPP.holidays[key]?.fullHebrew || "";

  document.getElementById("modal-shabbat-label").textContent =
    BNAPP.shabbat[key] || "";

  const wx = BNAPP.weather[key];
  document.getElementById("modal-weather-label").textContent =
    wx ? `${wx.icon} ${wx.max}° / ${wx.min}° — ${wx.desc}` : "";

  document.getElementById("events-list").innerHTML = "";

  renderEvents(key);

  document.getElementById("day-modal").dataset.key = key;
  document.getElementById("day-modal").classList.remove("hidden");
}

function closeDayModal() {
  document.getElementById("day-modal").classList.add("hidden");
}

// --------------------------------------------------
// Events
// --------------------------------------------------

function renderEvents(key) {
  const arr = BNAPP.events[key] || [];
  const list = document.getElementById("events-list");
  list.innerHTML = "";

  arr.forEach(ev => {
    const li = document.createElement("li");
    li.className = "event-item";

    li.innerHTML = `
      <div class="event-title">${ev.title}</div>
      <div class="event-meta">
        ${ev.time ? "שעה: " + ev.time : ""}
        ${ev.address ? " • כתובת: " + ev.address : ""}
      </div>
    `;

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

// --------------------------------------------------
// Load Month Data
// Includes: Hebrew calendar, holidays, weather, FULL SHABBAT FIX
// --------------------------------------------------

async function loadMonthData() {
  const y = BNAPP.viewYear;
  const m = BNAPP.viewMonth;
  const days = new Date(y, m + 1, 0).getDate();

  // Hebrew + Holidays
  const hMap = await Holidays.getHolidaysForMonth(y, m);
  BNAPP.holidays = {};

  const midKey = hebDateKey(y, m, Math.min(15, days));
  const midHeb = await Holidays.getHebrewDate(midKey);

  BNAPP.hebrewMonthLabel = midHeb ? midHeb.split(" ").slice(1).join(" ") : "";

  for (let d = 1; d <= days; d++) {
    const k = hebDateKey(y, m, d);
    const fullHeb = await Holidays.getHebrewDate(k);

    BNAPP.holidays[k] = {
      hebrew: fullHeb ? fullHeb.split(" ")[0] : "",
      fullHebrew: fullHeb,
      tags: []
    };

    if (hMap[k]) {
      hMap[k].forEach(item => {
        if (!["candles","havdalah","parashat"].includes(item.category)) {
          const type = Holidays.classifyHoliday([item]);
          const tag = Holidays.getHolidayTag(type);
          if (tag) BNAPP.holidays[k].tags.push(tag.text);
        }
      });
    }
  }

  // Weather (monthly)
  try {
    BNAPP.weather =
      (await Weather.getWeatherForMonth(BNAPP.settings.city, y, m)) || {};
  } catch {
    BNAPP.weather = {};
  }

  // --------------------------------------------------
  // FIXED SHABBAT — Exact times for entire month
  // --------------------------------------------------

  BNAPP.shabbat = {};

  const shMap = await Shabbat.getShabbatMonthTimes(
    BNAPP.settings.city,
    y,
    m
  );

  Object.keys(shMap).forEach(key => {
    BNAPP.shabbat[key] = Shabbat.formatShabbatLabel(shMap[key]);
  });

  renderCalendar();
}

// --------------------------------------------------
// INIT
// --------------------------------------------------

async function initBNAPP() {
  loadSettings();
  loadLocalEvents();

  BNAPP.viewYear = BNAPP.today.getFullYear();
  BNAPP.viewMonth = BNAPP.today.getMonth();

  await loadMonthData();
  renderRecentCities();
}

// --------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("settings-btn").onclick = () =>
    document.getElementById("settings-modal").classList.remove("hidden");

  document.getElementById("close-settings-modal").onclick = () =>
    document.getElementById("settings-modal").classList.add("hidden");

  document.getElementById("settings-save").onclick = () => {
    const city = document.getElementById("settings-city").value.trim();
    BNAPP.settings.city = city || "Yavne";

    saveSettings();
    saveRecentCity(BNAPP.settings.city);
    renderRecentCities();
    loadMonthData();

    document.getElementById("settings-modal").classList.add("hidden");
  };

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

  document.getElementById("close-day-modal").onclick = closeDayModal;

  initBNAPP();
});
