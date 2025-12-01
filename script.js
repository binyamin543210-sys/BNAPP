// BNAPP ULTRA – קובץ אחד גדול
// לוח שנה עברי/לועזי עם חגים + סנכרון Realtime Database לפי groupCode

// ---------- קונפיג Firebase (שלך) ----------
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

let app, db, eventsRef;

// ---------- בסיס ----------
const monthNamesGreg = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const weekdayNamesHeb = ['א','ב','ג','ד','ה','ו','ש']; // ראשון–שבת

let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let selectedDateKey = dateToKey(currentYear, currentMonth, currentDate.getDate());

let eventsByDate = {}; // { [dateKey]: [event,...] } – נבנה מתוך Firebase
let currentGroupCode = 'default';

let hebrewFormatter;

// רקעים רנדומליים
const pastelGradients = [
  ['#eef2ff','#fdf2ff'],
  ['#ecfeff','#fef3c7'],
  ['#f5f3ff','#e0f2fe'],
  ['#fdf2f2','#eff6ff'],
  ['#fdf2ff','#f0f9ff']
];

(function setRandomBackground() {
  const pair = pastelGradients[Math.floor(Math.random()*pastelGradients.length)];
  document.body.style.background = `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`;
})();

// ---------- עזרי תאריכים ----------
function dateToKey(year, monthIndex, day) {
  const m = String(monthIndex+1).padStart(2,'0');
  const d = String(day).padStart(2,'0');
  return `${year}-${m}-${d}`;
}

function keyToDate(key) {
  const [y,m,d] = key.split('-').map(Number);
  return new Date(y, m-1, d);
}

function keyToDisplayGreg(key) {
  const [y,m,d] = key.split('-');
  return `${Number(d)}/${Number(m)}/${y}`;
}

// ---------- תאריכים עבריים + חגים ----------

const hebrewHolidayMap = [
  { m: 'תשרי', d: 1,  name: 'ראש השנה', type: 'hebrew' },
  { m: 'תשרי', d: 2,  name: 'ראש השנה (יום ב׳)', type: 'hebrew' },
  { m: 'תשרי', d: 10, name: 'יום כיפור', type: 'hebrew' },
  { m: 'תשרי', d: 15, name: 'סוכות', type: 'hebrew' },
  { m: 'תשרי', d: 16, name: 'חוה״מ סוכות', type: 'hebrew' },
  { m: 'תשרי', d: 21, name: 'הושענא רבה', type: 'hebrew' },
  { m: 'תשרי', d: 22, name: 'שמחת תורה / שמיני עצרת', type: 'hebrew' },

  { m: 'כסלו', d: 25, name: 'חנוכה', type: 'hebrew' },
  { m: 'טבת', d: 1,  name: 'חנוכה', type: 'hebrew' },

  { m: 'שבט', d: 15, name: 'ט״ו בשבט', type: 'hebrew' },

  { m: 'אדר', d: 14, name: 'פורים', type: 'hebrew' },
  { m: 'אדר', d: 15, name: 'שושן פורים', type: 'hebrew' },

  { m: 'ניסן', d: 14, name: 'ערב פסח', type: 'hebrew' },
  { m: 'ניסן', d: 15, name: 'פסח', type: 'hebrew' },
  { m: 'ניסן', d: 16, name: 'חוה״מ פסח', type: 'hebrew' },
  { m: 'ניסן', d: 21, name: 'שביעי של פסח', type: 'hebrew' },

  { m: 'אייר', d: 18, name: 'ל״ג בעומר', type: 'hebrew' },
  { m: 'סיוון', d: 6, name: 'שבועות', type: 'hebrew' },

  { m: 'אב', d: 9,  name: 'תשעה באב', type: 'fast' },

  { m: 'תמוז', d: 17, name: 'צום י״ז בתמוז', type: 'fast' },
  { m: 'תשרי', d: 3,  name: 'צום גדליה', type: 'fast' },
  { m: 'טבת', d: 10, name: 'צום י׳ בטבת', type: 'fast' },
  { m: 'אדר', d: 13, name: 'תענית אסתר', type: 'fast' }
];

