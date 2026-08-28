require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const db = require('./db'); // инициализация БД
const authRoutes = require('./routes/auth');
const pasteRoutes = require('./routes/pastes');

// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const app = express();
const PORT = process.env.PORT || 3000;

// За reverse-proxy/nginx корректно определяем протокол (https) и host
app.set('trust proxy', 1);

// Базовый путь при работе за reverse-proxy/nginx по ссылке вида https://host/<path>/
// Позволяет обслуживать приложение в поддиректории (напр. BASE_PATH=/pastebin).
// Если BASE_PATH не задан в env — автоматически определяем его из URL входящего запроса,
// поэтому приложение работает за nginx как в режиме со срезанием префикса, так и без.
const ENV_BASE_PATH = (process.env.BASE_PATH || '').replace(/\/+$/, '');

// Пакет известных «корневых» сегментов маршрутов приложения, которые идут ПОСЛЕ базового пути.
// Всё, что стоит перед первым таким сегментом, считаем базовым путём (префиксом nginx).
const ROOT_SEGMENTS = ['api', 'p', 'api-docs', 'app.js', 'style.css'];

function detectBasePathFromUrl(url) {
  const cleaned = (url.split('?')[0] || '').replace(/\/+$/, '');
  if (!cleaned || cleaned === '/') return '';
  const parts = cleaned.split('/').filter(Boolean);
  const idx = parts.findIndex((seg) => ROOT_SEGMENTS.includes(seg));
  if (idx === -1) return '/' + parts.join('/');
  if (idx === 0) return ''; // известный корневой маршрут в начале — префикса нет
  return '/' + parts.slice(0, idx).join('/');
}

// Актуальный базовый путь конкретного запроса.
function getBasePath(req) {
  if (ENV_BASE_PATH) return ENV_BASE_PATH;
  return detectBasePathFromUrl(req.originalUrl || req.url);
}

// Снимаем префикс базового пути, чтобы маршруты и статика работали как при корневом размещении
app.use((req, res, next) => {
  const base = getBasePath(req);
  req.basePath = base;
  if (base && (req.url === base || req.url.startsWith(base + '/'))) {
    req.url = req.url.slice(base.length) || '/';
  }
  next();
});

// Шаблон главной страницы (кэшируем), куда подставляем актуальный BASE_PATH
const indexTemplate = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
function sendIndex(req, res) {
  const basePath = req.basePath || '';
  res.send(indexTemplate.replace('"__BASE_PATH__"', JSON.stringify(basePath)));
}

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

// Статика (без автоотдачи index.html — главную отдаёт sendIndex с подстановкой BASE_PATH)
app.use(express.static(path.join(__dirname, '..', 'public'), { index: false }));

// API-маршруты
app.use('/api/auth', authRoutes);
app.use('/api/pastes', pasteRoutes);

// Swagger UI (документация API)
// Учитываем базовый путь (nginx): подставляем актуальный префикс (req.basePath)
// в server URL спецификации, чтобы «Try it out» обращался по правильному под-пути.
app.use(
  '/api-docs',
  (req, res, next) => {
    const base = req.basePath || '/';
    req.swaggerDoc = Object.assign({}, swaggerSpec, {
      servers: [{ url: base, description: 'Текущий сервер' }],
    });
    next();
  },
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

// Генератор полной ссылки (учитывает BASE_URL из env)
app.get('/api/link/:slug', (req, res) => {
  const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  res.json({ url: `${base}${req.basePath || ''}/p/${req.params.slug}` });
});

// Фронтенд — SPA-страница (главная и страницы просмотра /p/:slug)
app.get(['/', '/p/:slug'], sendIndex);

app.listen(PORT, () => {
  console.log(`Сервис запущен на http://localhost:${PORT}`);
});