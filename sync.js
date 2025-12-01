// sync.js – Firebase + אירועים + חיפוש

// קונפיג Firebase – לפי הפרויקט שלך
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

// סנכרון אוטומטי – אין groupCode מהמשתמש
const GROUP_CODE = "bnapp_global";

let app, db, eventsRef;
let editingEventId = null;

// ---------- Firebase ----------
function initFirebase() {
  if (!firebase.apps.length) {
    app = firebase.initializeApp(firebaseConfig);
  } else {
    app = firebase.app();
  }
  db = firebase.database();
}

function attachDbListener() {
  if (!db) initFirebase();
  if (eventsRef) eventsRef.off();

  loadEventsFromLocal();
  renderAll();

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
  });
}

function upsertEventToDb(ev) {
  if (!db) initFirebase();
  const refBase = db.ref("groups/" + GROUP_CODE + "/events");
  if (!ev.id) {
    const newRef = refBase.push();
    ev.id = newRef.key;
    newRef.set(ev);
  } else {
    refBase.child(ev.id).set(ev);
  }
}

function deleteEventFromDb(id) {
  if (!db) initFirebase();
  const refBase = db.ref("groups/" + GROUP_CODE + "/events");
  refBase.child(id).remove();
}

// local cache
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

// ---------- מודאל אירוע ----------
function openModal(id=null) {
  editingEventId = id;

  const dateInput   = document.getElementById("eventDate");
  const titleInput  = document.getElementById("eventTitle");
  const descInput   = document.getElementById("eventDesc");
  const startInput  = document.getElementById("eventStart");
  const endInput    = document.getElementById("eventEnd");
  const typeSelect  = document.getElementById("eventType");
  const catSelect   = document.getElementById("eventCategory");
  const remSelect   = document.getElementById("eventReminder");
  const doneCheckbox= document.getElementById("eventDone");
  const modalTitle  = document.getElementById("modalTitle");

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
      doneCheckbox.checked = !!ev.done;
      modalTitle.textContent = "עריכת אירוע";
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
      ev.done      = done;
    }
  } else {
    ev = {
      id: null,
      title, desc,
      date: dateInputVal,
      startTime, endTime,
      type, category, reminder,
      done
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

// ---------- חיפוש ----------
function applySearch(term) {
  term = term.trim().toLowerCase();
  if (!term) {
    renderAll();
    return;
  }

  const sideTitle = document.getElementById("sideDateTitle");
  const listEl    = document.getElementById("eventList");
  const holidayBox= document.getElementById("holidayBox");

  sideTitle.textContent = "תוצאות חיפוש";
  holidayBox.classList.add("hidden");
  listEl.innerHTML = "";

  const matches = [];
  Object.entries(eventsByDate).forEach(([key,list])=>{
    list.forEach(ev => {
      const hay = (ev.title + " " + (ev.desc||"") + " " + categoryLabel(ev.category)).toLowerCase();
      if (hay.includes(term)) matches.push({ key, ev });
    });
  });

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
    meta.textContent = `${keyToDisplayGreg(item.key)} • ${ev.startTime ? ev.startTime.slice(0,5) : ""}`;
    header.appendChild(t);
    header.appendChild(meta);
    li.appendChild(header);
    listEl.appendChild(li);
  });
}

// ---------- Init ראשי ----------
function initBNAPP() {
  loadTheme();
  renderWeekdayRow();
  initFirebase();
  attachDbListener();

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

  document.getElementById("addEventBtn").onclick     = () => openModal();
  document.getElementById("saveEventBtn").onclick    = saveEventFromModal;
  document.getElementById("cancelEventBtn").onclick  = () => { editingEventId = null; closeModal(); };

  document.getElementById("darkToggle").onclick = toggleTheme;

  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", ()=>applySearch(searchInput.value));
}

document.addEventListener("DOMContentLoaded", initBNAPP);
