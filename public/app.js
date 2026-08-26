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
const createBtn = document.getElementById('create-btn');
const createError = document.getElementById('create-error');

const resultBox = document.getElementById('result');
const resultLink = document.getElementById('result-link');
const copyLinkBtn = document.getElementById('copy-link-btn');
const openLinkBtn = document.getElementById('open-link-btn');

const myPastes = document.getElementById('my-pastes');

const viewTitle = document.getElementById('view-title');
const viewContent = document.getElementById('view-content');
const downloadBtn = document.getElementById('download-btn');
const backBtn = document.getElementById('back-btn');
const viewError = document.getElementById('view-error');

let currentUser = null;

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
  const m = window.location.pathname.match(/^\/p\/([^/]+)$/);
  return m ? m[1] : null;
}

// ---- Авторизация ----
async function refreshMe() {
  try {
    const data = await api('/api/auth/me');
    currentUser = data.user;
  } catch {
    currentUser = null;
  }
}

function logout() {
  api('/api/auth/logout', { method: 'POST' }).finally(() => {
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
    const data = await api(`/api/auth/${action}`, {
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
  api('/api/auth/register', {
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
    const data = await api('/api/pastes', {
      method: 'POST',
      body: JSON.stringify({ content, title: pasteTitle.value.trim() }),
    });
    const linkData = await api(`/api/link/${data.paste.slug}`);
    resultLink.href = linkData.url;
    resultLink.textContent = linkData.url;
    openLinkBtn.onclick = () => { window.location.href = linkData.url; };
    resultBox.classList.remove('hidden');
    pasteTitle.value = '';
    pasteContent.value = '';
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

// ---- Мои записи ----
async function loadMyPastes() {
  try {
    const data = await api('/api/pastes/mine');
    myPastes.innerHTML = '';
    if (!data.pastes.length) {
      myPastes.innerHTML = '<li class="meta">Записей пока нет</li>';
      return;
    }
    data.pastes.forEach((p) => {
      const li = document.createElement('li');
      const title = p.title || '(без названия)';
      li.innerHTML = '<a href="/p/' + p.slug + '">' + escapeHtml(title) + '</a>' +
        '<span class="meta">' + escapeHtml(p.created_at) + '</span>' +
        '<a href="/api/pastes/' + p.slug + '/download">&#11015; скачать</a>';
      myPastes.appendChild(li);
    });
  } catch (e) {
    myPastes.innerHTML = '<li class="error">Не удалось загрузить записи</li>';
  }
}

// ---- Просмотр записи ----
async function viewPaste(slug) {
  viewError.textContent = '';
  try {
    const data = await api(`/api/pastes/${slug}`);
    viewTitle.textContent = data.paste.title || 'Запись';
    viewContent.textContent = data.content;
    downloadBtn.href = '/api/pastes/' + slug + '/download';
    showScreen('view');
  } catch (err) {
    viewError.textContent = err.message;
    showScreen('main');
  }
}

backBtn.addEventListener('click', () => {
  window.history.pushState({}, '', '/');
  showScreen('main');
});

// ---- Инициализация ----
async function enterApp() {
  renderUser();
  showScreen('main');
  await loadMyPastes();
}

async function init() {
  await refreshMe();
  renderUser();
  const slug = parseSlug();
  if (slug && currentUser) {
    await viewPaste(slug);
  } else if (currentUser) {
    showScreen('main');
    await loadMyPastes();
  } else {
    showScreen('auth');
  }
}

init();