import { execute, queryOne } from './db';

export const ADMIN_COOKIE_NAME = 'aisdgs_admin_session';
const TTL_SECONDS = 8 * 60 * 60;

export type AdminIdentity = { id: number; username: string; displayName: string };

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function tokenHash(token: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))));
}

export function readAdminToken(request: Request): string | null {
  const matches = (request.headers.get('Cookie') || '').split(';').map(value => value.trim())
    .filter(value => value.startsWith(`${ADMIN_COOKIE_NAME}=`));
  if (matches.length !== 1) return null;
  const token = matches[0].slice(ADMIN_COOKIE_NAME.length + 1);
  return /^[a-f0-9]{64}$/.test(token) ? token : null;
}

export async function createAdminSession(db: D1Database, adminId: number): Promise<string> {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  const result = await execute(db, 'INSERT INTO admin_sessions (id, admin_id, expires_at) VALUES (?, ?, ?)', [
    await tokenHash(token), adminId, new Date(Date.now() + TTL_SECONDS * 1000).toISOString(),
  ]);
  if (!result.success) throw new Error('Session insert failed.');
  return token;
}

export async function deleteAdminSession(db: D1Database, token: string): Promise<void> {
  const result = await execute(db, 'DELETE FROM admin_sessions WHERE id = ?', [await tokenHash(token)]);
  if (!result.success) throw new Error('Session deletion failed.');
}

/** Gunakan helper ini di setiap endpoint data admin pada Tahap 8. */
export async function requireAdminSession(request: Request, db: D1Database): Promise<AdminIdentity | null> {
  const token = readAdminToken(request);
  if (!token) return null;
  const row = await queryOne<{
    id: number; username: string; display_name: string; is_active: number; expires_at: string;
  }>(db, `SELECT a.id, a.username, a.display_name, a.is_active, s.expires_at
    FROM admin_sessions s JOIN admins a ON a.id = s.admin_id WHERE s.id = ?`, [await tokenHash(token)]);
  if (!row) return null;
  const expiry = Date.parse(row.expires_at);
  if (row.is_active !== 1 || !Number.isFinite(expiry) || expiry <= Date.now()) {
    await deleteAdminSession(db, token);
    return null;
  }
  return { id: row.id, username: row.username, displayName: row.display_name };
}

export function adminCookie(token: string): string {
  return `${ADMIN_COOKIE_NAME}=${token}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${TTL_SECONDS}`;
}
export function expiredAdminCookie(): string {
  return `${ADMIN_COOKIE_NAME}=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
