// BNAPP PRO+ – לוח שנה מתקדם
// כולל:
// • חודש/שבוע/רשימה
// • עברי/לועזי (תוויות בלבד)
// • אירועים + משימות + קטגוריות וצבעים
// • סטטיסטיקות
// • גיבוי/שחזור
// • localStorage + Firebase (אופציונלי)
// • מצב כהה
// • תזכורות בדפדפן (פשוטות)

// ---------- הגדרות בסיס ----------
const monthNames = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const hebrewMonthNames = ['טבת','שבט','אדר','ניסן','אייר','סיוון','תמוז','אב','אלול','תשרי','חשוון','כסלו']; // קירוב תצוגתי
const weekdayNames = ['א','ב','ג','ד','ה','ו','ש'];

let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let selectedDateKey = dateToKey(currentYear, currentMonth, currentDate.getDate());

let events = {}; // { [dateKey]: [event, ...] }
let firebaseEnabled = false;
let db = null;
let currentView = 'month';
let reminderTimers = {};
let currentGroupCode = 'default';

// ---------- Firebase (אופציונלי) ----------
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

function initFirebaseIfConfigured() {
  try {
    if (firebaseConfig.apiKey && firebaseConfig.databaseURL) {
      firebase.initializeApp(firebaseConfig);
      db = firebase.database();
      firebaseEnabled = true;
      console.log('BNAPP: Firebase enabled.');
    } else {
      console.log('BNAPP: Firebase not configured, working local-only.');
    }
  } catch (e) {
    console.warn('BNAPP: Firebase init failed, continuing local-only.', e);
  }
}

