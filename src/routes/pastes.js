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

// Создание записи (зашифрованный файл + ссылка)
router.post('/', requireAuth, (req, res) => {
  const { content, title } = req.body;
  if (typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({ error: 'Содержимое записи не может быть пустым' });
  }

  // Шифруем содержимое
  const { iv, ciphertext } = encrypt(content);

  const slug = generateSlug();
  const filename = `${slug}.enc`;
  const filePath = buildFilePath(filename);
  ensurePastesDir();
  fs.writeFileSync(filePath, ciphertext);

  db.prepare(
    'INSERT INTO pastes (user_id, slug, filename, title, iv) VALUES (?, ?, ?, ?, ?)'
  ).run(req.session.userId, slug, filename, title || null, iv);

  res.status(201).json({
    paste: {
      slug,
      url: `/p/${slug}`,
    },
  });
});

// Список записей текущего пользователя
router.get('/mine', requireAuth, (req, res) => {
  const pastes = db
    .prepare('SELECT slug, title, created_at FROM pastes WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.session.userId);
  res.json({ pastes });
});

// Скачивание расшифрованного файла в виде текстового файла
router.get('/:slug/download', requireAuth, (req, res) => {
  const paste = db.prepare('SELECT * FROM pastes WHERE slug = ?').get(req.params.slug);
  if (!paste) {
    return res.status(404).json({ error: 'Запись не найдена' });
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
  const paste = db.prepare('SELECT * FROM pastes WHERE slug = ?').get(req.params.slug);
  if (!paste) {
    return res.status(404).json({ error: 'Запись не найдена' });
  }

  const filePath = buildFilePath(paste.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(500).json({ error: 'Файл записи отсутствует на сервере' });
  }

  const ciphertext = fs.readFileSync(filePath, 'utf8');
  try {
    const text = decrypt(paste.iv, ciphertext);
    res.json({ paste: { slug: paste.slug, title: paste.title, created_at: paste.created_at }, content: text });
  } catch (e) {
    res.status(500).json({ error: 'Не удалось расшифровать запись' });
  }
});

module.exports = router;