require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const db = require('./db'); // инициализация БД
const authRoutes = require('./routes/auth');
const pasteRoutes = require('./routes/pastes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new SQLiteStore({ db: 'sessions.sqlite', dir: path.join(__dirname, '..', 'data') }),
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }, // 7 дней
  })
);

// Статика
app.use(express.static(path.join(__dirname, '..', 'public')));

// API-маршруты
app.use('/api/auth', authRoutes);
app.use('/api/pastes', pasteRoutes);

// Генератор полной ссылки (учитывает BASE_URL из env)
app.get('/api/link/:slug', (req, res) => {
  const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  res.json({ url: `${base}/p/${req.params.slug}` });
});

// Фронтенд — SPA-страница (главная и страницы просмотра /p/:slug)
app.get(['/', '/p/:slug'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Сервис запущен на http://localhost:${PORT}`);
});