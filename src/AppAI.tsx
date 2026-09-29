import { useDebateRun } from './history/useDebateRun';
import { fetchAI } from './team/api';
/**
 * FRONTEND V2 — AI + GOOGLE SEARCH
 *
 * Fungsi:
 * - Menjadi antarmuka Version 2 AI × SDGs Platform.
 * - Menggunakan Gemini API sebagai AI utama.
 * - Menggunakan Google Search grounding untuk pencarian web
 *   pada tahap AI Exploration dan Fact Check.
 *
 * Backend:
 * - POST /api/gemini-ai
 * - Backend: worker/gemini-ai.ts
 *
 * Alur:
 * 1. Issue Bank
 * 2. AI Exploration
 * 3. Fact Check
 * 4. Argument Builder
 * 5. Debate Preparation
 * 6. Solution Lab
 * 7. Impact
 *
 * Catatan:
 * - AI berfungsi sebagai alat bantu riset dan persiapan.a
 * - Debat resmi tetap dilakukan oleh siswa PRO dan KONTRA.
 */

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';

type Source = {
  title: string;
  url: string;
  domain: string;
  quality: 'tinggi' | 'sedang' | 'lainnya';
  year?: string;
  scope?: string;
  summary?: string;
};

type Issue = {
  id: number;
  sdg: string;
  title: string;
  blurb: string;
  motion: string;
  context: string;
  proFocus: string;
  contraFocus: string;
  starterQuestions: string[];
  sources: Source[];
};

type ClaimResult = {
  id: string;
  claim: string;
  normalizedClaim: string;
  type: 'factual' | 'opinion' | 'prediction';
  verdict: 'verified' | 'mostly_true' | 'misleading' | 'false' | 'unverifiable' | 'not_fact';
  confidence: number;
  explanation: string;
  caveat: string;
  sources: Source[];
  searchQueries: string[];
  checkedAt: string;
};

type ApiError = Error & { code?: string };
type StageId = 'home' | 'issue-bank' | 'ai-exploration' | 'fact-check' | 'argument-builder' | 'debate' | 'solution-lab' | 'impact';

type Argument = {
  claim: string;
  reason: string;
  evidence: string;
};

const STAGES: { id: StageId; label: string; short: string }[] = [
  { id: 'home', label: 'Home', short: 'H' },
  { id: 'issue-bank', label: 'SDGs Issue Bank', short: '01' },
  { id: 'ai-exploration', label: 'AI Exploration', short: '02' },
  { id: 'fact-check', label: 'Fact Check', short: '03' },
  { id: 'argument-builder', label: 'Argument Builder', short: '04' },
  { id: 'debate', label: 'Debate Preparation', short: '05' },
  { id: 'solution-lab', label: 'Solution Lab', short: '06' },
  { id: 'impact', label: 'Impact', short: '07' },
];

const FACT_CHECK_MODE: 'ai-web-search' | 'dummy' = 'ai-web-search';

const AI_STAGE_MODE: 'api' | 'dummy' = 'api';

const ARGUMENT_REVIEW_MODE: 'api' | 'dummy' = 'api';

const SOLUTION_EVALUATOR_MODE: 'api' | 'dummy' = 'api';

type MotionApiRow = {
  id: number;
  text: string;
  sdgNumber: number | null;
  createdAt: string;
  sdgs?: Array<{
    number: number;
    title: string;
    description: string;
    isPrimary: boolean;
  }>;
  context?: {
    background?: string;
    focusIssue?: string;
    sdgContext?: string;
    keyConsiderations?: string;
    analysisFramework?: string;
  } | null;
  questions?: Array<{
    id: number;
    category: string;
    question: string;
    position: number;
  }>;
  arguments?: Array<{
    id: number;
    side: 'PRO' | 'KONTRA';
    title: string;
    explanation: string;
    reasoning: string;
    evidenceToFind: string;
    position: number;
  }>;
  rebuttals?: Array<{
    id: number;
    argumentId: number;
    side: 'PRO' | 'KONTRA';
    counterargument: string;
    rebuttal: string;
    position: number;
  }>;
  sources?: Array<{
    id: number;
    organization: string;
    title: string;
    url: string | null;
    description: string | null;
    position: number;
  }>;
  keywords?: Array<{
    id: number;
    language: string;
    keyword: string;
    position: number;
  }>;
};

const ISSUE_DISPLAY_TITLES: Record<number, string> = {
  1: 'Dampak Perkembangan AI terhadap Lapangan Kerja',
  2: 'Manfaat Pengembangan AI dan Dampak Lingkungannya',
  3: 'Penggunaan AI dalam Pembelajaran',
  4: 'Penyebaran Informasi Palsu: AI-generated vs Human-generated',
  5: 'Pengawasan Penggunaan Media Sosial',
  6: 'Mobil Listrik dan Masa Depan Transportasi',
  7: 'Bantuan Sembako dan Bantuan Tunai',
  8: 'Pembatasan Penggunaan HP pada Remaja',
};

const EMPTY_ISSUE: Issue = {
  id: 0,
  sdg: '',
  title: 'Mosi',
  blurb: '',
  motion: '',
  context: '',
  proFocus: '',
  contraFocus: '',
  starterQuestions: [],
  sources: [],
};

function getDomain(url: string | null): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function mapMotionToIssue(motion: MotionApiRow): Issue {
  const sdgs = Array.isArray(motion.sdgs) ? motion.sdgs : [];
  const questions = Array.isArray(motion.questions) ? motion.questions : [];
  const argumentsList = Array.isArray(motion.arguments) ? motion.arguments : [];
  const sources = Array.isArray(motion.sources) ? motion.sources : [];
  const context = motion.context || null;

  const proArguments = argumentsList.filter((item) => item.side === 'PRO');
  const contraArguments = argumentsList.filter((item) => item.side === 'KONTRA');

  const proFocus = proArguments.length
    ? proArguments.map((item) => item.title).join('; ')
    : context?.keyConsiderations || '';
  const contraFocus = contraArguments.length
    ? contraArguments.map((item) => item.title).join('; ')
    : context?.keyConsiderations || '';

  return {
    id: motion.id,
    sdg: sdgs.length
      ? sdgs.map((item) => `SDG ${item.number}`).join(' & ')
      : motion.sdgNumber
        ? `SDG ${motion.sdgNumber}`
        : 'SDG',
    title: ISSUE_DISPLAY_TITLES[motion.id] || `Mosi #${motion.id}`,
    blurb: context?.focusIssue || context?.keyConsiderations || motion.text,
    motion: motion.text,
    context: context?.background || '',
    proFocus,
    contraFocus,
    starterQuestions: questions
      .sort((a, b) => a.position - b.position)
      .map((item) => item.question),
    sources: sources
      .sort((a, b) => a.position - b.position)
      .map((source) => ({
        title: source.title || source.organization,
        url: source.url || '',
        domain: getDomain(source.url),
        quality: 'tinggi' as const,
        summary: source.description || undefined,
      })),
  };
}

const verdictMeta: Record<ClaimResult['verdict'], { label: string; color: string }> = {
  verified: { label: 'Terverifikasi', color: 'bg-[#6C5CE7]/12 text-[#6C5CE7]' },
  mostly_true: { label: 'Sebagian besar benar', color: 'bg-[#6C5CE7]/12 text-[#6C5CE7]' },
  misleading: { label: 'Menyesatkan', color: 'bg-[#F2A93B]/14 text-[#C77B12]' },
  false: { label: 'Bertentangan', color: 'bg-coral/20 text-coral' },
  unverifiable: { label: 'Belum terverifikasi', color: 'bg-[#F2A93B]/14 text-[#C77B12]' },
  not_fact: { label: 'Bukan klaim fakta', color: 'bg-slate/20 text-[#70758B]' },
};

const qualityLabel: Record<Source['quality'], string> = {
  tinggi: 'Sumber prioritas',
  sedang: 'Sumber pendukung',
  lainnya: 'Sumber referensi',
};

