/**
 * TEAMS HANDLER
 *
 * Fungsi:
 * - Ambil data identitas tim yang sedang login (nama tim, mosi, SDG, anggota).
 * - Ubah identitas tim (nama tim, mosi, SDG).
 * - Tambah / ubah nama / hapus anggota tim.
 *
 * Semua endpoint di file ini WAJIB sesi login valid (lihat requireSession).
 * Tidak ada endpoint approval/verifikasi guru di sini (sesuai catatan proyek).
 *
 * Route:
 * - GET    /api/team              → data tim + anggota
 * - PATCH  /api/team              → update team_name / motion / sdg_number
 * - POST   /api/team/members      → tambah anggota
 * - PATCH  /api/team/members      → ubah nama anggota
 * - DELETE /api/team/members      → hapus anggota
 * - GET    /api/sdgs              → daftar 17 SDG (tidak perlu login, untuk dropdown)
 */

import type { Env } from './lib/db';
import { execute, json, queryAll, queryOne } from './lib/db';
import { requireSession } from './lib/session';
import { findSdgTitle, SDG_LIST } from './lib/sdgs';

type TeamRow = {
  id: number;
  username: string;
  team_name: string;
  motion: string | null;
  sdg_number: number | null;
  sdg_title: string | null;
  created_at: string;
  updated_at: string;
};

type MemberRow = {
  id: number;
  name: string;
  position: number;
};

async function getTeamId(request: Request, env: Env): Promise<number | null> {
  return requireSession(request, env.DB);
}

/** GET /api/sdgs — publik, tidak perlu login, dipakai frontend untuk isi dropdown. */
export async function handleListSdgs(): Promise<Response> {
  return json({ sdgs: SDG_LIST }, 200);
}

/** GET /api/team — data tim yang sedang login + daftar anggotanya. */
export async function handleGetTeam(request: Request, env: Env): Promise<Response> {
  const teamId = await getTeamId(request, env);
  if (!teamId) return json({ error: 'Belum login.' }, 401);

  const team = await queryOne<TeamRow>(
    env.DB,
    'SELECT id, username, team_name, motion, sdg_number, sdg_title, created_at, updated_at FROM teams WHERE id = ?',
    [teamId],
  );
  if (!team) return json({ error: 'Belum login.' }, 401);

  const members = await queryAll<MemberRow>(
    env.DB,
    'SELECT id, name, position FROM team_members WHERE team_id = ? ORDER BY position ASC, id ASC',
    [teamId],
  );

  return json({ team, members }, 200);
}

/** PATCH /api/team — ubah nama tim / mosi / SDG. Semua field opsional (partial update). */
export async function handleUpdateTeam(request: Request, env: Env): Promise<Response> {
  const teamId = await getTeamId(request, env);
  if (!teamId) return json({ error: 'Belum login.' }, 401);

  let body: { teamName?: string; motion?: string; sdgNumber?: number | null };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body request tidak valid.' }, 400);
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (body.teamName !== undefined) {
    const teamName = String(body.teamName).trim();
    if (!teamName) return json({ error: 'Nama tim tidak boleh kosong.' }, 400);
    updates.push('team_name = ?');
    params.push(teamName);
  }

  if (body.motion !== undefined) {
    updates.push('motion = ?');
    params.push(String(body.motion).trim());
  }

  if (body.sdgNumber !== undefined) {
    if (body.sdgNumber === null) {
      updates.push('sdg_number = ?', 'sdg_title = ?');
      params.push(null, null);
    } else {
      const sdgNumber = Number(body.sdgNumber);
      const sdgTitle = findSdgTitle(sdgNumber);
      if (!sdgTitle) return json({ error: 'sdgNumber harus salah satu dari 1-17.' }, 400);
      updates.push('sdg_number = ?', 'sdg_title = ?');
      params.push(sdgNumber, sdgTitle);
    }
  }

  if (!updates.length) {
    return json({ error: 'Tidak ada field yang diubah.' }, 400);
  }

  updates.push("updated_at = datetime('now')");
  params.push(teamId);

  await execute(env.DB, `UPDATE teams SET ${updates.join(', ')} WHERE id = ?`, params);

  return handleGetTeam(request, env);
}

/** POST /api/team/members — tambah anggota baru. Body: { name: string } */
export async function handleAddMember(request: Request, env: Env): Promise<Response> {
  const teamId = await getTeamId(request, env);
  if (!teamId) return json({ error: 'Belum login.' }, 401);

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body request tidak valid.' }, 400);
  }

  const name = String(body.name || '').trim();
  if (!name) return json({ error: 'Nama anggota tidak boleh kosong.' }, 400);

  const last = await queryOne<{ maxPosition: number | null }>(
    env.DB,
    'SELECT MAX(position) as maxPosition FROM team_members WHERE team_id = ?',
    [teamId],
  );
  const nextPosition = (last?.maxPosition ?? -1) + 1;

  await execute(env.DB, 'INSERT INTO team_members (team_id, name, position) VALUES (?, ?, ?)', [
    teamId,
    name,
    nextPosition,
  ]);

  return handleGetTeam(request, env);
}

/** PATCH /api/team/members — ubah nama anggota. Body: { id: number, name: string } */
export async function handleUpdateMember(request: Request, env: Env): Promise<Response> {
  const teamId = await getTeamId(request, env);
  if (!teamId) return json({ error: 'Belum login.' }, 401);

  let body: { id?: number; name?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body request tidak valid.' }, 400);
  }

  const memberId = Number(body.id);
  const name = String(body.name || '').trim();
  if (!memberId) return json({ error: 'id anggota wajib diisi.' }, 400);
  if (!name) return json({ error: 'Nama anggota tidak boleh kosong.' }, 400);

  // team_id = ? di WHERE memastikan tim A tidak bisa mengedit anggota tim B.
  const result = await execute(
    env.DB,
    'UPDATE team_members SET name = ? WHERE id = ? AND team_id = ?',
    [name, memberId, teamId],
  );

  if (!result.meta.changes) {
    return json({ error: 'Anggota tidak ditemukan.' }, 404);
  }

  return handleGetTeam(request, env);
}

/** DELETE /api/team/members — hapus anggota. Body: { id: number } */
export async function handleDeleteMember(request: Request, env: Env): Promise<Response> {
  const teamId = await getTeamId(request, env);
  if (!teamId) return json({ error: 'Belum login.' }, 401);

  let body: { id?: number };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body request tidak valid.' }, 400);
  }

  const memberId = Number(body.id);
  if (!memberId) return json({ error: 'id anggota wajib diisi.' }, 400);

  const result = await execute(env.DB, 'DELETE FROM team_members WHERE id = ? AND team_id = ?', [
    memberId,
    teamId,
  ]);

  if (!result.meta.changes) {
    return json({ error: 'Anggota tidak ditemukan.' }, 404);
  }

  return handleGetTeam(request, env);
}
