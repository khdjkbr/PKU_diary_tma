// app.js — Логика приложения ФКУ Дневник (с поддержкой Конструктора Рецептов)

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

// Личные продукты и рецепты пользователя
let userCustomProducts = [];

// Временные ингредиенты для текущего создаваемого рецепта
let currentRecipeIngredients = [];

let currentFilteredList = [];
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

// Объединенный список (общая база + личные продукты/рецепты)
function getAllProducts() {
  const base = (typeof FOOD_BASE !== 'undefined') ? FOOD_BASE : [];
  const custom = userCustomProducts.map((p, idx) => ({ ...p, cat: 'custom', isCustom: true, customIndex: idx }));
  return [...custom, ...base];
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

    const savedCustom = localStorage.getItem('pku_custom_products_' + currentTelegramId);
    if (savedCustom) {
      try { userCustomProducts = JSON.parse(savedCustom); } catch(e){}
    }

    setupCustomCategoryChip();
    setupRecipeUI();

    filterFoodList();
    updateDateUI();
  } catch(e){
    console.error('init error:', e);
  }
}

function setupCustomCategoryChip() {
  const chipContainer = document.querySelector('.category-chips');
  if (chipContainer && !document.getElementById('customChipBtn')) {
    const btn = document.createElement('button');
    btn.id = 'customChipBtn';
    btn.className = 'chip';
    btn.textContent = '⭐ Мои продукты / Рецепты';
    btn.onclick = function() { setCategory('custom', this); };
    chipContainer.insertBefore(btn, chipContainer.children[1]);
  }
}

// Встраиваем кнопку Рецептов в шапку и модальное окно конструктора
function setupRecipeUI() {
  const topHeader = document.querySelector('.header-top');
  if (topHeader && !document.getElementById('recipeBtn')) {
    const btn = document.createElement('button');
    btn.id = 'recipeBtn';
    btn.className = 'icon-btn';
    btn.style.marginRight = '6px';
    btn.textContent = '🍲';
    btn.title = 'Конструктор рецептов';
    btn.onclick = openRecipeModal;
    topHeader.insertBefore(btn, topHeader.querySelector('.icon-btn'));
  }

  // Создаем модальное окно рецептов, если его еще нет
  if (!document.getElementById('recipeModal')) {
    const modalDiv = document.createElement('div');
    modalDiv.id = 'recipeModal';
    modalDiv.className = 'modal';
    modalDiv.innerHTML = `
      <div class="modal-content">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="font-size:16px; font-weight:700;">🍲 Конструктор рецептов</h3>
          <button class="icon-btn" onclick="closeModal('recipeModal')">✕</button>
        </div>

        <div class="input-group">
          <label class="input-label">Название составного блюда</label>
          <input type="text" id="recipeNameInput" class="input-control" placeholder="Например: Овощной суп с н/б макаронами">
        </div>

        <!-- Добавление ингредиента -->
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:10px; margin-bottom:10px;">
          <span style="font-size:11px; font-weight:700; color:#475569; text-transform:uppercase;">Добавить ингредиент</span>
          <div style="margin-top:6px;">
            <select id="recipeIngredientSelect" class="input-control" style="margin-bottom:6px;">
              <option value="">-- Выберите продукт --</option>
            </select>
          </div>
          <div style="display:flex; gap:6px;">
            <input type="number" id="recipeIngredientWeight" class="input-control" placeholder="Вес (г)" style="width:120px;">
            <button class="btn-primary" style="padding:8px 12px; font-size:12px;" onclick="addIngredientToRecipe()">+ Добавить</button>
          </div>
        </div>

        <!-- Список добавленных ингредиентов -->
        <div style="margin-bottom:10px;">
          <span style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Ингредиенты блюда:</span>
          <div id="recipeIngredientsList" style="margin-top:4px; max-height:120px; overflow-y:auto;">
            <div style="font-size:12px; color:#94a3b8; padding:6px 0;">Ингредиенты еще не добавлены</div>
          </div>
        </div>

        <div class="input-group">
          <label class="input-label">Итоговый вес готового блюда (г)</label>
          <input type="number" id="recipeCookedWeightInput" class="input-control input-highlight" placeholder="Например: 500" oninput="calculateRecipeTotals()">
          <span style="font-size:10px; color:#64748b; display:block; margin-top:2px;">Взвесьте кастрюлю/блюдо после приготовления</span>
        </div>

        <!-- Итоговые показатели на 100г -->
        <div style="background:#ecfdf5; border:1px solid #a7f3d0; padding:12px; border-radius:12px; margin-bottom:12px;">
          <div style="font-size:11px; color:#065f46; font-weight:600;">РАСЧЕТ НА 100 Г ГОТОВОГО БЛЮДА:</div>
          <div style="display:flex; justify-content:space-between; align-items:baseline; margin-top:4px;">
            <span style="font-size:16px; font-weight:800; color:#047857;" id="recipeResultPhe">0 мг Фа</span>
            <span style="font-size:13px; font-weight:700; color:#047857;" id="recipeResultProt">0.0 г белка</span>
          </div>
        </div>

        <button class="btn-primary" onclick="saveRecipeToProducts()">⭐ Сохранить рецепт в Мои продукты</button>
      </div>
    `;
    document.body.appendChild(modalDiv);
  }
}

