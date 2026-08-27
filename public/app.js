// ---- Элементы DOM ----
const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const viewScreen = document.getElementById('view-screen');
const userArea = document.getElementById('user-area');

const loginForm = document.getElementById('login-form');
const authUsername = document.getElementById('auth-username');
const authPassword = document.getElementById('auth-password');
const authError = document.getElementById('auth-error');
const registerBtn = document.getElementById('register-btn');

const pasteTitle = document.getElementById('paste-title');
const pasteContent = document.getElementById('paste-content');
const pastePrivate = document.getElementById('paste-private');
const pastePublicDownload = document.getElementById('paste-public-download');
const createBtn = document.getElementById('create-btn');
const createError = document.getElementById('create-error');

const resultBox = document.getElementById('result');
const resultLink = document.getElementById('result-link');
const resultDownloadWrap = document.getElementById('result-download-wrap');
const resultDownloadLink = document.getElementById('result-download-link');
const copyLinkBtn = document.getElementById('copy-link-btn');
const openLinkBtn = document.getElementById('open-link-btn');

const myPastes = document.getElementById('my-pastes');
const allPastes = document.getElementById('all-pastes');

const viewTitle = document.getElementById('view-title');
const viewMeta = document.getElementById('view-meta');
const viewContent = document.getElementById('view-content');
const downloadBtn = document.getElementById('download-btn');
const deleteViewBtn = document.getElementById('delete-view-btn');
const backBtn = document.getElementById('back-btn');
const viewError = document.getElementById('view-error');

