// app.js — Логика приложения ФКУ Дневник

let DB_URL = '';
let DB_KEY = '';
try {
  if (typeof SUPABASE_URL !== 'undefined') DB_URL = SUPABASE_URL;
  if (typeof SUPABASE_KEY !== 'undefined') DB_KEY = SUPABASE_KEY;
} catch(e){}

const tg = window.Telegram?.WebApp;
if (tg) {
  try { tg.ready(); tg.expand(); } catch(e){}
}

const tgUser = tg?.initDataUnsafe?.user || { id: 99999999, first_name: "Пользователь" };
const currentTelegramId = tgUser.id;

let currentFilteredList = (typeof FOOD_BASE !== 'undefined') ? [...FOOD_BASE] : [];
let currentDateObj = new Date();
let currentCategory = 'all';

let appData = {
  settings: { dailyPhe: 300, aksPortions: 4 },
  today: getFormattedDate(currentDateObj),
  aks: [false, false, false, false],
  entries: []
};

let activeMeal = 'Завтрак';

function getFormattedDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function updateDateUI() {
  try {
    const selectedStr = getFormattedDate(currentDateObj);
    const actualTodayStr = getFormattedDate(new Date());
    appData.today = selectedStr;

    const isToday = (selectedStr === actualTodayStr);
    const todayBadge = document.getElementById('todayBadge');
    if (todayBadge) todayBadge.style.display = isToday ? 'inline-block' : 'none';

    const options = { day: 'numeric', month: 'short' };
    const label = document.getElementById('dateDisplayLabel');
    if (label) label.textContent = currentDateObj.toLocaleDateString('ru-RU', options);
    
    const picker = document.getElementById('hiddenDatePicker');
    if (picker) picker.value = selectedStr;

    loadDayData();
  } catch(e){ console.error('updateDateUI error:', e); }
}

function changeDate(daysOffset) {
  currentDateObj.setDate(currentDateObj.getDate() + daysOffset);
  updateDateUI();
}

function openDatePicker() {
  const picker = document.getElementById('hiddenDatePicker');
  if (picker) {
    if (typeof picker.showPicker === 'function') picker.showPicker();
    else picker.click();
  }
}

function onDatePicked(val) {
  if (!val) return;
  const parts = val.split('-');
  currentDateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  updateDateUI();
}

function loadDayData() {
  const local = localStorage.getItem('pku_diary_' + currentTelegramId + '_' + appData.today);
  if (local) {
    try {
      const parsed = JSON.parse(local);
      appData.entries = parsed.entries || [];
      appData.aks = parsed.aks || new Array(appData.settings.aksPortions).fill(false);
    } catch(e){}
  } else {
    appData.entries = [];
    appData.aks = new Array(appData.settings.aksPortions).fill(false);
  }

  render();
  syncWithSupabase();
}

function init() {
  try {
    const savedSettings = localStorage.getItem('pku_settings_' + currentTelegramId);
    if (savedSettings) {
      try { appData.settings = JSON.parse(savedSettings); } catch(e){}
    }

    filterFoodList();
    updateDateUI();
  } catch(e){
    console.error('init error:', e);
  }
}

function setCategory(cat, btn) {
  currentCategory = cat;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  filterFoodList();
}

function filterFoodList() {
  const query = (document.getElementById('foodSearchInput')?.value || '').toLowerCase().trim();
  const source = (typeof FOOD_BASE !== 'undefined') ? FOOD_BASE : [];
  currentFilteredList = source.filter(item => {
    const matchesCat = (currentCategory === 'all' || item.cat === currentCategory);
    const matchesQuery = !query || item.name.toLowerCase().includes(query);
    return matchesCat && matchesQuery;
  });
  renderFoodSearchList();
}