// ---------- עזרי תאריך ----------
function dateToKey(year, monthIndex, day) {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function keyToDisplay(key) {
  const [y,m,d] = key.split('-');
  return `${Number(d)}/${Number(m)}/${y}`;
}

function parseDateKey(key) {
  const [y,m,d] = key.split('-').map(Number);
  return new Date(y, m-1, d);
}

// ---------- localStorage ----------
function loadFromLocal() {
  try {
    const groupKey = 'bnapp_events_' + currentGroupCode;
    const raw = localStorage.getItem(groupKey);
    events = raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('BNAPP: failed to load local events', e);
    events = {};
  }
}

function saveToLocal() {
  try {
    const groupKey = 'bnapp_events_' + currentGroupCode;
    localStorage.setItem(groupKey, JSON.stringify(events));
  } catch (e) {
    console.warn('BNAPP: failed to save local events', e);
  }
}

// ---------- Firebase sync ----------
function getFirebaseRef() {
  if (!firebaseEnabled || !db) return null;
  return db.ref('bnapp_events/' + currentGroupCode);
}

function syncFromFirebase() {
  const ref = getFirebaseRef();
  if (!ref) return;
  ref.off();
  ref.on('value', snap => {
    const data = snap.val() || {};
    events = data;
    saveToLocal();
    renderAll();
  });
}

function syncToFirebase() {
  const ref = getFirebaseRef();
  if (!ref) return;
  ref.set(events);
}

// ---------- סטטיסטיקות ----------
function computeStats() {
  let total = 0, tasks = 0, done = 0;
  Object.values(events).forEach(list => {
    list.forEach(ev => {
      total++;
      if (ev.type === 'task') tasks++;
      if (ev.done) done++;
    });
  });
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statTasks').textContent = tasks;
  document.getElementById('statDone').textContent = done;
}

// ---------- רנדר ימי השבוע ----------
function renderWeekdayRow() {
  const row = document.getElementById('weekdayRow');
  row.innerHTML = '';
  weekdayNames.forEach(w => {
    const div = document.createElement('div');
    div.className = 'weekday';
    div.textContent = w;
    row.appendChild(div);
  });
}

// ---------- לוח חודש ----------
function renderMonth() {
  const cal = document.getElementById('calendar');
  const monthLabel = document.getElementById('monthLabel');
  const hebrewLabel = document.getElementById('hebrewLabel');

  cal.innerHTML = '';
  document.getElementById('weekView').classList.add('hidden');
  document.getElementById('agendaView').classList.add('hidden');
  cal.classList.remove('hidden');

  monthLabel.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  hebrewLabel.textContent = `≈ ${hebrewMonthNames[(currentMonth + 9) % 12]} (תצוגה)`;

  const firstDay = new Date(currentYear, currentMonth, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // התאמה
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const todayKey = dateToKey(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

  for (let i=0; i<startWeekday; i++) {
    const empty = document.createElement('div');
    empty.className = 'day inactive';
    cal.appendChild(empty);
  }

  for (let day=1; day<=daysInMonth; day++) {
    const key = dateToKey(currentYear, currentMonth, day);
    const list = events[key] || [];

    const cell = document.createElement('div');
    cell.className = 'day';
    if (key === todayKey) cell.classList.add('today');
    if (key === selectedDateKey) cell.classList.add('selected');

    const header = document.createElement('div');
    header.className = 'day-header';

    const num = document.createElement('div');
    num.className = 'day-number';
    num.textContent = day;
    header.appendChild(num);

    if (list.length > 0) {
      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.textContent = list.length;
      header.appendChild(badge);
    }

    const dots = document.createElement('div');
    dots.className = 'event-dots';
    list.slice(0,4).forEach(ev => {
      const dot = document.createElement('div');
      dot.classList.add('dot');
      dot.classList.add(ev.type === 'task' ? 'task' : 'event');
      if (ev.category) dot.classList.add(ev.category);
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

// ---------- Week view ----------
function renderWeekView() {
  const wrap = document.getElementById('weekView');
  const cal = document.getElementById('calendar');
  const agenda = document.getElementById('agendaView');
  wrap.innerHTML = '';
  cal.classList.add('hidden');
  agenda.classList.add('hidden');
  wrap.classList.remove('hidden');

  const selectedDate = parseDateKey(selectedDateKey);
  const dayOfWeek = selectedDate.getDay(); // 0=Sunday
  // נייצר שבוע מיום ראשון
  const sunday = new Date(selectedDate);
  sunday.setDate(selectedDate.getDate() - dayOfWeek);

  const container = document.createElement('div');
  container.className = 'week-columns';

  for (let i=0; i<7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const key = dateToKey(d.getFullYear(), d.getMonth(), d.getDate());
    const list = (events[key] || []).slice().sort(byTimeThenTitle);

    const col = document.createElement('div');
    col.className = 'week-day-column';

    const title = document.createElement('div');
    title.className = 'week-day-title';
    title.textContent = `${weekdayNames[(i+1)%7]} • ${d.getDate()}/${d.getMonth()+1}`;
    col.appendChild(title);

    if (list.length === 0) {
      const empty = document.createElement('div');
      empty.style.opacity = '0.6';
      empty.style.fontSize = '0.75rem';
      empty.textContent = 'אין אירועים';
      col.appendChild(empty);
    } else {
      list.forEach(ev => {
        const div = document.createElement('div');
        div.className = 'week-event';
        div.style.borderRight = '3px solid';
        div.style.borderRightColor = categoryColor(ev.category);
        div.textContent = `${formatTime(ev.startTime)} ${ev.title}`;
        col.appendChild(div);
      });
    }

    container.appendChild(col);
  }

  wrap.appendChild(container);
}

// ---------- Agenda view ----------
function renderAgendaView() {
  const agenda = document.getElementById('agendaView');
  const cal = document.getElementById('calendar');
  const week = document.getElementById('weekView');
  agenda.innerHTML = '';
  cal.classList.add('hidden');
  week.classList.add('hidden');
  agenda.classList.remove('hidden');

  const all = [];
  Object.entries(events).forEach(([key, list]) => {
    list.forEach(ev => all.push({ key, ev }));
  });
  all.sort((a,b) => {
    const da = parseDateKey(a.key) - parseDateKey(b.key);
    if (da !== 0) return da;
    return byTimeThenTitle(a.ev, b.ev);
  });

  if (all.length === 0) {
    const empty = document.createElement('div');
    empty.style.opacity = '0.7';
    empty.textContent = 'אין אירועים במערכת';
    agenda.appendChild(empty);
    return;
  }

  let current = null;
  let groupDiv = null;
  all.forEach(item => {
    if (item.key !== current) {
      current = item.key;
      groupDiv = document.createElement('div');
      groupDiv.className = 'agenda-group';

      const title = document.createElement('div');
      title.className = 'agenda-date';
      title.textContent = keyToDisplay(current);
      groupDiv.appendChild(title);

      agenda.appendChild(groupDiv);
    }
    const row = document.createElement('div');
    row.className = 'agenda-item';
    row.style.borderRight = '3px solid ' + categoryColor(item.ev.category);
    row.textContent = `${formatTime(item.ev.startTime)} ${item.ev.title}`;
    groupDiv.appendChild(row);
  });
}

// ---------- Side panel ----------
function renderSidePanel() {
  const titleEl = document.getElementById('sideDateTitle');
  const listEl = document.getElementById('eventList');

  if (!selectedDateKey) {
    titleEl.textContent = 'בחר יום';
    listEl.innerHTML = '';
    return;
  }

  titleEl.textContent = keyToDisplay(selectedDateKey);

  const list = (events[selectedDateKey] || []).slice().sort(byTimeThenTitle);
  listEl.innerHTML = '';

  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.style.opacity = '0.7';
    empty.style.fontSize = '0.85rem';
    empty.textContent = 'אין אירועים ליום זה';
    listEl.appendChild(empty);
    return;
  }

  list.forEach(ev => {
    const li = document.createElement('li');
    li.className = 'event-item';

    const header = document.createElement('div');
    header.className = 'event-header';

    const title = document.createElement('div');
    title.className = 'event-title';
    title.textContent = ev.title || '(ללא כותרת)';

    const meta = document.createElement('div');
    meta.className = 'event-meta';
    meta.textContent = [formatTime(ev.startTime), ev.categoryLabel || categoryLabel(ev.category)]
      .filter(Boolean).join(' • ');

    header.appendChild(title);
    header.appendChild(meta);

    const tags = document.createElement('div');
    tags.className = 'event-tags';

    const typeTag = document.createElement('span');
    typeTag.className = 'tag ' + (ev.type === 'task' ? 'task' : 'event');
    typeTag.textContent = ev.type === 'task' ? 'משימה' : 'אירוע';
    tags.appendChild(typeTag);

    if (ev.done) {
      const doneTag = document.createElement('span');
      doneTag.className = 'tag done';
      doneTag.textContent = 'בוצע';
      tags.appendChild(doneTag);
    }

    const catTag = document.createElement('span');
    catTag.className = 'tag ' + ev.category;
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
      saveAll();
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
    shareBtn.onclick = () => shareEvent(ev);

    actions.appendChild(toggleBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    actions.appendChild(shareBtn);

    li.appendChild(header);
    li.appendChild(tags);
    if (ev.desc) li.appendChild(desc);
    li.appendChild(actions);

    listEl.appendChild(li);
  });
}

// ---------- עזרי אירועים ----------
function categoryLabel(cat) {
  switch(cat) {
    case 'family': return 'משפחה';
    case 'work': return 'עבודה';
    case 'health': return 'בריאות';
    case 'holy': return 'קדושה/שבת';
    default: return 'כללי';
  }
}

function categoryColor(cat) {
  switch(cat) {
    case 'family': return '#ec4899';
    case 'work': return '#3b82f6';
    case 'health': return '#10b981';
    case 'holy': return '#facc15';
    default: return '#6366f1';
  }
}

function formatTime(t) {
  if (!t) return '';
  return t.slice(0,5);
}

function byTimeThenTitle(a, b) {
  const ta = a.startTime || '';
  const tb = b.startTime || '';
  if (ta < tb) return -1;
  if (ta > tb) return 1;
  return (a.title || '').localeCompare(b.title || '');
}

// ---------- מודאל ----------
let editingEventId = null;

function openModal(eventId=null) {
  const modal = document.getElementById('eventModal');
  const titleInput = document.getElementById('eventTitle');
  const descInput = document.getElementById('eventDesc');
  const dateInput = document.getElementById('eventDate');
  const startInput = document.getElementById('eventStart');
  const endInput = document.getElementById('eventEnd');
  const typeSelect = document.getElementById('eventType');
  const catSelect = document.getElementById('eventCategory');
  const remSelect = document.getElementById('eventReminder');
  const doneCheckbox = document.getElementById('eventDone');
  const modalTitle = document.getElementById('modalTitle');

  editingEventId = eventId;

  if (eventId) {
    const { ev } = findEventById(eventId) || {};
    if (ev) {
      titleInput.value = ev.title || '';
      descInput.value = ev.desc || '';
      dateInput.value = ev.date || selectedDateKey;
      startInput.value = ev.startTime || '';
      endInput.value = ev.endTime || '';
      typeSelect.value = ev.type || 'event';
      catSelect.value = ev.category || 'general';
      remSelect.value = ev.reminder || 'none';
      doneCheckbox.checked = !!ev.done;
      modalTitle.textContent = 'עריכת אירוע';
    }
  } else {
    titleInput.value = '';
    descInput.value = '';
    const [y,m,d] = selectedDateKey.split('-');
    dateInput.value = `${y}-${m}-${d}`;
    startInput.value = '';
    endInput.value = '';
    typeSelect.value = 'event';
    catSelect.value = 'general';
    remSelect.value = 'none';
    doneCheckbox.checked = false;
    modalTitle.textContent = 'אירוע חדש';
  }

  modal.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('eventModal').classList.add('hidden');
}

function findEventById(id) {
  for (const [key, list] of Object.entries(events)) {
    const idx = list.findIndex(e => e.id === id);
    if (idx >= 0) return { key, idx, ev: list[idx] };
  }
  return null;
}

function saveEventFromModal() {
  const title = document.getElementById('eventTitle').value.trim();
  const desc = document.getElementById('eventDesc').value.trim();
  const date = document.getElementById('eventDate').value;
  const startTime = document.getElementById('eventStart').value;
  const endTime = document.getElementById('eventEnd').value;
  const type = document.getElementById('eventType').value;
  const category = document.getElementById('eventCategory').value;
  const reminder = document.getElementById('eventReminder').value;
  const done = document.getElementById('eventDone').checked;

  if (!date) {
    alert('בחר תאריך');
    return;
  }

  const key = date;
  if (!events[key]) events[key] = [];

  if (editingEventId) {
    const found = findEventById(editingEventId);
    if (found) {
      const ev = found.ev;
      ev.title = title;
      ev.desc = desc;
      ev.date = key;
      ev.startTime = startTime;
      ev.endTime = endTime;
      ev.type = type;
      ev.category = category;
      ev.reminder = reminder;
      ev.done = done;
      if (found.key !== key) {
        events[found.key].splice(found.idx,1);
        events[key].push(ev);
      }
    }
  } else {
    const id = 'ev_' + Date.now() + '_' + Math.floor(Math.random()*1000);
    events[key].push({
      id, title, desc, date: key, startTime, endTime,
      type, category, reminder, done
    });
  }

  selectedDateKey = key;
  scheduleRemindersForAll();
  saveAll();
  closeModal();
}

function deleteEvent(id) {
  const found = findEventById(id);
  if (!found) return;
  const { key, idx } = found;
  events[key].splice(idx,1);
  if (events[key].length === 0) delete events[key];
  saveAll();
}

// ---------- שיתוף ----------
function shareEvent(ev) {
  const text = `אירוע: ${ev.title}
תאריך: ${keyToDisplay(ev.date)}
שעה: ${formatTime(ev.startTime)}${ev.endTime ? '–'+formatTime(ev.endTime) : ''}
קטגוריה: ${categoryLabel(ev.category)}
${ev.desc || ''}`.trim();

  if (navigator.share) {
    navigator.share({ text }).catch(()=>{});
  } else {
    navigator.clipboard?.writeText(text);
    alert('הפרטים הועתקו ללוח – אפשר להדביק בוואטסאפ.');
  }
}

// ---------- גיבוי/שחזור ----------
function doBackup() {
  const dataStr = JSON.stringify({ events, group: currentGroupCode }, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  const name = `bnapp-backup-${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}.json`;
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleRestoreFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (data.events) {
        events = data.events;
        saveAll();
        alert('הגיבוי שוחזר בהצלחה');
      } else {
        alert('קובץ גיבוי לא תקין');
      }
    } catch (e) {
      alert('שגיאה בקריאת הגיבוי');
    }
  };
  reader.readAsText(file);
}

// ---------- תזכורות (Notification API) ----------
function requestNotificationPermissionOnce() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function scheduleRemindersForAll() {
  Object.values(reminderTimers).forEach(id => clearTimeout(id));
  reminderTimers = {};
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const now = new Date();
  Object.values(events).flat().forEach(ev => {
    if (!ev.reminder || ev.reminder === 'none') return;
    if (!ev.date || !ev.startTime) return;
    const [y,m,d] = ev.date.split('-').map(Number);
    const [hh,mm] = ev.startTime.split(':').map(Number);
    const eventTime = new Date(y, m-1, d, hh, mm);
    const minutesBefore = Number(ev.reminder);
    const reminderTime = new Date(eventTime.getTime() - minutesBefore*60000);
    const diff = reminderTime - now;
    if (diff <= 0) return;
    const timerId = setTimeout(() => {
      new Notification('BNAPP – תזכורת', {
        body: `${ev.title} ב-${formatTime(ev.startTime)} (${keyToDisplay(ev.date)})`
      });
    }, diff);
    reminderTimers[ev.id] = timerId;
  });
}

// ---------- תצוגות ----------
function setView(view) {
  currentView = view;
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  if (view === 'month') renderMonth();
  else if (view === 'week') renderWeekView();
  else if (view === 'agenda') renderAgendaView();
}

// ---------- מצב כהה ----------
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

// ---------- קבוצה ----------
function loadGroupCode() {
  const saved = localStorage.getItem('bnapp_group_code') || 'default';
  currentGroupCode = saved;
  const input = document.getElementById('groupCode');
  if (input) input.value = saved;
}

function setGroupCode(newCode) {
  currentGroupCode = newCode || 'default';
  localStorage.setItem('bnapp_group_code', currentGroupCode);
  loadFromLocal();
  if (firebaseEnabled) syncFromFirebase();
  else renderAll();
}

// ---------- רינדורים ----------
function renderAll() {
  computeStats();
  if (currentView === 'month') renderMonth();
  else if (currentView === 'week') renderWeekView();
  else if (currentView === 'agenda') renderAgendaView();
  renderSidePanel();
}

// ---------- אתחול ----------
function initBNAPP() {
  loadTheme();
  initFirebaseIfConfigured();
  loadGroupCode();
  loadFromLocal();
  if (firebaseEnabled) syncFromFirebase();
  renderWeekdayRow();
  setView('month');
  renderAll();
  requestNotificationPermissionOnce();
  scheduleRemindersForAll();

  document.getElementById('prevMonthBtn').onclick = () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderAll();
  };
  document.getElementById('nextMonthBtn').onclick = () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderAll();
  };

  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.onclick = () => setView(btn.dataset.view);
  });

  document.getElementById('addEventBtn').onclick = () => openModal();
  document.getElementById('saveEventBtn').onclick = saveEventFromModal;
  document.getElementById('cancelEventBtn').onclick = () => {
    editingEventId = null;
    closeModal();
  };
  document.getElementById('backupBtn').onclick = doBackup;
  document.getElementById('restoreInput').onchange = (e) => {
    const file = e.target.files[0];
    if (file) handleRestoreFile(file);
    e.target.value = '';
  };
  document.getElementById('darkToggle').onclick = toggleTheme;
  document.getElementById('groupApplyBtn').onclick = () => {
    const code = document.getElementById('groupCode').value.trim();
    setGroupCode(code);
  };

  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim().toLowerCase();
    if (!term) {
      renderAll();
      return;
    }
    // מצב חיפוש: נציג ברשימת הצד אירועים מתאימים בלבד
    const matches = [];
    Object.entries(events).forEach(([key, list]) => {
      list.forEach(ev => {
        const text = (ev.title + ' ' + (ev.desc||'') + ' ' + categoryLabel(ev.category)).toLowerCase();
        if (text.includes(term)) matches.push({ key, ev });
      });
    });
    const listEl = document.getElementById('eventList');
    const titleEl = document.getElementById('sideDateTitle');
    titleEl.textContent = 'תוצאות חיפוש';
    listEl.innerHTML = '';
    if (matches.length === 0) {
      const empty = document.createElement('div');
      empty.style.opacity = '0.7';
      empty.textContent = 'לא נמצאו תוצאות';
      listEl.appendChild(empty);
      return;
    }
    matches.sort((a,b) => {
      const d1 = parseDateKey(a.key) - parseDateKey(b.key);
      if (d1 !== 0) return d1;
      return byTimeThenTitle(a.ev, b.ev);
    });
    matches.forEach(item => {
      const ev = item.ev;
      const li = document.createElement('li');
      li.className = 'event-item';
      const header = document.createElement('div');
      header.className = 'event-header';
      const t = document.createElement('div');
      t.className = 'event-title';
      t.textContent = ev.title;
      const meta = document.createElement('div');
      meta.className = 'event-meta';
      meta.textContent = `${keyToDisplay(ev.date)} • ${formatTime(ev.startTime)} • ${categoryLabel(ev.category)}`;
      header.appendChild(t);
      header.appendChild(meta);
      li.appendChild(header);
      listEl.appendChild(li);
    });
  });

  // PWA – רישום service worker (ל-cache בסיסי)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
}

function saveAll() {
  saveToLocal();
  syncToFirebase();
  renderAll();
  scheduleRemindersForAll();
}

document.addEventListener('DOMContentLoaded', initBNAPP);
