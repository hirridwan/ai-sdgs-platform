/**
 * SESSION HELPER
 *
 * Fungsi:
 * - Membuat & menyimpan sesi login tim ke tabel `sessions`.
 * - Membaca token sesi dari cookie request masuk & memvalidasinya ke DB.
 * - Menghapus sesi (logout).
 *
 * Sesi disimpan di DB (bukan JWT stateless) supaya "logout" benar-benar
 * mencabut akses, dan supaya mudah di-debug/di-audit langsung lewat D1.
 */

import { execute, queryOne } from './db';

const COOKIE_NAME = 'aisdgs_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 hari

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Buat sesi baru untuk sebuah team_id, simpan ke DB, kembalikan token mentahnya. */
export async function createSession(db: D1Database, teamId: number): Promise<string> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();

  await execute(db, 'INSERT INTO sessions (id, team_id, expires_at) VALUES (?, ?, ?)', [
    token,
    teamId,
    expiresAt,
  ]);

  return token;
}

/** Cabut satu sesi (dipakai saat logout). */
export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await execute(db, 'DELETE FROM sessions WHERE id = ?', [token]);
}

/** Ambil team_id pemilik sesi, atau null kalau token tidak valid/sudah kedaluwarsa. */
export async function getTeamIdFromToken(db: D1Database, token: string): Promise<number | null> {
  if (!token) return null;

  const row = await queryOne<{ team_id: number; expires_at: string }>(
    db,
    'SELECT team_id, expires_at FROM sessions WHERE id = ?',
    [token],
  );
  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    // Sesi kedaluwarsa: bersihkan baris agar tabel sessions tidak menumpuk sampah.
    await deleteSession(db, token);
    return null;
  }

  return row.team_id;
}

/** Ambil nilai cookie sesi dari header Cookie pada request. */
export function readSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));

  if (!match) return null;
  return decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
}

/** Header Set-Cookie untuk login (httpOnly + secure, tidak bisa diakses JS di browser). */
export function buildSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}

/** Header Set-Cookie untuk logout (menghapus cookie di browser). */
export function buildExpiredSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

/**
 * Middleware pendek: pastikan request punya sesi valid.
 * Dipakai di awal handler yang butuh login (teams.ts, interactions.ts, auth "me"/"logout").
 * Return team_id kalau valid, atau null kalau tidak (handler pemanggil yang memutuskan
 * response 401-nya, supaya helper ini tetap generic).
 */
export async function requireSession(request: Request, db: D1Database): Promise<number | null> {
  const token = readSessionToken(request);
  if (!token) return null;
  return getTeamIdFromToken(db, token);
}
