// core.js – לוגיקת תצוגה כללית + תאריכים

// שמות חודשים וימים
const monthNamesGreg = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const weekdayNamesHeb = ['א','ב','ג','ד','ה','ו','ש']; // ראשון–שבת

// מצב גלובלי
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let selectedDateKey = dateToKey(currentYear, currentMonth, currentDate.getDate());

let eventsByDate = {}; // נטען מ-Firebase ב-sync.js

let hebrewFormatter;
const pastelGradients = [
  ['#eef2ff','#fdf2ff'],
  ['#ecfeff','#fef3c7'],
  ['#f5f3ff','#e0f2fe'],
  ['#fdf2f2','#eff6ff'],
  ['#fdf2ff','#f0f9ff']
];

// רקע מתחלף
(function setRandomBackground() {
  const pair = pastelGradients[Math.floor(Math.random()*pastelGradients.length)];
  document.body.style.background = `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`;
})();

// ---------- כלי תאריכים ----------
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
  const startWeekday = firstDay.getDay(); // 0=ראשון
  const daysInMonth = new Date(currentYear, currentMonth+1, 0).getDate();

  const todayKey = dateToKey(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

  // רווחים לפני היום הראשון
  for (let i=0; i<startWeekday; i++) {
    const empty = document.createElement('div');
    empty.className = 'day inactive';
    cal.appendChild(empty);
  }

  for (let day=1; day<=daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const key = dateToKey(currentYear, currentMonth, day);
    const list = eventsByDate[key] || [];
    const hinfo = getHebrewHolidayInfo(date); // מפונקציה ב-holidays.js

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
    if (hinfo.isFast) {
      const dot = document.createElement('div');
      dot.className = 'dot dot-fast';
      dots.appendChild(dot);
    }
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

    list.slice(0,3).forEach(ev => {
      const dot = document.createElement('div');
      dot.classList.add('dot');
      if (ev.type === 'task') dot.classList.add('dot-task');
      else dot.classList.add('dot-user');
      dots.appendChild(dot);
    });

    cell.appendChild(header);
    cell.appendChild(dots);

    if (hinfo.labelsShort.length > 0) {
      const lbl = document.createElement('div');
      lbl.className = 'day-labels';
      lbl.textContent = hinfo.labelsShort[0];
      cell.appendChild(lbl);
    }

    cell.onclick = () => {
      selectedDateKey = key;
      renderAll();
    };

    cal.appendChild(cell);
  }
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

  const lines = [];

  if (hinfo.isShabbatEve) lines.push('ערב שבת (כניסת שבת – תל אביב)');
  if (hinfo.isShabbat) lines.push('שבת קודש (יציאת שבת – תל אביב)');
  if (hinfo.isRoshChodesh) lines.push('ראש חודש ' + (hinfo.hebrewMonth || ''));

  hinfo.labelsFull.forEach(l => {
    if (!lines.includes(l)) lines.push(l);
  });

  if (lines.length > 0) {
    holidayBox.classList.remove('hidden');
    holidayBox.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'holiday-title';
    title.textContent = 'חגים וימים מיוחדים:';
    holidayBox.appendChild(title);
    lines.forEach(line => {
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

// ---------- עזרי UI ----------
function categoryLabel(cat) {
  switch(cat) {
    case 'family': return 'משפחה';
    case 'work': return 'עבודה';
    case 'health': return 'בריאות';
    case 'holy': return 'קדושה/שבת';
    default: return 'כללי';
  }
}

// ---------- רענון כללי ----------
function renderAll() {
  renderCalendar();
  renderSidePanel();
}