function openRecipeModal() {
  currentRecipeIngredients = [];
  document.getElementById('recipeNameInput').value = '';
  document.getElementById('recipeCookedWeightInput').value = '';
  document.getElementById('recipeResultPhe').textContent = '0 мг Фа';
  document.getElementById('recipeResultProt').textContent = '0.0 г белка';
  
  // Заполняем список ингредиентов
  const sel = document.getElementById('recipeIngredientSelect');
  sel.innerHTML = '<option value="">-- Выберите продукт --</option>';
  const all = getAllProducts();
  all.forEach((item, idx) => {
    sel.innerHTML += `<option value="${idx}">${item.name} (${item.phe} мг Фа / 100г)</option>`;
  });

  renderRecipeIngredientsList();
  openModal('recipeModal');
}

function addIngredientToRecipe() {
  const sel = document.getElementById('recipeIngredientSelect');
  const weightInput = document.getElementById('recipeIngredientWeight');
  const idx = parseInt(sel.value);
  const weight = parseFloat(weightInput.value) || 0;

  if (isNaN(idx) || idx < 0) {
    alert('Пожалуйста, выберите продукт');
    return;
  }
  if (weight <= 0) {
    alert('Укажите вес ингредиента в граммах');
    return;
  }

  const all = getAllProducts();
  const product = all[idx];

  currentRecipeIngredients.push({
    name: product.name,
    weight: weight,
    phe: product.phe,
    prot: product.prot
  });

  weightInput.value = '';
  renderRecipeIngredientsList();
  calculateRecipeTotals();
}

function removeIngredientFromRecipe(index) {
  currentRecipeIngredients.splice(index, 1);
  renderRecipeIngredientsList();
  calculateRecipeTotals();
}

function renderRecipeIngredientsList() {
  const container = document.getElementById('recipeIngredientsList');
  if (!container) return;

  if (currentRecipeIngredients.length === 0) {
    container.innerHTML = '<div style="font-size:12px; color:#94a3b8; padding:6px 0;">Ингредиенты еще не добавлены</div>';
    return;
  }

  let html = '';
  currentRecipeIngredients.forEach((item, i) => {
    const itemPhe = Math.round((item.weight * item.phe) / 100);
    html += `
      <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; border:1px solid #e2e8f0; padding:6px 8px; border-radius:8px; margin-bottom:4px; font-size:12px;">
        <div><b>${item.name}</b> — ${item.weight} г <span style="color:#64748b;">(${itemPhe} мг Фа)</span></div>
        <button onclick="removeIngredientFromRecipe(${i})" style="background:none; border:none; color:#ef4444; font-size:14px; cursor:pointer;">✕</button>
      </div>
    `;
  });
  container.innerHTML = html;
}

