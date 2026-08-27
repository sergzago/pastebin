const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = process.env.DATA_DIR || 'data';
const dbPath = path.join(__dirname, '..', dataDir, 'pastebin.db');

// Убеждаемся, что директория существует
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Схема базы данных
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pastes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    filename TEXT NOT NULL,
    title TEXT,
    iv TEXT NOT NULL,
    private INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Миграция: добавляем колонку `private` в уже существующую таблицу pastes
const pasteCols = db.prepare("PRAGMA table_info(pastes)").all();
if (!pasteCols.some((c) => c.name === 'private')) {
  db.exec('ALTER TABLE pastes ADD COLUMN private INTEGER NOT NULL DEFAULT 0');
}
// Миграция: параметр «разрешить скачивание без авторизации»
if (!pasteCols.some((c) => c.name === 'public_download')) {
  db.exec('ALTER TABLE pastes ADD COLUMN public_download INTEGER NOT NULL DEFAULT 0');
}

module.exports = db;