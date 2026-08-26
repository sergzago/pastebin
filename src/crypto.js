const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const dataDir = process.env.DATA_DIR || 'data';

// Ключ шифрования. Если не задан в переменной окружения, генерируем и сохраняем в файл.
function loadOrCreateKey() {
  if (process.env.ENCRYPTION_KEY) {
    return Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  }
  const keyPath = path.join(__dirname, '..', dataDir, 'secret.key');
  fs.mkdirSync(path.dirname(keyPath), { recursive: true });
  if (!fs.existsSync(keyPath)) {
    const key = crypto.randomBytes(32);
    fs.writeFileSync(keyPath, key);
    return key;
  }
  return fs.readFileSync(keyPath);
}

const KEY = loadOrCreateKey();

const ALGO = 'aes-256-gcm';

/**
 * Шифрует текстовые данные и возвращает { iv, ciphertext }.
 * iv и ciphertext - строки в hex.
 */
function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Объединяем шифротекст и auth tag
  const combined = Buffer.concat([encrypted, authTag]);
  return {
    iv: iv.toString('hex'),
    ciphertext: combined.toString('hex'),
  };
}

/**
 * Дешифрует данные. Принимает { iv, ciphertext } в hex.
 */
function decrypt(ivHex, ciphertextHex) {
  const iv = Buffer.from(ivHex, 'hex');
  const combined = Buffer.from(ciphertextHex, 'hex');
  // Последние 16 байт — auth tag
  const authTag = combined.subarray(combined.length - 16);
  const encrypted = combined.subarray(0, combined.length - 16);
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Создаёт имя файла для хранения зашифрованных данных.
 */
function buildFilePath(filename) {
  return path.join(__dirname, '..', dataDir, 'pastes', filename);
}

function ensurePastesDir() {
  const dir = path.join(__dirname, '..', dataDir, 'pastes');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

module.exports = { encrypt, decrypt, buildFilePath, ensurePastesDir };