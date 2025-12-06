//
// core.js — BNAPP Ultra Fixed Edition
// כולל:
// ✔ תיקון שבת ביום הנכון (timezone fix)
// ✔ תיקון modal שלא מגיב לכפתורים
// ✔ תמיכה מלאה בהצגת כניסת/יציאת שבת בלוח ובחלונית
// ✔ יציבות כללית
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

// --------- כלי עזר ---------

function fixTZ(d) {
  // מניעת זליגת ימים – גורם לשבת להופיע ביום שבת
  d.setHours(12, 0, 0, 0);
  return d;
}

function fmt(d) {
  return d.toISOString().split("T")[0];
}

function dateFromKey(k) {
  const [y, m, d] = k.split("-").map(Number);
  return fixTZ(new Date(y, m - 1, d));
}

function hebKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2,"0")}`;
}

// -------- הגדרות --------

function loadSettings() {
  try {
    const raw = localStorage.getItem("bnapp_settings_v1");
    if (raw) Object.assign(BNAPP.settings, JSON.parse(raw));
  } catch {}
}

function saveSettings() {
  localStorage.setItem("bnapp_settings_v1", JSON.stringify(BNAPP.settings));
}

// -------- רינדור לוח --------

function renderCalendar() {
  const year = BNAPP.viewYear;
  const month = BNAPP.viewMonth;

  const names = [
    "ינואר","פברואר","מרץ","אפריל","מאי","יוני",
    "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"
  ];

  document.getElementById("month-label").textContent =
    `${names[month]} ${year}`;

  document.getElementById("hebrew-month-label").textContent =
    BNAPP.hebrewMonthLabel || "";

  const grid = document.getElementById("calendar-grid");
  grid.innerHTML = "";

  const first = fixTZ(new Date(year, month, 1));
  const firstDay = first.getDay();
  const days = new Date(year, month+1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  for (let i = 0; i < 42; i++) {
    const cell = document.createElement("div");
    cell.className = "day-cell";

    let dNum;
    let dObj;

    if (i < firstDay) {
      dNum = prevDays - (firstDay - i - 1);
      dObj = fixTZ(new Date(year, month - 1, dNum));
      cell.classList.add("other-month");
    } else if (i >= firstDay + days) {
      dNum = i - (firstDay + days) + 1;
      dObj = fixTZ(new Date(year, month + 1, dNum));
      cell.classList.add("other-month");
    } else {
      dNum = i - firstDay + 1;
      dObj = fixTZ(new Date(year, month, dNum));
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
    if (BNAPP.holidays[key]?.hebrew) heb.textContent = BNAPP.holidays[key].hebrew;

    header.appendChild(num);
    header.appendChild(heb);
    cell.appendChild(header);

    // TAGS
    const tags = document.createElement("div");
    tags.className = "day-tags";

    // שבת בלוח החודשי!!!
    if (dObj.getDay() === 6) {
      const t = document.createElement("span");
      t.className = "tag-pill tag-shabbat";
      t.textContent = "שבת";
      tags.appendChild(t);

      // הוספת כניסת/יציאת שבת
      if (BNAPP.shabbat[key]) {
        const t2 = document.createElement("span");
        t2.className = "tag-pill tag-shabbat-time";
        t2.textContent = BNAPP.shabbat[key].replace("יציאת שבת:", "").replace("נרות:", "").trim();
        tags.appendChild(t2);
      }
    }

    BNAPP.holidays[key]?.tags?.forEach(tg => {
      const h = document.createElement("span");
      h.className = "tag-pill tag-holiday";
      h.textContent = tg;
      tags.appendChild(h);
    });

    cell.appendChild(tags);

    // FOOTER
    const footer = document.createElement("div");
    footer.className = "day-footer";

    const wx = BNAPP.weather[key];
    if (wx) {
      const chip = document.createElement("div");
      chip.className = "weather-chip";
      chip.textContent = `${wx.icon} ${wx.max}°`;
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

    // TODAY
    const t = BNAPP.today;
    if (dObj.getFullYear()===t.getFullYear() &&
        dObj.getMonth()===t.getMonth() &&
        dObj.getDate()===t.getDate()) {
      cell.classList.add("day-today");
    }

    // CLICK → MODAL
    cell.dataset.key = key;
    cell.addEventListener("click", () => openDayModal(key));

    grid.appendChild(cell);
  }
}

// ------- חלון יום ---------

function openDayModal(key) {
  const d = dateFromKey(key);

  document.getElementById("day-modal").dataset.key = key;

  document.getElementById("modal-date-label").textContent =
    d.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });

  document.getElementById("modal-hebrew-label").textContent =
    BNAPP.holidays[key]?.fullHebrew || "";

  document.getElementById("modal-shabbat-label").textContent =
    BNAPP.shabbat[key] || "";

  const wx = BNAPP.weather[key];
  document.getElementById("modal-weather-label").textContent = wx
    ? `${wx.icon} ${wx.max}° / ${wx.min}° – ${wx.desc}`
    : "";

  renderEvents(key);

  document.getElementById("event-form-wrap").classList.add("hidden");
  document.getElementById("day-weather-panel").classList.add("hidden");

  document.getElementById("day-modal").classList.remove("hidden");
}

function closeDayModal() {
  document.getElementById("day-modal").classList.add("hidden");
}

// --- שאר הקוד של אירועים, חגים, מזג אוויר ושבת — נשאר זהה ---

// ... כאן נשארים כל הפונקציות של loadMonthData() , events וכו’ ...

// INIT
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("settings-btn").onclick =
    () => document.getElementById("settings-modal").classList.remove("hidden");

  document.getElementById("close-settings-modal").onclick =
    () => document.getElementById("settings-modal").classList.add("hidden");

  document.getElementById("close-day-modal").onclick = closeDayModal;

  document.getElementById("open-add-event").onclick = () => {
    document.getElementById("event-form-wrap").classList.toggle("hidden");
    document.getElementById("day-weather-panel").classList.add("hidden");
  };

  document.getElementById("open-day-weather").onclick = () => {
    const key = document.getElementById("day-modal").dataset.key;
    const panel = document.getElementById("day-weather-panel");

    const wx = BNAPP.weather[key];
    panel.textContent = wx
      ? `${wx.icon} ${wx.max}° / ${wx.min}° – ${wx.desc}`
      : "אין נתוני מזג אוויר ליום זה";

    panel.classList.remove("hidden");
    document.getElementById("event-form-wrap").classList.add("hidden");
  };

  BNAPP.viewYear = BNAPP.today.getFullYear();
  BNAPP.viewMonth = BNAPP.today.getMonth();

  loadSettings();
  loadLocalEvents();
  loadMonthData();
});
