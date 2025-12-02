// BNAPP – גרסת דפדפן מלאה עם לוח שנה, משימות, צ'קליסט, Waze והתראות מקומיות כל דקה.

let state = {
  events: [],
  tasks: [],
  settings: {
    dark: false,
    defaultSound: 'pling'
  },
  selectedDate: new Date()
};

const STORAGE_KEY = 'bnapp_ultra_v10';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state.events = parsed.events || [];
    state.tasks = parsed.tasks || [];
    state.settings = parsed.settings || state.settings;
  } catch (e) {
    console.error('loadState error', e);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('saveState error', e);
  }
}

function $(id) { return document.getElementById(id); }

function createEl(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
  return el;
}

function generateId(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatDateKey(d) {
  const dd = new Date(d);
  return dd.toISOString().slice(0,10);
}

// ==== Calendar ====

function getEventsForDate(dateKey) {
  const res = [];
  const target = new Date(dateKey + 'T00:00:00');
  const d = target.getDate();
  const m = target.getMonth();
  const y = target.getFullYear();
  for (const ev of state.events) {
    if (!ev.date) continue;
    const baseDate = new Date(ev.date + 'T00:00:00');
    if (!ev.repeat || ev.repeat === 'none') {
      if (ev.date === dateKey) res.push(ev);
    } else {
      switch (ev.repeat) {
        case 'daily':
          if (target >= baseDate) res.push(ev);
          break;
        case 'weekly':
          if (target >= baseDate && target.getDay() === baseDate.getDay()) res.push(ev);
          break;
        case 'monthly':
          if (target >= baseDate && d === baseDate.getDate()) res.push(ev);
          break;
        case 'yearly':
          if (target >= baseDate && d === baseDate.getDate() && m === baseDate.getMonth()) res.push(ev);
          break;
      }
    }
  }
  return res;
}

function renderCalendar() {
  const grid = $('calendarGrid');
  grid.innerHTML = '';

  const ref = state.selectedDate;
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const first = new Date(y, m, 1);
  const monthNames = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  $('monthLabel').textContent = `${monthNames[m]} ${y}`;

  const firstDay = (first.getDay() + 6) % 7; // start Sunday at index 0
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const todayKey = formatDateKey(new Date());

  for (let i=0;i<firstDay;i++) {
    const cell = createEl('div','day-cell empty','');
    grid.appendChild(cell);
  }

  for (let day=1; day<=daysInMonth; day++) {
    const dateObj = new Date(y,m,day);
    const key = formatDateKey(dateObj);
    const cell = createEl('div','day-cell');
    const num = createEl('div','day-number', String(day));
    cell.appendChild(num);
    if (key === todayKey) cell.classList.add('today');

    const events = getEventsForDate(key);
    const dotsWrap = createEl('div','event-dots');
    events.forEach(ev => {
      const dot = createEl('span','dot');
      if (ev.fromTask) dot.classList.add('task');
      if (ev.repeat && ev.repeat!=='none') dot.classList.add('recurring');
      dotsWrap.appendChild(dot);
    });
    cell.appendChild(dotsWrap);
    if (events.length >= 3) cell.classList.add('busy');

    cell.onclick = () => {
      state.selectedDate = dateObj;
      renderCalendar();
      renderSidePanelForDate(dateObj);
    };

    grid.appendChild(cell);
  }
}

function renderSidePanelForDate(dateObj) {
  const key = formatDateKey(dateObj);
  $('sidePanelTitle').textContent = `אירועים ל־${key}`;
  const cont = $('sidePanelContent');
  cont.innerHTML = '';

  const events = getEventsForDate(key).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  if (!events.length) {
    cont.textContent = 'אין אירועים ליום זה.';
    return;
  }

  events.forEach(ev=>{
    const card = createEl('div','event-card');
    card.appendChild(createEl('h4',null,ev.title || '(ללא כותרת)'));
    const metaParts = [];
    if (ev.time) metaParts.push(ev.time);
    if (ev.repeat && ev.repeat!=='none') {
      const map = {daily:'יומי',weekly:'שבועי',monthly:'חודשי',yearly:'שנתי'};
      metaParts.push('חוזר: '+(map[ev.repeat]||ev.repeat));
    }
    if (ev.location) metaParts.push('📍 '+ev.location);
    card.appendChild(createEl('div','event-meta', metaParts.join(' · ')));
    if (ev.desc) card.appendChild(createEl('div','event-meta', ev.desc));

    const actions = createEl('div','event-actions');
    const editBtn = createEl('button','btn small','ערוך');
    editBtn.onclick = ()=>openEventModal(ev);
    actions.appendChild(editBtn);
    if (ev.location) {
      const wazeBtn = createEl('button','btn small','🧭 Waze');
      wazeBtn.onclick = ()=>openInWaze(ev.location);
      actions.appendChild(wazeBtn);
    }
    card.appendChild(actions);
    cont.appendChild(card);
  });
}

function openInWaze(location) {
  const encoded = encodeURIComponent(location);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = `waze://?q=${encoded}`;
  } else {
    window.open(`https://waze.com/ul?q=${encoded}`,'_blank');
  }
}

