<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>BNAPP – לוח שנה</title>

<style>
/* ==== כל ה־CSS כאן ==== */
* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: 'Segoe UI', sans-serif;
  background: linear-gradient(180deg,#e8f0ff,#f4f7ff);
  color:#0f172a; direction:rtl;
}

#app { max-width:900px; margin:0 auto; padding:1rem; }

.app-header { display:flex; justify-content:center; margin-bottom:0.4rem; }
.app-title { font-size:1.7rem; font-weight:800; text-align:center; }
.sub { font-size:.85rem; opacity:.6; margin-top:-6px; }

.top-buttons {
  display:flex; justify-content:center; gap:.6rem; margin:1rem 0;
}
.bubble {
  width:38px;height:38px;background:white;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 2px 6px rgba(0,0,0,0.15);
}

.calendar-header {
  display:flex; justify-content:space-between; align-items:center;
  margin-bottom:0.5rem;
}
.calendar-header button {
  background:#dbeafe;border:none;padding:.4rem .8rem;
  border-radius:12px;cursor:pointer;
}

.month-wrap { text-align:center; flex:1; }
.month-label { font-size:1.35rem; font-weight:700; }
.hebrew-label { opacity:.65; font-size:.9rem; }

.calendar-weekdays {
  display:grid;grid-template-columns:repeat(7,1fr);
  text-align:center; color:#64748b; margin-bottom:.4rem;
}

.calendar-grid {
  display:grid; grid-template-columns:repeat(7,1fr); gap:.4rem;
}

.day-cell {
  background:white; border-radius:17px; padding:.45rem;
  min-height:82px; display:flex; flex-direction:column; justify-content:space-between;
  box-shadow:0 2px 6px rgba(0,0,0,.15); cursor:pointer;
}
.other-month { opacity:.35; }

.day-header { display:flex; justify-content:space-between; }
.day-number { font-weight:800; font-size:1.05rem; }
.hebrew-date { font-size:.7rem; opacity:.6; }