const fakeDelay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_FACT_CHECK_PROFILES: Record<number, {
  claims: string[];
  explanation: string;
  caveat: string;
  queries: string[];
}> = {
  1: {
    claims: [
      'Paparan terhadap AI tidak selalu berarti pekerjaan akan hilang karena banyak pekerjaan diperkirakan lebih banyak berubah daripada sepenuhnya digantikan.',
      'AI dapat menciptakan pekerjaan baru sekaligus menimbulkan displacement pada sebagian pekerjaan atau tugas.',
    ],
    explanation: 'Simulasi menilai klaim ini relevan dengan sumber ketenagakerjaan yang ada pada Source Pack. Untuk penggunaan nyata, definisi “pekerjaan tercipta” dan “pekerjaan hilang” harus dibatasi agar bukti dapat dibandingkan.',
    caveat: 'Ini adalah hasil DUMMY. Sistem belum melakukan pemeriksaan web atau validasi bukti secara langsung.',
    queries: ['simulasi: generative AI jobs transformation displacement', 'simulasi: AI job creation and displacement'],
  },
  2: {
    claims: [
      'Pengembangan AI dapat meningkatkan konsumsi listrik pusat data, sementara AI juga dapat dipakai untuk efisiensi energi dan pemantauan lingkungan.',
      'Dampak lingkungan AI perlu dinilai sepanjang siklus hidup, bukan hanya dari penggunaan listrik model.',
    ],
    explanation: 'Simulasi menilai kedua klaim sejalan dengan arah Source Pack. Perbandingan “manfaat lebih besar” tetap memerlukan indikator manfaat dan dampak yang jelas serta konteks penggunaan.',
    caveat: 'Ini adalah hasil DUMMY. Sistem belum melakukan pemeriksaan web atau validasi bukti secara langsung.',
    queries: ['simulasi: AI data centre electricity environmental impact', 'simulasi: AI environmental benefits lifecycle assessment'],
  },
  3: {
    claims: [
      'AI dapat memberi manfaat seperti personalisasi dan aksesibilitas, tetapi penggunaan tanpa pengawasan juga dapat menimbulkan kesalahan, bias, dan risiko privasi.',
      'Penggunaan chatbot untuk belajar cukup luas sehingga kemampuan siswa memeriksa dan menggunakan hasil AI secara kritis menjadi penting.',
    ],
    explanation: 'Simulasi menilai klaim konsisten dengan sumber UNESCO, UNICEF, dan OECD pada Source Pack. Dampak terhadap hasil belajar tetap perlu dilihat menurut tugas dan pola penggunaan.',
    caveat: 'Ini adalah hasil DUMMY. Sistem belum melakukan pemeriksaan web atau validasi bukti secara langsung.',
    queries: ['simulasi: generative AI education learning benefits risks', 'simulasi: Indonesia students chatbot learning PISA 2025'],
  },
  4: {
    claims: [
      'GenAI dapat menurunkan hambatan produksi dan distribusi informasi menyesatkan dalam skala besar.',
      'Kemampuan membedakan konten AI dan manusia menjadi tantangan penting dalam penilaian informasi digital.',
    ],
    explanation: 'Simulasi menilai klaim relevan dengan laporan WEF, survei OECD, dan materi UNICEF. Namun, “lebih berbahaya” membutuhkan indikator dampak yang lebih spesifik daripada sekadar asal konten.',
    caveat: 'Ini adalah hasil DUMMY. Sistem belum melakukan pemeriksaan web atau validasi bukti secara langsung.',
    queries: ['simulasi: AI generated misinformation scale detection', 'simulasi: AI vs human generated misleading content'],
  },
  5: {
    claims: [
      'Anak dapat menghadapi berbagai risiko daring di media sosial, termasuk paparan konten yang tidak sesuai dan pengalaman online yang membuat tidak nyaman atau takut.',
      'Keselamatan digital anak tidak hanya bergantung pada pemerintah, tetapi juga pada desain platform, orang tua, dan sekolah.',
    ],
    explanation: 'Simulasi menilai kedua klaim sesuai dengan fokus sumber UNICEF dan OECD. Bentuk pengawasan pemerintah tetap perlu didefinisikan agar dapat diuji secara konkret.',
    caveat: 'Ini adalah hasil DUMMY. Sistem belum melakukan pemeriksaan web atau validasi bukti secara langsung.',
    queries: ['simulasi: child online safety social media Indonesia', 'simulasi: digital safety by design children government platform'],
  },
  6: {
    claims: [
      'Kendaraan listrik dapat menghasilkan emisi siklus hidup yang lebih rendah daripada kendaraan bensin dalam banyak skenario yang dianalisis IEA.',
      'Dampak kendaraan listrik tetap dipengaruhi sumber listrik, produksi baterai, penggunaan, dan infrastruktur pengisian.',
    ],
    explanation: 'Simulasi menilai klaim relevan dengan analisis IEA pada Source Pack. Perbandingan perlu menyebut wilayah dan asumsi siklus hidup yang digunakan.',
    caveat: 'Ini adalah hasil DUMMY. Sistem belum melakukan pemeriksaan web atau validasi bukti secara langsung.',
    queries: ['simulasi: lifecycle emissions electric vehicle vs ICE', 'simulasi: EV electricity mix battery lifecycle emissions'],
  },
  7: {
    claims: [
      'Bantuan pangan dan bantuan tunai dapat menghasilkan manfaat yang berbeda tergantung kondisi pasar, kebutuhan rumah tangga, dan desain program.',
      'Bantuan tunai memberi fleksibilitas penggunaan, sedangkan bantuan pangan dapat secara langsung menyediakan komoditas tertentu.',
    ],
    explanation: 'Simulasi menilai klaim sesuai dengan tinjauan WFP dan ringkasan bukti World Bank. Pernyataan bahwa salah satu bentuk bantuan selalu lebih menjamin gizi perlu dibatasi pada kondisi tertentu.',
    caveat: 'Ini adalah hasil DUMMY. Sistem belum melakukan pemeriksaan web atau validasi bukti secara langsung.',
    queries: ['simulasi: cash transfers versus in-kind food assistance nutrition', 'simulasi: food assistance cash transfer context markets'],
  },
  8: {
    claims: [
      'Penggunaan media sosial yang bermasalah pada remaja dapat berkaitan dengan kesejahteraan dan kesehatan, tetapi hubungan tersebut tidak selalu sederhana.',
      'Pedoman kesehatan mendukung pengurangan perilaku sedentari dan keseimbangan dengan aktivitas fisik, tidur, dan kegiatan lain.',
    ],
    explanation: 'Simulasi menilai klaim konsisten dengan sumber WHO, dengan catatan bahwa durasi layar saja tidak cukup untuk menggambarkan dampak semua aktivitas digital.',
    caveat: 'Ini adalah hasil DUMMY. Sistem belum melakukan pemeriksaan web atau validasi bukti secara langsung.',
    queries: ['simulasi: adolescent screen time mental health problematic social media', 'simulasi: WHO sedentary behaviour adolescents screen time'],
  },
};

function makeMockSourcePack(issue: Issue): Source[] {
  return issue.sources.map((source) => ({ ...source }));
}

const MOCK_EVIDENCE_BY_ISSUE: Record<number, string[]> = {
  1: [
    'Temuan simulasi: ILO menekankan bahwa paparan GenAI pada pekerjaan tidak otomatis berarti penghapusan pekerjaan karena banyak pekerjaan diperkirakan mengalami transformasi tugas.',
    'Temuan simulasi: WEF 2025 memproyeksikan penciptaan dan displacement pekerjaan hingga 2030, tetapi proyeksi itu mencakup berbagai tren struktural, bukan AI saja.',
  ],
  2: [
    'Temuan simulasi: IEA memperkirakan kebutuhan listrik pusat data meningkat tajam hingga 2030 dan AI menjadi salah satu pendorong penting.',
    'Temuan simulasi: UNEP menekankan penilaian dampak lingkungan AI secara end-to-end, termasuk sumber daya dan infrastruktur digital.',
  ],
  3: [
    'Temuan simulasi: UNESCO dan UNICEF mengidentifikasi peluang AI untuk personalisasi dan aksesibilitas sekaligus risiko kesalahan, privasi, bias, dan ketergantungan.',
    'Temuan simulasi: OECD melaporkan 53% siswa di Indonesia menggunakan chatbot setiap minggu untuk belajar dalam PISA 2025.',
  ],
  4: [
    'Temuan simulasi: WEF menyoroti bahwa GenAI menurunkan hambatan produksi dan distribusi konten menyesatkan dalam skala besar.',
    'Temuan simulasi: OECD Truth Quest menguji kemampuan responden membedakan informasi benar dan palsu/menyesatkan, termasuk konten AI dan manusia.',
  ],
  5: [
    'Temuan simulasi: Studi UNICEF Indonesia menunjukkan anak menghadapi beragam risiko online dan pengetahuan keselamatan digital belum merata.',
    'Temuan simulasi: OECD menempatkan safety-by-design dan mekanisme keselamatan sesuai usia sebagai bagian penting dari perlindungan anak online.',
  ],
  6: [
    'Temuan simulasi: IEA 2024 memperkirakan emisi siklus hidup mobil listrik baterai ukuran menengah dalam skenario global tertentu sekitar setengah mobil ICE ekuivalen.',
    'Temuan simulasi: IEA 2026 memperkirakan penggunaan EV telah menghindari emisi CO2-eq secara bersih, dengan besarnya dampak bergantung pada lintasan kebijakan dan sistem energi.',
  ],
  7: [
    'Temuan simulasi: WFP menjelaskan bantuan dapat diberikan sebagai pangan, tunai, atau voucher dan bentuk bantuan dipilih sesuai konteks.',
    'Temuan simulasi: tinjauan WFP dan ringkasan World Bank menunjukkan hasil cash dan in-kind berbeda menurut kondisi pasar, desain, serta tujuan program.',
  ],
  8: [
    'Temuan simulasi: WHO Europe menyatakan bukti hubungan antara teknologi dan kesehatan mental remaja bersifat campuran dan dapat berlangsung dua arah.',
    'Temuan simulasi: WHO menyediakan rekomendasi aktivitas fisik dan sedentari untuk anak dan remaja, sehingga keseimbangan aktivitas penting saat membahas screen time.',
  ],
};

