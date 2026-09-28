const DB_URL = window.SUPABASE_URL || '';
const DB_KEY = window.SUPABASE_KEY || '';
const hasSupabase = DB_URL.startsWith('http') && DB_KEY.startsWith('eyJ');
const AUTH_KEY = 'pku_admin_session';

const state = {
  currentSection: 'dashboard',
  rows: {},
  modal: { table: '', mode: 'create', row: null },
  session: loadStoredSession()
};

const sectionMeta = {
  dashboard: ['Обзор', 'Состояние базы и быстрые показатели'],
  users: ['Пользователи', 'Настройки, нормы и активность пользователей'],
  products: ['Продукты', 'Справочник КБЖУ, ФА и ГИ'],
  wiki: ['Вики', 'Карточки полезной информации в приложении'],
  diary: ['Дневники', 'Записи питания пользователей по датам'],
  recipes: ['Рецепты', 'Публичные и личные рецепты сообщества']
};

const schemas = {
  products: {
    table: 'products',
    key: 'id',
    title: 'продукт',
    fields: [
      ['name', 'Название', 'text', true],
      ['cat', 'Категория', 'select', true, ['veg', 'fruit', 'grain', 'dairy', 'protein', 'special', 'sweet', 'drink']],
      ['kcal', 'Ккал', 'number'],
      ['protein', 'Белки', 'number'],
      ['fat', 'Жиры', 'number'],
      ['carbs', 'Углеводы', 'number'],
      ['phe', 'ФА, мг', 'number'],
      ['gi', 'ГИ', 'number'],
      ['sort_order', 'Порядок', 'number'],
      ['is_active', 'Активен', 'checkbox']
    ]
  },
  wiki: {
    table: 'wiki_articles',
    key: 'id',
    title: 'статью',
    fields: [
      ['title', 'Заголовок', 'text', true],
      ['icon', 'Иконка', 'text'],
      ['body', 'Текст', 'textarea', true],
      ['sort_order', 'Порядок', 'number'],
      ['is_published', 'Опубликовано', 'checkbox']
    ]
  }
};

function $(id) {
  return document.getElementById(id);
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

function setStatus(kind, text) {
  const el = $('adminStatus');
  el.className = 'status ' + kind;
  el.textContent = text;
}

function showNotice(text) {
  const el = $('accessNotice');
  el.hidden = false;
  el.textContent = text;
}

function headers(extra = {}) {
  return {
    apikey: DB_KEY,
    Authorization: 'Bearer ' + (state.session?.access_token || DB_KEY),
    ...extra
  };
}

function loadStoredSession() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.access_token || !session?.expires_at) return null;
    if (Date.now() > session.expires_at) {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
    return session;
  } catch(e) {
    return null;
  }
}

function storeSession(data) {
  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    email: data.user?.email || '',
    expires_at: Date.now() + ((data.expires_in || 3600) - 60) * 1000
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  state.session = session;
}

