// sync.js – Firebase + אירועים + סנכרון + חיפוש + התראות

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

// קוד קבוצה – אפשר להחליף אם תרצה לוח נפרד
const GROUP_CODE = "bnapp_global";

let app, db, eventsRef;
let editingEventId = null;

// התראות
let scheduledTimeouts = [];

// ---------- Firebase ----------
function initFirebase() {
  try {
    if (!firebase.apps.length) {
      app = firebase.initializeApp(firebaseConfig);
    } else {
      app = firebase.app();
    }
    db = firebase.database();
  } catch (e) {
    console.error("Firebase init error:", e);
    db = null;
  }
}

function attachDbListener() {
  if (!db) initFirebase();
  if (eventsRef) eventsRef.off();

  loadEventsFromLocal();
  renderAll();
  scheduleReminders();

  if (!db) {
    console.warn("אין חיבור Firebase – אירועים יישמרו מקומית בלבד");
    return;
  }

  eventsRef = db.ref("groups/" + GROUP_CODE + "/events");
  eventsRef.on("value", snapshot => {
    const data = snapshot.val() || {};
    eventsByDate = {};
    Object.values(data).forEach(ev => {
      if (!ev.date) return;
      if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
      eventsByDate[ev.date].push(ev);
    });
    saveEventsToLocal();
    renderAll();
    scheduleReminders();
  });
}

function upsertEventToDb(ev) {
  if (!ev.date) return;

  if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
  const list = eventsByDate[ev.date];
  const idx = ev.id ? list.findIndex(e => e.id === ev.id) : -1;
  if (idx >= 0) {
    list[idx] = ev;
  } else {
    if (!ev.id) ev.id = "local_" + Date.now() + "_" + Math.random().toString(16).slice(2);
    list.push(ev);
  }
  saveEventsToLocal();
  renderAll();
  scheduleReminders();

  if (!db) {
    console.warn("אין Firebase – האירוע נשמר רק מקומית");
    return;
  }
  const refBase = db.ref("groups/" + GROUP_CODE + "/events");
  const firebaseId = ev.id.startsWith("local_") ? refBase.push().key : ev.id;
  ev.id = firebaseId;
  refBase.child(firebaseId).set(ev);
  saveEventsToLocal();
}

function deleteEventFromDb(id) {
  if (!id) return;

  Object.keys(eventsByDate).forEach(dateKey => {
    const list = eventsByDate[dateKey];
    const idx = list.findIndex(e => e.id === id);
    if (idx >= 0) {
      list.splice(idx,1);
      if (list.length === 0) delete eventsByDate[dateKey];
    }
  });
  saveEventsToLocal();
  renderAll();
  scheduleReminders();

  if (!db) {
    console.warn("אין Firebase – מחיקה רק מקומית");
    return;
  }
  const refBase = db.ref("groups/" + GROUP_CODE + "/events");
  refBase.child(id).remove();
}

// ---------- Local Storage ----------
function loadEventsFromLocal() {
  try {
    const raw = localStorage.getItem("bnapp_events_cache_global");
    eventsByDate = raw ? JSON.parse(raw) : {};
  } catch(e) {
    eventsByDate = {};
  }
}

function saveEventsToLocal() {
  try {
    localStorage.setItem("bnapp_events_cache_global", JSON.stringify(eventsByDate));
  } catch(e) {}
}