function mockEvidenceForClaim(issue: Issue | null, claim: string): string {
  const findings = MOCK_EVIDENCE_BY_ISSUE[issue?.id || 1] || [];
  const sources = makeMockSourcePack(issue || EMPTY_ISSUE);
  const sourceText = sources.slice(0, 2).map((source, index) =>
    `${source.title}\nTemuan: ${findings[index] || 'Temuan simulasi yang relevan dengan klaim.'}\nSumber: ${source.url}`
  ).join('\n\n');
  return `Klaim yang diperiksa: ${claim}\n\n${sourceText}`;
}

async function mockFactCheck(payload: { claim?: string; text?: string; issue?: Issue | null; maxClaims?: number }): Promise<ClaimResult[]> {
  await fakeDelay();
  const issueId = payload.issue?.id || 1;
  const profile = MOCK_FACT_CHECK_PROFILES[issueId] || MOCK_FACT_CHECK_PROFILES[1];
  const input = (payload.claim || payload.text || '').trim();
  const requestedClaims = payload.claim
    ? [payload.claim.trim()]
    : profile.claims.slice(0, Math.min(Number(payload.maxClaims || 2), 2));
  const sources = makeMockSourcePack(payload.issue || EMPTY_ISSUE);

  return requestedClaims.map((claim, index) => ({
    id: `mock-${Date.now()}-${index}`,
    claim: claim || input,
    normalizedClaim: claim || input,
    type: 'factual',
    verdict: index === 0 ? 'mostly_true' : 'verified',
    confidence: index === 0 ? 86 : 91,
    explanation: profile.explanation,
    caveat: profile.caveat,
    sources,
    searchQueries: profile.queries,
    checkedAt: new Date().toISOString(),
  }));
}

