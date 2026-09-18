const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3.6-flash';

type SourcePackItem = {
  title: string;
  url: string;
  domain?: string;
  quality?: 'tinggi' | 'sedang' | 'lainnya';
  year?: string;
  scope?: string;
  summary?: string;
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

const HIGH_TRUST_DOMAINS = [
  '.gov', '.go.id', 'un.org', 'who.int', 'worldbank.org', 'oecd.org', 'imf.org',
  'ilo.org', 'ipcc.ch', 'unicef.org', 'unesco.org', 'unep.org', 'data.un.org',
  'data.worldbank.org', 'washdata.org', 'pubmed.ncbi.nlm.nih.gov', 'nature.com',
  'science.org', 'bmj.com', 'thelancet.com', 'noaa.gov',
];

const MEDIUM_TRUST_DOMAINS = [
  'reuters.com', 'apnews.com', 'bbc.com', 'kompas.com', 'tempo.co', 'antaranews.com',
];

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

function qualityForDomain(domain: string): 'tinggi' | 'sedang' | 'lainnya' {
  const lower = domain.toLowerCase();
  if (HIGH_TRUST_DOMAINS.some((item) => lower === item || lower.endsWith(item) || lower.includes(item))) return 'tinggi';
  if (MEDIUM_TRUST_DOMAINS.some((item) => lower === item || lower.endsWith(item) || lower.includes(item))) return 'sedang';
  return 'lainnya';
}

function cleanText(text: string) {
  return String(text || '')
    .replace(/^```(?:text|markdown)?\s*/i, '')
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

async function generateContent(params: {
  env: any;
  prompt: string;
  structured?: boolean;
  maxOutputTokens?: number;
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

function sanitizeSources(raw: RawClaim, sourcePack: SourcePackItem[]) {
  const normalizedPack = sourcePack.map((source) => ({
    ...source,
    url: normalizeUrl(source.url),
    domain: source.domain || domainOf(source.url),
    quality: source.quality || qualityForDomain(source.domain || domainOf(source.url)),
  }));

  const byUrl = new Map(normalizedPack.map((source) => [source.url, source]));
  const requestedUrls = Array.isArray(raw.sourceUrls) ? raw.sourceUrls : [];
  const titles = Array.isArray(raw.sourceTitles) ? raw.sourceTitles : [];
  const result: SourcePackItem[] = [];

  requestedUrls.forEach((url, index) => {
    const match = byUrl.get(normalizeUrl(url));
    if (match) {
      result.push({
        ...match,
        title: titles[index]?.trim() || match.title,
      });
    }
  });

  if (!result.length) {
    const titleSet = new Set(titles.map((title) => title.toLowerCase()));
    for (const source of normalizedPack) {
      if (titleSet.has(source.title.toLowerCase())) result.push(source);
    }
  }

  const seen = new Set<string>();
  return result.filter((source) => {
    if (!source.url || seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  });
}

async function factCheckFromSourcePack(context: any, payload: any) {
  const issue = payload?.issue || {};
  const sourcePack: SourcePackItem[] = Array.isArray(issue?.sources) ? issue.sources : [];
  const singleClaim = typeof payload?.claim === 'string' ? payload.claim.trim() : '';
  const text = singleClaim || (typeof payload?.text === 'string' ? payload.text.trim() : '');
  const maxClaims = Math.min(Math.max(Number(payload?.maxClaims || 8), 1), 8);

  if (!text) throw new Error('Teks/klaim untuk fact check kosong.');
  if (!sourcePack.length) throw new Error('Source pack untuk mosi ini belum diisi.');

  const sourceBlock = sourcePack.map((source, index) => (
    `SUMBER ${index + 1}\nJudul: ${source.title}\nURL: ${source.url}\nTahun: ${source.year || '-'}\nCakupan: ${source.scope || '-'}\nRingkasan bukti: ${source.summary || '-'}\n`
  )).join('\n');

  const prompt = `
Anda adalah fact-checker untuk proyek pendidikan AI × SDGs.

PENTING: Anda TIDAK memiliki akses web pada tugas ini. Anda hanya boleh menggunakan SOURCE PACK yang diberikan di bawah.

Aturan:
1. Pecah input menjadi klaim atomik.
2. Bedakan fakta, opini, dan prediksi.
3. Untuk klaim faktual, nilai hanya berdasarkan informasi yang benar-benar tertulis dalam source pack.
4. Jangan mengarang angka, kutipan, halaman, temuan, atau URL.
5. Jika source pack belum cukup mendukung klaim, pilih "unverifiable".
6. Jangan menyatakan sebab-akibat jika sumber hanya menunjukkan keterkaitan.
7. Jangan memberi verdict "verified" hanya karena nama lembaganya kredibel.
8. sourceUrls hanya boleh berasal dari SOURCE PACK.
9. Jelaskan dengan bahasa yang cocok untuk siswa SMA.
10. Maksimal ${maxClaims} klaim.

KONTEKS MOSI:
${JSON.stringify(issue)}

SOURCE PACK:
${sourceBlock}

INPUT SISWA:
${text}

KELUARKAN HANYA JSON ARRAY sesuai schema.
`.trim();

  const { text: rawText } = await generateContent({
    env: context.env,
    prompt,
    structured: true,
    maxOutputTokens: 7000,
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
    const sources = sanitizeSources(item, sourcePack).slice(0, 5);
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
      searchQueries: [],
      checkedAt,
    };
  });
}

async function exploreIssue(context: any, payload: any) {
  const issue = payload?.issue || {};
  const title = String(issue?.title || payload?.title || 'isu SDGs');
  const sdg = String(issue?.sdg || payload?.sdg || '');
  const motion = String(issue?.motion || payload?.motion || '');
  const issueContext = String(issue?.context || payload?.context || '');
  const proFocus = String(issue?.proFocus || '');
  const contraFocus = String(issue?.contraFocus || '');
  const starterQuestions = Array.isArray(issue?.starterQuestions)
    ? issue.starterQuestions.map((item: unknown) => String(item)).filter(Boolean)
    : (Array.isArray(payload?.starterQuestions) ? payload.starterQuestions.map((item: unknown) => String(item)).filter(Boolean) : []);
  const position = String(payload?.position || '');

  const prompt = `
Anda adalah AI Explorer untuk pembelajaran siswa SMA pada proyek AI × SDGs.

Tugas Anda adalah membantu siswa memahami MOSI YANG DIPILIH sebagai titik awal penelitian. Jangan membuat naskah debat, jangan mengganti topik, jangan memasukkan contoh dari mosi lain, dan jangan menentukan pemenang.

ATURAN KONTEKS WAJIB:
1. Hanya bahas isu, mosi, dan konteks yang tertulis pada DATA MOSI TERPILIH di bawah.
2. Jangan mengarang atau mengganti SDG, tema, mosi, atau masalah utama.
3. Jika posisi siswa PRO/KONTRA tersedia, gunakan posisi itu hanya untuk mengarahkan pertanyaan eksplorasi; konteks isu tetap netral.
4. Semua pertanyaan, faktor, kelompok terdampak, sudut pandang, dan catatan fact-check harus relevan langsung dengan mosi terpilih.
5. Jangan membawa contoh tentang AI, perubahan iklim, energi, pendidikan, media sosial, atau topik lain kecuali memang disebut dalam DATA MOSI TERPILIH.
6. Jika informasi yang diberikan tidak cukup, katakan bahwa informasi perlu diteliti lebih lanjut daripada mengganti topik.

DATA MOSI TERPILIH
SDG: ${sdg || '-'}
Isu: ${title}
Mosi: ${motion || '-'}
Konteks dasar: ${issueContext || '-'}
Fokus PRO: ${proFocus || '-'}
Fokus KONTRA: ${contraFocus || '-'}
Pertanyaan pemantik dari Bank Mosi:
${starterQuestions.length ? starterQuestions.map((question: string, index: number) => `${index + 1}. ${question}`).join('\n') : '-'}
Posisi siswa: ${position || 'belum ditentukan'}

Gunakan struktur:
1. Konteks isu
2. Faktor yang mungkin terkait
3. Kelompok yang terdampak
4. Berbagai sudut pandang
5. Pertanyaan pemantik
6. Catatan fact-check

Konteks dasar harus netral. Untuk posisi siswa ${position || 'yang belum ditentukan'}, arahkan pertanyaan pemantik agar berguna untuk posisi tersebut, tetapi tetap sebutkan bukti yang dapat mendukung maupun melemahkan posisi.

Pastikan bagian 1 secara eksplisit membahas mosi terpilih, bukan isu lain. Pertanyaan pada bagian 5 harus berhubungan langsung dengan mosi terpilih.

Gunakan bahasa Indonesia yang jelas untuk siswa SMA.
Maksimal 500 kata.
Jangan memakai Markdown bold (**), heading dengan #, atau fenced code. Gunakan teks biasa, nomor, dan bullet sederhana.
Pastikan respons selesai dalam kalimat lengkap.
`.trim();

  const { text } = await generateContent({ env: context.env, prompt, structured: false, maxOutputTokens: 2800 });
  return text;
}

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json();
    const { action, payload } = body || {};
    if (!action) return json({ error: 'Action tidak ditemukan.' }, 400);

    if (action === 'factCheck') {
      const result = await factCheckFromSourcePack(context, payload || {});
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
      const issue = payload?.issue || {};
      const argument = payload?.argument || {};
      const sourcePack: SourcePackItem[] = Array.isArray(issue?.sources) ? issue.sources : [];
      const sourceBlock = sourcePack.map((source, index) => (
        `SUMBER ${index + 1}\nJudul: ${source.title}\nTahun: ${source.year || '-'}\nCakupan: ${source.scope || '-'}\nRingkasan Source Pack: ${source.summary || '-'}\nURL: ${source.url}`
      )).join('\n\n');

      prompt = `
Anda adalah AI Reviewer untuk latihan argumentasi siswa SMA dalam proyek AI × SDGs.

Tugas Anda adalah menilai kualitas hubungan antara klaim, alasan, dan bukti siswa untuk MOSI YANG DIPILIH. Jangan membuat naskah debat dan jangan mengganti topik.

KONTEKS MOSI
SDG: ${issue?.sdg || '-'}
Isu: ${issue?.title || '-'}
Mosi: ${issue?.motion || '-'}
Konteks: ${issue?.context || '-'}
Posisi siswa: ${payload?.position || '-'}

ARGUMEN SISWA
Klaim: ${argument?.claim || '-'}
Alasan: ${argument?.reason || '-'}
Bukti: ${argument?.evidence || '-'}

SOURCE PACK YANG TERKAIT DENGAN MOSI
${sourceBlock || '-'}

ATURAN
1. Nilai bukti berdasarkan isi yang benar-benar diberikan siswa dan ringkasan Source Pack di atas.
2. Jangan menganggap sebuah klaim benar hanya karena sumbernya berasal dari lembaga tepercaya.
3. Jangan mengarang angka, hasil penelitian, kutipan, halaman, atau fakta baru.
4. Bedakan antara apa yang didukung bukti dan apa yang merupakan perluasan kesimpulan siswa.
5. Jika bukti hanya mendukung klaim yang lebih sempit, jelaskan batas klaim tersebut.
6. Pastikan review benar-benar relevan dengan mosi terpilih.

Tulis tepat 4 bagian:
1. Relevansi bukti
2. Hubungan klaim dan alasan
3. Catatan penting
4. Kesimpulan dan satu perbaikan prioritas

Setiap bagian 1-3 kalimat. Maksimal 260 kata.
Tanpa Markdown bold, heading #, atau fenced code. Gunakan teks biasa dan penomoran.
Pastikan respons selesai.
`.trim();
      maxOutputTokens = 1500;
    } else if (action === 'debate') {
      const issue = payload?.issue || {};
      prompt = `
Anda adalah sparring partner sebelum debat siswa PRO dan KONTRA.

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

Berikan SATU sanggahan atau SATU pertanyaan penguji yang konkret dan langsung berkaitan dengan mosi. Dorong siswa menghubungkan klaim dengan bukti dan mengakui batasan bukti bila perlu.
Jangan mengarang data baru atau membawa topik dari mosi lain.
Maksimal 130 kata.
Tanpa Markdown.
Pastikan respons selesai.
`.trim();
      maxOutputTokens = 850;
    } else if (action === 'evaluateSolution') {
      const issue = payload?.issue || {};
      const sourcePack: SourcePackItem[] = Array.isArray(issue?.sources) ? issue.sources : [];
      const sourceBlock = sourcePack.map((source, index) => (
        `SUMBER ${index + 1}: ${source.title} | Tahun: ${source.year || '-'} | Cakupan: ${source.scope || '-'}\nRingkasan: ${source.summary || '-'}\nURL: ${source.url}`
      )).join('\n');

      prompt = `
Anda adalah AI Evaluator untuk proyek pembelajaran AI × SDGs.

Evaluasi SOLUSI SISWA terhadap MOSI YANG DIPILIH, bukan secara generik. Jangan menilai siapa yang menang dalam debat. Tugas Anda adalah membantu siswa memperbaiki solusi agar relevan, realistis, terukur, dan sesuai konteks.

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

SOURCE PACK MOSI (untuk konteks, bukan untuk mengarang bukti baru)
${sourceBlock || '-'}

ATURAN EVALUASI
1. Evaluasi harus spesifik terhadap masalah dan mosi di atas.
2. Jangan memasukkan indikator, risiko, atau pihak yang hanya relevan untuk mosi lain.
3. Untuk indikator keberhasilan, gunakan ukuran yang benar-benar relevan dengan topik, misalnya indikator pangan/gizi untuk isu bantuan pangan, emisi untuk isu transportasi/iklim, atau hasil belajar untuk isu pendidikan.
4. Jangan mengarang angka target atau bukti empiris yang tidak ada.
5. Jika solusi masih terlalu umum, sebutkan bagian yang perlu dibuat lebih konkret.
6. Bedakan kelayakan dari bukti efektivitas: solusi yang realistis belum tentu terbukti efektif.

Tulis tepat 6 bagian:
1. Kesesuaian masalah
2. Kelayakan pelaksanaan
3. Pihak yang terlibat
4. Indikator keberhasilan
5. Risiko utama
6. Kesimpulan dan satu perbaikan prioritas

Setiap bagian 1-3 kalimat. Maksimal 360 kata.
Tanpa Markdown bold, heading #, atau fenced code. Gunakan teks biasa dan penomoran.
Pastikan respons selesai.
`.trim();
      maxOutputTokens = 2200;
    } else {
      return json({ error: `Action tidak dikenal: ${action}` }, 400);
    }

    const { text } = await generateContent({ env: context.env, prompt, structured: false, maxOutputTokens });
    return json({ result: cleanText(text) }, 200);
  } catch (error: any) {
    console.error('API /api/gemini error:', error);
    return json({ error: error?.message || 'Terjadi kesalahan pada server.', code: error?.code || 'GEMINI_REQUEST_FAILED' }, 500);
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