// ==== Event modal & checklist ====

let editingEventId = null;

function renderChecklist(items) {
  const container = $('eventChecklist');
  container.innerHTML = '';
  items.forEach((it,idx)=>{
    const row = createEl('div','checklist-item');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!it.done;
    const text = createEl('span','checklist-text',it.text||'');
    if (it.done) text.classList.add('done');
    cb.onchange = ()=>{
      it.done = cb.checked;
      if (it.done) text.classList.add('done'); else text.classList.remove('done');
      if (editingEventId) {
        const ev = state.events.find(e=>e.id===editingEventId);
        if (ev) ev.checklist = items;
        saveState();
      }
    };
    const del = createEl('button','icon-btn','✕');
    del.onclick = ()=>{
      items.splice(idx,1);
      renderChecklist(items);
      if (editingEventId) {
        const ev = state.events.find(e=>e.id===editingEventId);
        if (ev) ev.checklist = items;
        saveState();
      }
    };
    row.appendChild(cb);
    row.appendChild(text);
    row.appendChild(del);
    container.appendChild(row);
  });
  container.dataset.items = JSON.stringify(items);
}

function collectChecklistFromDOM() {
  const data = $('eventChecklist').dataset.items;
  if (!data) return [];
  try { return JSON.parse(data); } catch { return []; }
}

function openEventModal(ev) {
  $('eventModal').classList.remove('hidden');
  if (ev) {
    editingEventId = ev.id;
    $('eventModalTitle').textContent = 'עריכת אירוע';
    $('eventTitleInput').value = ev.title || '';
    $('eventDescInput').value = ev.desc || '';
    $('eventDateInput').value = ev.date || '';
    $('eventTimeInput').value = ev.time || '';
    $('eventLocationInput').value = ev.location || '';
    $('eventRepeatSelect').value = ev.repeat || 'none';
    $('reminderMinutes').value = ev.notify?.minutesBefore ?? 60;
    $('notifyTargetSelect').value = ev.notify?.sendTo || 'all';
    $('soundSelect').value = ev.notify?.sound || state.settings.defaultSound || 'pling';
    renderChecklist(ev.checklist || []);
  } else {
    editingEventId = null;
    $('eventModalTitle').textContent = 'אירוע חדש';
    const key = formatDateKey(state.selectedDate || new Date());
    $('eventTitleInput').value = '';
    $('eventDescInput').value = '';
    $('eventDateInput').value = key;
    $('eventTimeInput').value = '';
    $('eventLocationInput').value = '';
    $('eventRepeatSelect').value = 'none';
    $('reminderMinutes').value = 60;
    $('notifyTargetSelect').value = 'all';
    $('soundSelect').value = state.settings.defaultSound || 'pling';
    renderChecklist([]);
  }
}