async function signIn(email, password) {
  if (!hasSupabase) throw new Error('Supabase is not configured');
  const res = await fetch(DB_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: {
      apikey: DB_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Не удалось войти');
  }
  const data = await res.json();
  storeSession(data);
}

function signOut() {
  localStorage.removeItem(AUTH_KEY);
  state.session = null;
  showLogin();
}

async function api(path, options = {}) {
  if (!hasSupabase) throw new Error('Supabase is not configured');
  const res = await fetch(DB_URL + path, {
    ...options,
    headers: {
      ...headers(),
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function ensureAccess() {
  if (!hasSupabase) {
    setStatus('error', 'Supabase не настроен');
    showNotice('В config.js нужно указать SUPABASE_URL и SUPABASE_KEY.');
    return false;
  }
  if (!state.session?.access_token) {
    showLogin();
    return false;
  }
  showAdmin();
  setStatus('ok', state.session.email || 'Вход выполнен');
  return true;
}

function showLogin() {
  $('loginView').hidden = false;
  $('sidebar').hidden = true;
  $('adminShell').hidden = true;
}

function showAdmin() {
  $('loginView').hidden = true;
  $('sidebar').hidden = false;
  $('adminShell').hidden = false;
  $('accessNotice').hidden = true;
}

function switchSection(name) {
  state.currentSection = name;
  document.querySelectorAll('.tab').forEach(btn => btn.classList.toggle('active', btn.dataset.section === name));
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
  $(name + 'Section')?.classList.add('active');
  const [title, subtitle] = sectionMeta[name];
  $('sectionTitle').textContent = title;
  $('sectionSubtitle').textContent = subtitle;
  loadSection(name);
}

async function loadSection(name) {
  try {
    if (name === 'dashboard') await loadDashboard();
    if (name === 'users') await loadUsers();
    if (name === 'products') await loadProducts();
    if (name === 'wiki') await loadWiki();
    if (name === 'diary') await loadDiary();
    if (name === 'recipes') await loadRecipes();
  } catch(e) {
    setStatus('error', 'Ошибка загрузки');
    console.error(e);
  }
}

async function countRows(table) {
  const data = await api(`/rest/v1/${table}?select=id&limit=10000`);
  return Array.isArray(data) ? data.length : 0;
}

async function loadDashboard() {
  const items = [
    ['Пользователи', 'users'],
    ['Продукты', 'products'],
    ['Вики статьи', 'wiki_articles'],
    ['Записи дневника', 'diary_entries'],
    ['Рецепты', 'recipes']
  ];
  const results = await Promise.all(items.map(async ([label, table]) => {
    try { return [label, await countRows(table)]; }
    catch(e) { return [label, '—']; }
  }));
  $('statsGrid').innerHTML = results.map(([label, value]) => `
    <div class="stat-card"><span>${escapeHtml(label)}</span><b>${value}</b></div>
  `).join('');
}

function renderTable(id, columns, rows, actions) {
  const head = '<thead><tr>' + columns.map(col => `<th>${escapeHtml(col[0])}</th>`).join('') + '<th>Действия</th></tr></thead>';
  const body = '<tbody>' + rows.map((row, index) => {
    const cells = columns.map(([, getter]) => `<td>${getter(row)}</td>`).join('');
    return `<tr>${cells}<td><div class="row-actions">${actions(row, index)}</div></td></tr>`;
  }).join('') + '</tbody>';
  $(id).innerHTML = head + body;
}

async function loadUsers() {
  const query = $('usersSearch').value.trim().toLowerCase();
  const rows = await api('/rest/v1/users?select=*&order=telegram_id.asc');
  state.rows.users = rows || [];
  const filtered = state.rows.users.filter(row => !query || String(row.telegram_id).includes(query) || String(row.first_name || '').toLowerCase().includes(query));
  renderTable('usersTable', [
    ['Telegram ID', r => escapeHtml(r.telegram_id)],
    ['Имя', r => escapeHtml(r.first_name || '—')],
    ['ФА', r => escapeHtml(r.daily_phe ?? '—')],
    ['АКС', r => escapeHtml(r.aks_portions ?? '—')],
    ['Обновлен', r => escapeHtml(r.updated_at || '—')]
  ], filtered, row => `<button class="btn" onclick="openReadonly('users', '${row.id || row.telegram_id}')">Просмотр</button>`);
}

async function loadProducts() {
  const rows = await api('/rest/v1/products?select=*&order=sort_order.asc,name.asc');
  state.rows.products = rows || [];
  const query = $('productsSearch').value.trim().toLowerCase();
  const filtered = state.rows.products.filter(row => !query || row.name?.toLowerCase().includes(query));
  renderTable('productsTable', [
    ['Название', r => escapeHtml(r.name)],
    ['Категория', r => `<span class="pill">${escapeHtml(r.cat)}</span>`],
    ['КБЖУ', r => `${r.kcal ?? '—'} / ${r.protein ?? '—'} / ${r.fat ?? '—'} / ${r.carbs ?? '—'}`],
    ['ФА', r => escapeHtml(r.phe ?? '—')],
    ['ГИ', r => escapeHtml(r.gi ?? '—')],
    ['Статус', r => r.is_active === false ? 'Скрыт' : 'Активен']
  ], filtered, row => `<button class="btn" onclick="openEditor('products', '${row.id}')">Редактировать</button>`);
}

async function loadWiki() {
  const rows = await api('/rest/v1/wiki_articles?select=*&order=sort_order.asc,title.asc');
  state.rows.wiki = rows || [];
  const query = $('wikiSearch').value.trim().toLowerCase();
  const filtered = state.rows.wiki.filter(row => !query || row.title?.toLowerCase().includes(query));
  renderTable('wikiTable', [
    ['Порядок', r => escapeHtml(r.sort_order ?? '—')],
    ['Иконка', r => escapeHtml(r.icon || '—')],
    ['Заголовок', r => escapeHtml(r.title)],
    ['Текст', r => escapeHtml(String(r.body || '').slice(0, 140))],
    ['Статус', r => r.is_published === false ? 'Черновик' : 'Опубликовано']
  ], filtered, row => `<button class="btn" onclick="openEditor('wiki', '${row.id}')">Редактировать</button>`);
}

async function loadDiary() {
  const user = $('diaryUserFilter').value.trim();
  const date = $('diaryDateFilter').value;
  const filters = ['select=*', 'order=entry_date.desc,id.desc', 'limit=300'];
  if (user) filters.push('telegram_id=eq.' + encodeURIComponent(user));
  if (date) filters.push('entry_date=eq.' + encodeURIComponent(date));
  const rows = await api('/rest/v1/diary_entries?' + filters.join('&'));
  state.rows.diary = rows || [];
  renderTable('diaryTable', [
    ['Дата', r => escapeHtml(r.entry_date)],
    ['Telegram ID', r => escapeHtml(r.telegram_id)],
    ['Прием', r => escapeHtml(r.meal_type)],
    ['Продукт', r => escapeHtml(r.food_name)],
    ['Вес', r => escapeHtml(r.weight_g)],
    ['ФА', r => escapeHtml(r.phe_mg)],
    ['Белок', r => escapeHtml(r.protein_g)]
  ], state.rows.diary, row => `<button class="btn" onclick="openDiary('${row.id}')">Просмотр</button>`);
}

async function loadRecipes() {
  const rows = await api('/rest/v1/recipes?select=*&order=created_at.desc');
  state.rows.recipes = rows || [];
  const query = $('recipesSearch').value.trim().toLowerCase();
  const filtered = state.rows.recipes.filter(row => !query || row.title?.toLowerCase().includes(query));
  renderTable('recipesTable', [
    ['Название', r => escapeHtml(r.title)],
    ['Автор', r => `${escapeHtml(r.author_name || '—')}<br><small>${escapeHtml(r.telegram_id)}</small>`],
    ['ФА/100', r => escapeHtml(r.phe_per_100 ?? '—')],
    ['Белок/100', r => escapeHtml(r.prot_per_100 ?? '—')],
    ['Публичный', r => r.is_public ? 'Да' : 'Нет']
  ], filtered, row => `<button class="btn" onclick="toggleRecipe('${row.id}', ${row.is_public ? 'false' : 'true'})">${row.is_public ? 'Скрыть' : 'Опубликовать'}</button>`);
}

function fieldValue(row, name, type) {
  if (!row) return type === 'checkbox' ? true : '';
  return row[name] ?? (type === 'checkbox' ? false : '');
}

function openEditor(kind, id = '') {
  const schema = schemas[kind];
  const row = id ? (state.rows[kind] || []).find(item => String(item[schema.key]) === String(id)) : null;
  state.modal = { table: kind, mode: row ? 'edit' : 'create', row };
  $('modalTitle').textContent = row ? 'Редактировать ' + schema.title : 'Добавить ' + schema.title;
  $('deleteBtn').hidden = !row;
  $('editForm').innerHTML = schema.fields.map(([name, label, type, required, options]) => {
    const value = fieldValue(row, name, type);
    const full = type === 'textarea' ? ' full' : '';
    if (type === 'checkbox') {
      return `<div class="field${full}"><label><input name="${name}" type="checkbox" ${value ? 'checked' : ''}> ${escapeHtml(label)}</label></div>`;
    }
    if (type === 'select') {
      return `<div class="field${full}"><label>${escapeHtml(label)}</label><select name="${name}" ${required ? 'required' : ''}>${options.map(opt => `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`).join('')}</select></div>`;
    }
    if (type === 'textarea') {
      return `<div class="field${full}"><label>${escapeHtml(label)}</label><textarea name="${name}" ${required ? 'required' : ''}>${escapeHtml(value)}</textarea></div>`;
    }
    return `<div class="field${full}"><label>${escapeHtml(label)}</label><input name="${name}" type="${type}" value="${escapeHtml(value)}" ${required ? 'required' : ''}></div>`;
  }).join('');
  $('editModal').hidden = false;
}

window.openEditor = openEditor;

function openReadonly(kind, id) {
  const rows = state.rows[kind] || [];
  const row = rows.find(item => String(item.id || item.telegram_id) === String(id));
  $('modalTitle').textContent = 'Просмотр';
  $('deleteBtn').hidden = true;
  $('editForm').innerHTML = `<div class="field full"><textarea readonly>${escapeHtml(JSON.stringify(row, null, 2))}</textarea></div>`;
  state.modal = { table: '', mode: 'readonly', row };
  $('editModal').hidden = false;
}

window.openReadonly = openReadonly;
window.openDiary = (id) => openReadonly('diary', id);

async function saveModal() {
  const schema = schemas[state.modal.table];
  if (!schema) return;
  const form = new FormData($('editForm'));
  const payload = {};
  schema.fields.forEach(([name, , type]) => {
    if (type === 'checkbox') payload[name] = form.get(name) === 'on';
    else if (type === 'number') payload[name] = form.get(name) === '' ? null : Number(form.get(name));
    else payload[name] = String(form.get(name) || '').trim();
  });
  if (state.modal.mode === 'edit') {
    const id = state.modal.row[schema.key];
    await api(`/rest/v1/${schema.table}?${schema.key}=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } else {
    await api(`/rest/v1/${schema.table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }
  closeModal();
  loadSection(state.currentSection);
}

async function deleteModal() {
  const schema = schemas[state.modal.table];
  if (!schema || !state.modal.row) return;
  if (!confirm('Удалить запись?')) return;
  const id = state.modal.row[schema.key];
  await api(`/rest/v1/${schema.table}?${schema.key}=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  closeModal();
  loadSection(state.currentSection);
}

async function toggleRecipe(id, isPublic) {
  await api('/rest/v1/recipes?id=eq.' + encodeURIComponent(id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_public: isPublic })
  });
  loadRecipes();
}

window.toggleRecipe = toggleRecipe;

function closeModal() {
  $('editModal').hidden = true;
}

function setupEvents() {
  $('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const errorEl = $('loginError');
    errorEl.hidden = true;
    errorEl.textContent = '';

    try {
      await signIn($('loginEmail').value.trim(), $('loginPassword').value);
      $('loginPassword').value = '';
      showAdmin();
      setStatus('ok', state.session.email || 'Вход выполнен');
      loadDashboard();
    } catch(e) {
      errorEl.textContent = 'Не удалось войти. Проверьте логин и пароль.';
      errorEl.hidden = false;
      console.error(e);
    }
  });
  $('logoutBtn').addEventListener('click', signOut);
  document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => switchSection(btn.dataset.section)));
  document.querySelectorAll('[data-refresh]').forEach(btn => btn.addEventListener('click', () => loadSection(btn.dataset.refresh)));
  document.querySelectorAll('[data-create]').forEach(btn => btn.addEventListener('click', () => openEditor(btn.dataset.create)));
  ['usersSearch', 'productsSearch', 'wikiSearch', 'recipesSearch'].forEach(id => $(id)?.addEventListener('input', () => loadSection(state.currentSection)));
  $('modalClose').addEventListener('click', closeModal);
  $('cancelBtn').addEventListener('click', closeModal);
  $('saveBtn').addEventListener('click', saveModal);
  $('deleteBtn').addEventListener('click', deleteModal);
}

setupEvents();
if (ensureAccess()) {
  loadDashboard();
}
