/**
 * DB / ENV HELPER
 *
 * Fungsi:
 * - Definisi tipe Env terpusat (dipakai oleh index.ts, auth.ts, teams.ts,
 *   interactions.ts) supaya tidak duplikat & selalu sinkron dengan binding
 *   di wrangler-workers.jsonc.
 * - Helper kecil untuk query D1 (queryOne/queryAll/execute) agar handler
 *   lain tidak perlu menulis ulang pola `.prepare().bind().first()` dsb.
 */

export type Env = {
  ASSETS: any;
  DB: D1Database;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
};

/** Ambil satu baris, atau null kalau tidak ada. */
export async function queryOne<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const result = await db
    .prepare(sql)
    .bind(...params)
    .first<T>();
  return (result as T) ?? null;
}

/** Ambil semua baris hasil query. */
export async function queryAll<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await db
    .prepare(sql)
    .bind(...params)
    .all<T>();
  return result.results ?? [];
}

/** Jalankan statement tanpa perlu hasil baris (INSERT/UPDATE/DELETE). */
export async function execute(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<D1Result> {
  return db
    .prepare(sql)
    .bind(...params)
    .run();
}

/** Helper standar untuk response JSON, dipakai semua handler API. */
export function json(payload: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}
