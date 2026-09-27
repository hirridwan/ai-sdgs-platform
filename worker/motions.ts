/**
 * MOTIONS HANDLER (BANK MOSI — IDENTITAS TIM)
 *
 * Fungsi:
 * - Menyediakan daftar mosi yang bisa dipilih saat mengisi identitas tim
 *   (dropdown di form tim & form admin).
 *
 * PENTING: ini TERPISAH dari SAMPLE_ISSUES di App.tsx/AppAI.tsx, yang berisi
 * konteks lengkap (proFocus, contraFocus, sources) untuk alur latihan AI.
 * Tabel `motions` di sini sengaja ringan: cuma teks + SDG opsional, khusus
 * untuk identitas tim, dikelola admin lewat /api/admin/motions.
 *
 * Route:
 * - GET /api/motions — publik, tidak perlu login.
 */

import type { Env } from './lib/db';
import { json, queryAll } from './lib/db';

type MotionRow = { id: number; text: string; sdg_number: number | null; created_at: string };

export async function handleListMotions(env: Env): Promise<Response> {
  const rows = await queryAll<MotionRow>(
    env.DB,
    'SELECT id, text, sdg_number, created_at FROM motions ORDER BY sdg_number IS NULL, sdg_number ASC, id ASC',
  );
  return json({ motions: rows.map(row => ({ id: row.id, text: row.text, sdgNumber: row.sdg_number, createdAt: row.created_at })) });
}
