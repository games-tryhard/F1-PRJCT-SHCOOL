// World Clock - multi timezone digital clock
// Saves selection to localStorage

const COMMON_ZONES = [
  'UTC','Europe/London','Europe/Paris','Europe/Amsterdam','Europe/Berlin',
  'America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
  'Asia/Tokyo','Asia/Shanghai','Asia/Kolkata','Australia/Sydney'
];

const STORAGE_KEY = 'world-clock-zones-v1';
const STORAGE_12H = 'world-clock-12h-v1';

const presetTz = document.getElementById('presetTz');
const customTz = document.getElementById('customTz');
const addBtn = document.getElementById('addBtn');
const clocksEl = document.getElementById('clocks');
const tmpl = document.getElementById('clock-template');
const hour12Toggle = document.getElementById('hour12Toggle');
const clearBtn = document.getElementById('clearBtn');

let zones = loadZones();
let use12Hour = load12hPref();

function populatePreset(){
  presetTz.innerHTML = '';
  for(const z of COMMON_ZONES){
    const opt = document.createElement('option');
    opt.value = z; opt.textContent = z;
    presetTz.appendChild(opt);
  }
}
populatePreset();

hour12Toggle.checked = use12Hour;
hour12Toggle.addEventListener('change', () => {
  use12Hour = hour12Toggle.checked;
  localStorage.setItem(STORAGE_12H, JSON.stringify(use12Hour));
  renderAll();
});

addBtn.addEventListener('click', () => {
  const selected = presetTz.value.trim();
  const custom = customTz.value.trim();
  const tz = custom || selected;
  if(!tz) return;
  try {
    // Validate timezone by asking Intl to format a date using it
    new Intl.DateTimeFormat([], { timeZone: tz }).format(new Date());
  } catch (err) {
    alert('Invalid timezone name. Use a valid IANA timezone like "Europe/Paris" or "America/New_York".');
    return;
  }
  if(!zones.includes(tz)){
    zones.push(tz);
    saveZones();
    renderAll();
  }
  customTz.value = '';
});

clearBtn.addEventListener('click', () => {
  if(!confirm('Remove all saved zones?')) return;
  zones = [];
  saveZones();
  renderAll();
});

function loadZones(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  } catch {}
  // default zones
  return ['UTC','Europe/London','America/New_York','Asia/Tokyo'];
}
function saveZones(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(zones));
}

function renderAll(){
  clocksEl.innerHTML = '';
  if(zones.length === 0){
    clocksEl.innerHTML = `<div class="small">No zones added — use the controls above to add one.</div>`;
    return;
  }
  for(const z of zones){
    const node = tmpl.content.cloneNode(true);
    const card = node.querySelector('.clock-card');
    const nameEl = node.querySelector('.tz-name');
    const timeEl = node.querySelector('.time');
    const dateEl = node.querySelector('.date');
    const removeBtn = node.querySelector('.remove-btn');

    nameEl.textContent = z;
    removeBtn.addEventListener('click', () => {
      zones = zones.filter(t => t !== z);
      saveZones();
      renderAll();
    });

    // attach a data attribute for updates
    card.dataset.timezone = z;
    // keep references for updating later
    timeEl.dataset.tz = z;
    dateEl.dataset.tz = z;

    clocksEl.appendChild(node);
  }
  // update once immediately
  updateTimes();
}

function formatForZone(date, timeZone){
  // time and date strings
  const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: use12Hour, timeZone };
  const dateOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone };
  const timeStr = new Intl.DateTimeFormat(undefined, timeOptions).format(date);
  const dateStr = new Intl.DateTimeFormat(undefined, dateOptions).format(date);
  // Some locales add unicode bi-directional markers or non-breaking spaces; normalize spaces
  return { timeStr: timeStr.replace(/\u202F|\u00A0/g,' '), dateStr };
}

function updateTimes(){
  const now = new Date();
  // find all time elements and update
  const timeEls = clocksEl.querySelectorAll('.time');
  timeEls.forEach(el => {
    const tz = el.dataset.tz;
    try {
      const { timeStr } = formatForZone(now, tz);
      el.textContent = timeStr;
    } catch {
      el.textContent = '—';
    }
  });
  const dateEls = clocksEl.querySelectorAll('.date');
  dateEls.forEach(el => {
    const tz = el.dataset.tz;
    try {
      const { dateStr } = formatForZone(now, tz);
      el.textContent = dateStr;
    } catch {
      el.textContent = '';
    }
  });
}

// Update every 500ms to keep seconds in sync (500 is responsive while not too heavy)
let timer = null;
function startTimer(){
  if(timer) clearInterval(timer);
  updateTimes();
  timer = setInterval(updateTimes, 1000);
}

renderAll();
startTimer();