function closeEventModal() {
  $('eventModal').classList.add('hidden');
}

function showNotifyPopupIfNeeded() {
  const mins = parseInt($('reminderMinutes').value || '0',10);
  if (mins <= 0) return;
  const popup = $('notifyPopup');
  popup.classList.remove('hidden');
  popup.querySelectorAll('button[data-target]').forEach(btn=>{
    btn.onclick = ()=>{
      $('notifyTargetSelect').value = btn.dataset.target;
      popup.classList.add('hidden');
    };
  });
}

function handleSaveEvent() {
  const title = $('eventTitleInput').value.trim();
  const desc = $('eventDescInput').value.trim();
  const date = $('eventDateInput').value;
  const time = $('eventTimeInput').value;
  const location = $('eventLocationInput').value.trim();
  const repeat = $('eventRepeatSelect').value;
  const minutesBefore = parseInt($('reminderMinutes').value || '60',10);
  const sendTo = $('notifyTargetSelect').value || 'all';
  const sound = $('soundSelect').value || state.settings.defaultSound || 'pling';
  if (!date) {
    alert('חובה לבחור תאריך');
    return;
  }
  const checklist = collectChecklistFromDOM();
  const notify = {
    enabled: minutesBefore>0,
    minutesBefore: isNaN(minutesBefore)?60:minutesBefore,
    sendTo,
    type: 'sound',
    sound
  };
  state.settings.defaultSound = sound;

  if (editingEventId) {
    const ev = state.events.find(e=>e.id===editingEventId);
    if (ev) {
      ev.title = title;
      ev.desc = desc;
      ev.date = date;
      ev.time = time;
      ev.location = location;
      ev.repeat = repeat;
      ev.notify = notify;
      ev.checklist = checklist;
    }
  } else {
    state.events.push({
      id: generateId('ev'),
      title,
      desc,
      date,
      time,
      location,
      repeat,
      notify,
      checklist
    });
  }
  saveState();
  closeEventModal();
  renderCalendar();
  renderSidePanelForDate(state.selectedDate || new Date());
}

// ==== Tasks ====

function openTasksDrawer() {
  $('tasksDrawer').classList.remove('hidden');
  renderTasks();
}

function closeTasksDrawer() {
  $('tasksDrawer').classList.add('hidden');
}

function renderTasks() {
  const list = $('tasksList');
  list.innerHTML = '';
  if (!state.tasks.length) {
    list.textContent = 'אין משימות כרגע.';
    return;
  }
  state.tasks.forEach(task=>{
    const item = createEl('div','task-item');
    const left = createEl('div','task-main');
    const title = createEl('span','task-title'+(task.done?' done':''),task.title);
    left.appendChild(title);
    if (task.date) {
      left.appendChild(createEl('span','event-meta', (task.date||'')+(task.time?' · '+task.time:'')));
    }
    item.appendChild(left);
    const controls = createEl('div',null);
    const chk = document.createElement('input');
    chk.type='checkbox';
    chk.checked=!!task.done;
    chk.onchange=()=>{
      task.done = chk.checked;
      saveState();
      renderTasks();
    };
    controls.appendChild(chk);
    const toCal = createEl('button','icon-btn','📅');
    toCal.title='הוסף ללוח השנה';
    toCal.onclick=()=>{
      const d = task.date || formatDateKey(new Date());
      state.events.push({
        id: generateId('ev'),
        title: task.title,
        desc: task.desc || '',
        date: d,
        time: task.time || '',
        fromTask: true,
        repeat: 'none',
        notify: {enabled:false,minutesBefore:0,sendTo:'all',type:'none'},
        checklist: []
      });
      saveState();
      alert('נוסף אירוע ליום '+d);
      renderCalendar();
    };
    controls.appendChild(toCal);
    const del = createEl('button','icon-btn','✕');
    del.onclick=()=>{
      state.tasks = state.tasks.filter(t=>t.id!==task.id);
      saveState();
      renderTasks();
    };
    controls.appendChild(del);
    item.appendChild(controls);
    list.appendChild(item);
  });
}

