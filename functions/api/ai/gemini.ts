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
  sources?: Array<{
    title: string;
    url: string;
    domain?: string;
    quality?: 'tinggi' | 'sedang' | 'lainnya';
    year?: string;
    scope?: string;
    summary?: string;
  }>;
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

type WebSource = {
  title: string;
  url: string;
  domain: string;
  quality: 'tinggi' | 'sedang' | 'lainnya';
  year?: string;
  scope?: string;
  summary?: string;
};

const HIGH_TRUST_DOMAINS = [
  '.gov', '.go.id', 'un.org', 'who.int', 'worldbank.org', 'oecd.org', 'imf.org',
  'ilo.org', 'ipcc.ch', 'unicef.org', 'unesco.org', 'unep.org', 'data.un.org',
  'data.worldbank.org', 'washdata.org', 'pubmed.ncbi.nlm.nih.gov', 'nature.com',
  'science.org', 'bmj.com', 'thelancet.com', 'noaa.gov', 'iea.org', 'wfp.org',
];

const MEDIUM_TRUST_DOMAINS = [
  'reuters.com', 'apnews.com', 'bbc.com', 'kompas.com', 'tempo.co', 'antaranews.com',
];

function getModel(env: any) {
  return env.GEMINI_WEB_MODEL || env.GEMINI_MODEL || DEFAULT_MODEL;
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

function qualityForDomain(domain: string): 'tinggi' | 'sedang' | 'lainnya' {
  const lower = domain.toLowerCase();
  if (HIGH_TRUST_DOMAINS.some((item) => lower === item || lower.endsWith(item) || lower.includes(item))) return 'tinggi';
  if (MEDIUM_TRUST_DOMAINS.some((item) => lower === item || lower.endsWith(item) || lower.includes(item))) return 'sedang';
  return 'lainnya';
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
        sourceUrls: { type: 'ARRAY', items: { type: 'STRING' }, maxItems: 5 },
        sourceTitles: { type: 'ARRAY', items: { type: 'STRING' }, maxItems: 5 },
      },
      required: ['claim', 'normalizedClaim', 'type', 'verdict', 'confidence', 'explanation', 'caveat', 'sourceUrls', 'sourceTitles'],
    },
  };
}

function extractGroundingSources(data: any): { sources: WebSource[]; searchQueries: string[] } {
  const metadata = data?.candidates?.[0]?.groundingMetadata || {};
  const chunks = Array.isArray(metadata.groundingChunks) ? metadata.groundingChunks : [];
  const sources: WebSource[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const web = chunk?.web;
    if (!web) continue;
    const url = normalizeUrl(String(web.uri || web.url || ''));
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const domain = domainOf(url);
    sources.push({
      title: String(web.title || domain || 'Sumber web'),
      url,
      domain,
      quality: qualityForDomain(domain),
      summary: 'Sumber ditemukan melalui Google Search grounding Gemini.',
    });
  }

  return {
    sources: sources.slice(0, 8),
    searchQueries: Array.isArray(metadata.webSearchQueries)
      ? metadata.webSearchQueries.map((item: unknown) => String(item)).filter(Boolean).slice(0, 8)
      : [],
  };
}

async function generateContent(params: {
  env: any;
  prompt: string;
  structured?: boolean;
  maxOutputTokens?: number;
  useGoogleSearch?: boolean;
}) {
  const apiKey = params.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY belum diatur di environment Cloudflare Pages.');

  const model = getModel(params.env);
  const body: any = {
    contents: [{ role: 'user', parts: [{ text: params.prompt }] }],
    generationConfig: {
      temperature: params.structured ? 0.1 : 0.4,
      maxOutputTokens: params.maxOutputTokens ?? (params.structured ? 7000 : 2200),
    },
  };

  if (params.useGoogleSearch !== false) {
    body.tools = [{ google_search: {} }];
  }

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

  const grounding = extractGroundingSources(data);
  return { data, candidate, text, sources: grounding.sources, searchQueries: grounding.searchQueries };
}