function renderFoodSearchList() {
  const container = document.getElementById('foodSearchListContainer');
  if (!container) return;

  if (currentFilteredList.length === 0) {
    container.innerHTML = '<div style="padding:12px; text-align:center; font-size:12px; color:#94a3b8;">Ничего не найдено (введите название вручную ниже)</div>';
    return;
  }

  let html = '';
  for (let i = 0; i < currentFilteredList.length; i++) {
    const f = currentFilteredList[i];
    html += '<div class="search-item" onclick="selectFoodByIndex(' + i + ')">' +
              '<div class="search-item-name">' + f.name + '</div>' +
              '<div class="search-item-meta">' + f.phe + ' мг Фа <span style="color:#64748b; font-weight:normal;">(' + f.prot + 'г б.)</span></div>' +
            '</div>';
  }
  container.innerHTML = html;
}

function selectFoodByIndex(i) {
  const item = currentFilteredList[i];
  if (!item) return;
  document.getElementById('foodNameInput').value = item.name;
  document.getElementById('phe100Input').value = item.phe;
  document.getElementById('prot100Input').value = item.prot;
  calcPreview();
}

async function syncWithSupabase() {
  if (!DB_URL.startsWith('http') || DB_URL.includes('ВАШ_ПРОЕКТ')) return;
  try {
    const headers = { 'apikey': DB_KEY, 'Authorization': 'Bearer ' + DB_KEY };
    
    const resUser = await fetch(DB_URL + '/rest/v1/users?telegram_id=eq.' + currentTelegramId, { headers });
    const users = await resUser.json();
    if (users && users.length > 0) {
      appData.settings.dailyPhe = users[0].daily_phe || 300;
      appData.settings.aksPortions = users[0].aks_portions || 4;
    }

    const resEntries = await fetch(DB_URL + '/rest/v1/diary_entries?telegram_id=eq.' + currentTelegramId + '&entry_date=eq.' + appData.today, { headers });
    const entries = await resEntries.json();
    if (entries && Array.isArray(entries)) {
      appData.entries = entries.map(e => ({
        id: e.id,
        meal: e.meal_type,
        name: e.food_name,
        weight: Number(e.weight_g),
        phe: Number(e.phe_mg),
        prot: Number(e.protein_g)
      }));
    }

    const resAks = await fetch(DB_URL + '/rest/v1/aks_logs?telegram_id=eq.' + currentTelegramId + '&log_date=eq.' + appData.today, { headers });
    const aksLogs = await resAks.json();
    if (aksLogs && Array.isArray(aksLogs)) {
      appData.aks = new Array(appData.settings.aksPortions).fill(false);
      aksLogs.forEach(log => {
        if (log.portion_index < appData.aks.length) {
          appData.aks[log.portion_index] = log.is_taken;
        }
      });
    }

    render();
    saveLocal();
  } catch(e) {
    console.log("Supabase sync:", e);
  }
}

function saveLocal() {
  localStorage.setItem('pku_diary_' + currentTelegramId + '_' + appData.today, JSON.stringify({
    entries: appData.entries,
    aks: appData.aks
  }));
  localStorage.setItem('pku_settings_' + currentTelegramId, JSON.stringify(appData.settings));
}

