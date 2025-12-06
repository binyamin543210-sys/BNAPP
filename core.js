//
// core.js
// מנוע הלוח שנה BNAPP ULTRA – גרסה יציבה
//

const BNAPP = {
  today: new Date(),
  viewYear: null,
  viewMonth: null,
  settings: {
    city: "Yavne"
  },
  events: {},   // YYYY-MM-DD → מערך אירועים
  holidays: {}, // YYYY-MM-DD → עברי + תגיות
  weather: {},  // YYYY-MM-DD → נתוני מזג אוויר
  shabbat: {},  // YYYY-MM-DD → טקסט שבת
  hebrewMonthLabel: ""
};

// ---------- כלי עזר ----------

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

// ---------- הגדרות מקומיות ----------

function loadSettings() {
  try {
    const raw = localStorage.getItem("bnapp_settings_v1");
    if (raw) Object.assign(BNAPP.settings, JSON.parse(raw));
  } catch (e) {
    console.warn("Settings load failed", e);
  }
}

function saveSettings() {
  localStorage.setItem("bnapp_settings_v1", JSON.stringify(BNAPP.settings));
}

// ---------- אירועים מקומיים ----------

function loadLocalEvents() {
  try {
    const raw = localStorage.getItem("bnapp_events_v1");
    if (raw) BNAPP.events = JSON.parse(raw);
  } catch (e) {
    BNAPP.events = {};
  }
}

function saveLocalEvents() {
  localStorage.setItem("bnapp_events_v1", JSON.stringify(BNAPP.events));
}

// ---------- ערים אחרונות ----------

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

// ---------- רינדור לוח שנה ----------

function renderCalendar() {
  const year = BNAPP.viewYear;
  const month = BNAPP.viewMonth;

  const monthNames = [
    "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
    "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
  ];

  document.getElementById("month-label").textContent =
    `${monthNames[month]} ${year}`;

  document.getElementById("hebrew-month-label").textContent =
    BNAPP.hebrewMonthLabel || "";

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

    const tags = document.createElement("div");
    tags.className = "day-tags";

    if (dObj.getDay() === 6) {
      const t = document.createElement("span");
      t.className = "tag-pill tag-shabbat";
      t.textContent = "שבת";
      tags.appendChild(t);
    }

    if (BNAPP.holidays[key]?.tags) {
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

    const wxWrap = document.createElement("div");
    if (BNAPP.weather[key]) {
      const chip = document.createElement("div");
      chip.className = "weather-chip";
      chip.textContent =
        `${BNAPP.weather[key].icon} ${BNAPP.weather[key].max}°`;
      wxWrap.appendChild(chip);
    }
    footer.appendChild(wxWrap);

    if (BNAPP.events[key]?.length) {
      const dot = document.createElement("div");
      dot.className = "events-dot";
      footer.appendChild(dot);
    } else {
      footer.appendChild(document.createElement("div"));
    }

    cell.appendChild(footer);

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

function openDayModal(key) {
  const d = dateFromKey(key);

  document.getElementById("modal-date-label").textContent =
    d.toLocaleDateString("he-IL", {
      weekday: "long",
      month: "long",
      day: "numeric"
    });

  document.getElementById("modal-hebrew-label").textContent =
    BNAPP.holidays[key]?.fullHebrew || "";

  document.getElementById("modal-shabbat-label").textContent =
    BNAPP.shabbat[key] || "";

  if (BNAPP.weather[key]) {
    document.getElementById("modal-weather-label").textContent =
      `${BNAPP.weather[key].icon} ${BNAPP.weather[key].max}° / ${BNAPP.weather[key].min}° – ${BNAPP.weather[key].desc}`;
  } else {
    document.getElementById("modal-weather-label").textContent = "";
  }

  renderEvents(key);
  document.getElementById("day-weather-panel").classList.add("hidden");
  document.getElementById("event-form-wrap").classList.add("hidden");

  document.getElementById("day-modal").dataset.key = key;
  document.getElementById("day-modal").classList.remove("hidden");
}

function closeDayModal() {
  document.getElementById("day-modal").classList.add("hidden");
}

// ---------- אירועים ----------

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
  const arr = BNAPP.events[key] || [];
  arr.forEach(e => {
    if (e.id === id) e.done = !e.done;
  });
  saveLocalEvents();
  renderCalendar();
  renderEvents(key);
}

// ---------- טעינת עברי / חג / מזג אוויר / שבת ----------

async function loadMonthData() {
  const y = BNAPP.viewYear;
  const m = BNAPP.viewMonth;
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const holidaysMap = await Holidays.getHolidaysForMonth(y, m);
  BNAPP.holidays = {};

  const middleKey = hebDateKey(y, m, Math.min(15, daysInMonth));
  const middleHeb = await Holidays.getHebrewDate(middleKey);
  BNAPP.hebrewMonthLabel = middleHeb
    ? middleHeb.split(" ").slice(1).join(" ")
    : "";

  for (let d = 1; d <= daysInMonth; d++) {
    const dObj = new Date(y, m, d);
    const key = fmt(dObj);

    const fullHeb = await Holidays.getHebrewDate(key);
    const shortHeb = fullHeb ? fullHeb.split(" ")[0] : "";

    BNAPP.holidays[key] = {
      hebrew: shortHeb,
      fullHebrew: fullHeb,
      tags: [],
      isShabbat: Holidays.isShabbat(dObj)
    };

    if (holidaysMap[key]) {
      holidaysMap[key].forEach(item => {
        if (
          item.category !== "candles" &&
          item.category !== "havdalah" &&
          item.category !== "parashat"
        ) {
          const type = Holidays.classifyHoliday([item]);
          const tag = Holidays.getHolidayTag(type);
          if (tag) BNAPP.holidays[key].tags.push(tag.text);
        }
      });
    }
  }

  try {
    BNAPP.weather =
      (await Weather.getWeatherForMonth(BNAPP.settings.city, y, m)) || {};
  } catch (e) {
    console.error("Weather month load failed", e);
    BNAPP.weather = {};
  }

  BNAPP.shabbat = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dObj = new Date(y, m, d);
    const key = fmt(dObj);

    if (dObj.getDay() === 5 || dObj.getDay() === 6) {
      try {
        const times = await Shabbat.getShabbatTimes(BNAPP.settings.city, key);
        if (times) {
          BNAPP.shabbat[key] = Shabbat.formatShabbatForDay(dObj, times);
        }
      } catch (e) {
        console.error("Shabbat load error", e);
      }
    }
  }

  renderCalendar();
}

