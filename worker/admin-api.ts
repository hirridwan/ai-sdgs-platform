import { execute, json, queryAll, queryOne } from './lib/db';
import type { Env } from './lib/db';
import { requireAdminSession } from './lib/admin-session';
import { findSdgTitle } from './lib/sdgs';
import { hashPassword } from './lib/password';

const ACTIONS = ['explore', 'factCheck', 'reviewArgument', 'debate', 'evaluateSolution'];
// CASE protects legacy rows whose metadata is absent or malformed JSON.
const BACKEND = "CASE WHEN json_valid(i.request_meta) THEN json_extract(i.request_meta, '$.backend') ELSE NULL END";
const TEAM_COLUMNS = 't.id, t.username, t.team_name, t.motion, t.sdg_number, t.sdg_title, t.created_at, t.updated_at';
type TeamRow = { id: number; username: string; team_name: string; motion: string | null; sdg_number: number | null; sdg_title: string | null; created_at: string; updated_at: string };
type MemberRow = { id: number; name: string; position: number };
class InputError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
function positive(value: string, name: string): number {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new InputError(`${name} harus bilangan bulat positif.`);
  return Number(value);
}
function paging(search: URLSearchParams) {
  const page = positive(search.get('page') ?? '1', 'page');
  const limit = positive(search.get('limit') ?? '20', 'limit');
  if (limit > 50) throw new InputError('limit maksimal 50.');
  const offset = (page - 1) * limit;
  if (!Number.isSafeInteger(offset)) throw new InputError('Nomor halaman terlalu besar.');
  return { page, limit, offset };
}
function pagination(p: ReturnType<typeof paging>, total: number) {
  return { page: p.page, limit: p.limit, total, totalPages: Math.ceil(total / p.limit), hasNextPage: p.offset + p.limit < total };
}
function parseJson(value: string | null): unknown {
  try { return value ? JSON.parse(value) : null; } catch { return null; }
}
function utc(value: string | null): string | null {
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? value.replace(' ', 'T') + 'Z' : value;
}
function teamData(row: TeamRow) {
  return { id: row.id, username: row.username, teamName: row.team_name, motion: row.motion, sdgNumber: row.sdg_number, sdgTitle: row.sdg_title, createdAt: utc(row.created_at), updatedAt: utc(row.updated_at) };
}
async function getTeam(db: D1Database, id: number): Promise<TeamRow> {
  const team = await queryOne<TeamRow>(db, `SELECT ${TEAM_COLUMNS} FROM teams t WHERE t.id = ?`, [id]);
  if (!team) throw new InputError('Tim tidak ditemukan.', 404);
  return team;
}
async function teamDetail(db: D1Database, id: number): Promise<Response> {
  const team = await getTeam(db, id);
  const members = await queryAll<MemberRow>(db, 'SELECT id, name, position FROM team_members WHERE team_id = ? ORDER BY position, id', [id]);
  const activity = await queryOne<{ total: number; last_at: string | null }>(db, 'SELECT COUNT(*) AS total, MAX(created_at) AS last_at FROM ai_interactions WHERE team_id = ?', [id]);
  const counts = await queryAll<{ action: string; total: number }>(db, 'SELECT action, COUNT(*) AS total FROM ai_interactions WHERE team_id = ? GROUP BY action', [id]);
  return json({ team: teamData(team), members, activity: { totalInteractions: activity?.total ?? 0, lastInteractionAt: utc(activity?.last_at ?? null), byAction: actionCounts(counts) } });
}
function actionCounts(rows: { action: string; total: number }[]) {
  return ACTIONS.map(action => ({ action, total: rows.find(row => row.action === action)?.total ?? 0 }));
}
async function overview(db: D1Database): Promise<Response> {
  const totalTeams = await queryOne<{ total: number }>(db, 'SELECT COUNT(*) AS total FROM teams');
  const totalMembers = await queryOne<{ total: number }>(db, 'SELECT COUNT(*) AS total FROM team_members');
  const activity = await queryOne<{ total: number; teams: number; last_at: string | null }>(db, 'SELECT COUNT(*) AS total, COUNT(DISTINCT team_id) AS teams, MAX(created_at) AS last_at FROM ai_interactions');
  const counts = await queryAll<{ action: string; total: number }>(db, 'SELECT action, COUNT(*) AS total FROM ai_interactions GROUP BY action');
  const recent = await queryAll<{ id: number; team_id: number; team_name: string; action: string; position: string | null; created_at: string }>(db,
    'SELECT i.id, i.team_id, t.team_name, i.action, i.position, i.created_at FROM ai_interactions i JOIN teams t ON t.id = i.team_id ORDER BY i.created_at DESC, i.id DESC LIMIT 10');
  return json({ overview: {
    totalTeams: totalTeams?.total ?? 0, totalMembers: totalMembers?.total ?? 0,
    totalInteractions: activity?.total ?? 0, teamsWithInteractions: activity?.teams ?? 0,
    teamsWithoutInteractions: (totalTeams?.total ?? 0) - (activity?.teams ?? 0),
    lastInteractionAt: utc(activity?.last_at ?? null), byAction: actionCounts(counts),
    recentInteractions: recent.map(row => ({ id: row.id, teamId: row.team_id, teamName: row.team_name, action: row.action, position: row.position, createdAt: utc(row.created_at) })),
  } });
}
async function listTeams(db: D1Database, search: URLSearchParams): Promise<Response> {
  const p = paging(search), q = (search.get('q') ?? '').trim();
  if (q.length > 200) throw new InputError('Pencarian maksimal 200 karakter.');
  const escaped = `%${q.replace(/[!%_]/g, character => '!' + character)}%`;
  const where = q ? "WHERE t.team_name LIKE ? ESCAPE '!' OR t.username LIKE ? ESCAPE '!' OR t.motion LIKE ? ESCAPE '!'" : '';
  const params: unknown[] = q ? [escaped, escaped, escaped] : [];
  const count = await queryOne<{ total: number }>(db, `SELECT COUNT(*) AS total FROM teams t ${where}`, params);
  const rows = await queryAll<TeamRow & { member_count: number; interaction_count: number; last_at: string | null }>(db,
    `SELECT ${TEAM_COLUMNS},
      (SELECT COUNT(*) FROM team_members m WHERE m.team_id = t.id) AS member_count,
      (SELECT COUNT(*) FROM ai_interactions i WHERE i.team_id = t.id) AS interaction_count,
      (SELECT MAX(i.created_at) FROM ai_interactions i WHERE i.team_id = t.id) AS last_at
     FROM teams t ${where} ORDER BY t.id DESC LIMIT ? OFFSET ?`, [...params, p.limit, p.offset]);
  return json({ teams: rows.map(row => ({ ...teamData(row), memberCount: row.member_count, interactionCount: row.interaction_count, lastInteractionAt: utc(row.last_at) })), pagination: pagination(p, count?.total ?? 0) });
}
async function bodyObject(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) throw new InputError('Gunakan Content-Type application/json.', 415);
  let parsed: unknown;
  try { parsed = await request.json(); } catch { throw new InputError('JSON tidak valid.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new InputError('Body harus berupa objek JSON.');
  return parsed as Record<string, unknown>;
}
function only(body: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(body).some(key => !allowed.includes(key))) throw new InputError('Body memuat field yang tidak didukung.');
}
function requiredName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 150) throw new InputError('Nama harus berupa teks 1–150 karakter.');
  return value.trim();
}
// Username tim: huruf/angka/._- , 3-50 karakter. Dipakai untuk login, jadi dijaga ketat dari awal.
function requiredUsername(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_.-]{3,50}$/.test(value)) throw new InputError('Username harus 3–50 karakter, hanya huruf/angka/titik/underscore/strip.');
  return value;
}
function requiredPassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < 8 || value.length > 200) throw new InputError('Password minimal 8 karakter.');
  return value;
}
function optionalMotion(body: Record<string, unknown>): string | null {
  if (!Object.hasOwn(body, 'motion')) return null;
  const motion = body.motion;
  if (motion !== null && (typeof motion !== 'string' || motion.length > 5000)) throw new InputError('Mosi harus berupa teks maksimal 5000 karakter atau null.');
  return typeof motion === 'string' ? motion.trim() : null;
}
function optionalSdg(body: Record<string, unknown>): { sdgNumber: number | null; sdgTitle: string | null } {
  if (!Object.hasOwn(body, 'sdgNumber')) return { sdgNumber: null, sdgTitle: null };
  const sdg = body.sdgNumber;
  if (sdg !== null && (typeof sdg !== 'number' || !Number.isInteger(sdg) || sdg < 1 || sdg > 17)) throw new InputError('sdgNumber harus bilangan bulat 1–17 atau null.');
  const sdgNumber = sdg as number | null;
  const sdgTitle = sdgNumber === null ? null : findSdgTitle(sdgNumber);
  if (sdgNumber !== null && !sdgTitle) throw new InputError('SDG tidak ditemukan.');
  return { sdgNumber, sdgTitle };
}
/** POST /api/admin/teams — buat tim baru. Membuat akun login (username+password) sekaligus identitas awal. */
async function createTeam(request: Request, db: D1Database): Promise<Response> {
  const body = await bodyObject(request);
  only(body, ['username', 'password', 'teamName', 'motion', 'sdgNumber']);
  const username = requiredUsername(body.username);
  const password = requiredPassword(body.password);
  const teamName = requiredName(body.teamName);
  const motion = optionalMotion(body);
  const { sdgNumber, sdgTitle } = optionalSdg(body);

  const existing = await queryOne<{ id: number }>(db, 'SELECT id FROM teams WHERE username = ?', [username]);
  if (existing) throw new InputError('Username sudah dipakai tim lain.', 409);

  const passwordHash = await hashPassword(password);
  const result = await execute(
    db,
    'INSERT INTO teams (username, password_hash, team_name, motion, sdg_number, sdg_title) VALUES (?, ?, ?, ?, ?, ?)',
    [username, passwordHash, teamName, motion, sdgNumber, sdgTitle],
  );
  if (!result.success) throw new Error('Team insert failed.');

  return teamDetail(db, Number(result.meta.last_row_id));
}
async function updateTeam(request: Request, db: D1Database, id: number): Promise<Response> {
  await getTeam(db, id);
  const body = await bodyObject(request);
  only(body, ['teamName', 'motion', 'sdgNumber']);
  const updates: string[] = [], params: unknown[] = [];
  if (Object.hasOwn(body, 'teamName')) { updates.push('team_name = ?'); params.push(requiredName(body.teamName)); }
  if (Object.hasOwn(body, 'motion')) {
    if (body.motion !== null && (typeof body.motion !== 'string' || body.motion.length > 5000)) throw new InputError('Mosi harus berupa teks maksimal 5000 karakter atau null.');
    updates.push('motion = ?'); params.push(typeof body.motion === 'string' ? body.motion.trim() : null);
  }
  if (Object.hasOwn(body, 'sdgNumber')) {
    const sdg = body.sdgNumber;
    if (sdg !== null && (typeof sdg !== 'number' || !Number.isInteger(sdg) || sdg < 1 || sdg > 17)) throw new InputError('sdgNumber harus bilangan bulat 1–17 atau null.');
    const title = sdg === null ? null : findSdgTitle(sdg as number);
    if (sdg !== null && !title) throw new InputError('SDG tidak ditemukan.');
    updates.push('sdg_number = ?', 'sdg_title = ?'); params.push(sdg, title);
  }
  if (!updates.length) throw new InputError('Tidak ada field yang diubah.');
  updates.push("updated_at = datetime('now')");
  const result = await execute(db, `UPDATE teams SET ${updates.join(', ')} WHERE id = ?`, [...params, id]);
  if (!result.success) throw new Error('Team update failed.');
  return teamDetail(db, id);
}
async function mutateMember(request: Request, db: D1Database, teamId: number, memberId?: number): Promise<Response> {
  await getTeam(db, teamId);
  if (request.method === 'POST') {
    const body = await bodyObject(request); only(body, ['name']);
    const result = await execute(db, 'INSERT INTO team_members (team_id, name, position) SELECT ?, ?, COALESCE(MAX(position), -1) + 1 FROM team_members WHERE team_id = ?', [teamId, requiredName(body.name), teamId]);
    if (!result.success) throw new Error('Member insert failed.');
  } else {
    let result: D1Result;
    if (request.method === 'PATCH') {
      const body = await bodyObject(request); only(body, ['name']);
      result = await execute(db, 'UPDATE team_members SET name = ? WHERE id = ? AND team_id = ?', [requiredName(body.name), memberId, teamId]);
    } else result = await execute(db, 'DELETE FROM team_members WHERE id = ? AND team_id = ?', [memberId, teamId]);
    if (!result.success) throw new Error('Member mutation failed.');
    if (!result.meta.changes) throw new InputError('Anggota tidak ditemukan pada tim ini.', 404);
  }
  return teamDetail(db, teamId);
}
function dateBoundary(value: string, name: string, nextDay = false): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new InputError(`${name} harus berformat YYYY-MM-DD.`);
  const d = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== value) throw new InputError(`${name} tidak valid.`);
  if (nextDay) d.setUTCDate(d.getUTCDate() + 1);
  if (d.getUTCFullYear() > 9999) throw new InputError(`${name} di luar rentang.`);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}
