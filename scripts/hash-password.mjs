/**
 * Generate hash password untuk kolom teams.password_hash.
 *
 * Kenapa perlu script terpisah?
 * - worker/lib/password.ts pakai Web Crypto (crypto.subtle) yang hanya jalan
 *   di runtime Workers, tidak bisa dipanggil langsung dari terminal.
 * - Script ini pakai Node crypto.pbkdf2Sync dengan PARAMETER YANG SAMA PERSIS
 *   (PBKDF2-HMAC-SHA256, 100.000 iterasi, 256-bit key) supaya hasilnya
 *   kompatibel dan bisa diverifikasi oleh worker/lib/password.ts saat login.
 *
 * Pemakaian:
 *   node scripts/hash-password.mjs "passwordRahasiaTim"
 *
 * Output: "<salt_hex>:<hash_hex>" -> tempel ini ke kolom password_hash
 * saat INSERT akun tim lewat `wrangler d1 execute`.
 */

import crypto from 'node:crypto';

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH_BYTES = 32; // 256 bit, harus sama dengan KEY_LENGTH_BITS di password.ts
const SALT_LENGTH_BYTES = 16;

const password = process.argv[2];

if (!password) {
  console.error('Pemakaian: node scripts/hash-password.mjs "passwordRahasiaTim"');
  process.exit(1);
}

const salt = crypto.randomBytes(SALT_LENGTH_BYTES);
const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH_BYTES, 'sha256');

console.log(`${salt.toString('hex')}:${hash.toString('hex')}`);
