// Membuat SQL lokal. Tidak menghubungi Cloudflare atau menjalankan INSERT.
// Password dibaca interaktif tanpa ditampilkan; jangan masukkan password ke argumen shell.
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { emitKeypressEvents } from 'node:readline';

const [username, displayName] = process.argv.slice(2);
if (!username || !/^[A-Za-z0-9_.-]{3,64}$/.test(username) || !displayName?.trim() || displayName.length > 100) {
  console.error('Pemakaian: node scripts/create-admin-sql.mjs admin_lokal "Admin Lokal"');
  process.exit(1);
}

async function readSecret(prompt) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('Jalankan di terminal interaktif. Jika Git Bash bermasalah, gunakan PowerShell.');
  }
  process.stdout.write(prompt);
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    function finish(error) {
      process.stdin.removeListener('keypress', onKey);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
      if (error) reject(error); else resolve(value);
    }
    function onKey(str, key = {}) {
      if (key.ctrl && key.name === 'c') return finish(new Error('Dibatalkan.'));
      if (key.name === 'return' || key.name === 'enter') return finish();
      if (key.name === 'backspace') value = Array.from(value).slice(0, -1).join('');
      else if (str && !key.ctrl && !key.meta && !str.includes('\u001b') && !/[\r\n]/.test(str)) value += str;
    }
    process.stdin.on('keypress', onKey);
  });
}
const quote = value => `'${value.replaceAll("'", "''")}'`;
try {
  const password = await readSecret('Password admin (12–256 karakter; tidak ditampilkan): ');
  if (password.length < 12 || password.length > 256) throw new Error('Panjang password harus 12–256 karakter.');
  const confirmation = await readSecret('Ulangi password: ');
  if (password !== confirmation) throw new Error('Konfirmasi password tidak sama.');
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, 100_000, 32, 'sha256');
  const encoded = `pbkdf2-sha256$100000$${salt.toString('hex')}$${hash.toString('hex')}`;
  const sql = `-- Dibuat lokal; tidak berisi password mentah. Jangan commit file ini.\nINSERT INTO admins (username, password_hash, display_name) VALUES (${quote(username)}, ${quote(encoded)}, ${quote(displayName.trim())});\n`;
  writeFileSync('admin-local.seed.sql', sql, { flag: 'wx', mode: 0o600 });
  console.log('admin-local.seed.sql dibuat. Jalankan dengan wrangler d1 execute --local; script ini belum mengubah database.');
} catch (error) {
  console.error(error.code === 'EEXIST' ? 'admin-local.seed.sql sudah ada. Script tidak menimpanya; gunakan file yang ada atau pindahkan dahulu.' : error.message);
  process.exitCode = 1;
}