function render() {
  try {
    const limitPhe = appData.settings.dailyPhe;
    const limitProt = (limitPhe / 50).toFixed(1);
    document.getElementById('limitPheText').textContent = limitPhe;
    document.getElementById('limitProteinText').textContent = limitProt;

    let consumedPhe = 0;
    let consumedProt = 0;
    const mealSums = { 'Завтрак': 0, 'Обед': 0, 'Ужин': 0, 'Перекус': 0 };

    ['breakfastList', 'lunchList', 'dinnerList', 'snackList'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '';
    });

    appData.entries.forEach(item => {
      consumedPhe += item.phe;
      consumedProt += item.prot;
      mealSums[item.meal] += item.phe;

      const listId = item.meal === 'Завтрак' ? 'breakfastList' : item.meal === 'Обед' ? 'lunchList' : item.meal === 'Ужин' ? 'dinnerList' : 'snackList';
      const el = document.getElementById(listId);
      if (el) {
        el.innerHTML += '<div class="food-item">' +
                          '<div>' +
                            '<div class="food-info">' + item.name + '</div>' +
                            '<div class="food-sub">' + item.weight + ' г (' + item.prot + ' г б.)</div>' +
                          '</div>' +
                          '<div class="food-right">' +
                            '<span class="food-phe">' + item.phe + ' мг</span>' +
                            '<button class="del-btn" onclick="deleteFood(' + item.id + ')">🗑️</button>' +
                          '</div>' +
                        '</div>';
      }
    });

    document.getElementById('consumedPheText').textContent = consumedPhe;
    document.getElementById('consumedProteinText').textContent = consumedProt.toFixed(1);
    document.getElementById('breakfastTotal').textContent = mealSums['Завтрак'] + ' мг Фа';
    document.getElementById('lunchTotal').textContent = mealSums['Обед'] + ' мг Фа';
    document.getElementById('dinnerTotal').textContent = mealSums['Ужин'] + ' мг Фа';
    document.getElementById('snackTotal').textContent = mealSums['Перекус'] + ' мг Фа';

    const rem = limitPhe - consumedPhe;
    const badge = document.getElementById('pheStatusBadge');
    const bar = document.getElementById('pheProgressBar');
    const percent = Math.min(Math.round((consumedPhe / limitPhe) * 100), 100);
    bar.style.width = percent + '%';

    if (rem >= 0) {
      document.getElementById('remainingPheText').textContent = rem + ' мг';
      document.getElementById('remainingPheText').style.color = '#10b981';
      badge.className = 'badge badge-ok'; badge.textContent = 'В норме';
      bar.className = 'progress-bar-fill fill-ok';
    } else {
      document.getElementById('remainingPheText').textContent = 'Перебор ' + Math.abs(rem) + ' мг';
      document.getElementById('remainingPheText').style.color = '#ef4444';
      badge.className = 'badge badge-warn'; badge.textContent = 'Превышено!';
      bar.className = 'progress-bar-fill fill-warn';
    }

    // АКС
    const aksDiv = document.getElementById('aksContainer');
    if (aksDiv) {
      aksDiv.innerHTML = '';
      let takenCnt = 0;
      appData.aks.forEach((isTaken, i) => {
        if (isTaken) takenCnt++;
        aksDiv.innerHTML += '<button class="aks-btn ' + (isTaken ? 'aks-on' : 'aks-off') + '" onclick="toggleAks(' + i + ')">' + (i+1) + '-я порция</button>';
      });
      document.getElementById('aksProgressText').textContent = takenCnt + ' / ' + appData.aks.length + ' порций';
    }
  } catch(e){
    console.error('render error:', e);
  }
}

function calcPreview() {
  const w = parseFloat(document.getElementById('weightInput').value) || 0;
  let phe = parseFloat(document.getElementById('phe100Input').value) || 0;
  let prot = parseFloat(document.getElementById('prot100Input').value) || 0;
  if (prot > 0 && phe === 0) { phe = prot * 50; document.getElementById('phe100Input').value = Math.round(phe); }

  const totalPhe = Math.round((w * phe) / 100);
  const totalProt = ((w * prot) / 100).toFixed(2);
  document.getElementById('previewCalc').textContent = totalPhe + ' мг Фа (' + totalProt + ' г б.)';
}

function openAddFoodModal(m) {
  activeMeal = m;
  document.getElementById('modalMealTitle').textContent = 'Добавить в ' + m.toLowerCase();
  document.getElementById('foodSearchInput').value = '';
  document.getElementById('foodNameInput').value = '';
  document.getElementById('phe100Input').value = '';
  document.getElementById('prot100Input').value = '';
  document.getElementById('weightInput').value = '';
  currentCategory = 'all';
  document.querySelectorAll('.chip').forEach((c, idx) => c.classList.toggle('active', idx === 0));
  filterFoodList();
  calcPreview();
  openModal('addModal');
}

