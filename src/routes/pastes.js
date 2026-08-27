const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const db = require('../db');
const { encrypt, decrypt, buildFilePath, ensurePastesDir } = require('../crypto');

const router = express.Router();

// Требование авторизации
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  next();
}

// Генерация уникального slug для ссылки
function generateSlug() {
  return crypto.randomBytes(6).toString('base64url');
}

// Поиск записи вместе с именем автора
function findPaste(slug) {
  return db
    .prepare(
      `SELECT p.*, u.username AS author
       FROM pastes p JOIN users u ON u.id = p.user_id
       WHERE p.slug = ?`
    )
    .get(slug);
}

// Проверка доступа: приватную запись может смотреть/менять только её автор
function canAccess(paste, userId) {
  if (paste.private === 1) {
    return paste.user_id === userId;
  }
  return true; // неприватные доступны всем авторизованным
}

// Создание записи (зашифрованный файл + ссылка)
router.post('/', requireAuth, (req, res) => {
  const { content, title } = req.body;
  if (typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({ error: 'Содержимое записи не может быть пустым' });
  }

  const isPrivate = req.body.private === true;
  const isPublicDownload = req.body.public_download === true;

  // Шифруем содержимое
  const { iv, ciphertext } = encrypt(content);

  const slug = generateSlug();
  const filename = `${slug}.enc`;
  const filePath = buildFilePath(filename);
  ensurePastesDir();
  fs.writeFileSync(filePath, ciphertext);

  db.prepare(
    'INSERT INTO pastes (user_id, slug, filename, title, iv, private, public_download) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(req.session.userId, slug, filename, title || null, iv, isPrivate ? 1 : 0, isPublicDownload ? 1 : 0);

  res.status(201).json({
    paste: {
      slug,
      url: `/p/${slug}`,
      private: isPrivate,
      public_download: isPublicDownload,
    },
  });
});

// Лента публичных (неприватных) записей всех пользователей
router.get('/', requireAuth, (req, res) => {
  const pastes = db
    .prepare(
      `SELECT p.slug, p.title, p.created_at, p.private, p.public_download, u.username AS author
       FROM pastes p JOIN users u ON u.id = p.user_id
       WHERE p.private = 0
       ORDER BY p.created_at DESC`
    )
    .all();
  res.json({ pastes });
});

// Список записей текущего пользователя
router.get('/mine', requireAuth, (req, res) => {
  const pastes = db
    .prepare('SELECT slug, title, created_at, private, public_download FROM pastes WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.session.userId);
  res.json({ pastes });
});

// Скачивание расшифрованного файла в виде текстового файла.
// Если у записи включён параметр «публичное скачивание» (public_download = 1)
// и она не приватная — доступно без авторизации по прямой ссылке.
router.get('/:slug/download', (req, res) => {
  const paste = findPaste(req.params.slug);
  if (!paste) {
    return res.status(404).json({ error: 'Запись не найдена' });
  }

  // Анонимный доступ разрешён только для неприватных записей
  // с включённым параметром публичного скачивания
  const anonymousAllowed = paste.public_download === 1 && paste.private !== 1;
  if (!req.session.userId) {
    if (!anonymousAllowed) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }
  } else if (!canAccess(paste, req.session.userId)) {
    return res.status(403).json({ error: 'Доступ к приватной записи запрещён' });
  }

  const filePath = buildFilePath(paste.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(500).json({ error: 'Файл записи отсутствует на сервере' });
  }

  const ciphertext = fs.readFileSync(filePath, 'utf8');
  try {
    const text = decrypt(paste.iv, ciphertext);
    // Очистка имени файла: допускаем буквы (в т.ч. кириллицу), цифры, дефис и подчёркивание
    const baseName = (paste.title || paste.slug).replace(/[^A-Za-zА-Яа-яЁё0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || paste.slug;
    // ASCII-версия имени (без кириллицы) для fallback-параметра filename=
    const asciiName = baseName.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'paste';
    // RFC 5987: кодируем UTF-8 имя через encodeURIComponent для filename*
    const encodedName = encodeURIComponent(baseName + '.txt').replace(/['()]/g, escape);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiName}.txt"; filename*=UTF-8''${encodedName}`
    );
    res.send(text);
  } catch (e) {
    res.status(500).json({ error: 'Не удалось расшифровать запись' });
  }
});

// Просмотр расшифрованного текста по ссылке (только для авторизованных)
router.get('/:slug', requireAuth, (req, res) => {
  const paste = findPaste(req.params.slug);
  if (!paste) {
    return res.status(404).json({ error: 'Запись не найдена' });
  }
  if (!canAccess(paste, req.session.userId)) {
    return res.status(403).json({ error: 'Доступ к приватной записи запрещён' });
  }

  const filePath = buildFilePath(paste.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(500).json({ error: 'Файл записи отсутствует на сервере' });
  }

  const ciphertext = fs.readFileSync(filePath, 'utf8');
  try {
    const text = decrypt(paste.iv, ciphertext);
    res.json({
      paste: {
        slug: paste.slug,
        title: paste.title,
        created_at: paste.created_at,
        private: paste.private === 1,
        public_download: paste.public_download === 1,
        author: paste.author,
      },
      content: text,
    });
  } catch (e) {
    res.status(500).json({ error: 'Не удалось расшифровать запись' });
  }
});

// Редактирование записи
// Неприватные записи может редактировать любой зарегистрированный пользователь;
// приватные — только их автор.
router.put('/:slug', requireAuth, (req, res) => {
  const paste = db.prepare('SELECT * FROM pastes WHERE slug = ?').get(req.params.slug);
  if (!paste) {
    return res.status(404).json({ error: 'Запись не найдена' });
  }
  const isOwner = paste.user_id === req.session.userId;
  if (paste.private === 1 && !isOwner) {
    return res.status(403).json({ error: 'Доступ к приватной записи запрещён' });
  }

  const { content, title } = req.body;

  // Если передано содержимое — перешифровываем и перезаписываем файл
  if (content !== undefined) {
    if (typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({ error: 'Содержимое записи не может быть пустым' });
    }
    const { iv, ciphertext } = encrypt(content);
    const filePath = buildFilePath(paste.filename);
    ensurePastesDir();
    fs.writeFileSync(filePath, ciphertext);
    db.prepare('UPDATE pastes SET iv = ? WHERE slug = ?').run(iv, req.params.slug);
  }

  // Обновляем заголовок, если он передан
  if (title !== undefined) {
    db.prepare('UPDATE pastes SET title = ? WHERE slug = ?').run(title || null, req.params.slug);
  }

  // Менять признак приватности может только автор записи
  if (req.body.private !== undefined && isOwner) {
    db.prepare('UPDATE pastes SET private = ? WHERE slug = ?').run(req.body.private ? 1 : 0, req.params.slug);
  }

  // Разрешать/запрещать публичное скачивание может только автор записи
  if (req.body.public_download !== undefined && isOwner) {
    db.prepare('UPDATE pastes SET public_download = ? WHERE slug = ?').run(
      req.body.public_download ? 1 : 0,
      req.params.slug
    );
  }

  res.json({ ok: true });
});

// Удаление записи (только её автор)
router.delete('/:slug', requireAuth, (req, res) => {
  const paste = db.prepare('SELECT * FROM pastes WHERE slug = ?').get(req.params.slug);
  if (!paste) {
    return res.status(404).json({ error: 'Запись не найдена' });
  }
  if (paste.user_id !== req.session.userId) {
    return res.status(403).json({ error: 'Удалять запись может только её автор' });
  }

  // Удаляем зашифрованный файл записи, если он существует
  const filePath = buildFilePath(paste.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM pastes WHERE slug = ?').run(req.params.slug);
  res.json({ ok: true });
});

module.exports = router;