// ---------- INIT + מאזינים ----------

async function initBNAPP() {
  loadSettings();
  loadLocalEvents();

  BNAPP.viewYear = BNAPP.today.getFullYear();
  BNAPP.viewMonth = BNAPP.today.getMonth();

  await loadMonthData();
  renderRecentCities();
}

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
    document.getElementById("settings-modal").classList.add("hidden");
    loadMonthData();
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

  document.getElementById("event-form").addEventListener("submit", e => {
    e.preventDefault();

    const key = document.getElementById("day-modal").dataset.key;

    const ev = {
      id: Date.now(),
      title: document.getElementById("event-title").value.trim(),
      time: document.getElementById("event-time").value,
      address: document.getElementById("event-address").value.trim(),
      notes: document.getElementById("event-notes").value.trim(),
      reminder:
        Number(document.getElementById("event-reminder-mins").value) || null,
      done: false
    };

    if (!ev.title) return;

    addEvent(key, ev);
    document.getElementById("event-form").reset();
  });

  document.getElementById("open-add-event").onclick = () => {
    document.getElementById("event-form-wrap").classList.toggle("hidden");
    document.getElementById("day-weather-panel").classList.add("hidden");
  };

  document.getElementById("open-day-weather").onclick = () => {
    const key = document.getElementById("day-modal").dataset.key;
    const panel = document.getElementById("day-weather-panel");
    const wx = BNAPP.weather[key];

    if (!wx) {
      panel.textContent = "אין נתוני מזג אוויר ליום זה.";
    } else {
      panel.textContent =
        `${wx.icon} טמפרטורה מקסימלית ${wx.max}° • מינימלית ${wx.min}° • ${wx.desc}`;
    }

    panel.classList.remove("hidden");
    document.getElementById("event-form-wrap").classList.add("hidden");
  };

  initBNAPP();
});
