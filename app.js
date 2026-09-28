// app.js — Логика приложения ФКУ Компас

// 1. ИНИЦИАЛИЗАЦИЯ КЛЮЧЕЙ И TELEGRAM
    const DB_URL = (typeof window.SUPABASE_URL !== 'undefined') ? window.SUPABASE_URL : '';
    const DB_KEY = (typeof window.SUPABASE_KEY !== 'undefined') ? window.SUPABASE_KEY : '';
    const hasSupabase = DB_URL.startsWith('http') && !DB_URL.includes('ВАШ_ПРОЕКТ') && DB_KEY.startsWith('eyJ');

    const tg = window?.Telegram?.WebApp;
    if (tg) {
      try { tg.ready(); tg.expand(); } catch(e){}
    }

    const tgUser = tg?.initDataUnsafe?.user || { id: 99999999, first_name: "Пользователь" };
    const currentTelegramId = tgUser.id;
    let userCustomProducts = [];
    let allRecipes = [];
    let currentRecipeIngredients = [];
    let selectedRecipeForQuickAdd = null;

    let currentFilteredList = [];
    let currentDateObj = new Date();
    let currentCategory = 'all';
    let currentProductCategory = 'all';
    let currentExpandedProductIndex = null;
    let currentRecipeFilter = 'all';

    let appData = {
      settings: { dailyPhe: 300, aksPortions: 4 },
      today: getFormattedDate(currentDateObj),
      aks: [false, false, false, false],
      entries: []
    };

    let activeMeal = 'Завтрак';

    function supabaseHeaders(extra = {}) {
      return {
        apikey: DB_KEY,
        Authorization: 'Bearer ' + DB_KEY,
        ...extra
      };
    }

    async function supabaseRequest(path, options = {}) {
      if (!hasSupabase) {
        throw new Error('Supabase is not configured');
      }

      const res = await fetch(DB_URL + path, {
        ...options,
        headers: {
          ...supabaseHeaders(),
          ...(options.headers || {})
        }
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || ('Supabase request failed: ' + res.status));
      }

      if (res.status === 204) return null;
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    }

    function setCloudStatus(state, message) {
      const badge = document.getElementById('profileCloudBadge');
      if (!badge) return;

      const states = {
        ok: ['#dcfce7', '#15803d', '● '],
        pending: ['#fef3c7', '#b45309', '● '],
        error: ['#fee2e2', '#b91c1c', '● '],
        off: ['#f1f5f9', '#64748b', '● ']
      };
      const [bg, color, prefix] = states[state] || states.off;
      badge.style.background = bg;
      badge.style.color = color;
      badge.textContent = prefix + message;
    }

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char]));
    }

    function mapDiaryEntry(row) {
      return {
        id: row.id,
        meal: row.meal_type,
        name: row.food_name,
        weight: Number(row.weight_g),
        phe: Number(row.phe_mg),
        prot: Number(row.protein_g)
      };
    }

    function getFormattedDate(d) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return year + '-' + month + '-' + day;
    }

    // 3. ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ
    function switchView(viewName) {
      const isDiary = (viewName === 'diary');
      const isRecipes = (viewName === 'recipes');
      const isProducts = (viewName === 'products');
      
      const vDiary = document.getElementById('viewDiary');
      if (vDiary) vDiary.style.display = isDiary ? 'block' : 'none';

      const vRecipes = document.getElementById('viewRecipes');
      if (vRecipes) vRecipes.style.display = isRecipes ? 'block' : 'none';

      const vProducts = document.getElementById('viewProducts');
      if (vProducts) vProducts.style.display = isProducts ? 'block' : 'none';

      const fabLabel = document.getElementById('navFabLabel');
      if (fabLabel) fabLabel.style.color = isDiary ? '#10b981' : '#64748b';

      const btnDiary = document.getElementById('navBtnDiary');
      if (btnDiary && btnDiary.classList) btnDiary.classList.toggle('active', isDiary);

      const btnRec = document.getElementById('navBtnRecipes');
      if (btnRec && btnRec.classList) btnRec.classList.toggle('active', isRecipes);

      const btnProducts = document.getElementById('navBtnProducts');
      if (btnProducts && btnProducts.classList) btnProducts.classList.toggle('active', isProducts);

      const btnProf = document.getElementById('navBtnProfile');
      if (btnProf && btnProf.classList) btnProf.classList.remove('active');

      if (isRecipes) {
        renderRecipes();
        loadRecipesFromSupabase();
      }

      if (isProducts) {
        renderProductsPage();
      }
    }
    window.switchView = switchView;

    function getAllProducts() {
      const custom = userCustomProducts.map((p, idx) => ({ ...p, cat: 'custom', isCustom: true, customIndex: idx }));
      return [...custom, ...(window.FOOD_BASE || [])];
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

    function loadCachedDayData() {
      const local = localStorage.getItem('pku_diary_' + currentTelegramId + '_' + appData.today);
      if (!local) return false;

      try {
        const parsed = JSON.parse(local);
        appData.entries = parsed.entries || [];
        appData.aks = parsed.aks || new Array(appData.settings.aksPortions).fill(false);
        return true;
      } catch(e) {
        return false;
      }
    }

    async function loadDayData() {
      if (!hasSupabase) {
        setCloudStatus('off', 'Облачная синхронизация не настроена');
        if (!loadCachedDayData()) {
          appData.entries = [];
          appData.aks = new Array(appData.settings.aksPortions).fill(false);
        }
        render();
        return;
      }

      setCloudStatus('pending', 'Синхронизация...');
      appData.entries = [];
      appData.aks = new Array(appData.settings.aksPortions).fill(false);
      render();
      await syncWithSupabase();
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

        const profName = document.getElementById('profileUserName');
        if (profName) profName.textContent = tgUser.first_name || 'Пользователь Telegram';
        
        const profId = document.getElementById('profileUserId');
        if (profId) profId.textContent = currentTelegramId;

        setCloudStatus(hasSupabase ? 'pending' : 'off', hasSupabase ? 'Синхронизация...' : 'Облачная синхронизация не настроена');
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

    // 4. ЛОГИКА РЕЦЕПТОВ
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
        ? allRecipes.filter(r => String(r.telegram_id) === String(currentTelegramId))
        : allRecipes;

      if (list.length === 0) {
        container.innerHTML = `
          <div style="text-align:center; padding:30px 16px; color:#94a3b8;">
            <div style="font-size:32px; margin-bottom:8px;">🍲</div>
            <div style="font-size:14px; font-weight:600; color:#64748b;">${currentRecipeFilter === 'my' ? 'У вас пока нет личных рецептов' : 'В книге сообщества пока нет рецептов'}</div>
            <div style="font-size:12px; margin-top:4px;">Нажмите "+ Создать", чтобы добавить первое блюдо!</div>
          </div>
        `;
        return;
      }

      let html = '';
      list.forEach((r) => {
        const isOwner = (String(r.telegram_id) === String(currentTelegramId));
        const globalIdx = allRecipes.indexOf(r);
        const ingrText = (r.ingredients || []).map(i => `${escapeHtml(i.name)} (${i.weight}г)`).join(', ');
        const title = escapeHtml(r.title);
        const author = escapeHtml(r.author_name || 'Сообщество');

        html += `
          <div class="recipe-card">
            <div class="recipe-header">
              <div>
                <div class="recipe-title">🍲 ${title}</div>
                <div class="recipe-author">${isOwner ? '⭐ Ваш рецепт' : 'Автор: ' + author} • Выход: ${r.cooked_weight} г</div>
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

      if (!r.is_public && String(r.telegram_id) === String(currentTelegramId)) {
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

    async function confirmQuickAddRecipe() {
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

      const entry = {
        meal: meal,
        name: '🍲 ' + selectedRecipeForQuickAdd.title,
        weight: w,
        phe: phe,
        prot: prot
      };

      const saved = await createDiaryEntry(entry);
      if (!saved) return;

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
          sel.innerHTML += `<option value="${idx}">${escapeHtml(item.name)} (${item.phe} мг Фа / 100г)</option>`;
        });
      }

      renderRecipeIngredientsList();
      openModal('recipeModal');
    }
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
            <div><b>${escapeHtml(item.name)}</b> — ${item.weight} г <span style="color:#64748b;">(${itemPhe} мг Фа)</span></div>
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
        telegram_id: currentTelegramId,
        author_name: tgUser.first_name || 'Пользователь',
        title: name,
        ingredients: currentRecipeIngredients,
        cooked_weight: cookedWeight,
        phe_per_100: finalPhe100,
        prot_per_100: finalProt100,
        is_public: isPublic
      };

      if (hasSupabase) {
        try {
          const data = await supabaseRequest('/rest/v1/recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
            body: JSON.stringify(newRecipe)
          });
          allRecipes.unshift(data?.[0] || newRecipe);
        } catch(e) {
          setCloudStatus('error', 'Ошибка сохранения рецепта');
          alert('Не удалось сохранить рецепт на сервере. Проверьте подключение и настройки Supabase.');
          console.error('saveRecipe error:', e);
          return;
        }
      } else {
        newRecipe.id = Date.now();
        allRecipes.unshift(newRecipe);
      }

      localStorage.setItem('pku_all_recipes_' + currentTelegramId, JSON.stringify(allRecipes));
      setCloudStatus(hasSupabase ? 'ok' : 'off', hasSupabase ? 'Данные сохранены на сервере' : 'Локальный режим');
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

      if (hasSupabase) {
        try {
          await supabaseRequest('/rest/v1/recipes?id=eq.' + encodeURIComponent(r.id), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_public: r.is_public })
          });
          setCloudStatus('ok', 'Данные сохранены на сервере');
        } catch(e) {
          r.is_public = !r.is_public;
          localStorage.setItem('pku_all_recipes_' + currentTelegramId, JSON.stringify(allRecipes));
          renderRecipes();
          setCloudStatus('error', 'Ошибка сохранения рецепта');
          console.error('toggleRecipePublic error:', e);
        }
      }
    }
    window.toggleRecipePublic = toggleRecipePublic;

    async function deleteRecipe(idx) {
      if (confirm('Удалить этот рецепт?')) {
        const r = allRecipes[idx];
        allRecipes.splice(idx, 1);
        localStorage.setItem('pku_all_recipes_' + currentTelegramId, JSON.stringify(allRecipes));
        renderRecipes();

        if (hasSupabase && r?.id) {
          try {
            await supabaseRequest('/rest/v1/recipes?id=eq.' + encodeURIComponent(r.id), {
              method: 'DELETE'
            });
            setCloudStatus('ok', 'Данные сохранены на сервере');
          } catch(e) {
            setCloudStatus('error', 'Ошибка удаления рецепта');
            console.error('deleteRecipe error:', e);
            loadRecipesFromSupabase();
          }
        }
      }
    }
    window.deleteRecipe = deleteRecipe;

    async function loadRecipesFromSupabase() {
      if (!hasSupabase) return;
      try {
        const data = await supabaseRequest('/rest/v1/recipes?or=(is_public.eq.true,telegram_id.eq.' + encodeURIComponent(currentTelegramId) + ')&order=created_at.desc');
        if (data && Array.isArray(data)) {
          allRecipes = data;
          localStorage.setItem('pku_all_recipes_' + currentTelegramId, JSON.stringify(allRecipes));
          renderRecipes();
          setCloudStatus('ok', 'Данные загружены с сервера');
        }
      } catch(e){
        setCloudStatus('error', 'Ошибка загрузки рецептов');
        console.error('loadRecipesFromSupabase error:', e);
      }
    }

    // 5. СПРАВОЧНИК ПРОДУКТОВ
    const productCategoryNames = {
      veg: 'Овощи',
      fruit: 'Фрукты',
      grain: 'Зерновые',
      dairy: 'Молочные',
      protein: 'Белковые',
      special: 'Спецпродукты',
      sweet: 'Сладости',
      drink: 'Напитки',
      custom: 'Мои продукты'
    };

    function getProductValue(item, key, fallback = '—') {
      const value = item[key];
      return value === undefined || value === null || value === '' ? fallback : value;
    }

    function getProductProtein(item) {
      return item.protein ?? item.prot ?? 0;
    }

    function getProductListForPage() {
      const query = (document.getElementById('productSearchInput')?.value || '').toLowerCase().trim();
      return getAllProducts().filter(item => {
        const matchesCat = currentProductCategory === 'all' || item.cat === currentProductCategory;
        const matchesQuery = !query || item.name.toLowerCase().includes(query);
        return matchesCat && matchesQuery;
      });
    }

    function setProductCategory(cat, btn) {
      currentProductCategory = cat;
      currentExpandedProductIndex = null;
      document.querySelectorAll('#productCategoryChips .chip').forEach(c => c.classList.remove('active'));
      if (btn && btn.classList) btn.classList.add('active');
      renderProductsPage();
    }
    window.setProductCategory = setProductCategory;

    function filterProductsPage() {
      currentExpandedProductIndex = null;
      renderProductsPage();
    }
    window.filterProductsPage = filterProductsPage;

    function toggleProductDetails(index) {
      currentExpandedProductIndex = currentExpandedProductIndex === index ? null : index;
      renderProductsPage();
    }
    window.toggleProductDetails = toggleProductDetails;

    function renderProductsPage() {
      const container = document.getElementById('productsContainer');
      if (!container) return;

      const products = getProductListForPage();
      if (products.length === 0) {
        container.innerHTML = '<div class="empty-state">Ничего не найдено</div>';
        return;
      }

      let html = '';
      products.forEach((item, index) => {
        const isOpen = currentExpandedProductIndex === index;
        const protein = getProductProtein(item);
        const catName = productCategoryNames[item.cat] || item.cat || 'Продукт';
        const kcal = getProductValue(item, 'kcal');
        const fat = getProductValue(item, 'fat');
        const carbs = getProductValue(item, 'carbs');
        const gi = getProductValue(item, 'gi');

        html += `
          <button class="product-row ${isOpen ? 'expanded' : ''}" onclick="toggleProductDetails(${index})" type="button">
            <div class="product-row-main">
              <div>
                <div class="product-name">${escapeHtml(item.name)}</div>
                <div class="product-category">${escapeHtml(catName)}</div>
              </div>
              <div class="product-summary">
                <span>${item.phe} мг ФА</span>
                <span>${protein} г белка</span>
                <span>${kcal} ккал</span>
              </div>
            </div>
            <div class="product-chevron">${isOpen ? '⌃' : '⌄'}</div>
            ${isOpen ? `
              <div class="product-details">
                <div><span>Ккал</span><b>${kcal}</b></div>
                <div><span>Белки</span><b>${protein} г</b></div>
                <div><span>Жиры</span><b>${fat} г</b></div>
                <div><span>Углеводы</span><b>${carbs} г</b></div>
                <div><span>ФА</span><b>${item.phe} мг</b></div>
                <div><span>ГИ</span><b>${gi}</b></div>
              </div>
            ` : ''}
          </button>
        `;
      });

      container.innerHTML = html;
    }

    // 6. ДНЕВНИК И ДОБАВЛЕНИЕ ЕДЫ
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
                  '<div class="search-item-name">' + icon + escapeHtml(f.name) + '</div>' +
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

    async function createDiaryEntry(entry) {
      if (hasSupabase) {
        try {
          const data = await supabaseRequest('/rest/v1/diary_entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
            body: JSON.stringify({
              telegram_id: currentTelegramId,
              entry_date: appData.today,
              meal_type: entry.meal,
              food_name: entry.name,
              weight_g: entry.weight,
              phe_mg: entry.phe,
              protein_g: entry.prot
            })
          });
          const saved = data?.[0] ? mapDiaryEntry(data[0]) : { ...entry, id: Date.now() };
          appData.entries.push(saved);
          saveLocal();
          render();
          setCloudStatus('ok', 'Данные сохранены на сервере');
          return saved;
        } catch(e) {
          setCloudStatus('error', 'Ошибка сохранения дневника');
          alert('Не удалось сохранить запись на сервере. Запись не добавлена.');
          console.error('createDiaryEntry error:', e);
          return null;
        }
      }

      const fallback = { ...entry, id: Date.now() };
      appData.entries.push(fallback);
      saveLocal();
      render();
      setCloudStatus('off', 'Локальный режим');
      return fallback;
    }

    async function syncWithSupabase() {
      if (!hasSupabase) return;
      try {
        const users = await supabaseRequest('/rest/v1/users?telegram_id=eq.' + encodeURIComponent(currentTelegramId));
        if (users && users.length > 0) {
          appData.settings.dailyPhe = users[0].daily_phe || 300;
          appData.settings.aksPortions = users[0].aks_portions || 4;
        } else {
          await supabaseRequest('/rest/v1/users?on_conflict=telegram_id', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
            body: JSON.stringify({
              telegram_id: currentTelegramId,
              daily_phe: appData.settings.dailyPhe,
              aks_portions: appData.settings.aksPortions
            })
          });
        }

        const entries = await supabaseRequest('/rest/v1/diary_entries?telegram_id=eq.' + encodeURIComponent(currentTelegramId) + '&entry_date=eq.' + encodeURIComponent(appData.today) + '&order=id.asc');
        if (entries && Array.isArray(entries)) {
          appData.entries = entries.map(mapDiaryEntry);
        }

        const aksLogs = await supabaseRequest('/rest/v1/aks_logs?telegram_id=eq.' + encodeURIComponent(currentTelegramId) + '&log_date=eq.' + encodeURIComponent(appData.today));
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
        setCloudStatus('ok', 'Данные загружены с сервера');
      } catch(e) {
        setCloudStatus('error', 'Ошибка синхронизации');
        if (!loadCachedDayData()) {
          appData.entries = [];
          appData.aks = new Array(appData.settings.aksPortions).fill(false);
        }
        render();
        console.error('Supabase sync:', e);
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
                                '<div class="food-info">' + escapeHtml(item.name) + '</div>' +
                                '<div class="food-sub">' + item.weight + ' г (' + item.prot + ' г б.)</div>' +
                              '</div>' +
                              '<div class="food-right">' +
                                '<span class="food-phe">' + item.phe + ' мг</span>' +
                                '<button class="del-btn" onclick="deleteFood(' + item.id + ')">🗑️</button>' +
                              '</div>' +
                            '</div>';
          }
        });

        const consPheEl = document.getElementById('consumedPheText');
        if (consPheEl) consPheEl.textContent = consumedPhe;

        const consProtEl = document.getElementById('consumedProteinText');
        if (consProtEl) consProtEl.textContent = consumedProt.toFixed(1);

        const bTotal = document.getElementById('breakfastTotal');
        if (bTotal) bTotal.textContent = mealSums['Завтрак'] + ' мг Фа';

        const lTotal = document.getElementById('lunchTotal');
        if (lTotal) lTotal.textContent = mealSums['Обед'] + ' мг Фа';

        const dTotal = document.getElementById('dinnerTotal');
        if (dTotal) dTotal.textContent = mealSums['Ужин'] + ' мг Фа';

        const sTotal = document.getElementById('snackTotal');
        if (sTotal) sTotal.textContent = mealSums['Перекус'] + ' мг Фа';

        const rem = limitPhe - consumedPhe;
        const badge = document.getElementById('pheStatusBadge');
        const bar = document.getElementById('pheProgressBar');
        const percent = Math.min(Math.round((consumedPhe / limitPhe) * 100), 100);
        if (bar) bar.style.width = percent + '%';

        const remEl = document.getElementById('remainingPheText');
        if (rem >= 0) {
          if (remEl) {
            remEl.textContent = rem + ' мг';
            remEl.style.color = '#10b981';
          }
          if (badge) {
            badge.className = 'badge badge-ok';
            badge.textContent = 'В норме';
          }
          if (bar) bar.className = 'progress-bar-fill fill-ok';
        } else {
          if (remEl) {
            remEl.textContent = 'Перебор ' + Math.abs(rem) + ' мг';
            remEl.style.color = '#ef4444';
          }
          if (badge) {
            badge.className = 'badge badge-warn';
            badge.textContent = 'Превышено!';
          }
          if (bar) bar.className = 'progress-bar-fill fill-warn';
        }

        const aksDiv = document.getElementById('aksContainer');
        if (aksDiv) {
          aksDiv.innerHTML = '';
          let takenCnt = 0;
          appData.aks.forEach((isTaken, i) => {
            if (isTaken) takenCnt++;
            aksDiv.innerHTML += '<button class="aks-btn ' + (isTaken ? 'aks-on' : 'aks-off') + '" onclick="toggleAks(' + i + ')">' + (i+1) + '-я порция</button>';
          });
          const aksText = document.getElementById('aksProgressText');
          if (aksText) aksText.textContent = takenCnt + ' / ' + appData.aks.length + ' порций';
        }
      } catch(e){
        console.error('render error:', e);
      }
    }

    function calcPreview() {
      const wEl = document.getElementById('weightInput');
      const w = wEl ? parseFloat(wEl.value) || 0 : 0;
      
      const pheEl = document.getElementById('phe100Input');
      let phe = pheEl ? parseFloat(pheEl.value) || 0 : 0;
      
      const protEl = document.getElementById('prot100Input');
      let prot = protEl ? parseFloat(protEl.value) || 0 : 0;
      
      if (prot > 0 && phe === 0) {
        phe = prot * 50;
        if (pheEl) pheEl.value = Math.round(phe);
      }

      const totalPhe = Math.round((w * phe) / 100);
      const totalProt = ((w * prot) / 100).toFixed(2);
      
      const prevEl = document.getElementById('previewCalc');
      if (prevEl) prevEl.textContent = totalPhe + ' мг Фа (' + totalProt + ' г б.)';
    }
    window.calcPreview = calcPreview;

    function openAddFoodModal(m) {
      activeMeal = m;
      const titleEl = document.getElementById('modalMealTitle');
      if (titleEl) titleEl.textContent = 'Добавить в ' + m.toLowerCase();

      const searchEl = document.getElementById('foodSearchInput');
      if (searchEl) searchEl.value = '';

      const nameEl = document.getElementById('foodNameInput');
      if (nameEl) nameEl.value = '';

      const pheEl = document.getElementById('phe100Input');
      if (pheEl) pheEl.value = '';

      const protEl = document.getElementById('prot100Input');
      if (protEl) protEl.value = '';

      const wEl = document.getElementById('weightInput');
      if (wEl) wEl.value = '';

      currentCategory = 'all';
      document.querySelectorAll('.chip').forEach((c, idx) => c.classList.toggle('active', idx === 0));
      filterFoodList();
      calcPreview();
      openModal('addModal');
    }
    window.openAddFoodModal = openAddFoodModal;

    async function saveFood() {
      const name = document.getElementById('foodNameInput')?.value.trim() || 'Продукт';
      const w = parseFloat(document.getElementById('weightInput')?.value) || 0;
      const phe100 = parseFloat(document.getElementById('phe100Input')?.value) || 0;
      const prot100 = parseFloat(document.getElementById('prot100Input')?.value) || 0;

      if (w <= 0) { alert('Укажите вес в граммах'); return; }

      const totalPhe = Math.round((w * phe100) / 100);
      const totalProt = parseFloat(((w * prot100) / 100).toFixed(2));

      const saved = await createDiaryEntry({ meal: activeMeal, name: name, weight: w, phe: totalPhe, prot: totalProt });
      if (saved) closeModal('addModal');
    }
    window.saveFood = saveFood;

    async function deleteFood(id) {
      const previousEntries = [...appData.entries];
      appData.entries = appData.entries.filter(e => e.id !== id);
      saveLocal();
      render();

      if (hasSupabase) {
        try {
          await supabaseRequest('/rest/v1/diary_entries?id=eq.' + encodeURIComponent(id), {
            method: 'DELETE'
          });
          setCloudStatus('ok', 'Данные сохранены на сервере');
        } catch(e) {
          appData.entries = previousEntries;
          saveLocal();
          render();
          setCloudStatus('error', 'Ошибка удаления записи');
          alert('Не удалось удалить запись на сервере.');
          console.error('deleteFood error:', e);
        }
      }
    }
    window.deleteFood = deleteFood;

    async function toggleAks(i) {
      appData.aks[i] = !appData.aks[i];
      saveLocal();
      render();

      if (hasSupabase) {
        try {
          await supabaseRequest('/rest/v1/aks_logs?on_conflict=telegram_id,log_date,portion_index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
            body: JSON.stringify({ telegram_id: currentTelegramId, log_date: appData.today, portion_index: i, is_taken: appData.aks[i] })
          });
          setCloudStatus('ok', 'Данные сохранены на сервере');
        } catch(e) {
          appData.aks[i] = !appData.aks[i];
          saveLocal();
          render();
          setCloudStatus('error', 'Ошибка сохранения АКС');
          console.error('toggleAks error:', e);
        }
      }
    }
    window.toggleAks = toggleAks;

    function updateProfileProteinCalc() {
      const phe = parseInt(document.getElementById('settingDailyPhe')?.value) || 0;
      const prot = (phe / 50).toFixed(1);
      const el = document.getElementById('calcProfileProtein');
      if (el) el.textContent = prot;
    }
    window.updateProfileProteinCalc = updateProfileProteinCalc;

    function openModal(id) {
      if (id === 'settingsModal') {
        const sPhe = document.getElementById('settingDailyPhe');
        if (sPhe) sPhe.value = appData.settings.dailyPhe;

        const sAks = document.getElementById('settingAksPortions');
        if (sAks) sAks.value = appData.settings.aksPortions;

        updateProfileProteinCalc();
      }
      const el = document.getElementById(id);
      if (el && el.classList) el.classList.add('active');
    }
    window.openModal = openModal;

    function closeModal(id) {
      const el = document.getElementById(id);
      if (el && el.classList) el.classList.remove('active');
    }
    window.closeModal = closeModal;

    async function saveSettings() {
      const phe = parseInt(document.getElementById('settingDailyPhe')?.value) || 300;
      const aksCount = parseInt(document.getElementById('settingAksPortions')?.value) || 4;
      appData.settings.dailyPhe = phe;
      if (appData.settings.aksPortions !== aksCount) {
        appData.settings.aksPortions = aksCount;
        appData.aks = new Array(aksCount).fill(false);
      }
      saveLocal();
      render();
      closeModal('settingsModal');

      if (hasSupabase) {
        try {
          await supabaseRequest('/rest/v1/users?on_conflict=telegram_id', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
            body: JSON.stringify({ telegram_id: currentTelegramId, daily_phe: phe, aks_portions: aksCount })
          });
          setCloudStatus('ok', 'Данные сохранены на сервере');
        } catch(e) {
          setCloudStatus('error', 'Ошибка сохранения настроек');
          alert('Настройки сохранены локально, но не дошли до сервера.');
          console.error('saveSettings error:', e);
        }
      }
    }
    window.saveSettings = saveSettings;

    // Запуск приложения
    document.addEventListener('DOMContentLoaded', init);
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      init();
    }
