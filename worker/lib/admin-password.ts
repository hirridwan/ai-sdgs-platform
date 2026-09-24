// Format khusus admin; tidak mengubah format password tim yang sudah ada.
// Web Crypto tersedia di Worker dan Node modern.
const ITERATIONS = 100_000;
const PREFIX = 'pbkdf2-sha256';
const encoder = new TextEncoder();

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(hex.match(/.{2}/g) || [], part => parseInt(part, 16));
}

export async function verifyAdminPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split('$');
  if (parts.length !== 4 || parts[0] !== PREFIX || parts[1] !== String(ITERATIONS)
    || !/^[a-f0-9]{32}$/.test(parts[2]) || !/^[a-f0-9]{64}$/.test(parts[3])) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const actual = new Uint8Array(await crypto.subtle.deriveBits({
    name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(parts[2]), iterations: ITERATIONS,
  }, key, 256));
  const expected = fromHex(parts[3]);
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= actual[i] ^ expected[i];
  return difference === 0;
}

// Tetap melakukan derivasi untuk username yang tidak ditemukan.
export const DUMMY_ADMIN_HASH = `${PREFIX}$${ITERATIONS}$${'0'.repeat(32)}$${'0'.repeat(64)}`;
