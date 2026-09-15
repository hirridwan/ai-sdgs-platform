const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3.6-flash';

const HIGH_TRUST_DOMAINS = [
  '.gov', '.go.id', 'un.org', 'who.int', 'worldbank.org', 'oecd.org', 'imf.org',
  'ilo.org', 'ipcc.ch', 'unicef.org', 'data.un.org', 'data.worldbank.org', 'ourworldindata.org',
  'pubmed.ncbi.nlm.nih.gov', 'nature.com', 'science.org', 'bmj.com', 'thelancet.com',
];

const MEDIUM_TRUST_DOMAINS = [
  'reuters.com', 'apnews.com', 'bbc.com', 'theguardian.com', 'nytimes.com', 'kompas.com',
  'tempo.co', 'antaranews.com', 'cnbcindonesia.com',
];

type JsonSchema = Record<string, unknown>;

type ClaimSource = {
  title: string;
  url: string;
  domain: string;
  quality: 'tinggi' | 'sedang' | 'lainnya';
};

type RawClaim = {
  claim: string;
  normalizedClaim: string;
  type: 'factual' | 'opinion' | 'prediction';
  verdict: 'verified' | 'mostly_true' | 'misleading' | 'false' | 'unverifiable' | 'not_fact';
  confidence: number;
  explanation: string;
  caveat: string;
  sourceUrls: string[];
  sourceTitles: string[];
};

function getModel(env: any) {
  return env.GEMINI_MODEL || DEFAULT_MODEL;
}

function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function normalizeUrl(url: string) {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function qualityForDomain(domain: string): ClaimSource['quality'] {
  const lower = domain.toLowerCase();
  if (HIGH_TRUST_DOMAINS.some((item) => lower === item || lower.endsWith(item) || lower.includes(item))) return 'tinggi';
  if (MEDIUM_TRUST_DOMAINS.some((item) => lower === item || lower.endsWith(item) || lower.includes(item))) return 'sedang';
  return 'lainnya';
}

function parseJson<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  const start = Math.min(...[cleaned.indexOf('{'), cleaned.indexOf('[')].filter((v) => v >= 0));
  if (!Number.isFinite(start)) throw new Error('Model tidak mengembalikan JSON.');
  return JSON.parse(cleaned.slice(start));
}

function makeSchema(): JsonSchema {
  return {
    type: 'ARRAY',
    minItems: 1,
    maxItems: 8,
    items: {
      type: 'OBJECT',
      properties: {
        claim: { type: 'STRING' },
        normalizedClaim: { type: 'STRING' },
        type: { type: 'STRING', enum: ['factual', 'opinion', 'prediction'] },
        verdict: { type: 'STRING', enum: ['verified', 'mostly_true', 'misleading', 'false', 'unverifiable', 'not_fact'] },
        confidence: { type: 'NUMBER', minimum: 0, maximum: 100 },
        explanation: { type: 'STRING' },
        caveat: { type: 'STRING' },
        sourceUrls: { type: 'ARRAY', items: { type: 'STRING' }, maxItems: 5 },
        sourceTitles: { type: 'ARRAY', items: { type: 'STRING' }, maxItems: 5 },
      },
      required: [
        'claim', 'normalizedClaim', 'type', 'verdict', 'confidence',
        'explanation', 'caveat', 'sourceUrls', 'sourceTitles',
      ],
    },
  };
}

function extractGroundedSources(candidate: any): ClaimSource[] {
  const chunks = candidate?.groundingMetadata?.groundingChunks || [];
  const unique = new Map<string, ClaimSource>();

  for (const chunk of chunks) {
    const web = chunk?.web;
    if (!web?.uri) continue;
    const url = normalizeUrl(web.uri);
    if (!url) continue;
    const domain = domainOf(url);
    unique.set(url, {
      title: web.title || domain || 'Sumber web',
      url,
      domain,
      quality: qualityForDomain(domain),
    });
  }

  return [...unique.values()];
}