function calculateRecipeTotals() {
  let totalRawPhe = 0;
  let totalRawProt = 0;
  let totalRawWeight = 0;

  currentRecipeIngredients.forEach(item => {
    totalRawPhe += (item.weight * item.phe) / 100;
    totalRawProt += (item.weight * item.prot) / 100;
    totalRawWeight += item.weight;
  });

  let cookedWeight = parseFloat(document.getElementById('recipeCookedWeightInput').value) || totalRawWeight;
  if (cookedWeight <= 0) cookedWeight = totalRawWeight;

  if (cookedWeight > 0) {
    const phePer100 = Math.round((totalRawPhe / cookedWeight) * 100);
    const protPer100 = parseFloat(((totalRawProt / cookedWeight) * 100).toFixed(2));

    document.getElementById('recipeResultPhe').textContent = phePer100 + ' мг Фа';
    document.getElementById('recipeResultProt').textContent = protPer100 + ' г белка';
  }
}

function saveRecipeToProducts() {
  const name = document.getElementById('recipeNameInput').value.trim();
  if (!name) {
    alert('Введите название рецепта');
    return;
  }
  if (currentRecipeIngredients.length === 0) {
    alert('Добавьте хотя бы один ингредиент');
    return;
  }

  let totalRawPhe = 0;
  let totalRawProt = 0;
  let totalRawWeight = 0;

  currentRecipeIngredients.forEach(item => {
    totalRawPhe += (item.weight * item.phe) / 100;
    totalRawProt += (item.weight * item.prot) / 100;
    totalRawWeight += item.weight;
  });

  let cookedWeight = parseFloat(document.getElementById('recipeCookedWeightInput').value) || totalRawWeight;
  const finalPhe100 = Math.round((totalRawPhe / cookedWeight) * 100);
  const finalProt100 = parseFloat(((totalRawProt / cookedWeight) * 100).toFixed(2));

  userCustomProducts.push({
    name: '🍲 ' + name,
    phe: finalPhe100,
    prot: finalProt100
  });

  localStorage.setItem('pku_custom_products_' + currentTelegramId, JSON.stringify(userCustomProducts));
  alert('Рецепт "' + name + '" успешно сохранен в вашу базу!');
  closeModal('recipeModal');
  filterFoodList();
}

function setCategory(cat, btn) {
  currentCategory = cat;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  filterFoodList();
}

function filterFoodList() {
  const query = (document.getElementById('foodSearchInput')?.value || '').toLowerCase().trim();
  const all = getAllProducts();
  currentFilteredList = all.filter(item => {
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
    const icon = f.isCustom ? '⭐ ' : '';
    html += '<div class="search-item" onclick="selectFoodByIndex(' + i + ')">' +
              '<div class="search-item-name">' + icon + f.name + '</div>' +
              '<div style="display:flex; align-items:center; gap:8px;">' +
                '<div class="search-item-meta">' + f.phe + ' мг Фа <span style="color:#64748b; font-weight:normal;">(' + f.prot + 'г б.)</span></div>' +
                (f.isCustom ? '<button onclick="event.stopPropagation(); deleteCustomProduct(' + f.customIndex + ')" style="border:none; background:none; color:#ef4444; font-size:13px; cursor:pointer; padding:2px;">✕</button>' : '') +
              '</div>' +
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

function deleteCustomProduct(index) {
  if (confirm('Удалить этот продукт/рецепт из вашей личной базы?')) {
    userCustomProducts.splice(index, 1);
    localStorage.setItem('pku_custom_products_' + currentTelegramId, JSON.stringify(userCustomProducts));
    filterFoodList();
  }
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
