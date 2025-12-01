// ============================
//  BNAPP Premium Calendar
//  - גרסה פרימיום עם:
//    • ניווט חודשים
//    • עברי/לועזי (תוויות)
//    • אירועים + משימות
//    • סימון היום
//    • צבע רקע משתנה
//    • לוקאל סטורג' + Firebase (אם מוגדר)
// ============================

// -------- צבע רקע משתנה ועדין ----------
const pastelThemes = [
  ['#eef2ff', '#fdf2ff'],
  ['#ecfeff', '#fefce8'],
  ['#f5f3ff', '#e0f2fe'],
  ['#fef2f2', '#eff6ff'],
  ['#fdf2ff', '#f0f9ff'],
];

(function setRandomBackground() {
  const [c1, c2] = pastelThemes[Math.floor(Math.random() * pastelThemes.length)];
  document.body.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
})();

// -------- תאריכים בסיסיים ----------
let currentDate = new Date();
let currentMonth = currentDate.getMonth(); // 0-11
let currentYear = currentDate.getFullYear();
let selectedDateKey = dateToKey(currentYear, currentMonth, currentDate.getDate());

// Hebrew-like month names (תצוגה בלבד)
const monthNames = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const hebrewMonthNames = ['טבת','שבט','אדר','ניסן','אייר','סיוון','תמוז','אב','אלול','תשרי','חשוון','כסלו']; // לא חישוב אמיתי, רק תצוגה רוטציונית

const weekdayNames = ['א','ב','ג','ד','ה','ו','ש'];

// -------- Firebase / Local storage ----------
let db = null;
let firebaseEnabled = false;

// קונפיג ריק כבר בפנים כדי שלא תצטרך לגעת בכלום כדי שיעבוד לוקאלי.
// מי שרוצה סינכרון בין מכשירים – פשוט מחליף ערכים פה ב-Firebase config.
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

try {
  if (firebaseConfig.apiKey && firebaseConfig.databaseURL) {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    firebaseEnabled = true;
    console.log('Firebase enabled (BNAPP).');
  } else {
    console.log('BNAPP: Firebase לא מוגדר – נשמר רק במכשיר (localStorage).');
  }
} catch (e) {
  console.warn('BNAPP: Firebase init failed, fallback to local only.', e);
  firebaseEnabled = false;
}

// מבנה הנתונים: { [dateKey]: [ {id, title, desc, type, done} ] }
let events = {};
let modalEditingId = null;