async function saveFood() {
  const name = document.getElementById('foodNameInput').value.trim() || 'Продукт';
  const w = parseFloat(document.getElementById('weightInput').value) || 0;
  const phe100 = parseFloat(document.getElementById('phe100Input').value) || 0;
  const prot100 = parseFloat(document.getElementById('prot100Input').value) || 0;

  if (w <= 0) { alert('Укажите вес в граммах'); return; }

  const totalPhe = Math.round((w * phe100) / 100);
  const totalProt = parseFloat(((w * prot100) / 100).toFixed(2));
  const tempId = Date.now();

  appData.entries.push({ id: tempId, meal: activeMeal, name: name, weight: w, phe: totalPhe, prot: totalProt });
  saveLocal();
  render();
  closeModal('addModal');

  if (DB_URL.startsWith('http') && !DB_URL.includes('ВАШ_ПРОЕКТ')) {
    try {
      await fetch(DB_URL + '/rest/v1/diary_entries', {
        method: 'POST',
        headers: { 'apikey': DB_KEY, 'Authorization': 'Bearer ' + DB_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: currentTelegramId, entry_date: appData.today, meal_type: activeMeal, food_name: name, weight_g: w, phe_mg: totalPhe, protein_g: totalProt })
      });
    } catch(e){}
  }
}

async function deleteFood(id) {
  appData.entries = appData.entries.filter(e => e.id !== id);
  saveLocal();
  render();

  if (DB_URL.startsWith('http') && !DB_URL.includes('ВАШ_ПРОЕКТ')) {
    try {
      await fetch(DB_URL + '/rest/v1/diary_entries?id=eq.' + id, {
        method: 'DELETE',
        headers: { 'apikey': DB_KEY, 'Authorization': 'Bearer ' + DB_KEY }
      });
    } catch(e){}
  }
}

async function toggleAks(i) {
  appData.aks[i] = !appData.aks[i];
  saveLocal();
  render();

  if (DB_URL.startsWith('http') && !DB_URL.includes('ВАШ_ПРОЕКТ')) {
    try {
      await fetch(DB_URL + '/rest/v1/aks_logs', {
        method: 'POST',
        headers: { 'apikey': DB_KEY, 'Authorization': 'Bearer ' + DB_KEY, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({ telegram_id: currentTelegramId, log_date: appData.today, portion_index: i, is_taken: appData.aks[i] })
      });
    } catch(e){}
  }
}

function openModal(id) {
  if (id === 'settingsModal') {
    document.getElementById('settingDailyPhe').value = appData.settings.dailyPhe;
    document.getElementById('settingAksPortions').value = appData.settings.aksPortions;
  }
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

async function saveSettings() {
  const phe = parseInt(document.getElementById('settingDailyPhe').value) || 300;
  const aksCount = parseInt(document.getElementById('settingAksPortions').value) || 4;
  appData.settings.dailyPhe = phe;
  if (appData.settings.aksPortions !== aksCount) {
    appData.settings.aksPortions = aksCount;
    appData.aks = new Array(aksCount).fill(false);
  }
  saveLocal();
  render();
  closeModal('settingsModal');

  if (DB_URL.startsWith('http') && !DB_URL.includes('ВАШ_ПРОЕКТ')) {
    try {
      await fetch(DB_URL + '/rest/v1/users?telegram_id=eq.' + currentTelegramId, {
        method: 'PATCH',
        headers: { 'apikey': DB_KEY, 'Authorization': 'Bearer ' + DB_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ daily_phe: phe, aks_portions: aksCount })
      });
    } catch(e){}
  }
}

// Запуск
window.addEventListener('DOMContentLoaded', init);
init();