function sanitizeModelSources(raw: RawClaim, groundedSources: ClaimSource[]): ClaimSource[] {
  const exact = new Map(groundedSources.map((source) => [normalizeUrl(source.url), source]));
  const byHost = new Map(groundedSources.map((source) => [source.domain, source]));
  const byTitle = new Map(groundedSources.map((source) => [source.title.trim().toLowerCase(), source]));
  const requested = Array.isArray(raw.sourceUrls) ? raw.sourceUrls : [];
  const titleList = Array.isArray(raw.sourceTitles) ? raw.sourceTitles : [];
  const out: ClaimSource[] = [];

  requested.forEach((candidateUrl, index) => {
    const normalized = normalizeUrl(candidateUrl);
    const requestedTitle = titleList[index]?.trim().toLowerCase() || '';
    const titleMatch = requestedTitle
      ? [...byTitle.entries()].find(([title]) => title === requestedTitle || title.includes(requestedTitle) || requestedTitle.includes(title))?.[1]
      : undefined;
    const matched = exact.get(normalized) || byHost.get(domainOf(normalized)) || titleMatch;
    if (!matched) return;
    const title = titleList[index]?.trim() || matched.title;
    out.push({ ...matched, title });
  });

  const seen = new Set<string>();
  return out.filter((source) => {
    if (seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  });
}

async function generateContent(params: {
  env: any;
  prompt: string;
  grounded: boolean;
  structured: boolean;
}) {
  const apiKey = params.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY belum diatur di environment Cloudflare Pages.');
  }

  const model = getModel(params.env);
  const body: any = {
    contents: [{ role: 'user', parts: [{ text: params.prompt }] }],
    generationConfig: {
      temperature: params.structured ? 0.1 : 0.4,
      maxOutputTokens: params.structured ? 9000 : 1200,
    },
  };

  if (params.grounded) {
    body.tools = [{ google_search: {} }];
  }

  if (params.structured) {
    body.generationConfig.responseMimeType = 'application/json';
    body.generationConfig.responseSchema = makeSchema();
  }

  const response = await fetch(`${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const apiMessage = data?.error?.message || `Gemini API error ${response.status}`;
    throw new Error(apiMessage);
  }

  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.map((part: any) => part?.text || '').join('')?.trim();
  if (!text) throw new Error('Gemini tidak mengembalikan teks.');

  return { data, candidate, text };
}

async function factCheck(context: any, payload: any) {
  const issue = payload?.issue;
  const maxClaims = Math.min(Math.max(Number(payload?.maxClaims || 8), 1), 8);
  const singleClaim = typeof payload?.claim === 'string' ? payload.claim.trim() : '';
  const text = singleClaim || (typeof payload?.text === 'string' ? payload.text.trim() : '');

  if (!text) throw new Error('Teks/klaim untuk fact check kosong.');
  if (text.length > 16000) throw new Error('Teks terlalu panjang. Batasi catatan eksplorasi sampai 16.000 karakter.');

  const prompt = `
Anda adalah fact-checker untuk platform pendidikan AI × SDGs.

TUGAS UTAMA:
1. Pecah input menjadi klaim yang atomik: satu klaim faktual per item.
2. Pisahkan opini/nilai dan prediksi dari klaim faktual.
3. Untuk setiap klaim faktual, WAJIB gunakan Google Search untuk mencari bukti aktual. Jangan mengandalkan ingatan model.
4. Utamakan sumber primer dan otoritatif: lembaga pemerintah/statistik, UN, WHO, World Bank, OECD, IMF, ILO, IPCC, jurnal ilmiah, dokumentasi resmi, atau organisasi pemilik data.
5. Cari bukti yang MENDUKUNG dan juga bukti yang BERTENTANGAN jika memungkinkan.
6. Jangan memberi verdict “verified” hanya karena ada satu halaman yang mengulang klaim.
7. Jika bukti tidak cukup, pilih “unverifiable”; jangan menebak.
8. Jika inti benar tetapi ada konteks/batasan penting, pilih “mostly_true” atau “misleading”.
9. Jika bukti kredibel bertentangan langsung, pilih “false”.
10. Untuk opinion/prediction, pilih “not_fact” dan jangan memaksakan verdict benar/salah.
11. sourceUrls HARUS berisi URL yang benar-benar muncul dari hasil Google Search grounding. Jangan membuat URL.
12. sourceTitles harus berurutan sesuai sourceUrls.
13. Confidence adalah keyakinan terhadap verdict (0-100), bukan probabilitas dunia nyata.
14. Penjelasan harus ringkas, jelas, dan cocok untuk siswa SMA.

KONTEKS ISU:
${issue ? JSON.stringify(issue) : '(tidak ada)'}

INPUT:
${text}

KELUARKAN HANYA JSON ARRAY sesuai schema.
`.trim();

  const { candidate, text: rawText } = await generateContent({
    env: context.env,
    prompt,
    grounded: true,
    structured: true,
  });

  let parsed: RawClaim[];
  try {
    parsed = parseJson<RawClaim[]>(rawText);
  } catch {
    throw new Error('Gemini mengembalikan format yang tidak dapat diproses. Coba lagi.');
  }

  const groundedSources = extractGroundedSources(candidate);
  const checkedAt = new Date().toISOString();
  const searchQueries = candidate?.groundingMetadata?.webSearchQueries || [];

  return parsed.slice(0, maxClaims).map((item, index) => {
    const sanitizedSources = sanitizeModelSources(item, groundedSources).slice(0, 5);
    let verdict = item.verdict;
    let confidence = Math.max(0, Math.min(100, Math.round(Number(item.confidence) || 0)));

    if (item.type !== 'factual') {
      verdict = 'not_fact';
      confidence = Math.max(confidence, 90);
    }

    if (verdict === 'verified' && sanitizedSources.length === 0) {
      verdict = 'unverifiable';
      confidence = Math.min(confidence, 49);
    }

    return {
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      claim: item.claim,
      normalizedClaim: item.normalizedClaim || item.claim,
      type: item.type,
      verdict,
      confidence,
      explanation: item.explanation,
      caveat: item.caveat,
      sources: sanitizedSources,
      searchQueries,
      checkedAt,
    };
  });
}

export async function onRequestPost(context: any) {
  try {
    const requestData = await context.request.json();
    const { action, payload } = requestData || {};

    if (!action) {
      return json({ error: 'Action tidak ditemukan.' }, 400);
    }

    if (action === 'factCheck') {
      const result = await factCheck(context, payload || {});
      return json({ result }, 200);
    }

    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) return json({ error: 'GEMINI_API_KEY belum diatur di environment Cloudflare Pages.' }, 500);

    let prompt = '';
    if (action === 'explore') {
      prompt = `Berperan sebagai AI Explorer pendidikan. Jelaskan isu SDGs berikut dengan singkat, berikan konteks awal, 2 pertanyaan pemantik, dan sarankan jenis sumber primer yang sebaiknya dicari siswa. Isu: ${payload?.title || ''} (${payload?.sdg || ''}). Maksimal 3 paragraf.`;
    } else if (action === 'reviewArgument') {
      prompt = `Review argumen debat berikut. Klaim: "${payload?.claim || ''}". Alasan: "${payload?.reason || ''}". Bukti: "${payload?.evidence || ''}". Berikan kritik konstruktif tentang relevansi bukti, lompatan logika, konteks yang hilang, dan cara memperbaikinya. Maksimal 3 paragraf.`;
    } else if (action === 'debate') {
      prompt = `Berperan sebagai sparring partner debat yang kritis namun suportif. Argumen utama: "${payload?.arg?.claim || ''}". Respons pengguna: "${payload?.msg || ''}". Berikan satu sanggahan atau pertanyaan penguji yang memaksa pengguna menghubungkan klaim dengan bukti. Jangan mengarang fakta baru.`;
    } else if (action === 'evaluateSolution') {
      prompt = `Evaluasi solusi SDGs berikut. Solusi: "${payload?.solution || ''}". Berikan penilaian singkat terhadap kesesuaian masalah, kelayakan pelaksanaan, pihak yang terlibat, indikator keberhasilan, dan satu risiko utama.`;
    } else {
      return json({ error: `Action tidak dikenal: ${action}` }, 400);
    }

    const { text } = await generateContent({
      env: context.env,
      prompt,
      grounded: false,
      structured: false,
    });

    return json({ result: text }, 200);
  } catch (error: any) {
    console.error('API /api/gemini error:', error);
    return json(
      { error: error?.message || 'Terjadi kesalahan pada server.', code: 'GEMINI_REQUEST_FAILED' },
      500,
    );
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