// -------- עזרה במפתחות תאריך ----------
function dateToKey(year, monthIndex, day) {
  const m = (monthIndex + 1).toString().padStart(2, '0');
  const d = day.toString().padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function keyToDisplay(key) {
  const [y, m, d] = key.split('-');
  return `${Number(d)}/${Number(m)}/${y}`;
}

// -------- טעינת נתונים --------
function loadFromLocal() {
  try {
    const raw = localStorage.getItem('bnapp_events');
    events = raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('BNAPP: failed to load local events', e);
    events = {};
  }
}

function saveToLocal() {
  try {
    localStorage.setItem('bnapp_events', JSON.stringify(events));
  } catch (e) {
    console.warn('BNAPP: failed to save local events', e);
  }
}

function syncFromFirebase() {
  if (!firebaseEnabled || !db) return;
  db.ref('events').on('value', snap => {
    const data = snap.val() || {};
    events = data;
    saveToLocal();
    renderCalendar();
    renderSidePanel(selectedDateKey);
  });
}

function syncToFirebase() {
  if (!firebaseEnabled || !db) return;
  db.ref('events').set(events);
}

// -------- רנדר לוח שנה ----------
function renderWeekdayRow() {
  const row = document.getElementById('weekdayRow');
  row.innerHTML = '';
  weekdayNames.forEach(name => {
    const div = document.createElement('div');
    div.className = 'weekday';
    div.textContent = name;
    row.appendChild(div);
  });
}

function renderCalendar() {
  const cal = document.getElementById('calendar');
  const monthLabel = document.getElementById('monthLabel');
  const hebrewLabel = document.getElementById('hebrewLabel');

  cal.innerHTML = '';

  monthLabel.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  // תצוגת "עברי" משוערת – רק שם חודש מסתובב, לא תאריך אמיתי
  hebrewLabel.textContent = `≈ ${hebrewMonthNames[(currentMonth + 9) % 12]} (תצוגה)`;

  const firstDay = new Date(currentYear, currentMonth, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // נעשה התאמה כך ש-0=שבת
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // תאים ריקים לפני היום הראשון
  for (let i = 0; i < startWeekday; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'day inactive';
    cal.appendChild(emptyCell);
  }

  const todayKey = dateToKey(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

  for (let day = 1; day <= daysInMonth; day++) {
    const dayKey = dateToKey(currentYear, currentMonth, day);
    const dayEvents = events[dayKey] || [];

    const cell = document.createElement('div');
    cell.className = 'day';

    if (dayKey === todayKey) {
      cell.classList.add('today');
    }
    if (dayKey === selectedDateKey) {
      cell.style.background = 'rgba(219,234,254,0.8)';
    }

    const header = document.createElement('div');
    header.className = 'day-header';
    const num = document.createElement('div');
    num.className = 'day-number';
    num.textContent = day;

    header.appendChild(num);

    if (dayEvents.length > 0) {
      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.textContent = dayEvents.length;
      header.appendChild(badge);
    }

    const dots = document.createElement('div');
    dots.className = 'event-dots';
    dayEvents.slice(0, 3).forEach(ev => {
      const dot = document.createElement('div');
      dot.className = 'dot' + (ev.type === 'task' ? ' task' : '');
      dots.appendChild(dot);
    });

    cell.appendChild(header);
    cell.appendChild(dots);

    cell.onclick = () => {
      selectedDateKey = dayKey;
      renderCalendar();
      renderSidePanel(dayKey);
    };

    cal.appendChild(cell);
  }
}

// -------- פאנל צד לאירועים ----------
function renderSidePanel(dateKey) {
  const titleEl = document.getElementById('sideDateTitle');
  const listEl = document.getElementById('eventList');

  if (!dateKey) {
    titleEl.textContent = 'בחר יום';
    listEl.innerHTML = '';
    return;
  }

  titleEl.textContent = keyToDisplay(dateKey);

  const list = events[dateKey] || [];
  listEl.innerHTML = '';

  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.textContent = 'אין אירועים ליום זה';
    empty.style.opacity = '0.7';
    empty.style.fontSize = '0.85rem';
    listEl.appendChild(empty);
    return;
  }

  list.forEach(ev => {
    const li = document.createElement('li');
    li.className = 'event-item';

    const header = document.createElement('div');
    header.className = 'event-header';

    const t = document.createElement('div');
    t.className = 'event-title';
    t.textContent = ev.title || '(ללא כותרת)';

    const type = document.createElement('div');
    type.className = 'event-type';
    if (ev.type === 'task') type.classList.add('task');
    if (ev.done) type.classList.add('done');
    type.textContent = ev.type === 'task' ? (ev.done ? 'משימה (בוצע)' : 'משימה') : 'אירוע';

    header.appendChild(t);
    header.appendChild(type);

    const desc = document.createElement('div');
    desc.className = 'event-desc';
    desc.textContent = ev.desc || '';

    const actions = document.createElement('div');
    actions.className = 'event-actions';

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = ev.done ? 'סמן כלא בוצע' : 'סמן כבוצע';
    toggleBtn.onclick = () => {
      ev.done = !ev.done;
      saveAll();
    };

    const editBtn = document.createElement('button');
    editBtn.textContent = 'ערוך';
    editBtn.onclick = () => {
      openModal(ev.id);
    };

    const delBtn = document.createElement('button');
    delBtn.textContent = 'מחק';
    delBtn.classList.add('danger');
    delBtn.onclick = () => {
      deleteEvent(ev.id);
    };

    actions.appendChild(toggleBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(header);
    if (ev.desc) li.appendChild(desc);
    li.appendChild(actions);

    listEl.appendChild(li);
  });
}

// -------- מודאל אירוע ----------
function openModal(eventId = null) {
  const modal = document.getElementById('eventModal');
  const titleInput = document.getElementById('eventTitle');
  const descInput = document.getElementById('eventDesc');
  const typeSelect = document.getElementById('eventType');
  const doneCheckbox = document.getElementById('eventDone');
  const modalTitle = document.getElementById('modalTitle');

  modalEditingId = eventId;

  if (eventId) {
    const list = events[selectedDateKey] || [];
    const ev = list.find(e => e.id === eventId);
    if (ev) {
      titleInput.value = ev.title || '';
      descInput.value = ev.desc || '';
      typeSelect.value = ev.type || 'event';
      doneCheckbox.checked = !!ev.done;
      modalTitle.textContent = 'עריכת אירוע';
    }
  } else {
    titleInput.value = '';
    descInput.value = '';
    typeSelect.value = 'event';
    doneCheckbox.checked = false;
    modalTitle.textContent = 'אירוע חדש';
  }

  modal.classList.remove('hidden');
}

function closeModal() {
  const modal = document.getElementById('eventModal');
  modal.classList.add('hidden');
}

function saveEvent() {
  if (!selectedDateKey) {
    alert('בחר קודם יום בלוח');
    return;
  }
  const title = document.getElementById('eventTitle').value.trim();
  const desc = document.getElementById('eventDesc').value.trim();
  const type = document.getElementById('eventType').value;
  const done = document.getElementById('eventDone').checked;

  if (!events[selectedDateKey]) events[selectedDateKey] = [];

  if (modalEditingId) {
    const idx = events[selectedDateKey].findIndex(e => e.id === modalEditingId);
    if (idx >= 0) {
      events[selectedDateKey][idx] = {
        ...events[selectedDateKey][idx],
        title,
        desc,
        type,
        done,
      };
    }
  } else {
    const id = 'ev_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    events[selectedDateKey].push({ id, title, desc, type, done });
  }

  saveAll();
  closeModal();
}

function deleteEvent(eventId) {
  if (!selectedDateKey) return;
  const list = events[selectedDateKey] || [];
  const idx = list.findIndex(e => e.id === eventId);
  if (idx >= 0) {
    list.splice(idx, 1);
    if (list.length === 0) {
      delete events[selectedDateKey];
    }
    saveAll();
  }
}

function saveAll() {
  saveToLocal();
  syncToFirebase();
  renderCalendar();
  renderSidePanel(selectedDateKey);
}

// -------- ניווט חודשים ----------
function prevMonth() {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
  renderSidePanel(selectedDateKey);
}

function nextMonth() {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
  renderSidePanel(selectedDateKey);
}

// -------- אתחול ----------
function initBNAPP() {
  renderWeekdayRow();
  loadFromLocal();
  if (firebaseEnabled) {
    syncFromFirebase();
  } else {
    renderCalendar();
    renderSidePanel(selectedDateKey);
  }
}

document.addEventListener('DOMContentLoaded', initBNAPP);