const israeliDays = [
  { m: 'ניסן', d: 27, name: 'יום הזיכרון לשואה ולגבורה', type: 'israeli' },
  { m: 'אייר', d: 4,  name: 'יום הזיכרון לחללי צה״ל', type: 'israeli' },
  { m: 'אייר', d: 5,  name: 'יום העצמאות', type: 'israeli' },
  { m: 'אייר', d: 28, name: 'יום ירושלים', type: 'israeli' }
];

const foreignHolidaysGreg = [
  { m: 1, d: 1,  name: 'New Year', type: 'foreign' },
  { m: 12, d: 25, name: 'Christmas', type: 'foreign' },
  { m: 10, d: 31, name: 'Halloween', type: 'foreign' }
];

function normalizeHebMonthName(name) {
  if (!name) return '';
  return name.replace('חשון','חשוון');
}

function getHebrewParts(date) {
  if (!hebrewFormatter) {
    try {
      hebrewFormatter = new Intl.DateTimeFormat('he-u-ca-hebrew', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      console.warn('Hebrew calendar not supported in this browser');
      return null;
    }
  }
  const parts = hebrewFormatter.formatToParts(date);
  const obj = {};
  parts.forEach(p => {
    if (p.type === 'day') obj.day = Number(p.value);
    if (p.type === 'month') obj.monthName = normalizeHebMonthName(p.value.trim());
    if (p.type === 'year') obj.year = p.value;
  });
  return obj.day ? obj : null;
}

function getHebrewHolidayInfo(date) {
  const h = getHebrewParts(date);
  const info = {
    hebrewDay: null,
    hebrewMonth: null,
    hebrewYear: null,
    holidays: [],
    isRoshChodesh: false,
    isShabbatEve: false,
    isShabbat: false,
    isIsraeli: [],
    foreignHolidays: []
  };
  if (!h) return info;

  info.hebrewDay = h.day;
  info.hebrewMonth = h.monthName;
  info.hebrewYear = h.year;

  hebrewHolidayMap.forEach(hg => {
    if (hg.m === h.monthName && hg.d === h.day) {
      info.holidays.push({ name: hg.name, type: hg.type });
    }
  });

  israeliDays.forEach(hg => {
    if (hg.m === h.monthName && hg.d === h.day) {
      info.isIsraeli.push({ name: hg.name, type: 'israeli' });
    }
  });

  if (h.day === 1) info.isRoshChodesh = true;

  const dow = date.getDay();
  if (dow === 5) info.isShabbatEve = true;
  if (dow === 6) info.isShabbat = true;

  const gm = date.getMonth()+1;
  const gd = date.getDate();
  foreignHolidaysGreg.forEach(hg => {
    if (hg.m === gm && hg.d === gd) {
      info.foreignHolidays.push({ name: hg.name, type: 'foreign' });
    }
  });

  return info;
}

// ---------- Theme ----------
function loadTheme() {
  const t = localStorage.getItem('bnapp_theme') || 'light';
  document.body.classList.remove('light','dark');
  document.body.classList.add(t);
}

function toggleTheme() {
  const isDark = document.body.classList.contains('dark');
  const next = isDark ? 'light' : 'dark';
  document.body.classList.remove('light','dark');
  document.body.classList.add(next);
  localStorage.setItem('bnapp_theme', next);
}

// ---------- GroupCode + Firebase ----------
function loadGroupCode() {
  const saved = localStorage.getItem('bnapp_group_code') || 'default';
  currentGroupCode = saved;
  const input = document.getElementById('groupCode');
  if (input) input.value = saved;
}

function setGroupCode(newCode) {
  currentGroupCode = newCode || 'default';
  localStorage.setItem('bnapp_group_code', currentGroupCode);
  attachDbListener();
}

// local cache – רק כדי שלא יהיה ריק אם אין רשת
function loadEventsFromLocal() {
  try {
    const key = 'bnapp_events_cache_' + currentGroupCode;
    const raw = localStorage.getItem(key);
    eventsByDate = raw ? JSON.parse(raw) : {};
  } catch(e) {
    eventsByDate = {};
  }
}

function saveEventsToLocal() {
  try {
    const key = 'bnapp_events_cache_' + currentGroupCode;
    localStorage.setItem(key, JSON.stringify(eventsByDate));
  } catch(e) {}
}

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

  loadEventsFromLocal(); // נטען cache בסיסי
  renderAll();

  eventsRef = db.ref('groups/' + currentGroupCode + '/events');
  eventsRef.on('value', snapshot => {
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
  const refBase = db.ref('groups/' + currentGroupCode + '/events');
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
  const refBase = db.ref('groups/' + currentGroupCode + '/events');
  refBase.child(id).remove();
}

// ---------- תצוגת ימי השבוע ----------
function renderWeekdayRow() {
  const row = document.getElementById('weekdayRow');
  row.innerHTML = '';
  weekdayNamesHeb.forEach(c => {
    const div = document.createElement('div');
    div.className = 'weekday';
    div.textContent = c;
    row.appendChild(div);
  });
}

// ---------- תצוגת חודש ----------
function renderCalendar() {
  const cal = document.getElementById('calendar');
  cal.innerHTML = '';

  const monthLabel = document.getElementById('monthLabel');
  const hebMonthLabel = document.getElementById('hebrewMonthLabel');

  monthLabel.textContent = `${monthNamesGreg[currentMonth]} ${currentYear}`;

  const midMonthDate = new Date(currentYear, currentMonth, 15);
  const hMid = getHebrewParts(midMonthDate);
  if (hMid) {
    hebMonthLabel.textContent = `${hMid.monthName} ${hMid.year}`;
  } else {
    hebMonthLabel.textContent = '';
  }

  const firstDay = new Date(currentYear, currentMonth, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth+1, 0).getDate();

  const todayKey = dateToKey(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

  for (let i=0; i<startWeekday; i++) {
    const empty = document.createElement('div');
    empty.className = 'day inactive';
    cal.appendChild(empty);
  }

  for (let day=1; day<=daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const key = dateToKey(currentYear, currentMonth, day);
    const list = eventsByDate[key] || [];
    const hinfo = getHebrewHolidayInfo(date);

    const cell = document.createElement('div');
    cell.className = 'day';
    if (key === todayKey) cell.classList.add('today');
    if (key === selectedDateKey) cell.classList.add('selected');

    const header = document.createElement('div');
    header.className = 'day-header';

    const gregSpan = document.createElement('span');
    gregSpan.className = 'day-number';
    gregSpan.textContent = day;

    const hebSpan = document.createElement('span');
    hebSpan.className = 'hebrew-number';
    if (hinfo.hebrewDay && hinfo.hebrewMonth) {
      hebSpan.textContent = `${toHebrewNum(hinfo.hebrewDay)} ${hinfo.hebrewMonth}`;
    }

    header.appendChild(gregSpan);
    header.appendChild(hebSpan);

    const dots = document.createElement('div');
    dots.className = 'event-dots';

    if (hinfo.isShabbatEve) {
      const dot = document.createElement('div');
      dot.className = 'dot dot-shabbat-eve';
      dots.appendChild(dot);
    }
    if (hinfo.isShabbat) {
      const dot = document.createElement('div');
      dot.className = 'dot dot-shabbat';
      dots.appendChild(dot);
    }
    if (hinfo.isRoshChodesh) {
      const dot = document.createElement('div');
      dot.className = 'dot dot-rosh-chodesh';
      dots.appendChild(dot);
    }
    hinfo.holidays.forEach(() => {
      const dot = document.createElement('div');
      dot.className = 'dot dot-holy-hebrew';
      dots.appendChild(dot);
    });
    hinfo.isIsraeli.forEach(() => {
      const dot = document.createElement('div');
      dot.className = 'dot dot-israeli';
      dots.appendChild(dot);
    });
    hinfo.foreignHolidays.forEach(() => {
      const dot = document.createElement('div');
      dot.className = 'dot dot-holy-foreign';
      dots.appendChild(dot);
    });

    list.slice(0,4).forEach(ev => {
      const dot = document.createElement('div');
      dot.classList.add('dot');
      if (ev.type === 'task') dot.classList.add('dot-task');
      else dot.classList.add('dot-user');
      dots.appendChild(dot);
    });

    cell.appendChild(header);
    cell.appendChild(dots);

    cell.onclick = () => {
      selectedDateKey = key;
      renderAll();
    };

    cal.appendChild(cell);
  }
}

function toHebrewNum(n) {
  const letters = [
    '','א','ב','ג','ד','ה','ו','ז','ח','ט',
    'י','יא','יב','יג','יד','טו','טז','יז','יח','יט',
    'כ','כא','כב','כג','כד','כה','כו','כז','כח','כט',
    'ל'
  ];
  if (n >= 1 && n < letters.length) {
    let s = letters[n];
    if (s.length === 1) return s + '׳';
    if (s.length === 2) return s[0] + '״' + s[1];
    return s;
  }
  return String(n);
}

// ---------- Side panel ----------
function renderSidePanel() {
  const titleEl = document.getElementById('sideDateTitle');
  const eventListEl = document.getElementById('eventList');
  const holidayBox = document.getElementById('holidayBox');

  if (!selectedDateKey) {
    titleEl.textContent = 'בחר יום';
    eventListEl.innerHTML = '';
    holidayBox.classList.add('hidden');
    return;
  }

  const date = keyToDate(selectedDateKey);
  const hinfo = getHebrewHolidayInfo(date);

  let header = keyToDisplayGreg(selectedDateKey);
  if (hinfo.hebrewDay && hinfo.hebrewMonth) {
    header += ' • ' + toHebrewNum(hinfo.hebrewDay) + ' ' + hinfo.hebrewMonth;
  }
  titleEl.textContent = header;

  const holidayLines = [];
  if (hinfo.isShabbatEve) holidayLines.push('ערב שבת (כניסת שבת – תל אביב)');
  if (hinfo.isShabbat) holidayLines.push('שבת קודש (יציאת שבת – תל אביב)');
  if (hinfo.isRoshChodesh) holidayLines.push('ראש חודש ' + (hinfo.hebrewMonth || ''));
  hinfo.holidays.forEach(hg => holidayLines.push(hg.name));
  hinfo.isIsraeli.forEach(hg => holidayLines.push(hg.name));
  hinfo.foreignHolidays.forEach(hg => holidayLines.push(hg.name));

  if (holidayLines.length > 0) {
    holidayBox.classList.remove('hidden');
    holidayBox.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'holiday-title';
    title.textContent = 'חגים וימים מיוחדים:';
    holidayBox.appendChild(title);
    holidayLines.forEach(line => {
      const d = document.createElement('div');
      d.className = 'holiday-detail';
      d.textContent = '• ' + line;
      holidayBox.appendChild(d);
    });
  } else {
    holidayBox.classList.add('hidden');
  }

  const list = (eventsByDate[selectedDateKey] || []).slice().sort((a,b)=>{
    const ta = a.startTime || '';
    const tb = b.startTime || '';
    if (ta < tb) return -1;
    if (ta > tb) return 1;
    return (a.title||'').localeCompare(b.title||'');
  });

  eventListEl.innerHTML = '';
  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.style.opacity = '0.7';
    empty.style.fontSize = '0.85rem';
    empty.textContent = 'אין אירועים ליום זה';
    eventListEl.appendChild(empty);
    return;
  }

  list.forEach(ev => {
    const li = document.createElement('li');
    li.className = 'event-item';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'event-header';

    const t = document.createElement('div');
    t.className = 'event-title';
    t.textContent = ev.title || '(ללא כותרת)';

    const meta = document.createElement('div');
    meta.className = 'event-meta';
    const parts = [];
    if (ev.startTime) parts.push(ev.startTime.slice(0,5));
    parts.push(categoryLabel(ev.category));
    meta.textContent = parts.join(' • ');

    headerDiv.appendChild(t);
    headerDiv.appendChild(meta);

    const tags = document.createElement('div');
    tags.className = 'event-tags';

    const typeTag = document.createElement('span');
    typeTag.className = 'tag ' + (ev.type === 'task' ? 'tag-task' : '');
    typeTag.textContent = ev.type === 'task' ? 'משימה' : 'אירוע';
    tags.appendChild(typeTag);

    if (ev.done) {
      const doneTag = document.createElement('span');
      doneTag.className = 'tag tag-done';
      doneTag.textContent = 'בוצע';
      tags.appendChild(doneTag);
    }

    const catTag = document.createElement('span');
    catTag.className = 'tag tag-' + (ev.category || 'general');
    catTag.textContent = categoryLabel(ev.category);
    tags.appendChild(catTag);

    const desc = document.createElement('div');
    desc.className = 'event-desc';
    desc.textContent = ev.desc || '';

    const actions = document.createElement('div');
    actions.className = 'event-actions';

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = ev.done ? 'סמן כלא בוצע' : 'סמן כבוצע';
    toggleBtn.onclick = () => {
      ev.done = !ev.done;
      upsertEventToDb(ev);
    };

    const editBtn = document.createElement('button');
    editBtn.textContent = 'ערוך';
    editBtn.onclick = () => openModal(ev.id);

    const delBtn = document.createElement('button');
    delBtn.textContent = 'מחק';
    delBtn.classList.add('danger');
    delBtn.onclick = () => deleteEvent(ev.id);

    const shareBtn = document.createElement('button');
    shareBtn.textContent = 'שתף';
    shareBtn.onclick = () => shareEvent(ev, selectedDateKey);

    actions.appendChild(toggleBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    actions.appendChild(shareBtn);

    li.appendChild(headerDiv);
    li.appendChild(tags);
    if (ev.desc) li.appendChild(desc);
    li.appendChild(actions);

    eventListEl.appendChild(li);
  });
}

function categoryLabel(cat) {
  switch(cat) {
    case 'family': return 'משפחה';
    case 'work': return 'עבודה';
    case 'health': return 'בריאות';
    case 'holy': return 'קדושה/שבת';
    default: return 'כללי';
  }
}

// ---------- מודאל אירוע ----------
let editingEventId = null;

function openModal(id=null) {
  editingEventId = id;

  const dateInput = document.getElementById('eventDate');
  const titleInput = document.getElementById('eventTitle');
  const descInput = document.getElementById('eventDesc');
  const startInput = document.getElementById('eventStart');
  const endInput = document.getElementById('eventEnd');
  const typeSelect = document.getElementById('eventType');
  const catSelect = document.getElementById('eventCategory');
  const remSelect = document.getElementById('eventReminder');
  const doneCheckbox = document.getElementById('eventDone');
  const modalTitle = document.getElementById('modalTitle');

  if (id) {
    const found = findEventById(id);
    if (found) {
      const ev = found.ev;
      dateInput.value = ev.date;
      titleInput.value = ev.title || '';
      descInput.value = ev.desc || '';
      startInput.value = ev.startTime || '';
      endInput.value = ev.endTime || '';
      typeSelect.value = ev.type || 'event';
      catSelect.value = ev.category || 'general';
      remSelect.value = ev.reminder || 'none';
      doneCheckbox.checked = !!ev.done;
      modalTitle.textContent = 'עריכת אירוע';
    }
  } else {
    dateInput.value = selectedDateKey;
    titleInput.value = '';
    descInput.value = '';
    startInput.value = '';
    endInput.value = '';
    typeSelect.value = 'event';
    catSelect.value = 'general';
    remSelect.value = 'none';
    doneCheckbox.checked = false;
    modalTitle.textContent = 'אירוע חדש';
  }

  document.getElementById('eventModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('eventModal').classList.add('hidden');
}

function findEventById(id) {
  for (const [key,list] of Object.entries(eventsByDate)) {
    const idx = list.findIndex(e => e.id === id);
    if (idx >= 0) return { key, idx, ev: list[idx] };
  }
  return null;
}

function saveEventFromModal() {
  const dateInput = document.getElementById('eventDate').value;
  if (!dateInput) {
    alert('בחר תאריך');
    return;
  }

  const title = document.getElementById('eventTitle').value.trim();
  const desc = document.getElementById('eventDesc').value.trim();
  const startTime = document.getElementById('eventStart').value;
  const endTime = document.getElementById('eventEnd').value;
  const type = document.getElementById('eventType').value;
  const category = document.getElementById('eventCategory').value;
  const reminder = document.getElementById('eventReminder').value;
  const done = document.getElementById('eventDone').checked;

  let ev;
  if (editingEventId) {
    const found = findEventById(editingEventId);
    if (found) {
      ev = found.ev;
      ev.title = title;
      ev.desc = desc;
      ev.date = dateInput;
      ev.startTime = startTime;
      ev.endTime = endTime;
      ev.type = type;
      ev.category = category;
      ev.reminder = reminder;
      ev.done = done;
    }
  } else {
    ev = {
      id: null,
      title, desc,
      date: dateInput,
      startTime, endTime,
      type, category, reminder,
      done
    };
  }

  upsertEventToDb(ev);
  selectedDateKey = dateInput;
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
שעה: ${ev.startTime ? ev.startTime.slice(0,5) : ''}
קטגוריה: ${categoryLabel(ev.category)}
${ev.desc || ''}`.trim();

  if (navigator.share) {
    navigator.share({ text }).catch(()=>{});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
    alert('הפרטים הועתקו ללוח – אפשר להדביק בוואטסאפ.');
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
  const sideTitle = document.getElementById('sideDateTitle');
  const listEl = document.getElementById('eventList');
  const holidayBox = document.getElementById('holidayBox');

  sideTitle.textContent = 'תוצאות חיפוש';
  holidayBox.classList.add('hidden');
  listEl.innerHTML = '';

  const matches = [];
  Object.entries(eventsByDate).forEach(([key,list])=>{
    list.forEach(ev => {
      const hay = (ev.title + ' ' + (ev.desc||'') + ' ' + categoryLabel(ev.category)).toLowerCase();
      if (hay.includes(term)) matches.push({ key, ev });
    });
  });

  if (matches.length === 0) {
    const empty = document.createElement('div');
    empty.style.opacity = '0.7';
    empty.textContent = 'לא נמצאו תוצאות';
    listEl.appendChild(empty);
    return;
  }

  matches.sort((a,b)=>{
    const da = keyToDate(a.key) - keyToDate(b.key);
    if (da !== 0) return da;
    const ta = a.ev.startTime || '';
    const tb = b.ev.startTime || '';
    if (ta < tb) return -1;
    if (ta > tb) return 1;
    return (a.ev.title||'').localeCompare(b.ev.title||'');
  });

  matches.forEach(item=>{
    const ev = item.ev;
    const li = document.createElement('li');
    li.className = 'event-item';
    const header = document.createElement('div');
    header.className = 'event-header';
    const t = document.createElement('div');
    t.className = 'event-title';
    t.textContent = ev.title || '(ללא כותרת)';
    const meta = document.createElement('div');
    meta.className = 'event-meta';
    meta.textContent = `${keyToDisplayGreg(item.key)} • ${ev.startTime ? ev.startTime.slice(0,5) : ''}`;
    header.appendChild(t);
    header.appendChild(meta);
    li.appendChild(header);
    listEl.appendChild(li);
  });
}

// ---------- Save + Render ----------
function renderAll() {
  renderCalendar();
  renderSidePanel();
}

// ---------- Init ----------
function initBNAPP() {
  loadTheme();
  loadGroupCode();
  renderWeekdayRow();
  initFirebase();
  attachDbListener();

  document.getElementById('prevMonthBtn').onclick = () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderAll();
  };
  document.getElementById('nextMonthBtn').onclick = () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderAll();
  };

  document.getElementById('groupApplyBtn').onclick = () => {
    const code = document.getElementById('groupCode').value.trim();
    setGroupCode(code);
  };

  document.getElementById('addEventBtn').onclick = () => openModal();
  document.getElementById('saveEventBtn').onclick = saveEventFromModal;
  document.getElementById('cancelEventBtn').onclick = () => { editingEventId = null; closeModal(); };

  document.getElementById('darkToggle').onclick = toggleTheme;

  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', ()=>applySearch(searchInput.value));
}

document.addEventListener('DOMContentLoaded', initBNAPP);