.tag-pill {
  padding:.15rem .45rem; border-radius:999px; font-size:.65rem; margin-top:.25rem;
}
.tag-shabbat { background:#fee2e2; color:#b91c1c; }
.tag-holiday { background:#fef3c7; color:#92400e; }

.weather-chip {
  background:#e0f2fe; padding:.15rem .45rem; border-radius:12px; margin-top:.25rem;
  font-size:.8rem;
}

.day-today { outline:3px solid #0ea5e9; }

/* ==== MODAL ==== */
.modal {
  position:fixed; inset:0; display:flex; justify-content:center; align-items:center;
  z-index:50;
}
.hidden { display:none!important; }

.modal-backdrop {
  position:absolute; inset:0; background:rgba(0,0,0,.45);
}

.modal-content {
  position:relative; background:white; padding:1.2rem;
  border-radius:17px; width:min(420px,95vw);
  box-shadow:0 7px 25px rgba(0,0,0,0.25); z-index:60;
}

.modal-header {
  display:flex; justify-content:space-between; align-items:center;
}

.close-btn {
  border:none; background:none; font-size:1.4rem; cursor:pointer;
}

.modal-buttons {
  display:flex; gap:.6rem; margin:.8rem 0;
}
.modal-btn {
  background:#dbeafe; border:none; padding:.45rem .8rem;
  border-radius:12px; cursor:pointer;
}
.modal-btn.primary {
  background:#0ea5e9; color:white;
}

#events-list {
  list-style:none; padding:0; margin-top:1rem;
}

.event-item {
  background:#f8fafc; padding:.6rem;
  border-radius:12px; margin-bottom:.5rem;
  box-shadow:0 1px 4px rgba(0,0,0,.1);
}
</style>

</head>
<body>

<div id="app">

  <header class="app-header">
    <div>
      <div class="app-title">BNAPP</div>
      <div class="sub">לוח שנה עברי-לועזי</div>
    </div>
  </header>

  <!-- ארבעת הכפתורים -->
  <div class="top-buttons">
    <div class="bubble">1</div>
    <div class="bubble">2</div>
    <div class="bubble">3</div>
    <div class="bubble">4</div>
  </div>

  <div class="calendar-header">
    <button id="prev-month">‹</button>

    <div class="month-wrap">
      <div class="month-label" id="month-label"></div>
      <div class="hebrew-label" id="month-hebrew"></div>
    </div>

    <button id="next-month">›</button>
  </div>

  <button id="today-btn" style="
    display:flex;margin:0 auto;margin-bottom:.6rem;
    border:none;background:#0ea5e9;color:white;
    border-radius:12px;padding:.4rem 1rem;cursor:pointer;">
    היום
  </button>

  <div class="calendar-weekdays">
    <div>א'</div><div>ב'</div><div>ג'</div><div>ד'</div><div>ה'</div><div>ו'</div><div>ש'</div>
  </div>

  <div id="calendar-grid" class="calendar-grid"></div>
</div>

<!-- ==== MODAL DAY ==== -->
<div id="day-modal" class="modal hidden">
  <div class="modal-backdrop"></div>
  <div class="modal-content">

    <div class="modal-header">
      <div>
        <div id="modal-date" style="font-weight:700;"></div>
        <div id="modal-weather" style="margin-top:4px;font-size:.85rem;opacity:.8;"></div>
      </div>
      <button class="close-btn" id="close-day-modal">×</button>
    </div>

    <div class="modal-buttons">
      <button class="modal-btn primary" id="add-event-btn">+ הוסף</button>
    </div>

    <ul id="events-list"></ul>

  </div>
</div>

<script>
/* ==== לוגיקה מלאה JS כאן ==== */

const WEATHER_KEY = "aa23ce141d8b2aa46e8cfcae221850a7";

async function getCityCoords(city="Jerusalem") {
  let url = `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${WEATHER_KEY}`;
  try {
    let r = await fetch(url);
    let d = await r.json();
    if (d && d.length) return { lat:d[0].lat, lon:d[0].lon };
  } catch(e){}
  return null;
}

async function getWeatherForDate(city, dateKey) {
  const coords = await getCityCoords(city);
  if (!coords) return null;

  let url =
    `https://api.openweathermap.org/data/2.5/onecall?lat=${coords.lat}&lon=${coords.lon}`+
    `&exclude=minutely,hourly,alerts&units=metric&appid=${WEATHER_KEY}`;

  let r = await fetch(url);
  let d = await r.json();
  if (!d.daily) return null;

  const target = new Date(dateKey);
  target.setHours(12);

  let match = d.daily.find(x=>{
    let dt = new Date(x.dt*1000);
    return dt.toDateString() === target.toDateString();
  });

  if (!match) return null;

  return {
    icon: "🌤️",
    max: Math.round(match.temp.max)
  };
}

// Hebrew & holidays
async function getHebrew(iso){
  try {
    let u = `https://www.hebcal.com/converter?cfg=json&date=${iso}&g2h=1`;
    let r = await fetch(u); let d = await r.json();
    return d.hebrew || "";
  } catch(e) { return ""; }
}

function isShabbat(d){ return d.getDay()===6; }

async function getShabbatTimes(dateKey){
  try{
    let u = `https://www.hebcal.com/shabbat/?cfg=json&geo=city&city=Jerusalem&lg=h&date=${dateKey}`;
    let r = await fetch(u); let d = await r.json();
    let out={};
    d.items?.forEach(i=>{
      if(i.category==="candles") out.c=i.date;
      if(i.category==="havdalah") out.h=i.date;
    });
    return out;
  }catch(e){return null;}
}

// DATA
let events = JSON.parse(localStorage.getItem("bnapp_events")||"{}");

// UTIL
const fmt = d => d.toISOString().split("T")[0];

let today = new Date();
let viewY = today.getFullYear();
let viewM = today.getMonth();

// RENDER
async function renderCalendar(){
  document.getElementById("month-label").textContent =
    new Date(viewY,viewM,1).toLocaleDateString("he-IL",{month:"long",year:"numeric"});

  document.getElementById("month-hebrew").textContent =
    await getHebrew(`${viewY}-${String(viewM+1).padStart(2,"0")}-01`);

  const grid = document.getElementById("calendar-grid");
  grid.innerHTML="";

  let first = new Date(viewY,viewM,1);
  let fd = (first.getDay()+6)%7;
  let days = new Date(viewY,viewM+1,0).getDate();
  let prev = new Date(viewY,viewM,0).getDate();

  for(let i=0;i<42;i++){
    let cell = document.createElement("div");
    cell.className="day-cell";

    let num, dObj;

    if(i<fd){
      num = prev-(fd-i-1);
      dObj = new Date(viewY,viewM-1,num);
      cell.classList.add("other-month");
    } else if(i>=fd+days){
      num = (i-(fd+days))+1;
      dObj = new Date(viewY,viewM+1,num);
      cell.classList.add("other-month");
    } else {
      num = i-fd+1;
      dObj = new Date(viewY,viewM,num);
    }

    let key = fmt(dObj);

    let header = document.createElement("div");
    header.className="day-header";

    let dn = document.createElement("div");
    dn.className="day-number";
    dn.textContent=num;

    let hd = document.createElement("div");
    hd.className="hebrew-date";
    hd.textContent= (await getHebrew(key)).split(" ")[0] || "";

    header.appendChild(dn);
    header.appendChild(hd);
    cell.appendChild(header);

    // שבת
    if(isShabbat(dObj)){
      let tg=document.createElement("div");
      tg.className="tag-pill tag-shabbat";
      tg.textContent="שבת";
      cell.appendChild(tg);
    }

    // מזג אוויר
    let wx = await getWeatherForDate("Jerusalem",key);
    if(wx){
      let chip=document.createElement("div");
      chip.className="weather-chip";
      chip.textContent = `${wx.icon} ${wx.max}°`;
      cell.appendChild(chip);
    }

    if(dObj.toDateString()===today.toDateString())
      cell.classList.add("day-today");

    cell.onclick = ()=> openDay(key);

    grid.appendChild(cell);
  }
}

function openDay(key){
  document.getElementById("modal-date").textContent =
    new Date(key).toLocaleDateString("he-IL",{weekday:"long",day:"numeric",month:"long"});

  let w = getWeatherForDate("Jerusalem",key).then(wx=>{
    document.getElementById("modal-weather").textContent =
      wx ? `🌤️ ${wx.max}°` : "";
  });

  let list=document.getElementById("events-list");
  list.innerHTML="";
  (events[key]||[]).forEach(e=>{
    let li=document.createElement("li");
    li.className="event-item";
    li.textContent=e.title;
    list.appendChild(li);
  });

  document.getElementById("day-modal").classList.remove("hidden");
}

document.getElementById("close-day-modal").onclick=
  ()=>document.getElementById("day-modal").classList.add("hidden");

document.getElementById("today-btn").onclick=()=>{
  viewY=today.getFullYear();
  viewM=today.getMonth();
  renderCalendar();
};

document.getElementById("prev-month").onclick=()=>{
  viewM--; if(viewM<0){ viewM=11; viewY--; }
  renderCalendar();
};
document.getElementById("next-month").onclick=()=>{
  viewM++; if(viewM>11){ viewM=0; viewY++; }
  renderCalendar();
};

renderCalendar();
</script>

</body>
</html>
