import { ensureRun, validRunId } from './debate-runs';
import { execute, json, queryAll, queryOne } from './lib/db';
import type { Env } from './lib/db';
import { requireSession } from './lib/session';

type AiHandler = (context: {
  request: Request;
  env: Env;
}) => Promise<Response>;

type Backend = 'v1' | 'v2';

type JsonObject = Record<string, unknown>;

const ALLOWED_ACTIONS = new Set([
  'explore',
  'factCheck',
  'reviewArgument',
  'debate',
  'evaluateSolution',
  'recommendSolution',
]);

function asObject(value: unknown): JsonObject {
  if (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return value as JsonObject;
  }

  return {};
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function argumentText(value: unknown): string {
  const argument = asObject(value);

  return [
    `Klaim: ${asText(argument.claim)}`,
    `Alasan: ${asText(argument.reason)}`,
    `Bukti: ${asText(argument.evidence)}`,
  ].join('\n');
}

/**
 * Hanya mengambil input yang dibaca handler AI.
 * Konteks isu disimpan terpisah dalam request_meta.
 */
function extractStudentInput(
  action: string,
  payload: JsonObject,
): string {
  switch (action) {
    case 'explore':
      // Handler explore tidak membaca pertanyaan bebas siswa.
      // String kosong valid untuk kolom TEXT NOT NULL.
      return '';

    case 'factCheck':
      return asText(payload.claim).trim()
        ? asText(payload.claim)
        : asText(payload.text);

    case 'reviewArgument':
      return argumentText(payload.argument);

    case 'debate':
      // Argumen awal disimpan sebagai konteks dalam request_meta.
      // Input baru pada ronde ini adalah msg.
      return asText(payload.msg);

    case 'evaluateSolution':
      return asText(payload.solution);

    case 'recommendSolution':
      // Rekomendasi AI menggunakan solusi siswa + hasil evaluasi sebagai input.
      return [
        asText(payload.solution),
        asText(payload.evaluation),
      ].filter(Boolean).join('\n\n');

    default:
      return '';
  }
}

/**
 * Batasi metadata ke field aplikasi yang relevan.
 * Jangan menyalin header, cookie, atau environment.
 */
function extractPayloadMeta(payload: JsonObject): JsonObject {
  const allowedFields = [
    'issue',
    'position',
    'title',
    'sdg',
    'motion',
    'context',
    'starterQuestions',
    'claim',
    'text',
    'maxClaims',
    'argument',
    'arg',
    'round',
    'msg',
    'solution',
    'evaluation',
  ];

  const result: JsonObject = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      result[field] = payload[field];
    }
  }

  return result;
}

function withSaveStatus(
  response: Response,
  saved: boolean,
): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Interaction-Saved', String(saved));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Pembungkus kedua backend AI.
 * Satu respons AI sukses dicatat sebagai satu interaksi.
 */