type PreviewRow = { id: number; team_id: number; team_name: string; action: string; position: string | null; backend: string | null; request_preview: string; response_preview: string; created_at: string };
async function listInteractions(db: D1Database, search: URLSearchParams): Promise<Response> {
  const p = paging(search), conditions: string[] = [], params: unknown[] = [];
  if (search.has('teamId')) { conditions.push('i.team_id = ?'); params.push(positive(search.get('teamId')!, 'teamId')); }
  const action = search.get('action');
  if (action !== null) { if (!ACTIONS.includes(action)) throw new InputError('action tidak dikenal.'); conditions.push('i.action = ?'); params.push(action); }
  const backend = search.get('backend');
  if (backend !== null) { if (!['v1', 'v2'].includes(backend)) throw new InputError('backend harus v1 atau v2.'); conditions.push(`${BACKEND} = ?`); params.push(backend); }
  const from = search.get('dateFrom'), to = search.get('dateTo');
  if (from !== null) { conditions.push('i.created_at >= ?'); params.push(dateBoundary(from, 'dateFrom')); }
  if (to !== null) { conditions.push('i.created_at < ?'); params.push(dateBoundary(to, 'dateTo', true)); }
  if (from !== null && to !== null && from > to) throw new InputError('dateFrom tidak boleh melewati dateTo.');
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const count = await queryOne<{ total: number }>(db, `SELECT COUNT(*) AS total FROM ai_interactions i ${where}`, params);
  const rows = await queryAll<PreviewRow>(db, `SELECT i.id, i.team_id, t.team_name, i.action, i.position,
    ${BACKEND} AS backend, substr(i.request_text, 1, 240) AS request_preview,
    substr(i.ai_response, 1, 240) AS response_preview, i.created_at
    FROM ai_interactions i JOIN teams t ON t.id = i.team_id ${where}
    ORDER BY i.created_at DESC, i.id DESC LIMIT ? OFFSET ?`, [...params, p.limit, p.offset]);
  return json({ interactions: rows.map(row => ({ id: row.id, teamId: row.team_id, teamName: row.team_name, action: row.action, position: row.position, backend: row.backend,
    requestPreview: row.request_preview, responsePreview: row.response_preview, createdAt: utc(row.created_at) })), pagination: pagination(p, count?.total ?? 0) });
}
async function interactionDetail(db: D1Database, id: number): Promise<Response> {
  const row = await queryOne<{ id: number; team_id: number; team_name: string; action: string; position: string | null; request_text: string; request_meta: string | null; ai_response: string; ai_meta: string | null; created_at: string }>(db,
    `SELECT i.id, i.team_id, t.team_name, i.action, i.position, i.request_text, i.request_meta, i.ai_response, i.ai_meta, i.created_at
     FROM ai_interactions i JOIN teams t ON t.id = i.team_id WHERE i.id = ?`, [id]);
  if (!row) throw new InputError('Interaksi tidak ditemukan.', 404);
  return json({ interaction: { id: row.id, teamId: row.team_id, teamName: row.team_name, action: row.action, position: row.position, requestText: row.request_text,
    requestMeta: parseJson(row.request_meta), aiResponse: row.action === 'factCheck' ? parseJson(row.ai_response) ?? row.ai_response : row.ai_response,
    aiMeta: parseJson(row.ai_meta), createdAt: utc(row.created_at) } });
}

