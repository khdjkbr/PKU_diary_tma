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
window.changeDate = changeDate;

function openDatePicker() {
  const picker = document.getElementById('hiddenDatePicker');
  if (picker) {
    if (typeof picker.showPicker === 'function') picker.showPicker();
    else picker.click();
  }
}
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

  const titleEl = document.getElementById('quickRecipeTitle
