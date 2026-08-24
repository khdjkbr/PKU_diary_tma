// app.js — Логика приложения ФКУ Дневник

const DB_URL = (typeof window.SUPABASE_URL !== 'undefined') ? window.SUPABASE_URL : '';
const DB_KEY = (typeof window.SUPABASE_KEY !== 'undefined') ? window.SUPABASE_KEY : '';

const tg = window?.Telegram?.WebApp;
if (tg) {
  try { tg.ready(); tg.expand(); } catch(e){}
}

const tgUser = tg?.initDataUnsafe?.user || { id: 99999999, first_name: "Пользователь" };
const currentTelegramId = tgUser.id;

// Базы данных
let userCustomProducts = [];
let allRecipes = [];

let currentRecipeIngredients = [];
let selectedRecipeForQuickAdd = null;

let currentFilteredList = [];
let currentDateObj = new Date();
let currentCategory = 'all';
let currentRecipeFilter = 'all';

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

// 1. ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ
function switchView(viewName) {
  const isDiary = (viewName === 'diary');
  
  const vDiary = document.getElementById('viewDiary');
  if (vDiary) vDiary.style.display = isDiary ? 'block' : 'none';

  const vRecipes = document.getElementById('viewRecipes');
  if (vRecipes) vRecipes.style.display = isDiary ? 'none' : 'block';

  const fabLabel = document.getElementById('navFabLabel');
  if (fabLabel) fabLabel.style.color = isDiary ? '#10b981' : '#64748b';

  const btnRec = document.getElementById('navBtnRecipes');
  if (btnRec && btnRec.classList) btnRec.classList.toggle('active', !isDiary);

  const btnConst = document.getElementById('navBtnConstructor');
  if (btnConst && btnConst.classList) btnConst.classList.remove('active');

  if (viewName === 'recipes') {
    renderRecipes();
    loadRecipesFromSupabase();
  }
}
window._realSwitchView = switchView;
window.switchView = switchView;

function getAllProducts() {
  const base = (typeof window.FOOD_BASE !== 'undefined') ? window.FOOD_BASE : [];
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
window._realChangeDate = changeDate;
window.changeDate = changeDate;

function openDatePicker() {
  const picker = document.getElementById('hiddenDatePicker');
  if (picker) {
    if (typeof picker.showPicker === 'function') picker.showPicker();
    else picker.click();
  }
}
window._realOpenDatePicker = openDatePicker;
window.openDatePicker = openDatePicker;

function onDatePicked(val) {
  if (!val) return;
  const parts = val.split('-');
  currentDateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  updateDateUI();
}
window.onDatePicked = onDatePicked;

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

    const savedRecipes = localStorage.getItem('pku_all_recipes_' + currentTelegramId);
    if (savedRecipes) {
      try { allRecipes = JSON.parse(savedRecipes); } catch(e){}
    }

    filterFoodList();
    updateDateUI();
    checkTelegramDeepLink();
  } catch(e){
    console.error('init error:', e);
  }
}

function checkTelegramDeepLink() {
  const startParam = tg?.initDataUnsafe?.start_param;
  if (startParam && startParam.startsWith('recipe_')) {
    const recipeId = parseInt(startParam.replace('recipe_', ''));
    switchView('recipes');
    setTimeout(() => {
      const target = allRecipes.find(r => r.id === recipeId);
      if (target) {
        const idx = allRecipes.indexOf(target);
        openQuickAddRecipe(idx);
      }
    }, 600);
  }
}

// 2. РЕЦЕПТЫ И КОНСТРУКТОР
function switchRecipeTab(filter) {
  currentRecipeFilter = filter;
  const tabAll = document.getElementById('tabAllRecipes');
  if (tabAll && tabAll.classList) tabAll.classList.toggle('active', filter === 'all');

  const tabMy = document.getElementById('tabMyRecipes');
  if (tabMy && tabMy.classList) tabMy.classList.toggle('active', filter === 'my');

  renderRecipes();
}
window.switchRecipeTab = switchRecipeTab;