function sanitizeWebSources(raw: RawClaim, webSources: WebSource[]) {
  const byUrl = new Map(webSources.map((source) => [normalizeUrl(source.url), source]));
  const requestedUrls = Array.isArray(raw?.sourceUrls) ? raw.sourceUrls : [];
  const titles = Array.isArray(raw?.sourceTitles) ? raw.sourceTitles : [];
  const result: WebSource[] = [];

  requestedUrls.forEach((url, index) => {
    const match = byUrl.get(normalizeUrl(url));
    if (match) {
      result.push({ ...match, title: titles[index]?.trim() || match.title });
    }
  });

  if (!result.length) return webSources.slice(0, 5);
  return result.slice(0, 5);
}

function sourceText(sources: WebSource[]) {
  if (!sources.length) return '';
  return `\n\nSumber web yang digunakan:\n${sources.slice(0, 5).map((source, index) => `${index + 1}. ${source.title} — ${source.url}`).join('\n')}`;
}

async function factCheckFromWeb(context: any, payload: any) {
  const issue: Issue = payload?.issue || {};
  const text = String(payload?.claim || payload?.text || '').trim();
  const maxClaims = Math.max(1, Math.min(Number(payload?.maxClaims || 4), 8));
  if (!text) throw new Error('Tidak ada klaim atau catatan yang dapat diperiksa.');

  const prompt = `
Anda adalah fact-checker berbasis web untuk proyek pendidikan AI × SDGs.

Gunakan Google Search untuk mencari sumber aktual yang relevan dengan mosi dan klaim siswa. Jangan hanya mengandalkan pengetahuan internal model.

MOSi TERPILIH
SDG: ${issue?.sdg || '-'}
Isu: ${issue?.title || '-'}
Mosi: ${issue?.motion || '-'}
Konteks: ${issue?.context || '-'}
Posisi siswa: ${payload?.position || '-'}

ATURAN
1. Pecah input menjadi klaim atomik hingga maksimal ${maxClaims} klaim.
2. Bedakan fakta, opini, dan prediksi.
3. Untuk klaim faktual, cari dan gunakan sumber web yang benar-benar mendukung atau melemahkan klaim.
4. Prioritaskan sumber primer dan lembaga resmi/ilmiah yang relevan dengan topik.
5. Jangan mengarang angka, kutipan, halaman, URL, atau isi sumber.
6. Jika bukti web belum cukup, pilih "unverifiable".
7. Jangan menyatakan sebab-akibat jika sumber hanya menunjukkan keterkaitan.
8. "verified" hanya digunakan bila sumber web secara cukup jelas mendukung klaim dalam konteks yang sesuai.
9. sourceUrls dan sourceTitles harus berasal dari sumber web yang benar-benar ditemukan oleh Google Search.
10. Gunakan bahasa Indonesia yang jelas untuk siswa SMA.

INPUT SISWA:
${text}

KELUARKAN HANYA JSON ARRAY sesuai schema.
`.trim();

  const { text: rawText, sources: webSources, searchQueries } = await generateContent({
    env: context.env,
    prompt,
    structured: true,
    maxOutputTokens: 7000,
    useGoogleSearch: true,
  });

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
    const sources = sanitizeWebSources(item, webSources);
    if (verdict === 'verified' && sources.length === 0) {
      verdict = 'unverifiable';
      confidence = Math.min(confidence, 49);
    }
    return {
      id: `${Date.now()}-${index}`,
      claim: item.claim,
      normalizedClaim: item.normalizedClaim || item.claim,
      type: item.type,
      verdict,
      confidence,
      explanation: item.explanation,
      caveat: item.caveat,
      sources,
      searchQueries,
      checkedAt,
    };
  });
}