// ---------- מודאל ----------
function openModal(id=null) {
  editingEventId = id;

  const dateInput    = document.getElementById("eventDate");
  const titleInput   = document.getElementById("eventTitle");
  const descInput    = document.getElementById("eventDesc");
  const startInput   = document.getElementById("eventStart");
  const endInput     = document.getElementById("eventEnd");
  const typeSelect   = document.getElementById("eventType");
  const catSelect    = document.getElementById("eventCategory");
  const remSelect    = document.getElementById("eventReminder");
  const soundCheck   = document.getElementById("eventSound");
  const doneCheckbox = document.getElementById("eventDone");
  const modalTitle   = document.getElementById("modalTitle");

  if (id) {
    const found = findEventById(id);
    if (found) {
      const ev = found.ev;
      dateInput.value = ev.date;
      titleInput.value = ev.title || "";
      descInput.value = ev.desc || "";
      startInput.value = ev.startTime || "";
      endInput.value = ev.endTime || "";
      typeSelect.value = ev.type || "event";
      catSelect.value = ev.category || "general";
      remSelect.value = ev.reminder || "none";
      soundCheck.checked = !!ev.sound;
      doneCheckbox.checked = !!ev.done;
      modalTitle.textContent = "עריכת אירוע";
    } else {
      dateInput.value = selectedDateKey;
      titleInput.value = "";
      descInput.value = "";
      startInput.value = "";
      endInput.value = "";
      typeSelect.value = "event";
      catSelect.value = "general";
      remSelect.value = "none";
      soundCheck.checked = false;
      doneCheckbox.checked = false;
      modalTitle.textContent = "אירוע חדש";
      editingEventId = null;
    }
  } else {
    dateInput.value = selectedDateKey;
    titleInput.value = "";
    descInput.value = "";
    startInput.value = "";
    endInput.value = "";
    typeSelect.value = "event";
    catSelect.value = "general";
    remSelect.value = "none";
    soundCheck.checked = false;
    doneCheckbox.checked = false;
    modalTitle.textContent = "אירוע חדש";
  }

  document.getElementById("eventModal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("eventModal").classList.add("hidden");
}

function findEventById(id) {
  for (const [key,list] of Object.entries(eventsByDate)) {
    const idx = list.findIndex(e => e.id === id);
    if (idx >= 0) return { key, idx, ev: list[idx] };
  }
  return null;
}

function saveEventFromModal() {
  const dateInputVal = document.getElementById("eventDate").value;
  if (!dateInputVal) {
    alert("בחר תאריך");
    return;
  }
  const title      = document.getElementById("eventTitle").value.trim();
  const desc       = document.getElementById("eventDesc").value.trim();
  const startTime  = document.getElementById("eventStart").value;
  const endTime    = document.getElementById("eventEnd").value;
  const type       = document.getElementById("eventType").value;
  const category   = document.getElementById("eventCategory").value;
  const reminder   = document.getElementById("eventReminder").value;
  const sound      = document.getElementById("eventSound").checked;
  const done       = document.getElementById("eventDone").checked;

  let ev;
  if (editingEventId) {
    const found = findEventById(editingEventId);
    if (found) {
      ev = found.ev;
      ev.title     = title;
      ev.desc      = desc;
      ev.date      = dateInputVal;
      ev.startTime = startTime;
      ev.endTime   = endTime;
      ev.type      = type;
      ev.category  = category;
      ev.reminder  = reminder;
      ev.sound     = sound;
      ev.done      = done;
    } else {
      ev = {
        id: editingEventId,
        title, desc,
        date: dateInputVal,
        startTime, endTime,
        type, category, reminder,
        sound, done
      };
    }
  } else {
    ev = {
      id: null,
      title, desc,
      date: dateInputVal,
      startTime, endTime,
      type, category, reminder,
      sound, done
    };
  }

  upsertEventToDb(ev);
  selectedDateKey = dateInputVal;
  editingEventId = null;
  closeModal();
}

function deleteEvent(id) {
  deleteEventFromDb(id);
}

// ---------- שיתוף ----------
function shareEvent(ev, key) {
  const dateStr = keyToDisplayGreg(key);
  const text = `אירוע: ${ev.title}
תאריך: ${dateStr}
שעה: ${ev.startTime ? ev.startTime.slice(0,5) : ""}
קטגוריה: ${categoryLabel(ev.category)}
${ev.desc || ""}`.trim();

  if (navigator.share) {
    navigator.share({ text }).catch(()=>{});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
    alert("הפרטים הועתקו ללוח – אפשר להדביק בוואטסאפ.");
  } else {
    alert(text);
  }
}

// ---------- חיפוש לפי טקסט ----------
function applySearch(term) {
  term = term.trim().toLowerCase();
  if (!term) {
    renderAll();
    return;
  }

  const sideTitle = document.getElementById("sideDateTitle");
  const listEl    = document.getElementById("eventList");
  const holidayBox= document.getElementById("holidayBox");

  sideTitle.textContent = "תוצאות חיפוש לפי טקסט";
  holidayBox.classList.add("hidden");
  listEl.innerHTML = "";

  const matches = [];
  Object.entries(eventsByDate).forEach(([key,list])=>{
    list.forEach(ev => {
      const hay = (ev.title + " " + (ev.desc||"") + " " + categoryLabel(ev.category)).toLowerCase();
      if (hay.includes(term)) matches.push({ key, ev });
    });
  });

  renderSearchResults(matches);
}

// ---------- חיפוש לפי טווח תאריכים ----------
function searchByRange(from, to) {
  from = from ? from.trim() : "";
  to   = to ? to.trim() : "";
  if (!from && !to) {
    renderAll();
    return;
  }

  const sideTitle = document.getElementById("sideDateTitle");
  const listEl    = document.getElementById("eventList");
  const holidayBox= document.getElementById("holidayBox");

  sideTitle.textContent = "תוצאות חיפוש לפי טווח תאריכים";
  holidayBox.classList.add("hidden");
  listEl.innerHTML = "";

  const matches = [];
  Object.entries(eventsByDate).forEach(([key,list])=>{
    if (from && key < from) return;
    if (to && key > to) return;
    list.forEach(ev => matches.push({ key, ev }));
  });

  renderSearchResults(matches);
}

function renderSearchResults(matches) {
  const listEl = document.getElementById("eventList");
  listEl.innerHTML = "";

  if (matches.length === 0) {
    const empty = document.createElement("div");
    empty.style.opacity = "0.7";
    empty.textContent = "לא נמצאו תוצאות";
    listEl.appendChild(empty);
    return;
  }

  matches.sort((a,b)=>{
    const da = keyToDate(a.key) - keyToDate(b.key);
    if (da !== 0) return da;
    const ta = a.ev.startTime || "";
    const tb = b.ev.startTime || "";
    if (ta < tb) return -1;
    if (ta > tb) return 1;
    return (a.ev.title||"").localeCompare(b.ev.title||"");
  });

  matches.forEach(item=>{
    const ev = item.ev;
    const li = document.createElement("li");
    li.className = "event-item";
    const header = document.createElement("div");
    header.className = "event-header";
    const t = document.createElement("div");
    t.className = "event-title";
    t.textContent = ev.title || "(ללא כותרת)";
    const meta = document.createElement("div");
    meta.className = "event-meta";
    meta.textContent = `${keyToDisplayGreg(item.key)} • ${ev.startTime ? ev.startTime.slice(0,5) : ""} • ${categoryLabel(ev.category)}`;
    header.appendChild(t);
    header.appendChild(meta);
    li.appendChild(header);

    if (ev.desc) {
      const d = document.createElement("div");
      d.className = "event-desc";
      d.textContent = ev.desc;
      li.appendChild(d);
    }

    // לחיצה על תוצאה – מדגישה את היום בלוח
    li.onclick = () => {
      selectedDateKey = item.key;
      renderAll();
      const cell = document.querySelector('.day[data-date-key="' + item.key + '"]');
      if (cell) {
        cell.classList.add('search-highlight');
        cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(()=>cell.classList.remove('search-highlight'), 1200);
      }
    };

    listEl.appendChild(li);
  });
}

// ---------- התראות ----------
function clearScheduledReminders() {
  scheduledTimeouts.forEach(id => clearTimeout(id));
  scheduledTimeouts = [];
}

function scheduleReminders() {
  clearScheduledReminders();
  const now = Date.now();
  const maxAhead = now + 1000 * 60 * 60 * 24 * 2; // עד יומיים קדימה

  Object.entries(eventsByDate).forEach(([key,list])=>{
    list.forEach(ev => {
      if (!ev.startTime) return;
      if (!ev.reminder || ev.reminder === 'none') return;

      const [y,m,d] = key.split('-').map(Number);
      const [hh,mm] = ev.startTime.split(':').map(Number);
      const eventTime = new Date(y, m-1, d, hh, mm).getTime();
      const beforeMs = parseInt(ev.reminder,10) * 60 * 1000;
      const triggerTime = eventTime - beforeMs;
      if (isNaN(triggerTime)) return;
      if (triggerTime <= now || triggerTime > maxAhead) return;

      const delay = triggerTime - now;
      const id = setTimeout(()=>notifyEvent(ev, key), delay);
      scheduledTimeouts.push(id);
    });
  });
}

function notifyEvent(ev, key) {
  const dateStr = keyToDisplayGreg(key);
  const baseText = `תזכורת לאירוע: ${ev.title || '(ללא כותרת)'}\n${dateStr} ${ev.startTime ? ev.startTime.slice(0,5) : ''}`;

  if (ev.sound) {
    const audio = document.getElementById('bnappBeep');
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(()=>{});
    }
  }

  if (window.Notification && Notification.permission === 'granted') {
    new Notification('BNAPP – תזכורת', { body: baseText });
  } else if (window.Notification && Notification.permission !== 'denied') {
    Notification.requestPermission().then(res => {
      if (res === 'granted') {
        new Notification('BNAPP – תזכורת', { body: baseText });
      } else {
        alert(baseText);
      }
    });
  } else {
    alert(baseText);
  }
}

