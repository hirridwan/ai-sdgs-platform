const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3.6-flash';

type Issue = {
  id?: number;
  sdg?: string;
  title?: string;
  blurb?: string;
  motion?: string;
  context?: string;
  proFocus?: string;
  contraFocus?: string;
  starterQuestions?: string[];
};

type RawClaim = {
  claim: string;
  normalizedClaim: string;
  type: 'factual' | 'opinion' | 'prediction';
  verdict: 'verified' | 'mostly_true' | 'misleading' | 'false' | 'unverifiable' | 'not_fact';
  confidence: number;
  explanation: string;
  caveat: string;
};

function getModel(env: any) {
  return env.GEMINI_MODEL || DEFAULT_MODEL;
}

function cleanText(text: string) {
  return String(text || '')
    .replace(/^```(?:text|markdown|md)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\\([*_#`>])/g, '$1')
    .trim();
}

function parseJson<T>(text: string): T {
  const cleaned = cleanText(text);
  const starts = [cleaned.indexOf('{'), cleaned.indexOf('[')].filter((value) => value >= 0);
  if (!starts.length) throw new Error('Model tidak mengembalikan JSON.');
  const start = Math.min(...starts);
  return JSON.parse(cleaned.slice(start));
}

type GroundingSource = {
  title: string;
  url: string;
  domain: string;
  quality: 'tinggi' | 'sedang' | 'lainnya';
  summary?: string;
};

type GroundingInfo = {
  sources: GroundingSource[];
  searchQueries: string[];
};

function extractGrounding(data: any): GroundingInfo {
  const metadata = data?.candidates?.[0]?.groundingMetadata;
  const chunks = Array.isArray(metadata?.groundingChunks) ? metadata.groundingChunks : [];
  const searchQueries = Array.isArray(metadata?.webSearchQueries)
    ? metadata.webSearchQueries.map((value: any) => String(value)).filter(Boolean)
    : [];

  const seen = new Set<string>();
  const sources: GroundingSource[] = [];

  for (const chunk of chunks) {
    const web = chunk?.web;
    const url = String(web?.uri || '').trim();
    if (!url || seen.has(url)) continue;

    let domain = url;
    try {
      domain = new URL(url).hostname.replace(/^www\\./i, '');
    } catch {
      // Keep the raw URL as a fallback domain label.
    }

    seen.add(url);
    sources.push({
      title: String(web?.title || domain),
      url,
      domain,
      quality: 'lainnya',
      summary: 'Sumber web yang digunakan Gemini melalui Google Search grounding.',
    });
  }

  return { sources, searchQueries };
}

function makeClaimSchema() {
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
      },
      required: ['claim', 'normalizedClaim', 'type', 'verdict', 'confidence', 'explanation', 'caveat'],
    },
  };
}