const editBox = document.getElementById('edit-box');
const editTitle = document.getElementById('edit-title');
const editContent = document.getElementById('edit-content');
const editPublicDownload = document.getElementById('edit-public-download');
const editBtn = document.getElementById('edit-btn');
const saveEditBtn = document.getElementById('save-edit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const editError = document.getElementById('edit-error');
const editSuccess = document.getElementById('edit-success');
const viewAnonDl = document.getElementById('view-anon-dl');
const viewAnonLink = document.getElementById('view-anon-link');

let currentUser = null;
let currentSlug = null;
let currentPaste = null; // данные текущей открытой записи
let registrationEnabled = true;

// ---- Базовый путь (поддержка работы за nginx по под-пути) ----
// Приоритет: значение, подставленное сервером (BASE_PATH из env).
// Иначе определяем автоматически из URL страницы — работает даже когда
// nginx срезает префикс под-пути (нулевая конфигурация).
function detectBasePath() {
  var p = window.location.pathname || '/';
  p = p.replace(/\/+$/, '');                  // убрать хвостовой слеш
  var m = p.match(/(.*)\/p\/[^/]+$/);         // открыта страница записи /p/:slug
  if (m) return m[1] || '';
  return p || '';
}
const BP = window.__BASE_PATH__ || detectBasePath();
function u(path) {
  return BP + path;
}

// ---- Утилиты ----
async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

function showScreen(name) {
  authScreen.classList.toggle('hidden', name !== 'auth');
  mainScreen.classList.toggle('hidden', name !== 'main');
  viewScreen.classList.toggle('hidden', name !== 'view');
}

function renderUser() {
  if (currentUser) {
    userArea.innerHTML = `${escapeHtml(currentUser.username)} <button onclick="logout()">Выйти</button>`;
  } else {
    userArea.innerHTML = '';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  var amp = String.fromCharCode(38) + 'amp;';
  var lt = String.fromCharCode(38) + 'lt;';
  var gt = String.fromCharCode(38) + 'gt;';
  var quot = String.fromCharCode(38) + 'quot;';
  var apos = String.fromCharCode(38) + '#39;';
  var map = {};
  map['&'] = amp;
  map['<'] = lt;
  map['>'] = gt;
  map['"'] = quot;
  map["'"] = apos;
  return str.replace(/[&<>"']/g, function (c) { return map[c]; });
}

function parseSlug() {
  let p = window.location.pathname;
  if (BP && p.startsWith(BP)) p = p.slice(BP.length) || '/';
  const m = p.match(/^\/p\/([^/]+)$/);
  return m ? m[1] : null;
}

// ---- Авторизация ----
async function refreshMe() {
  try {
    const data = await api(u('/api/auth/me'));
    currentUser = data.user;
  } catch {
    currentUser = null;
  }
}

function logout() {
  api(u('/api/auth/logout'), { method: 'POST' }).finally(() => {
    currentUser = null;
    renderUser();
    showScreen('auth');
  });
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.textContent = '';
  const username = authUsername.value.trim();
  const password = authPassword.value;
  const action = e.submitter.dataset.action;
  try {
    const data = await api(u(`/api/auth/${action}`), {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    currentUser = data.user;
    authUsername.value = '';
    authPassword.value = '';
    await enterApp();
  } catch (err) {
    authError.textContent = err.message;
  }
});

registerBtn.addEventListener('click', () => {
  authError.textContent = '';
  const username = authUsername.value.trim();
  const password = authPassword.value;
  api(u('/api/auth/register'), {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
    .then(async (data) => {
      currentUser = data.user;
      authUsername.value = '';
      authPassword.value = '';
      await enterApp();
    })
    .catch((err) => { authError.textContent = err.message; });
});

// ---- Создание записи ----
createBtn.addEventListener('click', async () => {
  createError.textContent = '';
  resultBox.classList.add('hidden');
  const content = pasteContent.value;
  if (!content.trim()) {
    createError.textContent = 'Введите текст записи';
    return;
  }
  try {
    const data = await api(u('/api/pastes'), {
      method: 'POST',
      body: JSON.stringify({
        content,
        title: pasteTitle.value.trim(),
        private: pastePrivate.checked,
        public_download: pastePublicDownload.checked,
      }),
    });
    const linkData = await api(u(`/api/link/${data.paste.slug}`));
    resultLink.href = linkData.url;
    resultLink.textContent = linkData.url;
    openLinkBtn.onclick = () => { window.location.href = linkData.url; };
    // Прямая ссылка на скачивание без авторизации (если включена)
    if (data.paste.public_download) {
      const dlUrl = window.location.origin + u('/api/pastes/' + data.paste.slug + '/download');
      resultDownloadLink.href = dlUrl;
      resultDownloadLink.textContent = dlUrl;
      resultDownloadWrap.classList.remove('hidden');
    } else {
      resultDownloadWrap.classList.add('hidden');
    }
    resultBox.classList.remove('hidden');
    pasteTitle.value = '';
    pasteContent.value = '';
    pastePublicDownload.checked = false;
    loadAllPastes();
    loadMyPastes();
  } catch (err) {
    createError.textContent = err.message;
  }
});

copyLinkBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(resultLink.href).then(() => {
    copyLinkBtn.textContent = 'Скопировано!';
    setTimeout(() => { copyLinkBtn.textContent = 'Копировать ссылку'; }, 1500);
  });
});

// ---- Все записи (публичная лента) ----
async function loadAllPastes() {
  try {
    const data = await api(u('/api/pastes'));
    allPastes.innerHTML = '';
    if (!data.pastes.length) {
      allPastes.innerHTML = '<li class="meta">Публичных записей пока нет</li>';
      return;
    }
    data.pastes.forEach((p) => {
      const li = document.createElement('li');
      li.innerHTML = '<a href="' + u('/p/' + p.slug) + '">' + escapeHtml(p.title || '(без названия)') + '</a>' +
        '<span class="author">Автор: ' + escapeHtml(p.author) + ' · ' + escapeHtml(p.created_at) + '</span>';
      allPastes.appendChild(li);
    });
  } catch (e) {
    allPastes.innerHTML = '<li class="error">Не удалось загрузить записи</li>';
  }
}

// ---- Мои записи ----
async function loadMyPastes() {
  try {
    const data = await api(u('/api/pastes/mine'));
    myPastes.innerHTML = '';
    if (!data.pastes.length) {
      myPastes.innerHTML = '<li class="meta">Записей пока нет</li>';
      return;
    }
    data.pastes.forEach((p) => {
      const li = document.createElement('li');
      const title = p.title || '(без названия)';
      li.innerHTML = '<a href="' + u('/p/' + p.slug) + '">' + escapeHtml(title) + '</a>' +
        '<span class="meta">' + escapeHtml(p.created_at) + '</span>' +
        '<a href="' + u('/api/pastes/' + p.slug + '/download') + '">&#11015; скачать</a>';
      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.textContent = 'Удалить';
      delBtn.addEventListener('click', () => deletePaste(p.slug, false));
      li.appendChild(delBtn);
      myPastes.appendChild(li);
    });
  } catch (e) {
    myPastes.innerHTML = '<li class="error">Не удалось загрузить записи</li>';
  }
}

// ---- Просмотр записи ----
async function viewPaste(slug) {
  viewError.textContent = '';
  currentSlug = slug;
  editError.textContent = '';
  editSuccess.textContent = '';
  editBox.classList.add('hidden');
  viewContent.classList.remove('hidden');
  viewAnonDl.classList.add('hidden');
  editBtn.style.display = '';
  downloadBtn.style.display = '';
  deleteViewBtn.style.display = 'none';
  try {
    const data = await api(u(`/api/pastes/${slug}`));
    currentPaste = data.paste;
    viewTitle.textContent = data.paste.title || 'Запись';
    viewContent.textContent = data.content;
    downloadBtn.href = u('/api/pastes/' + slug + '/download');

    const isPrivate = data.paste.private === true;
    const isOwner = currentUser && data.paste.author === currentUser.username;
    const isPublicDownload = data.paste.public_download === true && !isPrivate;
    viewMeta.textContent =
      'Автор: ' + escapeHtml(data.paste.author || '—') +
      ' · ' + (isPrivate ? '🔒 Приватная' : '🌐 Публичная');

    // Ссылка на скачивание без авторизации (если включена автором)
    if (isPublicDownload) {
      const dlUrl = window.location.origin + u('/api/pastes/' + slug + '/download');
      viewAnonLink.href = dlUrl;
      viewAnonLink.textContent = dlUrl;
      viewAnonDl.classList.remove('hidden');
    }

    // Приватные записи может редактировать (и скачивать) только их автор
    if (isPrivate && !isOwner) {
      editBtn.style.display = 'none';
      downloadBtn.style.display = 'none';
    }

    // Удалять запись может только её автор
    if (isOwner) {
      deleteViewBtn.style.display = '';
      deleteViewBtn.onclick = () => deletePaste(slug, true);
    }

    showScreen('view');
  } catch (err) {
    viewMeta.textContent = '';
    viewError.textContent = err.message;
    showScreen('main');
  }
}

// ---- Редактирование записи ----
function startEdit() {
  viewError.textContent = '';
  editSuccess.textContent = '';
  editTitle.value = viewTitle.textContent === 'Запись' ? '' : viewTitle.textContent;
  editContent.value = viewContent.textContent;
  editPublicDownload.checked = !!(currentPaste && currentPaste.public_download);
  viewContent.classList.add('hidden');
  editBox.classList.remove('hidden');
  editBtn.classList.add('hidden');
}

function cancelEdit() {
  editError.textContent = '';
  viewContent.classList.remove('hidden');
  editBox.classList.add('hidden');
  editBtn.classList.remove('hidden');
}

editBtn.addEventListener('click', startEdit);
cancelEditBtn.addEventListener('click', cancelEdit);

saveEditBtn.addEventListener('click', async () => {
  editError.textContent = '';
  editSuccess.textContent = '';
  const content = editContent.value;
  if (!content.trim()) {
    editError.textContent = 'Текст записи не может быть пустым';
    return;
  }
  try {
    await api(u(`/api/pastes/${currentSlug}`), {
      method: 'PUT',
      body: JSON.stringify({
        content,
        title: editTitle.value.trim(),
        public_download: editPublicDownload.checked,
      }),
    });
    cancelEdit();
    await viewPaste(currentSlug);
    editSuccess.textContent = 'Запись обновлена';
    // Обновляем ленты (могли измениться заголовок/приватность)
    loadAllPastes();
    loadMyPastes();
  } catch (err) {
    editError.textContent = err.message;
  }
});

backBtn.addEventListener('click', () => {
  window.history.pushState({}, '', u('/'));
  showScreen('main');
  // Перезагружаем ленты, чтобы изменения отразились
  loadAllPastes();
  loadMyPastes();
});

// ---- Удаление записи (только автор) ----
async function deletePaste(slug, fromView) {
  if (!window.confirm('Удалить эту запись безвозвратно?')) return;
  try {
    await api(u('/api/pastes/' + slug), { method: 'DELETE' });
    if (fromView) {
      window.history.pushState({}, '', u('/'));
      showScreen('main');
    }
    loadAllPastes();
    loadMyPastes();
  } catch (err) {
    window.alert(err.message);
  }
}

// ---- Инициализация ----
async function enterApp() {
  renderUser();
  showScreen('main');
  await loadAllPastes();
  await loadMyPastes();
}

async function init() {
  // Настройки сервиса (доступна ли регистрация)
  try {
    const cfg = await api(u('/api/auth/config'));
    registrationEnabled = cfg.registrationEnabled !== false;
  } catch {
    registrationEnabled = true;
  }
  registerBtn.style.display = registrationEnabled ? '' : 'none';

  await refreshMe();
  renderUser();
  const slug = parseSlug();
  if (slug && currentUser) {
    await viewPaste(slug);
  } else if (currentUser) {
    showScreen('main');
    await loadAllPastes();
    await loadMyPastes();
  } else {
    showScreen('auth');
  }
}

init();