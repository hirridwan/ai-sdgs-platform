/**
 * PASSWORD HELPER
 *
 * Fungsi:
 * - Hash & verifikasi password tim menggunakan PBKDF2 (Web Crypto API).
 * - Tidak pakai library eksternal (bcrypt dsb tidak jalan di Cloudflare
 *   Workers runtime tanpa WASM tambahan), jadi cukup pakai crypto.subtle
 *   yang sudah tersedia native di Workers.
 *
 * Format hash yang disimpan di kolom teams.password_hash:
 *   "<salt_hex>:<hash_hex>"
 *
 * PENTING: jika parameter (iterasi, panjang key, algoritma hash) di bawah
 * ini diubah, password lama yang sudah tersimpan tidak akan valid lagi.
 */

const PBKDF2_ITERATIONS = 100_000;
const HASH_ALGORITHM = 'SHA-256';
const KEY_LENGTH_BITS = 256;
const SALT_LENGTH_BYTES = 16;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function deriveHashHex(password: string, salt: Uint8Array): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    keyMaterial,
    KEY_LENGTH_BITS,
  );

  return toHex(new Uint8Array(derivedBits));
}

/** Buat hash baru untuk password polos. Dipakai saat membuat/mengganti password tim. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
  const hashHex = await deriveHashHex(password, salt);
  return `${toHex(salt)}:${hashHex}`;
}

/** Cocokkan password polos yang diinput saat login dengan hash tersimpan di DB. */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, expectedHashHex] = String(storedHash || '').split(':');
  if (!saltHex || !expectedHashHex) return false;

  const salt = fromHex(saltHex);
  const actualHashHex = await deriveHashHex(password, salt);

  return timingSafeEqualHex(actualHashHex, expectedHashHex);
}

/** Bandingkan dua hex string tanpa membocorkan info lewat waktu eksekusi (mitigasi timing attack). */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