function cleanAiText(value: string): string {
  return String(value || '')
    .replace(/\\([*_#`>])/g, '$1')
    .replace(/\r/g, '')
    .replace(/^```(?:text|markdown|md)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|\n)\s*[-*]\s+/g, '$1• ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function formatApiError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui.';
  if (/quota|rate.?limit|429/i.test(message)) {
    return 'Layanan AI sedang mencapai batas penggunaan. Pemeriksaan belum menghasilkan verdict. Coba lagi setelah kuota tersedia.';
  }
  return message;
}

export default function App() {
  const [currentStage, setCurrentStage] = useState(0);
  const [furthestStage, setFurthestStage] = useState(0);
  const PRIMARY_MOTION_IDS = new Set([1, 2, 3, 4]);

  const [issues, setIssues] = useState<Issue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [issuesError, setIssuesError] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [debatePosition, setDebatePosition] = useState<'PRO' | 'KONTRA' | ''>('');

  const [exploration, setExploration] = useState('');
  const [explorerReply, setExplorerReply] = useState('');
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [explorerIssueId, setExplorerIssueId] = useState<number | null>(null);
  const [explorerSources, setExplorerSources] = useState<Source[]>([]);

  const [claims, setClaims] = useState<ClaimResult[]>([]);
  const [factCheckLoading, setFactCheckLoading] = useState(false);
  const [factCheckError, setFactCheckError] = useState<string | null>(null);
  const [draftClaim, setDraftClaim] = useState('');
  const [recheckingId, setRecheckingId] = useState<string | null>(null);

  const [argument, setArgument] = useState<Argument>({ claim: '', reason: '', evidence: '' });
  const [review, setReview] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const [debateLog, setDebateLog] = useState<{ who: 'ai' | 'user'; text: string }[]>([]);
  const [debateInput, setDebateInput] = useState('');
  const [debateLoading, setDebateLoading] = useState(false);
  const [sparringRound, setSparringRound] = useState(0);

  const [solution, setSolution] = useState('');
  const [evalReply, setEvalReply] = useState('');
  const [evalLoading, setEvalLoading] = useState(false);

  const debateRun = useDebateRun(
    selectedIssue,
    debatePosition,
    'v2',
    currentStage === 7 &&
    solution.trim() &&
    evalReply.trim()
      ? {
          ...argument,
          solution,
          evaluation: evalReply,
        }
      : null,
  );

  const verifiedClaims = useMemo(
    () => claims.filter((claim) => ['verified', 'mostly_true'].includes(claim.verdict)),
    [claims],
  );

  const blockingClaims = useMemo(
    () => claims.filter((claim) => !['verified', 'mostly_true', 'not_fact'].includes(claim.verdict)),
    [claims],
  );

  const canProceedFactCheck = verifiedClaims.length > 0;
  const canReviewArgument = Boolean(argument.claim.trim() && argument.reason.trim() && argument.evidence.trim());
  const canProceedToDebate = canReviewArgument && Boolean(review.trim()) && !reviewLoading;
  const canProceedToSolution = sparringRound >= 1;
  const canProceedToImpact = Boolean(solution.trim() && evalReply.trim()) && !evalLoading;

  useEffect(() => {
    let cancelled = false;

    const loadIssues = async () => {
      setIssuesLoading(true);
      setIssuesError(null);

      try {
        const response = await fetch('/api/motions', {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.error || `Gagal memuat bank mosi (${response.status}).`);
        }

        if (!Array.isArray(data?.motions)) {
          throw new Error('Respons /api/motions tidak memiliki daftar mosi.');
        }

        const mappedIssues = (data.motions as MotionApiRow[])
          .map(mapMotionToIssue)
          .filter((issue) => PRIMARY_MOTION_IDS.has(issue.id));

        if (!cancelled) {
          setIssues(mappedIssues);
          setSelectedIssue((current) => {
            if (!current) return null;
            return mappedIssues.find((issue) => issue.id === current.id) || null;
          });
        }
      } catch (error) {
        if (!cancelled) {
          setIssuesError(error instanceof Error ? error.message : 'Bank mosi gagal dimuat.');
        }
      } finally {
        if (!cancelled) setIssuesLoading(false);
      }
    };

    loadIssues();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedIssue) return;
    setExploration('');
    setExplorerReply('');
    setExplorerIssueId(null);
    setExplorerSources([]);
    setClaims([]);
    setDraftClaim('');
    setFactCheckError(null);
    setArgument({ claim: '', reason: '', evidence: '' });
    setReview('');
    setDebateLog([]);
    setDebateInput('');
    setSparringRound(0);
    setSolution('');
    setEvalReply('');
  }, [selectedIssue?.id, debatePosition]);

  useEffect(() => {
    if (currentStage !== 2 || !selectedIssue || !debatePosition || explorerIssueId === selectedIssue.id) return;

    let cancelled = false;
    const loadExplorer = async () => {
      setExplorerLoading(true);
      try {
        const response = await callAPI('explore', { issue: selectedIssue, position: debatePosition, focus: debatePosition === 'PRO' ? selectedIssue.proFocus : selectedIssue.contraFocus, starterQuestions: selectedIssue.starterQuestions }, true);
        if (!cancelled) {
          setExplorerReply(cleanAiText(String(response?.result || 'AI Explorer tidak memberikan hasil.')));
          setExplorerSources(Array.isArray(response?.sources) ? response.sources : []);
          setExplorerIssueId(selectedIssue.id);
        }
      } catch (error) {
        if (!cancelled) setExplorerReply(error instanceof Error ? `AI Explorer gagal: ${error.message}` : 'AI Explorer gagal dijalankan.');
      } finally {
        if (!cancelled) setExplorerLoading(false);
      }
    };

    loadExplorer();
    return () => { cancelled = true; };
  }, [currentStage, selectedIssue, debatePosition, explorerIssueId]);

  useEffect(() => {
    if (currentStage !== 5 || debateLog.length > 0) return;
    setDebateLog([
      {
        who: 'ai',
        text: `Argumenmu: "${argument.claim || '(belum diisi)'}". Jelaskan mengapa bukti yang kamu punya cukup kuat. Ingat, saya hanya sparring partner sebelum debat dengan siswa lain.`,
      },
    ]);
  }, [currentStage, debateLog.length, argument.claim]);

  function mockArgumentReview(issue: Issue | null, arg: Argument) {
    const evidence = arg.evidence.trim();
    const hasUrl = /https?:\/\//i.test(evidence);
    const hasReason = arg.reason.trim().length >= 30;
    const claim = arg.claim.trim();
    const findings = MOCK_EVIDENCE_BY_ISSUE[issue?.id || 1] || [];
    const sources = makeMockSourcePack(issue || EMPTY_ISSUE).slice(0, 2);

    if (claim && hasReason && hasUrl) {
      const evidenceLines = sources.map((source, index) =>
        `${source.title}: ${findings[index] || source.summary || 'Temuan simulasi yang relevan dengan klaim.'}`
      );

      return [
        'Review AI',
        '',
        '1. Relevansi bukti',
        'Bukti sudah memiliki sumber yang jelas dan dapat dihubungkan dengan klaim. Pada mode simulasi, temuan berikut digunakan sebagai bukti pendukung:',
        `• ${evidenceLines[0]}`,
        `• ${evidenceLines[1]}`,
        '',
        '2. Hubungan klaim dan alasan',
        'Alasan menjelaskan mekanisme yang membuat klaim masuk akal dan masih berada dalam ruang lingkup klaim.',
        '',
        '3. Catatan penting',
        'Jangan menarik kesimpulan yang lebih luas daripada temuan sumber. Pada versi produksi, temuan simulasi harus diganti dengan kutipan atau data nyata dari Source Pack.',
        '',
        '4. Kesimpulan',
        'Argumen sudah cukup koheren untuk lanjut ke Uji Argumen. Tetap pertahankan batas klaim sesuai bukti yang tersedia.',
      ].join('\n');
    }

    return [
      'Review AI',
      '',
      'Argumen belum siap direview penuh.',
      'Lengkapi klaim dan alasan, lalu masukkan minimal satu sumber dengan URL pada bagian bukti.',
    ].join('\n');
  }

  function mockDebateReply(round: number) {
    const replies = [
      'Sanggahan: bukti yang kamu sebutkan masih umum. Jelaskan bagian mana dari bukti tersebut yang paling langsung mendukung klaimmu dan hindari menyimpulkan lebih jauh dari data.',
      'Pertanyaan penguji: indikator apa yang dapat digunakan untuk membedakan pengaruh faktor yang kamu sebut dari faktor lain? Jelaskan batas bukti yang kamu miliki.',
      'Sanggahan terakhir: nyatakan dengan jelas apa yang dapat dibuktikan oleh sumbermu dan apa yang masih menjadi keterbatasan. Pertahankan hanya bagian argumen yang benar-benar didukung bukti.'
    ];
    return replies[Math.max(0, Math.min(replies.length - 1, round - 1))];
  }

  function mockSolutionEvaluation() {
    const issueContext = selectedIssue?.title || 'isu yang dipilih';
    return `1. Kesesuaian masalah\nSolusi relevan dengan masalah pada ${issueContext} dan perlu menunjukkan hubungan yang jelas antara masalah, tindakan, serta hasil yang diharapkan.\n\n2. Kelayakan pelaksanaan\nSolusi cukup realistis jika dilakukan bertahap dan disesuaikan dengan sumber daya, waktu, serta kondisi pihak yang terlibat.\n\n3. Pihak yang terlibat\nTentukan pihak yang memiliki kewenangan, pelaksana, penerima manfaat, serta pihak pendukung sesuai konteks mosi.\n\n4. Indikator keberhasilan\nGunakan ukuran yang dapat diamati, misalnya perubahan akses/partisipasi, penggunaan layanan, biaya, emisi, hasil belajar, keselamatan digital, kualitas konsumsi, atau indikator lain yang relevan dengan isu.\n\n5. Risiko utama\nPerhatikan keterbatasan anggaran, perubahan kebiasaan, infrastruktur, ketimpangan akses, dampak tidak langsung, atau partisipasi yang rendah.\n\n6. Kesimpulan dan satu perbaikan prioritas\nSolusi dapat dilanjutkan setelah indikator keberhasilan dan pembagian tanggung jawab dibuat lebih spesifik.`;
  }

  async function callAPI(action: string, payload: unknown, withMeta = false) {
    const response = await fetchAI('/api/gemini-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload, debateSessionId: debateRun.id, }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data?.error || `API gagal (${response.status})`) as ApiError;
      error.code = data?.code;
      throw error;
    }
    if (data?.result === undefined) throw new Error('Respons API tidak memiliki field result.');
    return withMeta ? data : data.result;
  }

  function goTo(index: number) {
    const safeIndex = Math.max(0, Math.min(STAGES.length - 1, index));
    setCurrentStage(safeIndex);
    setFurthestStage((previous) => Math.max(previous, safeIndex));
  }

  async function runFactCheck() {
    if (!exploration.trim()) {
      setFactCheckError('Masukkan catatan eksplorasi terlebih dahulu.');
      return;
    }
    setFactCheckLoading(true);
    setFactCheckError(null);
    try {
      const result = FACT_CHECK_MODE === 'dummy'
        ? await mockFactCheck({ text: exploration, issue: selectedIssue, maxClaims: 2 })
        : await callAPI('factCheck', { text: exploration, issue: selectedIssue, maxClaims: 8 });
      if (!Array.isArray(result)) throw new Error('Hasil fact check tidak berbentuk daftar klaim.');
      setClaims(result);
    } catch (error) {
      setFactCheckError(formatApiError(error));
    } finally {
      setFactCheckLoading(false);
    }
  }

  async function addAndCheckClaim() {
    const claim = draftClaim.trim();
    if (!claim) return;
    setDraftClaim('');
    setRecheckingId(`new-${Date.now()}`);
    setFactCheckError(null);
    try {
      const result = FACT_CHECK_MODE === 'dummy'
        ? await mockFactCheck({ claim, issue: selectedIssue, maxClaims: 1 })
        : await callAPI('factCheck', { claim, issue: selectedIssue, maxClaims: 1 });
      if (!Array.isArray(result) || result.length === 0) throw new Error('Klaim tidak menghasilkan hasil pemeriksaan.');
      setClaims((previous) => [...previous, result[0]]);
    } catch (error) {
      setFactCheckError(formatApiError(error));
    } finally {
      setRecheckingId(null);
    }
  }

  async function recheckClaim(claim: ClaimResult) {
    setRecheckingId(claim.id);
    setFactCheckError(null);
    try {
      const result = FACT_CHECK_MODE === 'dummy'
        ? await mockFactCheck({ claim: claim.claim, issue: selectedIssue, maxClaims: 1 })
        : await callAPI('factCheck', { claim: claim.claim, issue: selectedIssue, maxClaims: 1 });
      if (!Array.isArray(result) || result.length === 0) throw new Error('Tidak ada hasil baru untuk klaim tersebut.');
      setClaims((previous) => previous.map((item) => (item.id === claim.id ? result[0] : item)));
    } catch (error) {
      setFactCheckError(formatApiError(error));
    } finally {
      setRecheckingId(null);
    }
  }

  function selectClaimForArgument(claim: ClaimResult) {
    const sourceEvidence = claim.sources.map((source) => [
      `Sumber: ${source.title}`,
      `Ringkasan sumber web: ${source.summary || 'Ringkasan sumber belum tersedia.'}`,
      `URL: ${source.url}`,
    ].join('\n')).join('\n\n');

    setArgument({
      claim: claim.claim,
      reason: '',
      evidence: FACT_CHECK_MODE === 'dummy'
        ? mockEvidenceForClaim(selectedIssue, claim.claim)
        : sourceEvidence,
    });
    setReview('');
    goTo(4);
  }

  async function getReview() {
    setReviewLoading(true);
    try {
      if (ARGUMENT_REVIEW_MODE === 'dummy') {
        await fakeDelay();
        setReview(mockArgumentReview(selectedIssue, argument));
      } else {
        const reply = await callAPI('reviewArgument', {
          issue: selectedIssue,
          position: debatePosition,
          argument,
        });
        setReview(cleanAiText(String(reply || 'AI Reviewer tidak memberikan hasil.')));
      }
    } catch (error) {
      setReview(error instanceof Error ? `AI Reviewer gagal: ${error.message}` : 'AI Reviewer gagal dijalankan.');
    } finally {
      setReviewLoading(false);
    }
  }

  async function sendDebateMessage() {
    const message = debateInput.trim();
    if (!message || debateLoading || sparringRound >= 3) return;

    const history = [...debateLog, { who: 'user' as const, text: message }];
    setDebateLog([...history, { who: 'ai', text: 'mengetik...' }]);
    setDebateInput('');
    setDebateLoading(true);

    try {
      let reply = '';
      if (AI_STAGE_MODE === 'dummy') {
        await fakeDelay();
        reply = mockDebateReply(sparringRound + 1);
      } else {
        reply = cleanAiText(String(await callAPI('debate', {
          msg: message,
          arg: argument,
          issue: selectedIssue,
          position: debatePosition,
          round: sparringRound + 1,
        })));
      }
      setDebateLog([...history, { who: 'ai', text: reply }]);
      setSparringRound((previous) => previous + 1);
    } catch (error) {
      setDebateLog([...history, { who: 'ai', text: error instanceof Error ? `Sparring gagal: ${error.message}` : 'Sparring gagal dijalankan.' }]);
    } finally {
      setDebateLoading(false);
    }
  }

  async function getSolutionEvaluation() {
    if (!solution.trim()) return;
    setEvalLoading(true);
    try {
      if (SOLUTION_EVALUATOR_MODE === 'dummy') {
        await fakeDelay();
        setEvalReply(mockSolutionEvaluation());
      } else {
        const reply = await callAPI('evaluateSolution', {
          solution,
          issue: selectedIssue,
          position: debatePosition,
        });
        setEvalReply(cleanAiText(String(reply || 'AI Evaluator tidak memberikan hasil.')));
      }
    } catch (error) {
      setEvalReply(error instanceof Error ? `AI Evaluator gagal: ${error.message}` : 'AI Evaluator gagal dijalankan.');
    } finally {
      setEvalLoading(false);
    }
  }

  function renderPanel() {
    const stage = STAGES[currentStage].id;

    if (stage === 'home') {
      return (
        <div className="animate-[rise_0.25s_ease]">
          <p className="font-mono text-xs tracking-wider text-[#6C5CE7] uppercase mb-2.5">AI × SDGs Platform · AI RESEARCH MODE</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,42px)] leading-[1.08] tracking-[-0.02em] mb-4">Dari isu global<br />ke solusi nyata.</h1>
          <p className="text-[#70758B] text-[15px] leading-7 max-w-[62ch] mb-8">Eksplorasi isu SDGs, periksa klaim dengan bukti, bangun argumen, uji argumenmu sebelum debat siswa, lalu kembangkan solusi.</p>
          <Btn onClick={() => goTo(1)}>Mulai Eksplorasi</Btn>
        </div>
      );
    }

    if (stage === 'issue-bank') {
      return (
        <div className="animate-[rise_0.25s_ease]">
          <p className="font-mono text-xs tracking-wider text-[#6C5CE7] uppercase mb-2.5">01 — Issue Bank</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,42px)] leading-[1.08] tracking-[-0.02em] mb-4">Pilih satu isu SDGs</h1>
          <p className="text-[#70758B] text-[15px] leading-7 max-w-[62ch] mb-8">Pilih satu mosi dari Bank Mosi. Data mosi dan konteksnya dimuat langsung dari database.</p>

          {issuesLoading && (
            <div className="rounded-[18px] border border-[#E6E7EF] bg-white/80 p-4 text-sm text-[#70758B]">
              Memuat bank mosi dari D1...
            </div>
          )}

          {issuesError && (
            <div className="rounded-[18px] border border-[#F0C9C9] bg-[#FFF7F7] p-4 text-sm text-[#A53E3E]">
              Gagal memuat bank mosi: {issuesError}
            </div>
          )}

          {!issuesLoading && !issuesError && issues.length === 0 && (
            <div className="rounded-[18px] border border-[#E6E7EF] bg-white/80 p-4 text-sm text-[#70758B]">
              Belum ada mosi yang tersedia.
            </div>
          )}

          {!issuesLoading && !issuesError && issues.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-3">
              {issues.map((issue) => (
              <button key={issue.id} type="button" onClick={() => setSelectedIssue(issue)} className={`text-left h-full flex flex-col bg-white/80 border rounded-[20px] p-4 cursor-pointer transition-all duration-200 hover:border-[#6C5CE7]/60 hover:bg-white ${selectedIssue?.id === issue.id ? 'border-[#6C5CE7] bg-[#6C5CE7]/6 shadow-[0_0_0_3px_rgba(45,212,191,0.07)]' : 'border-[#E6E7EF]'}`}>
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#6C5CE7]">{issue.sdg}</div>
                <h3 className="font-display text-[15px] leading-6 my-1.5">{issue.title}</h3>
                <p className="text-[13px] text-[#70758B] m-0 leading-6 flex-grow">{issue.blurb}</p>
                <div className="mt-4 pt-3 border-t border-[#E6E7EF]">
                  <div className="font-mono text-[10px] text-[#C77B12] uppercase tracking-[0.16em] mb-1">Mosi</div>
                  <p className="text-[12px] text-[#303246] m-0 leading-5">{issue.motion}</p>
                </div>
              </button>
              ))}
            </div>
          )}

          <div className="mt-7">
            <div className="font-mono text-[11px] text-[#6C5CE7] uppercase tracking-wider mb-2">Posisi debat (sesuai hasil undian)</div>
            <div className="flex gap-3 flex-wrap">
              <button type="button" onClick={() => setDebatePosition('PRO')} className={`px-5 py-3 rounded-full border font-semibold text-sm transition-all ${debatePosition === 'PRO' ? 'bg-[#6C5CE7] border-[#6C5CE7] text-white' : 'bg-transparent border-[#E6E7EF] text-[#1D2030] hover:border-paper'}`}>PRO</button>
              <button type="button" onClick={() => setDebatePosition('KONTRA')} className={`px-5 py-3 rounded-full border font-semibold text-sm transition-all ${debatePosition === 'KONTRA' ? 'bg-[#F2A93B] border-[#F2A93B] text-white' : 'bg-transparent border-[#E6E7EF] text-[#1D2030] hover:border-paper'}`}>KONTRA</button>
            </div>
            <p className="text-xs text-[#70758B] mt-2">Gunakan posisi yang benar-benar diberikan kepada siswa; platform tidak menentukan pemenang.</p>
          </div>
          <div className="flex gap-3 flex-wrap mt-8">
            <Btn onClick={() => goTo(2)} disabled={!selectedIssue || !debatePosition}>Lanjut ke AI Exploration →</Btn>
          </div>
        </div>
      );
    }

    if (stage === 'ai-exploration') {
      return (
        <div className="animate-[rise_0.25s_ease]">
          <p className="font-mono text-xs tracking-wider text-[#6C5CE7] uppercase mb-2.5">02 — AI Exploration</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,42px)] leading-[1.08] tracking-[-0.02em] mb-4">Eksplorasi isu</h1>
          <p className="text-[#70758B] text-[15px] leading-7 max-w-[72ch] mb-8">Isu: <strong>{selectedIssue?.title || '(belum dipilih)'}</strong><br />Mosi: <strong>{selectedIssue?.motion || '(belum ditentukan)'}</strong><br />Posisi: <strong>{debatePosition || '(belum ditentukan)'}</strong></p>
          <div className="bg-white/90 border border-[#E6E7EF] rounded-[20px] p-5 mb-6 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
            <div className="font-mono text-[11px] text-[#6C5CE7] uppercase mb-1.5">AI · Explorer</div>
            <p className="m-0 text-sm leading-relaxed text-[#1D2030] whitespace-pre-line">{explorerLoading ? 'AI sedang menyiapkan eksplorasi...' : explorerReply}</p>
          </div>
          {explorerSources.length > 0 && (
            <div className="bg-white/90 border border-[#E6E7EF] rounded-[20px] p-5 mb-6">
              <div className="font-mono text-[10px] text-[#6C5CE7] uppercase tracking-[0.16em] mb-2">Sumber web yang digunakan</div>
              <div className="space-y-2">
                {explorerSources.map((source) => (
                  <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="block bg-[#F6F7FB]/70 border border-[#E6E7EF] rounded-[16px] p-4 hover:border-[#6C5CE7]/60 hover:bg-white/80 transition-colors">
                    <div className="font-mono text-[10px] text-[#70758B] uppercase">{source.domain}{source.year ? ` · ${source.year}` : ''}{source.scope ? ` · ${source.scope}` : ''}</div>
                    <div className="text-sm text-[#1D2030] mt-1">{source.title}</div>
                    {source.summary && <div className="text-xs text-[#70758B] mt-1 leading-relaxed">{source.summary}</div>}
                    <div className="text-[11px] text-[#6C5CE7] break-all mt-1">{source.url}</div>
                  </a>
                ))}
              </div>
            </div>
          )}
          <InputField label="Catatan eksplorasimu" isTextarea value={exploration} onChange={(event) => setExploration(event.target.value)} placeholder="Tuliskan apa yang kamu pahami dan apa yang ingin kamu buktikan. Jangan sekadar menyalin jawaban AI." />
          <div className="flex gap-3 flex-wrap mt-8">
            <Btn secondary onClick={() => goTo(1)}>← Kembali</Btn>
            <Btn onClick={() => goTo(3)} disabled={!exploration.trim()}>Lanjut ke Fact Check →</Btn>
          </div>
        </div>
      );
    }

    if (stage === 'fact-check') {
      return (
        <div className="animate-[rise_0.25s_ease]">
          <p className="font-mono text-xs tracking-wider text-[#6C5CE7] uppercase mb-2.5">03 — Fact Check</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,42px)] leading-[1.08] tracking-[-0.02em] mb-4">Periksa klaim dengan bukti</h1>
          <p className="text-[#70758B] text-[15px] leading-7 max-w-[72ch] mb-5">Pada tahap ini siswa menguji klaim sebelum menggunakannya dalam argumen.</p>

          {FACT_CHECK_MODE === 'dummy' && (
            <div className="bg-[#F2A93B]/5 border border-[#F2A93B]/15 rounded-[20px] p-4 mb-6 text-sm leading-6 text-[#1D2030]">
              <strong>MODE SIMULASI:</strong> hasil belum merupakan verifikasi web nyata. Gunakan tahap ini untuk menguji alur klaim → verdict → sumber → Argument Builder.
            </div>
          )}
          {FACT_CHECK_MODE === 'ai-web-search' && (
            <div className="bg-[#6C5CE7]/6 border border-[#6C5CE7]/15 rounded-[20px] p-4 mb-6 text-sm leading-6 text-[#1D2030]">
              <strong>MODE AI + WEB SEARCH:</strong> Gemini menggunakan Google Search untuk mencari bukti web yang relevan dan menampilkan referensi yang digunakan. Tetap buka sumber asli sebelum menjadikannya bukti debat.
            </div>
          )}

          <div className="flex gap-3 flex-wrap mb-6">
            <Btn onClick={runFactCheck} disabled={factCheckLoading || !exploration.trim()}>{factCheckLoading ? 'Memeriksa...' : 'Jalankan Fact Check'}</Btn>
            <Btn secondary onClick={() => setClaims([])} disabled={factCheckLoading || claims.length === 0}>Bersihkan hasil</Btn>
          </div>

          <div className="bg-white/90 border border-[#E6E7EF] rounded-[20px] p-5 mb-6">
            <div className="font-mono text-[11px] text-[#6C5CE7] uppercase mb-2">Tambah klaim spesifik</div>
            <div className="flex gap-3 items-start flex-wrap">
              <textarea value={draftClaim} onChange={(event) => setDraftClaim(event.target.value)} placeholder="Tulis satu klaim yang bisa diperiksa." className="flex-1 min-w-[260px] bg-[#F6F7FB] border border-[#E6E7EF] rounded-[10px] text-[#1D2030] font-body text-sm p-3.5 resize-y min-h-[90px] focus:outline focus:outline-2 focus:outline-[#6C5CE7] focus:outline-offset-2" />
              <Btn secondary onClick={addAndCheckClaim} disabled={!draftClaim.trim() || recheckingId !== null}>Periksa klaim</Btn>
            </div>
          </div>

          {factCheckError && (
            <div className="bg-coral/10 border border-coral/25 text-[#1D2030] rounded-[20px] p-4 mb-5 text-sm leading-6">
              <strong>Fact check belum dapat dilakukan:</strong> {factCheckError}
            </div>
          )}

          {factCheckLoading && (
            <div className="bg-white/90 border border-[#E6E7EF] rounded-[20px] p-4 mb-4"><p className="text-[#70758B] font-mono text-xs m-0">Memeriksa klaim...</p></div>
          )}

          {!factCheckLoading && claims.length === 0 && !factCheckError && (
            <div className="bg-white/40 border border-dashed border-[#E6E7EF] rounded-[20px] p-6 text-[#70758B] text-sm">Belum ada hasil. Jalankan Fact Check untuk memulai.</div>
          )}

          <div className="space-y-3">
            {claims.map((claim) => {
              const meta = verdictMeta[claim.verdict];
              const isRechecking = recheckingId === claim.id;
              return (
                <article key={claim.id} className="bg-white border border-[#E6E7EF] rounded-[18px] p-4">
                  <div className="flex gap-3 items-start justify-between flex-wrap">
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className={`font-mono text-[10px] px-2 py-1 rounded-full whitespace-nowrap uppercase ${meta.color}`}>{meta.label}</span>
                      <span className="font-mono text-[10px] px-2 py-1 rounded-full bg-slate/10 text-[#70758B] uppercase">{claim.type}</span>
                      <span className="font-mono text-[10px] text-[#70758B]">Confidence {claim.confidence}%</span>
                    </div>
                    <Btn secondary onClick={() => recheckClaim(claim)} disabled={isRechecking}>{isRechecking ? 'Memeriksa...' : 'Periksa ulang'}</Btn>
                  </div>
                  <h3 className="font-display text-base mt-3 mb-2">{claim.claim}</h3>
                  <p className="text-sm leading-relaxed text-[#1D2030] m-0">{claim.explanation}</p>
                  {claim.caveat && <div className="bg-[#F2A93B]/10 border border-[#F2A93B]/20 rounded-[10px] p-3 mt-3 text-sm leading-relaxed"><strong>Catatan konteks:</strong> {claim.caveat}</div>}
                  {claim.sources.length > 0 && (
                    <div className="mt-4">
                      <div className="font-mono text-[10px] text-[#6C5CE7] uppercase tracking-[0.16em] mb-2">{FACT_CHECK_MODE === 'dummy' ? 'Referensi simulasi' : 'Sumber web yang digunakan'}</div>
                      <div className="space-y-2">
                        {claim.sources.map((source) => (
                          <a key={`${claim.id}-${source.url}`} href={source.url} target="_blank" rel="noreferrer" className="block bg-[#F6F7FB]/70 border border-[#E6E7EF] rounded-[16px] p-4 hover:border-[#6C5CE7]/60 hover:bg-white/80 transition-colors">
                            <div className="font-mono text-[10px] text-[#70758B] uppercase">{qualityLabel[source.quality]} · {source.domain}{source.year ? ` · ${source.year}` : ''}{source.scope ? ` · ${source.scope}` : ''}</div>
                            <div className="text-sm text-[#1D2030] mt-1">{source.title}</div>
                            {source.summary && <div className="text-xs text-[#70758B] mt-1 leading-relaxed">{source.summary}</div>}
                            <div className="text-[11px] text-[#6C5CE7] break-all mt-1">{source.url}</div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {claim.searchQueries.length > 0 && <div className="mt-3 font-mono text-[10px] text-[#70758B]">Query pencarian: {claim.searchQueries.join(' · ')}</div>}
                </article>
              );
            })}
          </div>

          {claims.length > 0 && (
            <div className="mt-5 bg-white border border-[#E6E7EF] rounded-[18px] p-4">
              <div className="flex gap-4 flex-wrap text-sm">
                <span><strong>{claims.length}</strong> klaim diperiksa</span>
                <span><strong>{verifiedClaims.length}</strong> bisa dipakai</span>
                <span><strong>{blockingClaims.length}</strong> perlu diperbaiki</span>
              </div>
              {FACT_CHECK_MODE === 'dummy' && <p className="text-xs text-[#70758B] mt-3 mb-0">Mode simulasi hanya untuk pengujian alur. Jangan gunakan verdict dummy sebagai bukti debat.</p>}
            </div>
          )}

          <div className="flex gap-3 flex-wrap mt-8">
            <Btn secondary onClick={() => goTo(2)}>← Kembali</Btn>
            <Btn onClick={() => goTo(4)} disabled={!canProceedFactCheck}>Lanjut ke Argument Builder →</Btn>
          </div>
        </div>
      );
    }

    if (stage === 'argument-builder') {
      return (
        <div className="animate-[rise_0.25s_ease]">
          <p className="font-mono text-xs tracking-wider text-[#6C5CE7] uppercase mb-2.5">04 — Argument Builder</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,42px)] leading-[1.08] tracking-[-0.02em] mb-4">Susun argumenmu</h1>
          <p className="text-[#70758B] text-base leading-relaxed max-w-[60ch] mb-6">Gunakan struktur klaim → alasan → bukti.</p>

          {verifiedClaims.length > 0 && (
            <div className="bg-white/90 border border-[#E6E7EF] rounded-[20px] p-5 mb-5">
              <div className="font-mono text-[10px] text-[#6C5CE7] uppercase tracking-[0.16em] mb-2">Klaim yang lolos fact check</div>
              <div className="space-y-2">
                {verifiedClaims.map((claim) => (
                  <button key={claim.id} type="button" onClick={() => selectClaimForArgument(claim)} className="block text-left w-full bg-[#F6F7FB] border border-[#E6E7EF] rounded-[10px] p-3 text-sm hover:border-[#6C5CE7]">
                    <span className="text-[#1D2030]">{claim.claim}</span>
                    <span className="block text-[11px] text-[#70758B] mt-1">{claim.sources.length} sumber referensi</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <InputField label="Klaim" value={argument.claim} onChange={(event) => setArgument({ ...argument, claim: event.target.value })} placeholder="Apa yang kamu nyatakan?" />
          <InputField label="Alasan" value={argument.reason} onChange={(event) => setArgument({ ...argument, reason: event.target.value })} placeholder="Mengapa klaim itu penting/masuk akal?" />
          <InputField label="Bukti" isTextarea value={argument.evidence} onChange={(event) => setArgument({ ...argument, evidence: event.target.value })} placeholder="Masukkan temuan spesifik dari sumber, lalu sertakan URL sumber." />

          <div className="flex gap-3 flex-wrap mt-7 mb-5"><Btn secondary onClick={getReview} disabled={!canReviewArgument || reviewLoading}>{reviewLoading ? 'Mereview...' : 'Minta review AI'}</Btn></div>

          {!canReviewArgument && <p className="text-xs text-[#70758B] mt-2">Lengkapi klaim, alasan, dan bukti sebelum meminta review.</p>}
          {review && !reviewLoading && (
            <div className="bg-white/90 border border-[#E6E7EF] rounded-[20px] p-5 mt-5">
              <div className="font-mono text-[11px] text-[#6C5CE7] uppercase mb-1.5">AI · Reviewer {ARGUMENT_REVIEW_MODE === 'api' ? '· API' : '· Simulasi'}</div>
              <p className="m-0 text-sm leading-relaxed text-[#1D2030] whitespace-pre-wrap">{review}</p>
            </div>
          )}

          <div className="flex gap-3 flex-wrap mt-8">
            <Btn secondary onClick={() => goTo(3)}>← Kembali</Btn>
            <Btn onClick={() => goTo(5)} disabled={!canProceedToDebate}>Lanjut ke Uji Argumen →</Btn>
          </div>
        </div>
      );
    }

    if (stage === 'debate') {
      return (
        <div className="animate-[rise_0.25s_ease]">
          <p className="font-mono text-xs tracking-wider text-[#6C5CE7] uppercase mb-2.5">05 — Debate Preparation</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,42px)] leading-[1.08] tracking-[-0.02em] mb-4">Uji argumenmu</h1>
          <p className="text-[#70758B] text-[15px] leading-7 max-w-[70ch] mb-6">AI di sini hanya sebagai sparring partner sebelum debat. Debat resmi tetap dilakukan siswa PRO dan KONTRA.</p>

          <div className="flex items-center gap-2 mb-4">
            <span className="font-mono text-[10px] text-[#6C5CE7] uppercase tracking-[0.16em]">Sparring {sparringRound}/3</span>
            {sparringRound >= 3 && <span className="font-mono text-[10px] px-2 py-1 rounded-full bg-[#6C5CE7]/12 text-[#6C5CE7] uppercase">Selesai</span>}
          </div>

          <div className="flex flex-col gap-2.5 mt-4">
            {debateLog.map((message, index) => (
              <div key={index} className={`max-w-[82%] px-4 py-3 rounded-[20px] text-sm leading-6 break-words ${message.who === 'ai' ? 'bg-white/90 border border-[#E6E7EF] self-start rounded-bl-md' : 'bg-[#6C5CE7] text-white self-end rounded-br-md'}`}>
                {message.text === 'mengetik...' ? <span className="text-[#70758B] font-mono text-xs">mengetik...</span> : message.text}
              </div>
            ))}
          </div>

          {sparringRound < 3 && (
            <div className="flex gap-3 items-center mt-7 flex-wrap">
              <input type="text" value={debateInput} onChange={(event) => setDebateInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && sendDebateMessage()} placeholder="Tulis responsmu..." className="flex-1 min-w-[200px] bg-white/90 border border-[#E6E7EF] rounded-[16px] text-[#1D2030] font-body text-sm px-4 py-3.5 focus:outline focus:outline-2 focus:outline-[#6C5CE7] focus:outline-offset-2 focus:border-[#6C5CE7]/50 placeholder:text-[#9A9DAF]" />
              <Btn onClick={sendDebateMessage} disabled={!debateInput.trim() || debateLoading}>{debateLoading ? 'Menilai...' : 'Kirim'}</Btn>
            </div>
          )}

          <div className="bg-white/80 border border-[#E6E7EF] rounded-[16px] px-4 py-3 mt-6 text-xs text-[#70758B] leading-relaxed">Batas sparring adalah 3 ronde agar AI tidak terus-menerus menantang tanpa akhir.</div>

          <div className="flex gap-3 flex-wrap mt-8">
            <Btn secondary onClick={() => goTo(4)}>← Kembali</Btn>
            <Btn onClick={() => goTo(6)} disabled={!canProceedToSolution}>Lanjut ke Solution Lab →</Btn>
          </div>
        </div>
      );
    }

    if (stage === 'solution-lab') {
      return (
        <div className="animate-[rise_0.25s_ease]">
          <p className="font-mono text-xs tracking-wider text-[#6C5CE7] uppercase mb-2.5">06 — Solution Lab</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,42px)] leading-[1.08] tracking-[-0.02em] mb-4">Rancang solusimu</h1>
          <InputField label="Rancangan solusi" isTextarea value={solution} onChange={(event) => setSolution(event.target.value)} placeholder="Jelaskan solusi konkretmu, siapa yang terlibat, dan bagaimana mengukur keberhasilannya." />
          <div className="flex gap-3 flex-wrap mt-7 mb-5"><Btn secondary onClick={getSolutionEvaluation} disabled={!solution.trim() || evalLoading}>{evalLoading ? 'Mengevaluasi...' : 'Evaluasi kelayakan'}</Btn></div>
          {evalReply && !evalLoading && (
            <div className="bg-white/90 border border-[#E6E7EF] rounded-[20px] p-5 mt-5">
              <div className="font-mono text-[11px] text-[#6C5CE7] uppercase mb-1.5">AI · Evaluator {SOLUTION_EVALUATOR_MODE === 'api' ? '· API' : '· Simulasi'}</div>
              <p className="m-0 text-sm leading-relaxed text-[#1D2030] whitespace-pre-wrap">{evalReply}</p>
            </div>
          )}
          <div className="flex gap-3 flex-wrap mt-8">
            <Btn secondary onClick={() => goTo(5)}>← Kembali</Btn>
            <Btn onClick={() => goTo(7)} disabled={!canProceedToImpact}>Lihat Impact →</Btn>
          </div>
        </div>
      );
    }

    return (
      <div className="animate-[rise_0.25s_ease]">
        <p className="font-mono text-xs tracking-wider text-[#6C5CE7] uppercase mb-2.5">07 — Impact</p>
        <h1 className="font-display font-semibold text-[clamp(28px,4vw,42px)] leading-[1.08] tracking-[-0.02em] mb-4">Perjalananmu</h1>
        <p className="text-[#70758B] text-base leading-relaxed max-w-[65ch] mb-7">Ringkasan akhir perjalananmu dari isu, klaim, argumen, uji argumen, sampai solusi.</p>

        <div className="space-y-3">
          <div role="status">
            {debateRun.status}

            {debateRun.status.startsWith('Gagal') && (
              <button
                type="button"
                onClick={debateRun.retry}
              >
                {' '}· Coba simpan lagi
              </button>
            )}
          </div>
          <SummaryCard label="Isu" value={`${selectedIssue?.title || '-'}${debatePosition ? ` — Posisi ${debatePosition}` : ''}`} />
          <SummaryCard label="Klaim" value={argument.claim || '-'} />
          <SummaryCard label="Alasan" value={argument.reason || '-'} />
          <SummaryCard label="Bukti" value={argument.evidence || '-'} />
          <SummaryCard label="Solusi" value={solution || '-'} />
          <SummaryCard label="Evaluasi Solusi" value={evalReply || '-'} />
        </div>

        <div className="bg-white border border-[#E6E7EF] rounded-[18px] p-4 mt-5 text-sm text-[#1D2030]">
          <strong>Catatan:</strong> debat resmi tetap dilakukan antara siswa PRO dan KONTRA. Sparring AI pada tahap 05 hanya membantu menguji argumen sebelum debat.
        </div>

        <div className="flex gap-3 flex-wrap mt-8">
          <Btn secondary onClick={() => goTo(6)}>← Kembali</Btn>
          <Btn
            secondary
            onClick={() => {
              const confirmed = window.confirm(
                'Mulai sesi baru? Pastikan Impact sudah tersimpan.',
              );

              if (confirmed) {
                window.location.reload();
              }
            }}
          >
            Mulai sesi baru
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7FB] text-[#1D2030]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-24 h-80 w-80 rounded-full bg-[#6C5CE7]/8 blur-3xl" />
        <div className="absolute bottom-0 -left-24 h-72 w-72 rounded-full bg-[#F2A93B]/8 blur-3xl" />
      </div>

      <aside className="fixed left-0 top-0 bottom-0 z-50 w-[232px] border-r border-[#E6E7EF] bg-white/92 backdrop-blur-xl px-5 py-6 shadow-[8px_0_30px_rgba(30,32,48,0.04)] max-lg:w-[205px] max-md:left-3 max-md:right-3 max-md:bottom-3 max-md:top-auto max-md:w-auto max-md:h-[74px] max-md:px-3 max-md:py-0 max-md:border max-md:rounded-[20px] max-md:shadow-[0_16px_36px_rgba(30,32,48,0.12)]">
        <div className="flex h-full flex-col max-md:flex-row max-md:items-center max-md:gap-2">
          <div className="mb-7 flex items-center gap-3 max-md:mb-0 max-md:mr-2 max-md:shrink-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#6C5CE7] text-white shadow-[0_10px_24px_rgba(108,92,231,0.20)]">
              <span className="font-display text-base font-bold">AI</span>
            </div>
            <div className="min-w-0 max-md:hidden">
              <div className="font-display text-sm font-semibold tracking-[-0.01em]">AI × SDGs</div>
              <div className="mt-0.5 text-[11px] text-[#8A8EA2]">AI + Web Search Mode</div>
            </div>
          </div>

          <div className="mb-6 rounded-[18px] bg-[#F7F5FF] px-4 py-3.5 max-md:hidden">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6C5CE7]">AI + Web Search</span>
              <span className="h-2 w-2 rounded-full bg-[#6C5CE7] shadow-[0_0_0_4px_rgba(108,92,231,0.10)]" />
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[#73778D]">Gemini dapat mencari sumber web langsung saat tahap penelitian dan fact-check.</p>
          </div>

          <div className="hidden border-t border-[#E6E7EF] pt-4 max-md:flex max-md:flex-1 max-md:gap-1 max-md:overflow-x-auto max-md:border-t-0 max-md:pt-0">
            {STAGES.map((stage, index) => {
              const isActive = index === currentStage;
              const isDone = index < furthestStage;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => goTo(index)}
                  className={`flex h-10 min-w-10 shrink-0 items-center justify-center rounded-[14px] border px-3 font-mono text-[10px] font-semibold transition-all ${isActive ? 'border-[#6C5CE7] bg-[#6C5CE7] text-white shadow-[0_8px_18px_rgba(108,92,231,0.20)]' : isDone ? 'border-[#F2A93B]/60 bg-[#FFF8EC] text-[#B97819]' : 'border-[#E6E7EF] bg-white text-[#7B7F93]'}`}
                  aria-label={stage.label}
                >
                  {stage.short}
                </button>
              );
            })}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1 max-md:hidden">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8A8EA2]">Perjalanan</span>
              <span className="text-[10px] font-semibold text-[#6C5CE7]">{Math.round((furthestStage / (STAGES.length - 1 || 1)) * 100)}%</span>
            </div>
            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[#EEF0F5]">
              <div className="h-full rounded-full bg-[#6C5CE7] transition-all duration-300" style={{ width: `${(furthestStage / (STAGES.length - 1 || 1)) * 100}%` }} />
            </div>
            <div className="space-y-1.5">
              {STAGES.map((stage, index) => {
                const isActive = index === currentStage;
                const isDone = index < furthestStage;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => goTo(index)}
                    className={`group flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-all ${isActive ? 'bg-[#F1EEFF] text-[#5B4CCF]' : 'text-[#70758B] hover:bg-[#F8F8FC] hover:text-[#303246]'}`}
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] border font-mono text-[9px] font-semibold ${isActive ? 'border-[#6C5CE7] bg-[#6C5CE7] text-white' : isDone ? 'border-[#F2A93B]/50 bg-[#FFF8EC] text-[#B97819]' : 'border-[#E6E7EF] bg-white text-[#8A8EA2]'}`}>
                      {stage.short}
                    </span>
                    <span className="truncate text-xs font-medium">{stage.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-auto max-md:hidden">
            <div className="border-t border-[#E6E7EF] pt-4 text-[10px] leading-5 text-[#9A9DAF]">
              Tetap pada mosi yang dipilih. AI digunakan sebagai alat riset dan penguji argumen.
            </div>
          </div>
        </div>
      </aside>

      <main className="relative min-h-screen pl-[232px] max-lg:pl-[205px] max-md:pl-0 max-md:pb-[104px]">
        <div className="mx-auto w-full max-w-[1120px] px-9 py-8 max-lg:px-7 max-md:px-4 max-md:pt-5">
          <header className="mb-8 flex items-center justify-between gap-4 rounded-[22px] border border-[#E6E7EF] bg-white/85 px-5 py-4 shadow-[0_10px_28px_rgba(30,32,48,0.04)] backdrop-blur max-md:mb-5 max-md:px-4 max-md:py-3.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-semibold tracking-[-0.01em]">AI × SDGs Platform</span>
                <span className="hidden h-1 w-1 rounded-full bg-[#C7C9D4] sm:block" />
                <span className="hidden text-[11px] font-medium text-[#8A8EA2] sm:block">AI Mode</span>
              </div>
              <div className="mt-1 truncate text-[11px] text-[#8A8EA2]">
                {selectedIssue ? selectedIssue.title : 'Eksplorasi isu dan bukti berbasis web'}
                {debatePosition ? ` · ${debatePosition}` : ''}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden rounded-full border border-[#E6E7EF] bg-[#FAFAFC] px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[#777B90] sm:block">Gemini AI</div>
              <div className="rounded-full bg-[#6C5CE7] px-3.5 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_6px_14px_rgba(108,92,231,0.18)]">Tahap {String(currentStage).padStart(2,'0')}</div>
            </div>
          </header>

          {renderPanel()}
        </div>
      </main>
    </div>
  );

}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#E6E7EF] rounded-[20px] p-4 bg-white/90">
      <div className="font-mono text-[10px] text-[#6C5CE7] uppercase tracking-[0.16em] mb-2">{label}</div>
      <div className="text-[13px] leading-6 whitespace-pre-wrap break-words text-[#303246]">{value}</div>
    </div>
  );
}

function Btn({ children, onClick, secondary, disabled }: { children: ReactNode; onClick?: () => void; secondary?: boolean; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`font-body font-semibold text-sm px-5 py-2.5 rounded-[16px] transition-all whitespace-nowrap ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-px'} ${secondary ? 'bg-white text-[#3A3D4E] border border-[#E6E7EF] hover:border-[#B8BAC8] hover:bg-[#FAFAFC]' : 'bg-[#6C5CE7] text-white hover:bg-[#5F50D8] shadow-[0_8px_22px_rgba(108,92,231,0.16)]'}`}>
      {children}
    </button>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  isTextarea,
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  isTextarea?: boolean;
}) {
  return (
    <div className="mb-4 w-full">
      <label className="font-mono text-[10px] text-[#70758B] uppercase tracking-[0.16em] block mb-2 mt-6">{label}</label>
      {isTextarea ? (
        <textarea value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-white/90 border border-[#E6E7EF] rounded-[16px] text-[#1D2030] font-body text-sm px-4 py-3.5 resize-y min-h-[104px] transition-colors focus:outline focus:outline-2 focus:outline-[#6C5CE7] focus:outline-offset-2 focus:border-[#6C5CE7]/50 placeholder:text-[#9A9DAF]" />
      ) : (
        <input type="text" value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-white/90 border border-[#E6E7EF] rounded-[16px] text-[#1D2030] font-body text-sm px-4 py-3 min-h-[50px] transition-colors focus:outline focus:outline-2 focus:outline-[#6C5CE7] focus:outline-offset-2 focus:border-[#6C5CE7]/50 placeholder:text-[#9A9DAF]" />
      )}
    </div>
  );
}