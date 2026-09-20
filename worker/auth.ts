/**
 * AUTH HANDLER
 *
 * Fungsi:
 * - Login tim (username + password) → set cookie sesi httpOnly.
 * - Logout → cabut sesi di DB & hapus cookie.
 * - Cek status login ("me") → dipakai frontend untuk tahu apakah sudah
 *   login sebelum menampilkan dashboard.
 *
 * Route:
 * - POST /api/auth/login
 * - POST /api/auth/logout
 * - GET  /api/auth/me
 *
 * Tidak ada endpoint signup publik dengan sengaja: akun tim dibuat manual
 * oleh admin lewat `wrangler d1 execute` (lihat catatan di worker/README
 * atau dokumentasi Tahap 2).
 */

import type { Env } from './lib/db';
import { json, queryOne } from './lib/db';
import { verifyPassword } from './lib/password';
import {
  buildExpiredSessionCookie,
  buildSessionCookie,
  createSession,
  deleteSession,
  readSessionToken,
  requireSession,
} from './lib/session';

type TeamRow = {
  id: number;
  username: string;
  password_hash: string;
  team_name: string;
};

export async function handleLogin(request: Request, env: Env): Promise<Response> {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body request tidak valid.' }, 400);
  }

  const username = String(body.username || '').trim();
  const password = String(body.password || '');

  if (!username || !password) {
    return json({ error: 'Username dan password wajib diisi.' }, 400);
  }

  const team = await queryOne<TeamRow>(
    env.DB,
    'SELECT id, username, password_hash, team_name FROM teams WHERE username = ?',
    [username],
  );

  // Pesan error digeneralisasi (tidak bilang "username tidak ada" vs "password salah")
  // supaya tidak membocorkan username mana saja yang terdaftar.
  if (!team || !(await verifyPassword(password, team.password_hash))) {
    return json({ error: 'Username atau password salah.' }, 401);
  }

  const token = await createSession(env.DB, team.id);

  return json(
    { team: { id: team.id, username: team.username, teamName: team.team_name } },
    200,
    { 'Set-Cookie': buildSessionCookie(token) },
  );
}

export async function handleLogout(request: Request, env: Env): Promise<Response> {
  const token = readSessionToken(request);
  if (token) {
    await deleteSession(env.DB, token);
  }

  return json({ ok: true }, 200, { 'Set-Cookie': buildExpiredSessionCookie() });
}

export async function handleMe(request: Request, env: Env): Promise<Response> {
  const teamId = await requireSession(request, env.DB);
  if (!teamId) {
    return json({ error: 'Belum login.' }, 401);
  }

  const team = await queryOne<{ id: number; username: string; team_name: string }>(
    env.DB,
    'SELECT id, username, team_name FROM teams WHERE id = ?',
    [teamId],
  );

  if (!team) {
    return json({ error: 'Belum login.' }, 401);
  }

  return json({ team: { id: team.id, username: team.username, teamName: team.team_name } }, 200);
}