function addTaskFlow() {
  const title = prompt('שם המשימה:');
  if (!title) return;
  const date = prompt('תאריך (YYYY-MM-DD) – אופציונלי:') || '';
  const time = prompt('שעה (HH:MM) – אופציונלי:') || '';
  state.tasks.push({
    id: generateId('task'),
    title,
    desc: '',
    date,
    time,
    done: false
  });
  saveState();
  renderTasks();
}

// ==== Daily Focus & Free Time ====

function openDailyFocus() {
  $('dailyFocusModal').classList.remove('hidden');
  const body = $('dailyFocusBody');
  body.innerHTML = '';
  const todayKey = formatDateKey(new Date());
  const events = getEventsForDate(todayKey);
  const tasksToday = state.tasks.filter(t=>t.date===todayKey);

  body.appendChild(createEl('h4',null,'אירועים היום'));
  if (!events.length) body.appendChild(createEl('div','event-meta','אין אירועים להיום.'));
  else events.forEach(ev=>{
    const card = createEl('div','event-card');
    card.appendChild(createEl('h4',null,ev.title || '(ללא כותרת)'));
    const meta = [];
    if (ev.time) meta.push(ev.time);
    if (ev.location) meta.push('📍 '+ev.location);
    card.appendChild(createEl('div','event-meta', meta.join(' · ')));
    body.appendChild(card);
  });

  body.appendChild(createEl('h4',null,'משימות היום'));
  if (!tasksToday.length) body.appendChild(createEl('div','event-meta','אין משימות מיוחדות להיום.'));
  else tasksToday.forEach(task=>{
    const div = createEl('div','task-item');
    div.appendChild(createEl('span','task-title'+(task.done?' done':''),task.title));
    body.appendChild(div);
  });

  body.appendChild(createEl('div','event-meta','לחץ על Free time כדי לראות חלונות פנויים להיום.'));
}

function closeDailyFocusModal() {
  $('dailyFocusModal').classList.add('hidden');
}

function openFreeTime() {
  $('freeTimeModal').classList.remove('hidden');
  const body = $('freeTimeBody');
  body.innerHTML='';

  const todayKey = formatDateKey(new Date());
  const events = getEventsForDate(todayKey).filter(ev=>ev.time);
  const blocks = events.map(ev=>{
    const start = new Date(todayKey+'T'+ev.time);
    const end = new Date(start.getTime()+60*60*1000);
    return {start,end};
  }).sort((a,b)=>a.start-b.start);

  const dayStart = new Date(todayKey+'T08:00:00');
  const dayEnd = new Date(todayKey+'T22:00:00');

  let cursor = dayStart;
  const freeSlots=[];
  for (const blk of blocks) {
    if (blk.start>cursor) freeSlots.push({start:new Date(cursor),end:new Date(blk.start)});
    if (blk.end>cursor) cursor = blk.end;
  }
  if (cursor<dayEnd) freeSlots.push({start:new Date(cursor),end:new Date(dayEnd)});

  if (!freeSlots.length) {
    body.textContent = 'היום אין כמעט זמן פנוי בין 08:00 ל־22:00.';
    return;
  }
  freeSlots.forEach(slot=>{
    const card = createEl('div','event-card');
    const s = slot.start.toTimeString().slice(0,5);
    const e = slot.end.toTimeString().slice(0,5);
    card.appendChild(createEl('div',null,`${s} - ${e}`));
    body.appendChild(card);
  });
}

function closeFreeTimeModal() {
  $('freeTimeModal').classList.add('hidden');
}

// ==== Today bar & dark mode ====