export async function handleAiWithLogging(
  request: Request,
  env: Env,
  handler: AiHandler,
  backend: Backend,
): Promise<Response> {
  let teamId: number | null;

  try {
    teamId = await requireSession(request, env.DB);
  } catch {
    // Jangan mencetak token atau detail request ke log.
    console.error('Gagal memvalidasi sesi pada endpoint AI.');

    return json(
      { error: 'Sesi tidak dapat diperiksa. Silakan coba lagi.' },
      500,
    );
  }

  if (!teamId) {
    return json({ error: 'Belum login.' }, 401);
  }

  let body: JsonObject;

  try {
    const parsed: unknown = await request.clone().json();

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return json({ error: 'Body harus berupa objek JSON.' }, 400);
    }

    body = parsed as JsonObject;
  } catch {
    return json({ error: 'Body request bukan JSON yang valid.' }, 400);
  }

  if (
    body.debateSessionId !== undefined &&
    !validRunId(body.debateSessionId)
  ) {
    return json(
      { error: 'ID sesi debat tidak valid.' },
      400,
    );
  }

  const action = asText(body.action);

  if (!ALLOWED_ACTIONS.has(action)) {
    return json({ error: 'Action tidak dikenal.' }, 400);
  }

  const payload = asObject(body.payload);
  const receivedAt = new Date().toISOString();

  let response: Response;

  try {
    // Body request asli belum dibaca karena sebelumnya memakai clone().
    response = await handler({ request, env });
  } catch {
    console.error('Handler AI gagal menghasilkan response.', {
      backend,
      action,
    });

    return json({ error: 'Terjadi kesalahan pada layanan AI.' }, 500);
  }

  // Skema saat ini mencatat interaksi yang memperoleh jawaban sukses.
  // Respons gagal diteruskan tanpa INSERT.
  if (!response.ok) {
    return response;
  }

  try {
    // Jangan menghabiskan body yang akan dikirim ke frontend.
    const responseBody = asObject(await response.clone().json());
    const result = responseBody.result;

    if (
      typeof result !== 'string' &&
      !Array.isArray(result)
    ) {
      throw new Error('Format hasil AI tidak sesuai.');
    }

    const position =
      payload.position === 'PRO' || payload.position === 'KONTRA'
        ? payload.position
        : null;

    const requestText = extractStudentInput(action, payload);

    const requestMeta = {
      schemaVersion: 1,
      debateSessionId: body.debateSessionId ?? null,
      backend,
      action,
      receivedAt,
      inputKind:
        action === 'explore'
          ? 'context_selection'
          : action === 'recommendSolution'
            ? 'solution_recommendation_request'
            : 'submitted_content',
      hasStudentText: requestText.trim().length > 0,
      payload: extractPayloadMeta(payload),
    };

    // Untuk factCheck, sources/searchQueries berada di setiap item.
    // Untuk explore V2, keduanya berada di tingkat teratas response.
    const aiMeta = {
      schemaVersion: 1,
      backend,
      resultType: Array.isArray(result) ? 'claims' : 'text',
      sources: Array.isArray(responseBody.sources)
        ? responseBody.sources
        : [],
      searchQueries: Array.isArray(responseBody.searchQueries)
        ? responseBody.searchQueries
        : [],
      claimSources: Array.isArray(result)
        ? result.map((item: unknown) => {
            const claim = asObject(item);

            return {
              id: claim.id ?? null,
              sources: Array.isArray(claim.sources)
                ? claim.sources
                : [],
              searchQueries: Array.isArray(claim.searchQueries)
                ? claim.searchQueries
                : [],
            };
          })
        : [],
    };

    if (validRunId(body.debateSessionId)) {
      await ensureRun(
        env.DB,
        teamId,
        body.debateSessionId,
        backend,
        payload,
      );
    }

    const saved = await execute(
      env.DB,
      `INSERT INTO ai_interactions (
        team_id,
        action,
        position,
        request_text,
        request_meta,
        ai_response,
        ai_meta
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        teamId,
        action,
        position,
        requestText,
        JSON.stringify(requestMeta),
        typeof result === 'string'
          ? result
          : JSON.stringify(result),
        JSON.stringify(aiMeta),
      ],
    );

    if (!saved.success) {
      throw new Error('INSERT interaksi gagal.');
    }

    return withSaveStatus(response, true);
  } catch {
    console.error('Jawaban AI berhasil, tetapi pencatatan gagal.', {
      teamId,
      backend,
      action,
    });

    return withSaveStatus(response, false);
  }
}

type InteractionRow = {
  id: number;
  action: string;
  position: string | null;
  request_text: string;
  request_meta: string | null;
  ai_response: string;
  ai_meta: string | null;
  created_at: string;
};

function parseStoredJson(value: string | null): unknown {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * GET /api/interactions
 *
 * Query opsional:
 * - action: filter jenis aktivitas
 * - page: halaman, mulai dari 1
 * - limit: jumlah per halaman, maksimal 50
 *
 * Identitas tim selalu berasal dari sesi login.
 */
export async function handleListInteractions(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const teamId = await requireSession(request, env.DB);

    if (!teamId) {
      return json({ error: 'Belum login.' }, 401);
    }

    const url = new URL(request.url);

    // Endpoint ini khusus riwayat tim yang sedang login.
    if (url.searchParams.has('teamId')) {
      return json(
        { error: 'Identitas tim ditentukan dari sesi login.' },
        400,
      );
    }

    const action = url.searchParams.get('action') ?? '';
    const page = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '20');

    if (!Number.isSafeInteger(page) || page < 1) {
      return json(
        { error: 'page harus berupa bilangan bulat positif.' },
        400,
      );
    }

    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 50
    ) {
      return json(
        { error: 'limit harus berupa bilangan bulat antara 1–50.' },
        400,
      );
    }

    if (action && !ALLOWED_ACTIONS.has(action)) {
      return json({ error: 'Filter action tidak dikenal.' }, 400);
    }

    const offset = (page - 1) * limit;

    if (!Number.isSafeInteger(offset)) {
      return json({ error: 'Nomor halaman terlalu besar.' }, 400);
    }

    const conditions = ['team_id = ?'];
    const params: unknown[] = [teamId];

    if (action) {
      conditions.push('action = ?');
      params.push(action);
    }

    const where = conditions.join(' AND ');

    const count = await queryOne<{ total: number }>(
      env.DB,
      `SELECT COUNT(*) AS total
       FROM ai_interactions
       WHERE ${where}`,
      params,
    );

    const rows = await queryAll<InteractionRow>(
      env.DB,
      `SELECT
         id,
         action,
         position,
         request_text,
         request_meta,
         ai_response,
         ai_meta,
         created_at
       FROM ai_interactions
       WHERE ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const total = Number(count?.total ?? 0);

    const interactions = rows.map((row) => ({
      id: row.id,
      action: row.action,
      position: row.position,
      requestText: row.request_text,
      requestMeta: parseStoredJson(row.request_meta),

      // Teks tetap teks. Hasil factCheck tersimpan sebagai JSON array.
      aiResponse:
        row.action === 'factCheck'
          ? parseStoredJson(row.ai_response) ?? row.ai_response
          : row.ai_response,

      aiMeta: parseStoredJson(row.ai_meta),

      // datetime('now') SQLite disimpan dalam UTC.
      createdAt: `${row.created_at.replace(' ', 'T')}Z`,
    }));

    return json({
      interactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: offset + limit < total,
      },
    });
  } catch {
    console.error('Gagal mengambil riwayat interaksi AI.');

    return json(
      { error: 'Riwayat interaksi belum dapat dimuat.' },
      500,
    );
  }
}