async function generateContent(params: {
  env: any;
  prompt: string;
  structured?: boolean;
  maxOutputTokens?: number;
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
  useGoogleSearch?: boolean;
}) {
  const apiKey = params.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY belum diatur di environment Cloudflare Worker.');

  const model = getModel(params.env);
  const body: any = {
    contents: [{ role: 'user', parts: [{ text: params.prompt }] }],
    ...(params.useGoogleSearch ? { tools: [{ google_search: {} }] } : {}),
    generationConfig: {
      temperature: params.structured ? 0.1 : 0.4,
      maxOutputTokens: params.maxOutputTokens ?? (params.structured ? 5000 : 2200),
      ...(params.thinkingLevel
        ? {
            thinkingConfig: {
              thinkingLevel: params.thinkingLevel,
            },
          }
        : {}),
    },
  };

  if (params.structured) {
    body.generationConfig.responseMimeType = 'application/json';
    body.generationConfig.responseSchema = makeClaimSchema();
  }

  const response = await fetch(`${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `Gemini API error ${response.status}`;
    const error = new Error(message) as Error & { code?: string };
    error.code = data?.error?.status || String(response.status);
    throw error;
  }

  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.map((part: any) => part?.text || '').join('').trim();
  if (!text) throw new Error('Gemini tidak mengembalikan teks.');

  if (candidate?.finishReason === 'MAX_TOKENS') {
    throw new Error('Respons AI terpotong karena batas output. Silakan coba lagi dengan jawaban yang lebih ringkas.');
  }

  return { data, candidate, text };
}

async function factCheckFromModel(payload: any) {
  const issue: Issue = payload?.issue || {};
  const text = String(payload?.claim || payload?.text || '').trim();
  const maxClaims = Math.max(1, Math.min(Number(payload?.maxClaims || 4), 8));
  if (!text) throw new Error('Tidak ada klaim atau catatan yang dapat diperiksa.');

  const prompt = `
Anda adalah AI reviewer fakta untuk pembelajaran siswa SMA dalam proyek AI × SDGs.

PENTING:
- Anda memiliki akses Google Search grounding pada tugas ini. Gunakan pencarian web bila diperlukan untuk memeriksa klaim faktual.
- Prioritaskan sumber primer dan institusi kredibel seperti pemerintah, lembaga statistik, PBB/WHO/UNESCO/OECD/ILO/IEA, universitas, dan publikasi ilmiah bila relevan.
- Jangan membuat URL atau sumber yang tidak benar-benar tersedia dari hasil pencarian.
- Jangan menganggap sebuah klaim benar hanya karena terdengar masuk akal.
- Jika bukti web tidak cukup atau sumber saling bertentangan, gunakan verdict "unverifiable" atau jelaskan keterbatasannya.
- Bedakan fakta, opini, dan prediksi.

KONTEKS MOSI TERPILIH
SDG: ${issue?.sdg || '-'}
Isu: ${issue?.title || '-'}
Mosi: ${issue?.motion || '-'}
Konteks: ${issue?.context || '-'}
Posisi siswa: ${payload?.position || '-'}

INPUT SISWA:
${text}

Pecah menjadi maksimal ${maxClaims} klaim atomik.
Untuk setiap klaim faktual, gunakan bukti web yang ditemukan jika tersedia dan jelaskan keterbatasannya.
Keluarkan HANYA JSON ARRAY sesuai schema.

`.trim();

  const { text: rawText, data } = await generateContent({
    env: payload.__env,
    prompt,
    structured: true,
    maxOutputTokens: 5000,
    useGoogleSearch: true,
  });
  const grounding = extractGrounding(data);

  let parsed: RawClaim[];
  try {
    parsed = parseJson<RawClaim[]>(rawText);
  } catch {
    throw new Error('Gemini mengembalikan format fact check yang tidak dapat diproses.');
  }

  const checkedAt = new Date().toISOString();
  return parsed.slice(0, maxClaims).map((item, index) => {
    let verdict = item.verdict;
    let confidence = Math.max(0, Math.min(100, Math.round(Number(item.confidence) || 0)));
    if (item.type !== 'factual') verdict = 'not_fact';

    return {
      id: `${Date.now()}-${index}`,
      claim: item.claim,
      normalizedClaim: item.normalizedClaim || item.claim,
      type: item.type,
      verdict,
      confidence,
      explanation: item.explanation,
      caveat: item.caveat || 'Penilaian ini menggunakan Google Search grounding; tetap periksa sumber asli sebelum menjadikannya bukti debat.',
      sources: grounding.sources,
      searchQueries: grounding.searchQueries,
      checkedAt,
    };
  });
}

async function exploreIssue(context: any, payload: any) {
  const issue: Issue = payload?.issue || {};
  const position = String(payload?.position || '');
  const prompt = `
Anda adalah AI Explorer untuk pembelajaran siswa SMA pada proyek AI × SDGs.

Gunakan Google Search grounding bila diperlukan untuk melengkapi konteks dan menemukan informasi web yang relevan. Gunakan hasil web sebagai bahan penelitian awal, bukan sebagai naskah debat siap pakai. Jangan menentukan pemenang.

DATA MOSI TERPILIH
SDG: ${issue?.sdg || '-'}
Isu: ${issue?.title || '-'}
Mosi: ${issue?.motion || '-'}
Konteks dasar: ${issue?.context || '-'}
Fokus PRO: ${issue?.proFocus || '-'}
Fokus KONTRA: ${issue?.contraFocus || '-'}
Pertanyaan pemantik:
${Array.isArray(issue?.starterQuestions) && issue.starterQuestions.length ? issue.starterQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n') : '-'}
Posisi siswa: ${position || '-'}

Gunakan struktur:
1. Konteks isu
2. Faktor yang mungkin terkait
3. Kelompok yang terdampak
4. Berbagai sudut pandang
5. Pertanyaan pemantik
6. Catatan fact-check

Konteks dasar harus netral. Jika posisi siswa tersedia, arahkan pertanyaan pemantik agar membantu penelitian posisi tersebut tetapi tetap tampilkan hal yang dapat mendukung maupun melemahkannya.
Semua isi harus langsung relevan dengan mosi terpilih. Jangan membawa isu dari mosi lain.
Untuk fakta yang berasal dari web, prioritaskan sumber primer/kredibel dan jangan mengada-adakan sumber. Jika sumber yang ditemukan berbeda atau bukti terbatas, nyatakan keterbatasannya.
Maksimal 500 kata.
Tanpa Markdown bold atau heading #.
`.trim();

  const { text, data } = await generateContent({
    env: context.env,
    prompt,
    structured: false,
    maxOutputTokens: 2800,
    useGoogleSearch: true,
  });
  const grounding = extractGrounding(data);
  return { text: cleanText(text), ...grounding };
}

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json();
    const { action, payload } = body || {};
    if (!action) return json({ error: 'Action tidak ditemukan.' }, 400);

    if (action === 'factCheck') {
      const result = await factCheckFromModel({ ...(payload || {}), __env: context.env });
      return json({ result }, 200);
    }

    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) return json({ error: 'GEMINI_API_KEY belum diatur di environment Cloudflare Pages.' }, 500);

    let prompt = '';
    let maxOutputTokens = 1800;
    const issue: Issue = payload?.issue || {};

    if (action === 'explore') {
      const result = await exploreIssue(context, payload || {});
      return json({ result: result.text, sources: result.sources, searchQueries: result.searchQueries }, 200);
    }

    if (action === 'reviewArgument') {
      const argument = payload?.argument || {};
      prompt = `
Anda adalah AI Reviewer untuk latihan argumentasi siswa SMA dalam proyek AI × SDGs.

Anda TIDAK menggunakan web search dan TIDAK menggunakan Source Pack. Gunakan pengetahuan internal model hanya untuk membantu memeriksa struktur dan relevansi argumen. Jangan mengarang fakta baru.

KONTEKS MOSI
SDG: ${issue?.sdg || '-'}
Isu: ${issue?.title || '-'}
Mosi: ${issue?.motion || '-'}
Konteks: ${issue?.context || '-'}
Posisi siswa: ${payload?.position || '-'}

ARGUMEN SISWA
Klaim: ${argument?.claim || '-'}
Alasan: ${argument?.reason || '-'}
Bukti siswa: ${argument?.evidence || '-'}

Bahas secara konkret:
1. relevansi bukti terhadap klaim dan mosi;
2. lompatan logika;
3. konteks yang hilang;
4. satu perbaikan prioritas.

Jika bukti membutuhkan verifikasi sumber, katakan bahwa siswa perlu mengeceknya secara eksternal.
Jangan menyatakan argumen menang/kalah.
Maksimal 260 kata.
Tanpa Markdown bold atau heading #.
`.trim();
      maxOutputTokens = 1500;
    } else if (action === 'debate') {
      prompt = `
Anda adalah sparring partner sebelum debat siswa PRO dan KONTRA.

Anda TIDAK menggunakan web search. Gunakan pengetahuan internal model dan informasi yang diberikan siswa. Jangan mengarang data baru.

KONTEKS MOSI
SDG: ${issue?.sdg || '-'}
Isu: ${issue?.title || '-'}
Mosi: ${issue?.motion || '-'}
Konteks: ${issue?.context || '-'}
Posisi siswa: ${payload?.position || '-'}

ARGUMEN SISWA
Klaim: ${payload?.arg?.claim || ''}
Alasan: ${payload?.arg?.reason || ''}
Bukti: ${payload?.arg?.evidence || ''}
Respons siswa ronde ${payload?.round || 1}: ${payload?.msg || ''}

Berikan SATU sanggahan atau SATU pertanyaan penguji yang konkret dan langsung berkaitan dengan mosi.
Jika menggunakan fakta yang mungkin perlu diperiksa, sarankan siswa memverifikasinya dengan sumber eksternal.
Maksimal 130 kata.
Tanpa Markdown.
`.trim();
      maxOutputTokens = 1200;
    } else if (action === 'evaluateSolution') {
      prompt = `
Anda adalah AI Evaluator untuk proyek pembelajaran AI × SDGs.

Anda TIDAK menggunakan web search dan TIDAK menggunakan Source Pack. Evaluasi berdasarkan konteks mosi, solusi siswa, serta pengetahuan internal model. Jangan mengarang angka atau bukti empiris baru.

KONTEKS MOSI
SDG: ${issue?.sdg || '-'}
Isu: ${issue?.title || '-'}
Mosi: ${issue?.motion || '-'}
Konteks: ${issue?.context || '-'}
Posisi siswa: ${payload?.position || '-'}
Fokus PRO: ${issue?.proFocus || '-'}
Fokus KONTRA: ${issue?.contraFocus || '-'}

SOLUSI SISWA
${payload?.solution || '-'}

Evaluasi secara spesifik terhadap mosi di atas.
Untuk indikator keberhasilan, gunakan ukuran yang relevan dengan topik, bukan daftar generik.
Jika suatu aspek membutuhkan data terbaru atau pembuktian empiris, tandai bahwa siswa perlu memverifikasinya secara eksternal.

Tulis tepat 6 bagian:
1. Kesesuaian masalah
2. Kelayakan pelaksanaan
3. Pihak yang terlibat
4. Indikator keberhasilan
5. Risiko utama
6. Kesimpulan dan satu perbaikan prioritas

Setiap bagian 1-3 kalimat. Maksimal 360 kata.
Tanpa Markdown bold atau heading #.
`.trim();
      maxOutputTokens = 2400;
    } else {
      return json({ error: `Action tidak dikenal: ${action}` }, 400);
    }

    const { text } = await generateContent({
      env: context.env,
      prompt,
      structured: false,
      maxOutputTokens,
      thinkingLevel:
        action === 'debate'
          ? 'minimal'
          : action === 'reviewArgument'
            ? 'low'
            : action === 'evaluateSolution'
              ? 'minimal'
              : undefined,
    });

    return json({ result: cleanText(text) }, 200);
  } catch (error: any) {
    console.error('API /api/gemini-ai error:', error);
    return json(
      { error: error?.message || 'Terjadi kesalahan pada server.', code: error?.code || 'GEMINI_AI_REQUEST_FAILED' },
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
