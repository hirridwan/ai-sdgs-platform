import { json, queryOne } from './lib/db';
import type { Env } from './lib/db';
import { DUMMY_ADMIN_HASH, verifyAdminPassword } from './lib/admin-password';
import { adminCookie, createAdminSession, deleteAdminSession, expiredAdminCookie, readAdminToken, requireAdminSession } from './lib/admin-session';

/** Router autentikasi admin; endpoint data admin akan ditambahkan di Tahap 8. */
export async function handleAdminAuth(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname;
  const methods: Record<string, string> = {
    '/api/admin/auth/login': 'POST',
    '/api/admin/auth/logout': 'POST',
    '/api/admin/auth/me': 'GET',
  };
  const allowed = methods[path];
  if (!allowed) return json({ error: 'Endpoint admin tidak ditemukan.' }, 404);
  if (request.method !== allowed) return json({ error: 'Method Not Allowed' }, 405, { Allow: allowed });

  // Browser cross-site POST ditolak. curl tanpa Origin tetap dapat dipakai.
  // SameSite=Strict menjadi lapisan tambahan untuk cookie admin.
  if (request.method === 'POST' && request.headers.get('Sec-Fetch-Site') === 'cross-site') {
    return json({ error: 'Permintaan lintas situs ditolak.' }, 403);
  }

  try {
    if (path === '/api/admin/auth/login') {
      if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
        return json({ error: 'Gunakan Content-Type application/json.' }, 415);
      }
      let body: unknown;
      try { body = await request.json(); }
      catch { return json({ error: 'Body request bukan JSON yang valid.' }, 400); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Body harus berupa objek JSON.' }, 400);
      const { username, password } = body as Record<string, unknown>;
      if (typeof username !== 'string' || typeof password !== 'string'
        || !username.trim() || username.trim().length > 64 || !password || password.length > 256) {
        return json({ error: 'Username atau password tidak valid.' }, 400);
      }
      const admin = await queryOne<{ id: number; username: string; display_name: string; password_hash: string; is_active: number }>(env.DB,
        'SELECT id, username, display_name, password_hash, is_active FROM admins WHERE username = ?', [username.trim()]);
      const valid = await verifyAdminPassword(password, admin?.password_hash || DUMMY_ADMIN_HASH);
      if (!admin || !valid || admin.is_active !== 1) return json({ error: 'Username atau password salah.' }, 401);

      // Rotasi sesi browser yang sama setelah autentikasi berhasil.
      const previousToken = readAdminToken(request);
      if (previousToken) await deleteAdminSession(env.DB, previousToken);
      const token = await createAdminSession(env.DB, admin.id);
      return json({ admin: { id: admin.id, username: admin.username, displayName: admin.display_name } }, 200, { 'Set-Cookie': adminCookie(token) });
    }
    if (path === '/api/admin/auth/logout') {
      const token = readAdminToken(request);
      if (token) await deleteAdminSession(env.DB, token);
      return json({ ok: true }, 200, { 'Set-Cookie': expiredAdminCookie() });
    }
    const admin = await requireAdminSession(request, env.DB);
    if (!admin) return json({ error: 'Belum login sebagai admin.' }, 401, { 'Set-Cookie': expiredAdminCookie() });
    return json({ admin });
  } catch {
    // Jangan mencetak password, cookie, atau isi sesi ke log.
    console.error('Autentikasi admin gagal diproses.', { path });
    return json({ error: 'Layanan autentikasi admin belum dapat memproses permintaan.' }, 500);
  }
}