function renderRecipes() {
  const container = document.getElementById('recipesContainer');
  if (!container) return;

  const list = (currentRecipeFilter === 'my') 
    ? allRecipes.filter(r => r.telegram_id === currentTelegramId)
    : allRecipes;

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:30px 16px; color:#94a3b8;">
        <div style="font-size:32px; margin-bottom:8px;">🍲</div>
        <div style="font-size:14px; font-weight:600; color:#64748b;">${currentRecipeFilter === 'my' ? 'У вас пока нет личных рецептов' : 'В книге сообщества пока нет рецептов'}</div>
        <div style="font-size:12px; margin-top:4px;">Нажмите "+ Создать" или кнопку "Конструктор" внизу, чтобы добавить блюдо!</div>
      </div>
    `;
    return;
  }

  let html = '';
  list.forEach((r) => {
    const isOwner = (r.telegram_id === currentTelegramId);
    const globalIdx = allRecipes.indexOf(r);
    const ingrText = (r.ingredients || []).map(i => `${i.name} (${i.weight}г)`).join(', ');

    html += `
      <div class="recipe-card">
        <div class="recipe-header">
          <div>
            <div class="recipe-title">🍲 ${r.title}</div>
            <div class="recipe-author">${isOwner ? '⭐ Ваш рецепт' : 'Автор: ' + (r.author_name || 'Сообщество')} • Выход: ${r.cooked_weight} г</div>
          </div>
          ${isOwner ? `<button onclick="deleteRecipe(${globalIdx})" style="border:none; background:none; color:#ef4444; font-size:14px; cursor:pointer;">🗑️</button>` : ''}
        </div>

        <div style="font-size:12px; color:#475569; margin: 6px 0;">
          <b>Состав:</b> <span style="color:#64748b;">${ingrText}</span>
        </div>

        <div class="recipe-pills">
          <div class="recipe-pill">${r.phe_per_100} мг Фа / 100г</div>
          <div class="recipe-pill" style="background:#eff6ff; border-color:#bfdbfe; color:#1d4ed8;">${r.prot_per_100} г белка / 100г</div>
        </div>

        <div class="recipe-actions">
          <button class="recipe-btn-sm" style="background:#ecfdf5; color:#047857;" onclick="openQuickAddRecipe(${globalIdx})">➕ В дневник</button>
          <button class="recipe-btn-sm" style="background:#f1f5f9; color:#334155;" onclick="shareRecipe(${globalIdx})">🔗 Поделиться</button>
          ${isOwner ? `
            <button class="recipe-btn-sm" style="background:${r.is_public ? '#fef3c7' : '#f1f5f9'}; color:${r.is_public ? '#b45309' : '#64748b'};" onclick="toggleRecipePublic(${globalIdx})">
              ${r.is_public ? '🌍 Публичный' : '🔒 Личный'}
            </button>
          ` : ''}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

async function shareRecipe(idx) {
  const r = allRecipes[idx];
  if (!r) return;

  if (!r.is_public && r.telegram_id === currentTelegramId) {
    if (confirm('Этот рецепт сейчас личный. Сделать его публичным, чтобы получатель смог его открыть?')) {
      await toggleRecipePublic(idx);
    } else {
      return;
    }
  }

  const botUsername = tg?.initDataUnsafe?.bot?.username || 'pku_diary_bot';
  const deepLink = `https://t.me/${botUsername}?startapp=recipe_${r.id || 'shared'}`;
  const text = `🍲 Попробуйте рецепт для диеты ФКУ: "${r.title}"\n` +
               `📊 ${r.phe_per_100} мг Фа и ${r.prot_per_100}г белка на 100г.\n\n` +
               `👉 Открыть рецепт в приложении:\n${deepLink}`;

  if (tg && tg.openTelegramLink) {
    tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(text)}`);
  } else {
    navigator.clipboard.writeText(text).then(() => {
      alert('Ссылка на рецепт скопирована! Можете отправить её в Telegram.');
    });
  }
}
window.shareRecipe = shareRecipe;

function openQuickAddRecipe(idx) {
  selectedRecipeForQuickAdd = allRecipes[idx];
  if (!selectedRecipeForQuickAdd) return;

  const titleEl = document.getElementById('quickRecipeTitle');
  if (titleEl) titleEl.textContent = `Добавить "${selectedRecipeForQuickAdd.title}"`;
  
  const wEl = document.getElementById('quickRecipeWeight');
  if (wEl) wEl.value = '100';
  
  calcQuickRecipePreview();
  openModal('quickAddRecipeModal');
}
window.openQuickAddRecipe = openQuickAddRecipe;

function calcQuickRecipePreview() {
  if (!selectedRecipeForQuickAdd) return;
  const wEl = document.getElementById('quickRecipeWeight');
  const w = wEl ? parseFloat(wEl.value) || 0 : 0;
  const phe = Math.round((w * selectedRecipeForQuickAdd.phe_per_100) / 100);
  const prot = parseFloat(((w * selectedRecipeForQuickAdd.prot_per_100) / 100).toFixed(2));
  
  const prev = document.getElementById('quickRecipePreviewCalc');
  if (prev) prev.textContent = `${phe} мг Фа (${prot} г б.)`;
}
window.calcQuickRecipePreview = calcQuickRecipePreview;

function confirmQuickAddRecipe() {
  if (!selectedRecipeForQuickAdd) return;
  const meal = document.getElementById('quickRecipeMealSelect')?.value || 'Обед';
  const wEl = document.getElementById('quickRecipeWeight');
  const w = wEl ? parseFloat(wEl.value) || 0 : 0;

  if (w <= 0) {
    alert('Укажите вес съеденной порции');
    return;
  }

  const phe = Math.round((w * selectedRecipeForQuickAdd.phe_per_100) / 100);
  const prot = parseFloat(((w * selectedRecipeForQuickAdd.prot_per_100) / 100).toFixed(2));

  appData.entries.push({
    id: Date.now(),
    meal: meal,
    name: '🍲 ' + selectedRecipeForQuickAdd.title,
    weight: w,
    phe: phe,
    prot: prot
  });

  saveLocal();
  closeModal('quickAddRecipeModal');
  switchView('diary');
  alert(`Блюдо "${selectedRecipeForQuickAdd.title}" (${w}г) добавлено в ${meal}!`);
}
window.confirmQuickAddRecipe = confirmQuickAddRecipe;

function openRecipeModal() {
  currentRecipeIngredients = [];
  const nameEl = document.getElementById('recipeNameInput');
  if (nameEl) nameEl.value = '';
  
  const wCooked = document.getElementById('recipeCookedWeightInput');
  if (wCooked) wCooked.value = '';
  
  const resPhe = document.getElementById('recipeResultPhe');
  if (resPhe) resPhe.textContent = '0 мг Фа';
  
  const resProt = document.getElementById('recipeResultProt');
  if (resProt) resProt.textContent = '0.0 г белка';
  
  const checkPub = document.getElementById('recipeIsPublicCheck');
  if (checkPub) checkPub.checked = true;

  const sel = document.getElementById('recipeIngredientSelect');
  if (sel) {
    sel.innerHTML = '<option value="">-- Выберите продукт из базы --</option>';
    const all = getAllProducts();
    all.forEach((item, idx) => {
      sel.innerHTML += `<option value="${idx}">${item.name} (${item.phe} мг Фа / 100г)</option>`;
    });
  }

  renderRecipeIngredientsList();
  openModal('recipeModal');
}
window._realOpenRecipeModal = openRecipeModal;
window.openRecipeModal = openRecipeModal;

function addIngredientToRecipe() {
  const sel = document.getElementById('recipeIngredientSelect');
  const weightInput = document.getElementById('recipeIngredientWeight');
  const idx = parseInt(sel?.value);
  const weight = parseFloat(weightInput?.value) || 0;

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

  if (weightInput) weightInput.value = '';
  renderRecipeIngredientsList();
  calculateRecipeTotals();
}
window.addIngredientToRecipe = addIngredientToRecipe;

function removeIngredientFromRecipe(index) {
  currentRecipeIngredients.splice(index, 1);
  renderRecipeIngredientsList();
  calculateRecipeTotals();
}
window.removeIngredientFromRecipe = removeIngredientFromRecipe;

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

  const wCookedEl = document.getElementById('recipeCookedWeightInput');
  let cookedWeight = parseFloat(wCookedEl?.value) || totalRawWeight;
  if (cookedWeight <= 0) cookedWeight = totalRawWeight;

  if (cookedWeight > 0) {
    const phePer100 = Math.round((totalRawPhe / cookedWeight) * 100);
    const protPer100 = parseFloat(((totalRawProt / cookedWeight) * 100).toFixed(2));

    const resPhe = document.getElementById('recipeResultPhe');
    if (resPhe) resPhe.textContent = phePer100 + ' мг Фа';
    
    const resProt = document.getElementById('recipeResultProt');
    if (resProt) resProt.textContent = protPer100 + ' г белка';
  }
}
window.calculateRecipeTotals = calculateRecipeTotals;

async function saveRecipe() {
  const name = document.getElementById('recipeNameInput')?.value.trim();
  const isPublic = document.getElementById('recipeIsPublicCheck')?.checked || false;

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

  const wCookedEl = document.getElementById('recipeCookedWeightInput');
  let cookedWeight = parseFloat(wCookedEl?.value) || totalRawWeight;
  const finalPhe100 = Math.round((totalRawPhe / cookedWeight) * 100);
  const finalProt100 = parseFloat(((totalRawProt / cookedWeight) * 100).toFixed(2));

  const newRecipe = {
    id: Date.now(),
    telegram_id: currentTelegramId,
    author_name: tgUser.first_name || 'Пользователь',
    title: name,
    ingredients: currentRecipeIngredients,
    cooked_weight: cookedWeight,
    phe_per_100: finalPhe100,
    prot_per_100: finalProt100,
    is_public: isPublic
  };

  allRecipes.unshift(newRecipe);
  localStorage.setItem('pku_all_recipes_' + currentTelegramId, JSON.stringify(allRecipes));

  if (DB_URL.startsWith('http') && !DB_URL.includes('ВАШ_ПРОЕКТ')) {
    try {
      const res = await fetch(DB_URL + '/rest/v1/recipes', {
        method: 'POST',
        headers: { 'apikey': DB_KEY, 'Authorization': 'Bearer ' + DB_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(newRecipe)
      });
      const data = await res.json();
      if (data && data.length > 0) newRecipe.id = data[0].id;
    } catch(e){}
  }

  alert('Рецепт успешно сохранен!');
  closeModal('recipeModal');
  switchView('recipes');
}
window.saveRecipe = saveRecipe;

async function toggleRecipePublic(idx) {
  const r = allRecipes[idx];
  if (!r) return;
  r.is_public = !r.is_public;
  localStorage.setItem('pku_all_recipes_' + currentTelegramId, JSON.stringify(allRecipes));
  renderRecipes();

  if (DB_URL.startsWith('http') && !DB_URL.includes('ВАШ_ПРОЕКТ')) {
    try {
      await fetch(DB_URL + '/rest/v1/recipes?id=eq.' + r.id, {
        method: 'PATCH',
        headers: { 'apikey': DB_KEY, 'Authorization': 'Bearer ' + DB_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: r.is_public })
      });
    } catch(e){}
  }
}
window.toggleRecipePublic = toggleRecipePublic;

async function deleteRecipe(idx) {
  if (confirm('Удалить этот рецепт?')) {
    const r = allRecipes[idx];
    allRecipes.splice(idx, 1);
    localStorage.setItem('pku_all_recipes_' + currentTelegramId, JSON.stringify(allRecipes));
    renderRecipes();

    if (DB_URL.startsWith('http') && !DB_URL.includes('ВАШ_ПРОЕКТ') && r?.id) {
      try {
        await fetch(DB_URL + '/rest/v1/recipes?id=eq.' + r.id, {
          method: 'DELETE',
          headers: { 'apikey': DB_KEY, 'Authorization': 'Bearer ' + DB_KEY }
        });
      } catch(e){}
    }
  }
}
window.deleteRecipe = deleteRecipe;

async function loadRecipesFromSupabase() {
  if (!DB_URL.startsWith('http') || DB_URL.includes('ВАШ_ПРОЕКТ')) return;
  try {
    const headers = { 'apikey': DB_KEY, 'Authorization': 'Bearer ' + DB_KEY };
    const res = await fetch(DB_URL + '/rest/v1/recipes?or=(is_public.eq.true,telegram_id.eq.' + currentTelegramId + ')&order=created_at.desc', { headers });
    const data = await res.json();
    if (data && Array.isArray(data)) {
      allRecipes = data;
      localStorage.setItem('pku_all_recipes_' + currentTelegramId, JSON.stringify(allRecipes));
      renderRecipes();
    }
  } catch(e){}
}

// 3. ДНЕВНИК И ПРОДУКТЫ
function setCategory(cat, btn) {
  currentCategory = cat;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  if (btn && btn.classList) btn.classList.add('active');
  filterFoodList();
}
window.setCategory = setCategory;

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
window.filterFoodList = filterFoodList;

function renderFoodSearchList() {
  const container = document.getElementById('foodSearchListContainer');
  if (!container) return;

  if (currentFilteredList.length === 0) {
    container.innerHTML = '<div style="padding:12px; text-align:center; font-size:12px; color:#94a3b8;">Ничего не найдено</div>';
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
              '</div>' +
            '</div>';
  }
  container.innerHTML = html;
}

function selectFoodByIndex(i) {
  const item = currentFilteredList[i];
  if (!item) return;
  const nameEl = document.getElementById('foodNameInput');
  if (nameEl) nameEl.value = item.name;
  
  const pheEl = document.getElementById('phe100Input');
  if (pheEl) pheEl.value = item.phe;
  
  const protEl = document.getElementById('prot100Input');
  if (protEl) protEl.value = item.prot;
  
  calcPreview();
}
window.selectFoodByIndex = selectFoodByIndex;

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
    
    const limitPheEl = document.getElementById('limitPheText');
    if (limitPheEl) limitPheEl.textContent = limitPhe;
    
    const limitProtEl = document.getElementById('limitProteinText');
    if (limitProtEl) limitProtEl.textContent = limitProt;

    let consumedPhe = 0;
    let consumedProt = 0;
    const