// ---------- INIT ראשי ----------
function initBNAPP() {
  loadTheme();
  renderWeekdayRow();
  initFirebase();
  attachDbListener();
  loadShabbatTimes();

  document.getElementById("prevMonthBtn").onclick = () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderAll();
  };
  document.getElementById("nextMonthBtn").onclick = () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderAll();
  };
  document.getElementById("todayBtn").onclick = () => {
    currentDate = new Date();
    currentMonth = currentDate.getMonth();
    currentYear = currentDate.getFullYear();
    selectedDateKey = dateToKey(currentYear, currentMonth, currentDate.getDate());
    renderAll();
  };

  document.getElementById("addEventBtn").onclick     = () => openModal();
  document.getElementById("saveEventBtn").onclick    = saveEventFromModal;
  document.getElementById("cancelEventBtn").onclick  = () => { editingEventId = null; closeModal(); };

  document.getElementById("darkToggle").onclick = toggleTheme;

  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", ()=>applySearch(searchInput.value));

  const rangeBtn = document.getElementById("rangeSearchBtn");
  rangeBtn.addEventListener("click", ()=>{
    const from = document.getElementById("rangeFrom").value;
    const to   = document.getElementById("rangeTo").value;
    searchByRange(from, to);
  });
}

document.addEventListener("DOMContentLoaded", initBNAPP);