async function exploreIssue(context: any, payload: any) {
  const issue: Issue = payload?.issue || {};
  const position = String(payload?.position || '');
  const prompt = `
Anda adalah AI Explorer untuk pembelajaran siswa SMA pada proyek AI × SDGs.

Gunakan Google Search untuk memperkaya eksplorasi dengan informasi dan sumber web yang relevan. Jangan membuat naskah debat dan jangan menentukan pemenang.

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

Konteks dasar harus netral. Jika posisi siswa tersedia, arahkan pertanyaan pemantik untuk membantu penelitian posisi tersebut tetapi tetap tampilkan hal yang dapat mendukung maupun melemahkannya.
Semua isi harus langsung relevan dengan mosi terpilih. Jangan membawa isu dari mosi lain.
Gunakan sumber web yang ditemukan untuk mendukung fakta yang memerlukan verifikasi.
Maksimal 500 kata.
Tanpa Markdown bold atau heading #.
`.trim();

  const { text, sources } = await generateContent({ env: context.env, prompt, structured: false, maxOutputTokens: 2800, useGoogleSearch: true });
  return cleanText(text) + sourceText(sources);
}

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json();
    const { action, payload } = body || {};
    if (!action) return json({ error: 'Action tidak ditemukan.' }, 400);

    if (action === 'factCheck') {
      const result = await factCheckFromWeb(context, payload || {});
      return json({ result }, 200);
    }

    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) return json({ error: 'GEMINI_API_KEY belum diatur di environment Cloudflare Pages.' }, 500);

    let prompt = '';
    let maxOutputTokens = 1800;

    if (action === 'explore') {
      const result = await exploreIssue(context, payload || {});
      return json({ result }, 200);
    }

    if (action === 'reviewArgument') {
      const issue: Issue = payload?.issue || {};
      const argument = payload?.argument || {};
      prompt = `
Anda adalah AI Reviewer untuk latihan argumentasi siswa SMA dalam proyek AI × SDGs.

Gunakan Google Search untuk memeriksa apakah bukti web yang relevan mendukung, membatasi, atau melemahkan argumen. Jangan mengganti topik mosi.

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

ATURAN
1. Nilai relevansi bukti terhadap klaim dan mosi.
2. Cari web hanya untuk memeriksa konteks/fakta yang memang membutuhkan verifikasi.
3. Jangan mengarang angka atau fakta baru.
4. Jelaskan lompatan logika dan batas bukti.
5. Jangan menyatakan argumen menang/kalah.

Tulis tepat 4 bagian:
1. Relevansi bukti
2. Hubungan klaim dan alasan
3. Catatan penting
4. Kesimpulan dan satu perbaikan prioritas

Setiap bagian 1-3 kalimat. Maksimal 260 kata.
Tanpa Markdown bold atau heading #.
`.trim();
      maxOutputTokens = 1500;
    } else if (action === 'debate') {
      const issue: Issue = payload?.issue || {};
      prompt = `
Anda adalah sparring partner sebelum debat siswa PRO dan KONTRA.

Gunakan Google Search bila diperlukan untuk memeriksa fakta atau konteks yang relevan dengan sanggahan. Jangan mengarang data.

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

Berikan SATU sanggahan atau SATU pertanyaan penguji yang konkret dan langsung berkaitan dengan mosi. Jika membawa fakta eksternal, pastikan relevan dan berbasis hasil web.
Maksimal 130 kata.
Tanpa Markdown.
`.trim();
      maxOutputTokens = 850;
    } else if (action === 'evaluateSolution') {
      const issue: Issue = payload?.issue || {};
      prompt = `
Anda adalah AI Evaluator untuk proyek pembelajaran AI × SDGs.

Gunakan Google Search untuk memperkaya evaluasi dengan konteks kebijakan, implementasi, atau indikator yang relevan dengan mosi. Jangan menyalin solusi dari sumber dan jangan menilai siapa yang menang.

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

ATURAN
1. Evaluasi spesifik terhadap masalah dan mosi di atas.
2. Gunakan sumber web bila memerlukan konteks faktual.
3. Jangan mengarang angka target atau bukti empiris.
4. Untuk indikator keberhasilan, gunakan ukuran yang relevan dengan topik, bukan daftar generik.
5. Bedakan kelayakan dari efektivitas yang sudah terbukti.

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
      maxOutputTokens = 2200;
    } else {
      return json({ error: `Action tidak dikenal: ${action}` }, 400);
    }

    const { text, sources } = await generateContent({
      env: context.env,
      prompt,
      structured: false,
      maxOutputTokens,
      useGoogleSearch: true,
    });

    return json({ result: cleanText(text) + sourceText(sources) }, 200);
  } catch (error: any) {
    console.error('API /api/ai/gemini error:', error);
    return json(
      { error: error?.message || 'Terjadi kesalahan pada server.', code: error?.code || 'GEMINI_WEB_REQUEST_FAILED' },
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