function updateTodayBar() {
  const now = new Date();
  $('todayTime').textContent = now.toTimeString().slice(0,5);
  $('todayDateGreg').textContent = now.toLocaleDateString('he-IL',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  $('todayDateHeb').textContent = 'תאריך עברי (Placeholder)';
  const todayKey = formatDateKey(now);
  $('todayEventsCount').textContent = `${getEventsForDate(todayKey).length} אירועים היום`;
  $('todayWeather').textContent = 'מזג אוויר: --° (Placeholder)';
}

function applyDarkMode() {
  if (state.settings.dark) document.body.classList.add('dark');
  else document.body.classList.remove('dark');
}

// ==== Notifications (local, every minute) ====

let notificationSeen = {};

function requestNotificationPermissionIfNeeded() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') Notification.requestPermission();
}

function checkNotificationsTick() {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  const now = Date.now();
  for (const ev of state.events) {
    if (!ev.notify || !ev.notify.enabled || !ev.date) continue;
    const timeStr = ev.time || '00:00';
    const [hh,mm] = timeStr.split(':').map(x=>parseInt(x||'0',10));
    const eventMs = new Date(ev.date+'T'+timeStr).getTime();
    const beforeMs = (ev.notify.minutesBefore || 60)*60*1000;
    const trigger = eventMs - beforeMs;
    if (trigger<=0) continue;
    if (now>=trigger && now<trigger+60*1000) {
      const key = ev.id+':'+ev.date+':'+ev.notify.minutesBefore;
      if (notificationSeen[key]) continue;
      notificationSeen[key]=true;
      const title = ev.title || 'אירוע מתקרב';
      let body = '';
      if (ev.time) body+='בשעה '+ev.time;
      if (ev.location) body+=' · '+ev.location;
      const n = new Notification(title,{
        body: body || 'תזכורת לאירוע בלוח השנה שלך',
        icon: 'icon-192.png'
      });
    }
  }
}

// ==== Init ====

function init() {
  loadState();
  applyDarkMode();

  $('prevMonth').onclick=()=>{
    const d=state.selectedDate;
    state.selectedDate=new Date(d.getFullYear(),d.getMonth()-1,1);
    renderCalendar();
  };
  $('nextMonth').onclick=()=>{
    const d=state.selectedDate;
    state.selectedDate=new Date(d.getFullYear(),d.getMonth()+1,1);
    renderCalendar();
  };
  $('todayBtn').onclick=()=>{
    state.selectedDate=new Date();
    renderCalendar();
    renderSidePanelForDate(state.selectedDate);
  };
  $('addEventBtn').onclick=()=>openEventModal();
  $('closeEventModal').onclick=closeEventModal;
  $('tasksBtn').onclick=openTasksDrawer;
  $('closeTasksBtn').onclick=closeTasksDrawer;
  $('addTaskBtn').onclick=addTaskFlow;
  $('dailyFocusBtn').onclick=openDailyFocus;
  $('closeDailyFocus').onclick=closeDailyFocusModal;
  $('freeTimeBtn').onclick=openFreeTime;
  $('closeFreeTime').onclick=closeFreeTimeModal;
  $('saveEventBtn').onclick=handleSaveEvent;
  $('darkToggle').onclick=()=>{
    state.settings.dark=!state.settings.dark;
    applyDarkMode();
    saveState();
  };
  $('previewSoundBtn').onclick=()=>{
    const val=$('soundSelect').value;
    const audio=new Audio('sounds/'+val+'.wav');
    audio.play().catch(()=>{});
  };
  $('reminderMinutes').addEventListener('change', ()=>{
    const mins = parseInt($('reminderMinutes').value || '0',10);
    if (mins>0) showNotifyPopupIfNeeded();
  });
  $('notifyPopup').addEventListener('click', (e)=>{
    if (e.target.id==='notifyPopup') $('notifyPopup').classList.add('hidden');
  });

  renderCalendar();
  renderSidePanelForDate(state.selectedDate);
  updateTodayBar();
  setInterval(updateTodayBar, 60*1000);
  requestNotificationPermissionIfNeeded();
  setInterval(checkNotificationsTick, 60*1000);
}

document.addEventListener('DOMContentLoaded', init);