/** Register AFTER /api/admin/auth/ and BEFORE the frontend fallback. */
export async function handleAdminApi(request: Request, env: Env): Promise<Response> {
  try {
    const admin = await requireAdminSession(request, env.DB);
    if (!admin) return json({ error: 'Belum login sebagai admin.' }, 401);
    const url = new URL(request.url), path = url.pathname;
    let allowed: string[] = [], work: (() => Promise<Response>) | null = null;
    if (path === '/api/admin/overview') { allowed = ['GET']; work = () => overview(env.DB); }
    else if (path === '/api/admin/teams') { allowed = ['GET', 'POST']; work = () => request.method === 'GET' ? listTeams(env.DB, url.searchParams) : createTeam(request, env.DB); }
    else if (path === '/api/admin/interactions') { allowed = ['GET']; work = () => listInteractions(env.DB, url.searchParams); }
    else {
      const teamMatch = path.match(/^\/api\/admin\/teams\/([^/]+)$/);
      const memberList = path.match(/^\/api\/admin\/teams\/([^/]+)\/members$/);
      const member = path.match(/^\/api\/admin\/teams\/([^/]+)\/members\/([^/]+)$/);
      const interaction = path.match(/^\/api\/admin\/interactions\/([^/]+)$/);
      if (teamMatch) { const id = positive(teamMatch[1], 'teamId'); allowed = ['GET', 'PATCH']; work = () => request.method === 'GET' ? teamDetail(env.DB, id) : updateTeam(request, env.DB, id); }
      else if (memberList) { const id = positive(memberList[1], 'teamId'); allowed = ['POST']; work = () => mutateMember(request, env.DB, id); }
      else if (member) { const teamId = positive(member[1], 'teamId'), memberId = positive(member[2], 'memberId'); allowed = ['PATCH', 'DELETE']; work = () => mutateMember(request, env.DB, teamId, memberId); }
      else if (interaction) { const id = positive(interaction[1], 'interactionId'); allowed = ['GET']; work = () => interactionDetail(env.DB, id); }
    }
    if (!work) return json({ error: 'Endpoint admin tidak ditemukan.' }, 404);
    if (!allowed.includes(request.method)) return json({ error: 'Method Not Allowed' }, 405, { Allow: allowed.join(', ') });
    if (request.method !== 'GET' && request.headers.get('Sec-Fetch-Site') === 'cross-site') return json({ error: 'Permintaan lintas situs ditolak.' }, 403);
    return await work();
  } catch (error) {
    if (error instanceof InputError) return json({ error: error.message }, error.status);
    console.error('API admin gagal diproses.', { pathname: new URL(request.url).pathname });
    return json({ error: 'Data admin belum dapat diproses. Silakan coba lagi.' }, 500);
  }
}