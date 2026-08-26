const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

// Регистрация пользователя
router.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Введите имя пользователя и пароль' });
  }
  if (username.length < 3 || password.length < 6) {
    return res.status(400).json({ error: 'Имя — минимум 3 символа, пароль — минимум 6 символов' });
  }

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) {
    return res.status(409).json({ error: 'Пользователь с таким именем уже существует' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
  const user = { id: result.lastInsertRowid, username };
  req.session.userId = user.id;
  req.session.username = user.username;
  res.status(201).json({ user });
});

// Вход
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Введите имя пользователя и пароль' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ user: { id: user.id, username: user.username } });
});

// Текущий пользователь
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Не авторизован' });
  }
  res.json({ user: { id: req.session.userId, username: req.session.username } });
});

// Выход
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

module.exports = router;