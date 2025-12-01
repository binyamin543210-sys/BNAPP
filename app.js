import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getDatabase, ref, onValue, push, remove } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const gregEl = document.getElementById('gregorian-month');
const hebEl = document.getElementById('hebrew-month');
const gridEl = document.getElementById('days-grid');
const todayBtn = document.getElementById('today-btn');

const panelEl = document.getElementById('event-panel');
const closePanelBtn = document.getElementById('close-panel');
const eventGregEl = document.getElementById('event-date-greg');
const eventHebEl = document.getElementById('event-date-hebrew');
const eventsListEl = document.getElementById('events-list');
const newEventInput = document.getElementById('new-event-text');
const addEventBtn = document.getElementById('add-event-btn');

let currentDate = new Date();
let selectedKey = null;
let eventsByDay = {};

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function hebrewMonthYear(d) {
  return new Intl.DateTimeFormat('he-u-ca-hebrew', {
    month: 'long',
    year: 'numeric'
  }).format(d);
}

function hebrewFull(d) {
  return new Intl.DateTimeFormat('he-u-ca-hebrew', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(d);
}

function gregFull(d) {
  return d.toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function hebrewDay(d) {
  return new Intl.DateTimeFormat('he-u-ca-hebrew', {
    day: 'numeric'
  }).format(d);
}

function renderMonth() {
  const y = currentDate.getFullYear();
  const m = currentDate.getMonth();

  gregEl.textContent = currentDate.toLocaleDateString('he-IL', {
    month: 'long',
    year: 'numeric'
  });
  hebEl.textContent = hebrewMonthYear(currentDate);

  gridEl.innerHTML = '';

  const first = new Date(y, m, 1);
  const firstDay = first.getDay(); // 0=Sunday
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const leading = firstDay;
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;

  const todayKey = dateKey(new Date());

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'day-cell';

    const inner = document.createElement('div');
    inner.className = 'day-inner';

    const dayIndex = i - leading + 1;

    if (dayIndex < 1 || dayIndex > daysInMonth) {
      cell.classList.add('day-empty');
      cell.appendChild(inner);
      gridEl.appendChild(cell);
      continue;
    }

    const cellDate = new Date(y, m, dayIndex);
    const key = dateKey(cellDate);

    const hebSpan = document.createElement('span');
    hebSpan.className = 'day-hebrew';
    hebSpan.textContent = hebrewDay(cellDate);

    const gregSpan = document.createElement('span');
    gregSpan.className = 'day-greg';
    gregSpan.textContent = String(dayIndex);

    inner.appendChild(hebSpan);
    inner.appendChild(gregSpan);

    if (key === todayKey) {
      cell.classList.add('day-today');
    }
    if (eventsByDay[key]) {
      cell.classList.add('day-has-events');
    }
    if (key === selectedKey) {
      cell.classList.add('day-selected');
    }

    attachDayHandlers(cell, key, cellDate);
    cell.appendChild(inner);
    gridEl.appendChild(cell);
  }
}

function attachDayHandlers(cell, key, cellDate) {
  let pressTimer = null;
  let longPressed = false;

  const openForView = () => {
    if (!longPressed) openPanel(key, cellDate, false);
  };

  const startPress = () => {
    longPressed = false;
    pressTimer = setTimeout(() => {
      longPressed = true;
      openPanel(key, cellDate, true);
    }, 450);
  };

  const cancelPress = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };

  cell.addEventListener('click', openForView);
  cell.addEventListener('touchstart', startPress);
  cell.addEventListener('mousedown', startPress);
  cell.addEventListener('touchend', cancelPress);
  cell.addEventListener('touchcancel', cancelPress);
  cell.addEventListener('mouseup', cancelPress);
  cell.addEventListener('mouseleave', cancelPress);
}

function openPanel(key, dateObj, focusAdd) {
  selectedKey = key;
  const d = dateObj || new Date(key);

  eventGregEl.textContent = gregFull(d);
  eventHebEl.textContent = hebrewFull(d);

  renderEventsForDay(key);
  panelEl.classList.remove('hidden');

  if (focusAdd) {
    setTimeout(() => newEventInput.focus(), 50);
  }

  renderMonth();
}

function closePanel() {
  panelEl.classList.add('hidden');
  selectedKey = null;
  renderMonth();
}

function renderEventsForDay(key) {
  eventsListEl.innerHTML = '';
  const list = eventsByDay[key] || {};
  const entries = Object.entries(list);

  if (entries.length === 0) {
    const p = document.createElement('p');
    p.className = 'empty-text';
    p.textContent = 'אין אירועים ליום זה';
    eventsListEl.appendChild(p);
    return;
  }

  entries.forEach(([id, ev]) => {
    const row = document.createElement('div');
    row.className = 'event-item';

    const textSpan = document.createElement('span');
    textSpan.className = 'event-text';
    textSpan.textContent = ev.text;

    const delBtn = document.createElement('button');
    delBtn.className = 'event-delete';
    delBtn.textContent = 'מחק';
    delBtn.addEventListener('click', () => {
      remove(ref(db, `events/${key}/${id}`));
    });

    row.appendChild(textSpan);
    row.appendChild(delBtn);
    eventsListEl.appendChild(row);
  });
}

function addEvent() {
  if (!selectedKey) return;
  const text = newEventInput.value.trim();
  if (!text) return;
  const listRef = ref(db, `events/${selectedKey}`);
  push(listRef, { text });
  newEventInput.value = '';
}

function initEventsListener() {
  const eventsRef = ref(db, 'events');
  onValue(eventsRef, snapshot => {
    eventsByDay = snapshot.val() || {};
    renderMonth();
    if (selectedKey) renderEventsForDay(selectedKey);
  });
}

todayBtn.addEventListener('click', () => {
  currentDate = new Date();
  renderMonth();
});

closePanelBtn.addEventListener('click', closePanel);
addEventBtn.addEventListener('click', addEvent);
newEventInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addEvent();
});

initEventsListener();
renderMonth();
