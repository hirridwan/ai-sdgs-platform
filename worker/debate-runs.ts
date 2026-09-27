import { execute, json, queryAll, queryOne } from './lib/db';
import type { Env } from './lib/db';
import { requireSession } from './lib/session';

export function validRunId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9-]{36}$/i.test(value);
}
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function parse(value: string | null): unknown { try { return JSON.parse(value || 'null'); } catch { return null; } }
export async function ensureRun(db: D1Database, teamId: number, id: string, backend: string, payload: Record<string, unknown>) {
  const result = await execute(db, `INSERT INTO debate_runs (team_id, id, backend, position, issue_json)
    VALUES (?, ?, ?, ?, ?) ON CONFLICT(team_id, id) DO NOTHING`,
    [teamId, id, backend, typeof payload.position === 'string' ? payload.position : null, JSON.stringify(object(payload.issue))]);
  if (!result.success) throw new Error('Sesi gagal disimpan.');
}

// Caller must resolve teamId from team authentication or authenticate an admin first.
export async function listRuns(db: D1Database, teamId: number, search: URLSearchParams): Promise<Response> {
  const page = Number(search.get('page') || 1), limit = 5;
  if (!Number.isSafeInteger(teamId) || teamId < 1 || !Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger((page - 1) * limit)) return json({ error: 'Parameter tidak valid.' }, 400);
  const count = await queryOne<{ total: number }>(db, 'SELECT COUNT(*) AS total FROM debate_runs WHERE team_id = ?', [teamId]);
  const runs = await queryAll<{ id: string; backend: string; position: string | null; issue_json: string; impact_json: string | null; created_at: string }>(db,
    'SELECT * FROM debate_runs WHERE team_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?', [teamId, limit, (page - 1) * limit]);
  const sessions = [];
  for (const run of runs) {
    const rows = await queryAll<{ id: number; action: string; request_text: string; ai_response: string; ai_meta: string; created_at: string }>(db,
      `SELECT id, action, request_text, ai_response, ai_meta, created_at FROM ai_interactions WHERE team_id = ?
       AND CASE WHEN json_valid(request_meta) THEN json_extract(request_meta, '$.debateSessionId') END = ? ORDER BY created_at, id`, [teamId, run.id]);
    sessions.push({ id: run.id, backend: run.backend, position: run.position, issue: parse(run.issue_json), impact: parse(run.impact_json), createdAt: run.created_at.replace(' ', 'T') + 'Z',
      interactions: rows.map(row => ({ id: row.id, action: row.action, requestText: row.request_text, aiResponse: row.action === 'factCheck' ? parse(row.ai_response) ?? row.ai_response : row.ai_response, aiMeta: parse(row.ai_meta), createdAt: row.created_at.replace(' ', 'T') + 'Z' })) });
  }
  const total = Number(count?.total || 0);
  return json({ sessions, pagination: { page, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total } });
}
export async function handleRuns(request: Request, env: Env): Promise<Response> {
  try {
    const teamId = await requireSession(request, env.DB);
    if (!teamId) return json({ error: 'Belum login.' }, 401);
    if (request.method === 'GET') return listRuns(env.DB, teamId, new URL(request.url).searchParams);
    if (request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405, { Allow: 'GET, POST' });
    if (Number(request.headers.get('Content-Length')) > 200000) return json({ error: 'Ringkasan terlalu panjang.' }, 413);
    const raw = await request.text();
    if (raw.length > 200000) return json({ error: 'Ringkasan terlalu panjang.' }, 413);
    let body: Record<string, unknown>;
    try { body = object(JSON.parse(raw)); } catch { return json({ error: 'JSON tidak valid.' }, 400); }
    if (!validRunId(body.id) || !['v1', 'v2'].includes(String(body.backend)) || !Object.keys(object(body.issue)).length || !['PRO', 'KONTRA'].includes(String(body.position))) return json({ error: 'Data sesi tidak valid.' }, 400);
    await ensureRun(env.DB, teamId, body.id, String(body.backend), body);
    if (body.impact !== undefined) {
      const impact = object(body.impact);
      const fields = ['claim', 'reason', 'evidence', 'solution', 'evaluation'];
      if (fields.some(key => typeof impact[key] !== 'string') || !String(impact.solution).trim() || !String(impact.evaluation).trim()) return json({ error: 'Impact belum lengkap.' }, 400);
      const snapshot = Object.fromEntries(fields.map(key => [key, impact[key]]));
      const saved = await execute(env.DB, `UPDATE debate_runs SET impact_json = ?, updated_at = datetime('now') WHERE team_id = ? AND id = ?`, [JSON.stringify(snapshot), teamId, body.id]);
      if (!saved.success) throw new Error('Impact gagal disimpan.');
    }
    return json({ ok: true });
  } catch {
    return json({ error: 'Sesi debat belum dapat disimpan/dimuat. Pastikan migrasi 0007 sudah dijalankan.' }, 500);
  }
}
