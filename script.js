// ----- Firebase Init -----
const firebaseConfig = {
  apiKey: "REPLACE",
  authDomain: "REPLACE",
  databaseURL: "REPLACE",
  projectId: "REPLACE",
  storageBucket: "REPLACE",
  messagingSenderId: "REPLACE",
  appId: "REPLACE"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let selectedDate = null;

// Render calendar simple month
function renderCalendar() {
  const cal = document.getElementById("calendar");
  cal.innerHTML = "";
  const days = 30;
  for (let i = 1; i <= days; i++) {
    const d = document.createElement("div");
    d.className = "day";
    d.innerHTML = `<b>${i}</b>`;
    d.onclick = () => openModal(i);
    cal.appendChild(d);
  }
}

function openModal(day) {
  selectedDate = day;
  document.getElementById("eventModal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("eventModal").classList.add("hidden");
}

function saveEvent() {
  const title = document.getElementById("eventTitle").value;
  const desc = document.getElementById("eventDesc").value;

  db.ref("events/" + selectedDate).set({ title, desc });

  closeModal();
}

renderCalendar();
