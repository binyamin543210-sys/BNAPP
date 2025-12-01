import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getDatabase, ref, onValue, push, set, remove } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const VALID_USERNAME='family';
const VALID_PASSWORD='1234';

const loginScreen=document.getElementById('login-screen');
const calendarScreen=document.getElementById('calendar-screen');
const loginBtn=document.getElementById('login-btn');
const logoutBtn=document.getElementById('logout-btn');
const usernameInput=document.getElementById('username');
const passwordInput=document.getElementById('password');
const loginError=document.getElementById('login-error');

const greg=document.getElementById('gregorian-month');
const heb=document.getElementById('hebrew-month');
const grid=document.getElementById('days-grid');
const prev=document.getElementById('prev-month');
const next=document.getElementById('next-month');

const panel=document.getElementById('event-panel');
const closePanel=document.getElementById('close-panel');
const eventGreg=document.getElementById('event-date-greg');
const eventHeb=document.getElementById('event-date-hebrew');
const eventsList=document.getElementById('events-list');
const addEventBtn=document.getElementById('add-event-btn');
const newEvent=document.getElementById('new-event-text');

let current=new Date();
let selected=null;
let events={};

function show(screen){
  loginScreen.classList.remove('active');
  calendarScreen.classList.remove('active');
  screen.classList.add('active');
}

function saveUser(u,p){
  localStorage.setItem('bn_user',JSON.stringify({u,p}));
}
function getUser(){
  try{return JSON.parse(localStorage.getItem('bn_user'))}catch(e){return null}
}

function login(){
  const u=usernameInput.value.trim();
  const p=passwordInput.value.trim();
  if(u===VALID_USERNAME && p===VALID_PASSWORD){
    saveUser(u,p);
    initDB();
    show(calendarScreen);
    render();
  } else {
    loginError.textContent='שם משתמש או סיסמה לא נכונים';
  }
}

loginBtn.onclick=login;
passwordInput.onkeydown=e=>{ if(e.key==='Enter') login(); };
logoutBtn.onclick=()=>{
  localStorage.removeItem('bn_user');
  show(loginScreen);
};

function initDB(){
  const r=ref(db,'events/');
  onValue(r,snap=>{
    events=snap.val()||{};
    if(selected) renderEvents(selected);
    render();
  });
}

function render(){
  const y=current.getFullYear();
  const m=current.getMonth();

  greg.textContent=current.toLocaleDateString('he-IL',{month:'long',year:'numeric'});
  heb.textContent=new Intl.DateTimeFormat('he-u-ca-hebrew',{month:'long',year:'numeric'}).format(current);

  grid.innerHTML='';
  const first=new Date(y,m,1);
  const start=(first.getDay()+6)%7;
  const days=new Date(y,m+1,0).getDate();
  const total=Math.ceil((start+days)/7)*7;

  for(let i=0;i<total;i++){
    const cell=document.createElement('div');
    cell.className='day-cell';
    const day=i-start+1;
    let d=null;

    if(day>=1 && day<=days){
      d=new Date(y,m,day);
    } else {
      cell.style.opacity='0.4';
      grid.appendChild(cell);
      continue;
    }

    cell.innerHTML = `<div>${day}</div>`;
    const key=toKey(d);

    if(key===toKey(new Date())) cell.classList.add('today');
    if(events[key]) cell.style.background='#bbdefb';

    cell.onclick=()=>openPanel(key);
    grid.appendChild(cell);
  }
}

function toKey(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function openPanel(key){
  selected=key;
  const d=new Date(key);
  eventGreg.textContent=d.toLocaleDateString('he-IL',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  eventHeb.textContent=new Intl.DateTimeFormat('he-u-ca-hebrew',{day:'numeric',month:'long',year:'numeric'}).format(d);
  renderEvents(key);
  panel.classList.remove('hidden');
}

function renderEvents(key){
  eventsList.innerHTML='';
  const list=events[key]||{};
  Object.entries(list).forEach(([id,ev])=>{
    const row=document.createElement('div');
    row.className='event-item';
    row.innerHTML=`<span>${ev.text}</span>`;
    const del=document.createElement('button');
    del.textContent='מחק';
    del.onclick=()=>remove(ref(db,`events/${key}/${id}`));
    row.appendChild(del);
    eventsList.appendChild(row);
  });
}

addEventBtn.onclick=()=>{
  if(!selected) return;
  const txt=newEvent.value.trim();
  if(!txt) return;
  const listRef=ref(db,`events/${selected}`);
  const id=push(listRef);
  set(id,{text:txt});
  newEvent.value='';
};

closePanel.onclick=()=>panel.classList.add('hidden');

prev.onclick=()=>{ current=new Date(current.getFullYear(),current.getMonth()-1,1);render(); };
next.onclick=()=>{ current=new Date(current.getFullYear(),current.getMonth()+1,1);render(); };

const u=getUser();
if(u && u.u===VALID_USERNAME && u.p===VALID_PASSWORD){
  initDB();
  show(calendarScreen);
  render();
} else {
  show(loginScreen);
}
