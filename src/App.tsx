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

const FACT_CHECK_MODE = String((import.meta as any).env?.VITE_FACT_CHECK_MODE || 'dummy') === 'source-pack'
  ? 'source-pack'
  : 'dummy';

const SAMPLE_ISSUES: Issue[] = [
  {
    id: 1,
    sdg: 'SDG 6',
    title: 'Krisis Air Bersih di Wilayah Perkotaan Padat',
    blurb: 'Akses air bersih tidak merata di permukiman padat penduduk.',
    sources: [
      {
        title: 'WHO — Drinking-water',
        url: 'https://www.who.int/news-room/fact-sheets/detail/drinking-water',
        domain: 'who.int',
        quality: 'tinggi',
        scope: 'Global',
        summary: 'Referensi resmi WHO mengenai air minum, layanan air, kualitas, dan akses.',
      },
      {
        title: 'WHO/UNICEF Joint Monitoring Programme (JMP)',
        url: 'https://washdata.org/',
        domain: 'washdata.org',
        quality: 'tinggi',
        scope: 'Global',
        summary: 'Portal data dan laporan resmi mengenai layanan air, sanitasi, dan higiene.',
      },
    ],
  },
  {
    id: 2,
    sdg: 'SDG 13',
    title: 'Kenaikan Suhu & Banjir Rob Pesisir',
    blurb: 'Perubahan iklim mempercepat risiko pesisir dan banjir di kota pesisir.',
    sources: [
      {
        title: 'IPCC — AR6 Synthesis Report',
        url: 'https://www.ipcc.ch/report/ar6/syr/',
        domain: 'ipcc.ch',
        quality: 'tinggi',
        scope: 'Global',
        summary: 'Laporan sintesis IPCC mengenai perubahan iklim, risiko, dampak, dan respons.',
      },
      {
        title: 'NOAA — Climate',
        url: 'https://www.noaa.gov/climate',
        domain: 'noaa.gov',
        quality: 'tinggi',
        scope: 'Global',
        summary: 'Sumber resmi NOAA mengenai iklim dan kondisi pesisir.',
      },
    ],
  },
  {
    id: 3,
    sdg: 'SDG 4',
    title: 'Kesenjangan Akses Pendidikan Digital',
    blurb: 'Tidak semua siswa punya akses perangkat dan internet yang setara.',
    sources: [
      {
        title: 'UNESCO — Technology in education',
        url: 'https://www.unesco.org/gem-report/en/technology',
        domain: 'unesco.org',
        quality: 'tinggi',
        scope: 'Global',
        summary: 'Sumber UNESCO mengenai teknologi dalam pendidikan dan isu pemerataan akses.',
      },
      {
        title: 'UNICEF — Digital Learning',
        url: 'https://www.unicef.org/education/digital-learning',
        domain: 'unicef.org',
        quality: 'tinggi',
        scope: 'Global',
        summary: 'Sumber UNICEF mengenai pembelajaran digital dan tantangan akses.',
      },
    ],
  },
  {
    id: 4,
    sdg: 'SDG 12',
    title: 'Sampah Plastik Sekali Pakai di Sekolah',
    blurb: 'Konsumsi plastik sekali pakai tinggi di lingkungan sekolah.',
    sources: [
      {
        title: 'UNEP — Plastic Pollution',
        url: 'https://www.unep.org/plastic-pollution',
        domain: 'unep.org',
        quality: 'tinggi',
        scope: 'Global',
        summary: 'Sumber UNEP mengenai polusi plastik dan respons pengurangan sampah plastik.',
      },
      {
        title: 'UNEP — Beat Plastic Pollution',
        url: 'https://www.unep.org/interactives/beat-plastic-pollution/',
        domain: 'unep.org',
        quality: 'tinggi',
        scope: 'Global',
        summary: 'Materi UNEP mengenai pengurangan penggunaan plastik dan dampaknya.',
      },
    ],
  },
];

const verdictMeta: Record<ClaimResult['verdict'], { label: string; color: string }> = {
  verified: { label: 'Terverifikasi', color: 'bg-teal/20 text-teal' },
  mostly_true: { label: 'Sebagian besar benar', color: 'bg-teal/20 text-teal' },
  misleading: { label: 'Menyesatkan', color: 'bg-amber/20 text-amber' },
  false: { label: 'Bertentangan', color: 'bg-coral/20 text-coral' },
  unverifiable: { label: 'Belum terverifikasi', color: 'bg-amber/20 text-amber' },
  not_fact: { label: 'Bukan klaim fakta', color: 'bg-slate/20 text-slate' },
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
      'Masyarakat berpenghasilan rendah di permukiman padat perkotaan cenderung menghadapi akses air bersih yang lebih rendah dibandingkan masyarakat perkotaan lainnya.',
      'Ketimpangan akses air di kawasan perkotaan tidak hanya dipengaruhi oleh ketersediaan air, tetapi juga oleh infrastruktur dan kondisi sosial ekonomi masyarakat.',
    ],
    explanation: 'Simulasi menunjukkan bahwa inti klaim relevan dengan referensi umum mengenai layanan air. Dalam penelitian nyata, istilah akses air harus didefinisikan dan bukti harus dicek pada sumber spesifik.',
    caveat: 'Ini adalah hasil DUMMY. Sistem belum melakukan pemeriksaan web atau validasi bukti secara langsung.',
    queries: ['simulasi: ketimpangan akses air bersih perkotaan', 'simulasi: low income informal settlements drinking water access'],
  },
  2: {
    claims: [
      'Perubahan iklim dapat meningkatkan risiko banjir pesisir melalui kenaikan muka laut dan perubahan pola kejadian ekstrem.',
      'Wilayah pesisir yang padat penduduk dapat menghadapi risiko banjir yang lebih besar ketika paparan penduduk dan infrastruktur tinggi.',
    ],
    explanation: 'Simulasi menganggap klaim relevan dengan literatur perubahan iklim, tetapi bukti spesifik tetap perlu dilihat pada wilayah yang dikaji.',
    caveat: 'Ini adalah hasil DUMMY. Sistem belum melakukan pemeriksaan web atau validasi bukti secara langsung.',
    queries: ['simulasi: climate change coastal flooding sea level rise', 'simulasi: coastal flood risk urban areas'],
  },
  3: {
    claims: [
      'Siswa yang memiliki akses internet dan perangkat digital yang lebih baik memiliki kesempatan belajar yang lebih besar dibandingkan siswa yang akses digitalnya terbatas.',
      'Kesenjangan akses perangkat dan koneksi internet dapat menjadi salah satu hambatan dalam penerapan pembelajaran digital secara merata.',
    ],
    explanation: 'Simulasi menganggap akses perangkat dan konektivitas relevan untuk pembelajaran digital. Akses teknologi bukan satu-satunya faktor yang menentukan hasil belajar.',
    caveat: 'Ini adalah hasil DUMMY. Sistem belum melakukan pemeriksaan web atau validasi bukti secara langsung.',
    queries: ['simulasi: digital divide students internet devices education', 'simulasi: access to technology digital learning students'],
  },
  4: {
    claims: [
      'Penggunaan plastik sekali pakai yang tinggi di lingkungan sekolah dapat meningkatkan jumlah sampah plastik yang perlu dikelola.',
      'Upaya mengurangi plastik sekali pakai di sekolah dapat melibatkan perubahan kebiasaan, penyediaan alternatif guna ulang, dan pengelolaan sampah yang lebih baik.',
    ],
    explanation: 'Simulasi menganggap klaim relevan dengan isu pengurangan sampah plastik, tetapi dampak spesifik perlu dibuktikan pada sekolah atau wilayah tertentu.',
    caveat: 'Ini adalah hasil DUMMY. Sistem belum melakukan pemeriksaan web atau validasi bukti secara langsung.',
    queries: ['simulasi: single use plastic waste schools', 'simulasi: reducing plastic waste school environment'],
  },
};

function makeMockSourcePack(issue: Issue): Source[] {
  return issue.sources.map((source) => ({ ...source }));
}

async function mockFactCheck(payload: { claim?: string; text?: string; issue?: Issue | null; maxClaims?: number }): Promise<ClaimResult[]> {
  await fakeDelay();
  const issueId = payload.issue?.id || 1;
  const profile = MOCK_FACT_CHECK_PROFILES[issueId] || MOCK_FACT_CHECK_PROFILES[1];
  const input = (payload.claim || payload.text || '').trim();
  const requestedClaims = payload.claim
    ? [payload.claim.trim()]
    : profile.claims.slice(0, Math.min(Number(payload.maxClaims || 2), 2));
  const sources = makeMockSourcePack(payload.issue || SAMPLE_ISSUES[0]);

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
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [debatePosition, setDebatePosition] = useState<'PRO' | 'KONTRA' | ''>('');

  const [exploration, setExploration] = useState('');
  const [explorerReply, setExplorerReply] = useState('');
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [explorerIssueId, setExplorerIssueId] = useState<number | null>(null);

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

  const verifiedClaims = useMemo(
    () => claims.filter((claim) => ['verified', 'mostly_true'].includes(claim.verdict)),
    [claims],
  );

  const blockingClaims = useMemo(
    () => claims.filter((claim) => !['verified', 'mostly_true', 'not_fact'].includes(claim.verdict)),
    [claims],
  );

  const canProceedFactCheck = claims.length > 0 && blockingClaims.length === 0 && verifiedClaims.length > 0;
  const canReviewArgument = Boolean(argument.claim.trim() && argument.reason.trim() && argument.evidence.trim());
  const canProceedToDebate = canReviewArgument && Boolean(review.trim()) && !reviewLoading;
  const canProceedToSolution = sparringRound >= 1;
  const canProceedToImpact = Boolean(solution.trim() && evalReply.trim()) && !evalLoading;

  useEffect(() => {
    if (!selectedIssue) return;
    setExploration('');
    setExplorerReply('');
    setExplorerIssueId(null);
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
      const fallback = `Eksplorasi awal untuk ${selectedIssue.title}: pahami konteks isu, pihak yang terdampak, faktor yang mungkin terkait, sudut pandang yang berbeda, dan bukti apa yang perlu diperiksa sebelum digunakan dalam debat.`;
      try {
        const result = await callAPI('explore', { ...selectedIssue, position: debatePosition }, fallback);
        if (!cancelled) {
          setExplorerReply(cleanAiText(String(result || fallback)));
          setExplorerIssueId(selectedIssue.id);
        }
      } catch (error) {
        if (!cancelled) setExplorerReply(fallback);
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

  async function callAPI(action: string, payload: unknown, fallbackData?: unknown) {
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data?.error || `API gagal (${response.status})`) as ApiError;
        error.code = data?.code;
        throw error;
      }
      if (data?.result === undefined) throw new Error('Respons API tidak memiliki field result.');
      return data.result;
    } catch (error) {
      if (action === 'factCheck') throw error;
      await fakeDelay();
      return fallbackData;
    }
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
    setArgument({
      claim: claim.claim,
      reason: '',
      evidence: claim.sources.map((source) => `${source.title} — ${source.url}`).join('\n'),
    });
    setReview('');
    goTo(4);
  }

  async function getReview() {
    setReviewLoading(true);
    const fallback = 'Perjelas hubungan antara klaim, alasan, dan bukti. Gunakan sumber yang spesifik dan jelaskan temuan apa dari sumber tersebut yang benar-benar mendukung klaim.';
    try {
      const reply = await callAPI('reviewArgument', argument, fallback);
      setReview(cleanAiText(String(reply || fallback)));
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

    const fallback = 'Coba tunjukkan bagian bukti yang paling langsung mendukung klaimmu dan jelaskan batasan bukti tersebut.';
    try {
      const reply = await callAPI('debate', { msg: message, arg: argument, round: sparringRound + 1 }, fallback);
      setDebateLog([...history, { who: 'ai', text: cleanAiText(String(reply || fallback)) }]);
      setSparringRound((previous) => previous + 1);
    } finally {
      setDebateLoading(false);
    }
  }

  async function getSolutionEvaluation() {
    if (!solution.trim()) return;
    setEvalLoading(true);
    const fallback = '1. Kesesuaian masalah: solusi menjawab isu yang dipilih.\n2. Kelayakan: pihak pelaksana dan kebutuhan sumber daya perlu dipastikan.\n3. Pihak terlibat: pemerintah, penyedia layanan, dan masyarakat.\n4. Indikator: tetapkan hasil yang dapat diukur.\n5. Risiko: perhatikan biaya, koordinasi, dan keberlanjutan.\nKesimpulan: solusi dapat diperbaiki dengan indikator yang lebih spesifik.';
    try {
      const reply = await callAPI('evaluateSolution', { solution }, fallback);
      const cleaned = cleanAiText(String(reply || fallback));
      setEvalReply(cleaned);
    } finally {
      setEvalLoading(false);
    }
  }

  function renderPanel() {
    const stage = STAGES[currentStage].id;

    if (stage === 'home') {
      return (
        <div className="animate-[rise_0.35s_ease]">
          <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">AI × SDGs Platform</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Dari isu global<br />ke solusi nyata.</h1>
          <p className="text-slate text-base leading-relaxed max-w-[60ch] mb-8">Eksplorasi isu SDGs, periksa klaim dengan bukti, bangun argumen, uji argumenmu sebelum debat siswa, lalu kembangkan solusi.</p>
          <Btn onClick={() => goTo(1)}>Mulai Eksplorasi</Btn>
        </div>
      );
    }

    if (stage === 'issue-bank') {
      return (
        <div className="animate-[rise_0.35s_ease]">
          <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">01 — Issue Bank</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Pilih satu isu SDGs</h1>
          <p className="text-slate text-base leading-relaxed max-w-[60ch] mb-8">Pilih satu dari 4 isu demo. Isu yang dipilih menjadi konteks seluruh perjalanan.</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {SAMPLE_ISSUES.map((issue) => (
              <button key={issue.id} type="button" onClick={() => setSelectedIssue(issue)} className={`text-left h-full flex flex-col bg-ink-2 border rounded-[14px] p-[18px] cursor-pointer transition-all hover:-translate-y-0.5 hover:border-teal ${selectedIssue?.id === issue.id ? 'border-amber bg-amber/10' : 'border-line'}`}>
                <div className="font-mono text-[11px] text-teal">{issue.sdg}</div>
                <h3 className="font-display text-base my-1.5">{issue.title}</h3>
                <p className="text-[13px] text-slate m-0 leading-relaxed flex-grow">{issue.blurb}</p>
              </button>
            ))}
          </div>
          <div className="mt-7">
            <div className="font-mono text-[11px] text-teal uppercase tracking-wider mb-2">Posisi debat (sesuai hasil undian)</div>
            <div className="flex gap-3 flex-wrap">
              <button type="button" onClick={() => setDebatePosition('PRO')} className={`px-5 py-3 rounded-full border font-semibold text-sm transition-all ${debatePosition === 'PRO' ? 'bg-teal border-teal text-ink' : 'bg-transparent border-line text-paper hover:border-paper'}`}>PRO</button>
              <button type="button" onClick={() => setDebatePosition('KONTRA')} className={`px-5 py-3 rounded-full border font-semibold text-sm transition-all ${debatePosition === 'KONTRA' ? 'bg-amber border-amber text-ink' : 'bg-transparent border-line text-paper hover:border-paper'}`}>KONTRA</button>
            </div>
            <p className="text-xs text-slate mt-2">Gunakan posisi yang benar-benar diberikan kepada siswa; platform tidak menentukan pemenang.</p>
          </div>
          <div className="flex gap-3 flex-wrap mt-7">
            <Btn onClick={() => goTo(2)} disabled={!selectedIssue || !debatePosition}>Lanjut ke AI Exploration →</Btn>
          </div>
        </div>
      );
    }

    if (stage === 'ai-exploration') {
      return (
        <div className="animate-[rise_0.35s_ease]">
          <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">02 — AI Exploration</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Eksplorasi isu</h1>
          <p className="text-slate text-base leading-relaxed max-w-[60ch] mb-8">Isu: <strong>{selectedIssue?.title || '(belum dipilih)'}</strong><br />Posisi: <strong>{debatePosition || '(belum ditentukan)'}</strong></p>
          <div className="bg-ink-2 border border-line border-l-[3px] border-l-teal rounded-r-[14px] p-4 mb-6">
            <div className="font-mono text-[11px] text-teal uppercase mb-1.5">AI · Explorer</div>
            <p className="m-0 text-sm leading-relaxed text-paper whitespace-pre-line">{explorerLoading ? 'AI sedang menyiapkan eksplorasi...' : explorerReply}</p>
          </div>
          <InputField label="Catatan eksplorasimu" isTextarea value={exploration} onChange={(event) => setExploration(event.target.value)} placeholder="Tuliskan apa yang kamu pahami dan apa yang ingin kamu buktikan. Jangan sekadar menyalin jawaban AI." />
          <div className="flex gap-3 flex-wrap mt-7">
            <Btn secondary onClick={() => goTo(1)}>← Kembali</Btn>
            <Btn onClick={() => goTo(3)} disabled={!exploration.trim()}>Lanjut ke Fact Check →</Btn>
          </div>
        </div>
      );
    }

    if (stage === 'fact-check') {
      return (
        <div className="animate-[rise_0.35s_ease]">
          <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">03 — Fact Check</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Periksa klaim dengan bukti</h1>
          <p className="text-slate text-base leading-relaxed max-w-[70ch] mb-4">Pada tahap ini siswa menguji klaim sebelum menggunakannya dalam argumen.</p>

          {FACT_CHECK_MODE === 'dummy' && (
            <div className="bg-amber/10 border border-amber/20 rounded-[12px] p-3 mb-6 text-sm leading-relaxed text-paper">
              <strong>MODE SIMULASI:</strong> hasil belum merupakan verifikasi web nyata. Gunakan tahap ini untuk menguji alur klaim → verdict → sumber → Argument Builder.
            </div>
          )}
          {FACT_CHECK_MODE === 'source-pack' && (
            <div className="bg-teal/10 border border-teal/20 rounded-[12px] p-3 mb-6 text-sm leading-relaxed text-paper">
              <strong>MODE SOURCE PACK:</strong> AI menilai klaim terhadap sumber yang disiapkan untuk mosi, bukan melakukan web search otomatis.
            </div>
          )}

          <div className="flex gap-3 flex-wrap mb-5">
            <Btn onClick={runFactCheck} disabled={factCheckLoading || !exploration.trim()}>{factCheckLoading ? 'Memeriksa...' : 'Jalankan Fact Check'}</Btn>
            <Btn secondary onClick={() => setClaims([])} disabled={factCheckLoading || claims.length === 0}>Bersihkan hasil</Btn>
          </div>

          <div className="bg-ink-2 border border-line rounded-[14px] p-4 mb-6">
            <div className="font-mono text-[11px] text-teal uppercase mb-2">Tambah klaim spesifik</div>
            <div className="flex gap-3 items-start flex-wrap">
              <textarea value={draftClaim} onChange={(event) => setDraftClaim(event.target.value)} placeholder="Tulis satu klaim yang bisa diperiksa." className="flex-1 min-w-[260px] bg-ink border border-line rounded-[10px] text-paper font-body text-sm p-3.5 resize-y min-h-[90px] focus:outline focus:outline-2 focus:outline-teal focus:outline-offset-2" />
              <Btn secondary onClick={addAndCheckClaim} disabled={!draftClaim.trim() || recheckingId !== null}>Periksa klaim</Btn>
            </div>
          </div>

          {factCheckError && (
            <div className="bg-coral/10 border border-coral/30 text-paper rounded-[12px] p-4 mb-5 text-sm leading-relaxed">
              <strong>Fact check belum dapat dilakukan:</strong> {factCheckError}
            </div>
          )}

          {factCheckLoading && (
            <div className="bg-ink-2 border border-line rounded-[14px] p-4 mb-4"><p className="text-slate font-mono text-xs m-0">Memeriksa klaim...</p></div>
          )}

          {!factCheckLoading && claims.length === 0 && !factCheckError && (
            <div className="bg-ink-2 border border-dashed border-line rounded-[14px] p-5 text-slate text-sm">Belum ada hasil. Jalankan Fact Check untuk memulai.</div>
          )}

          <div className="space-y-3">
            {claims.map((claim) => {
              const meta = verdictMeta[claim.verdict];
              const isRechecking = recheckingId === claim.id;
              return (
                <article key={claim.id} className="bg-ink-2 border border-line rounded-[14px] p-4">
                  <div className="flex gap-3 items-start justify-between flex-wrap">
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className={`font-mono text-[10px] px-2 py-1 rounded-full whitespace-nowrap uppercase ${meta.color}`}>{meta.label}</span>
                      <span className="font-mono text-[10px] px-2 py-1 rounded-full bg-slate/10 text-slate uppercase">{claim.type}</span>
                      <span className="font-mono text-[10px] text-slate">Confidence {claim.confidence}%</span>
                    </div>
                    <Btn secondary onClick={() => recheckClaim(claim)} disabled={isRechecking}>{isRechecking ? 'Memeriksa...' : 'Periksa ulang'}</Btn>
                  </div>
                  <h3 className="font-display text-base mt-3 mb-2">{claim.claim}</h3>
                  <p className="text-sm leading-relaxed text-paper m-0">{claim.explanation}</p>
                  {claim.caveat && <div className="bg-amber/10 border border-amber/20 rounded-[10px] p-3 mt-3 text-sm leading-relaxed"><strong>Catatan konteks:</strong> {claim.caveat}</div>}
                  {claim.sources.length > 0 && (
                    <div className="mt-4">
                      <div className="font-mono text-[10px] text-teal uppercase mb-2">{FACT_CHECK_MODE === 'dummy' ? 'Referensi simulasi' : 'Referensi source pack'}</div>
                      <div className="space-y-2">
                        {claim.sources.map((source) => (
                          <a key={`${claim.id}-${source.url}`} href={source.url} target="_blank" rel="noreferrer" className="block bg-ink border border-line rounded-[10px] p-3 hover:border-teal transition-colors">
                            <div className="font-mono text-[10px] text-slate uppercase">{qualityLabel[source.quality]} · {source.domain}{source.scope ? ` · ${source.scope}` : ''}</div>
                            <div className="text-sm text-paper mt-1">{source.title}</div>
                            {source.summary && <div className="text-xs text-slate mt-1 leading-relaxed">{source.summary}</div>}
                            <div className="text-[11px] text-teal break-all mt-1">{source.url}</div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {claim.searchQueries.length > 0 && <div className="mt-3 font-mono text-[10px] text-slate">Query simulasi: {claim.searchQueries.join(' · ')}</div>}
                </article>
              );
            })}
          </div>

          {claims.length > 0 && (
            <div className="mt-5 bg-ink-2 border border-line rounded-[14px] p-4">
              <div className="flex gap-4 flex-wrap text-sm">
                <span><strong>{claims.length}</strong> klaim diperiksa</span>
                <span><strong>{verifiedClaims.length}</strong> bisa dipakai</span>
                <span><strong>{blockingClaims.length}</strong> perlu diperbaiki</span>
              </div>
              {FACT_CHECK_MODE === 'dummy' && <p className="text-xs text-slate mt-3 mb-0">Mode simulasi hanya untuk pengujian alur. Jangan gunakan verdict dummy sebagai bukti debat.</p>}
            </div>
          )}

          <div className="flex gap-3 flex-wrap mt-7">
            <Btn secondary onClick={() => goTo(2)}>← Kembali</Btn>
            <Btn onClick={() => goTo(4)} disabled={!canProceedFactCheck}>Lanjut ke Argument Builder →</Btn>
          </div>
        </div>
      );
    }

    if (stage === 'argument-builder') {
      return (
        <div className="animate-[rise_0.35s_ease]">
          <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">04 — Argument Builder</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Susun argumenmu</h1>
          <p className="text-slate text-base leading-relaxed max-w-[60ch] mb-6">Gunakan struktur klaim → alasan → bukti.</p>

          {verifiedClaims.length > 0 && (
            <div className="bg-ink-2 border border-line rounded-[14px] p-4 mb-5">
              <div className="font-mono text-[10px] text-teal uppercase mb-2">Klaim yang lolos fact check</div>
              <div className="space-y-2">
                {verifiedClaims.map((claim) => (
                  <button key={claim.id} type="button" onClick={() => selectClaimForArgument(claim)} className="block text-left w-full bg-ink border border-line rounded-[10px] p-3 text-sm hover:border-teal">
                    <span className="text-paper">{claim.claim}</span>
                    <span className="block text-[11px] text-slate mt-1">{claim.sources.length} sumber referensi</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <InputField label="Klaim" value={argument.claim} onChange={(event) => setArgument({ ...argument, claim: event.target.value })} placeholder="Apa yang kamu nyatakan?" />
          <InputField label="Alasan" value={argument.reason} onChange={(event) => setArgument({ ...argument, reason: event.target.value })} placeholder="Mengapa klaim itu penting/masuk akal?" />
          <InputField label="Bukti" isTextarea value={argument.evidence} onChange={(event) => setArgument({ ...argument, evidence: event.target.value })} placeholder="Masukkan temuan, sumber, atau penjelasan yang mendukung." />

          <div className="flex gap-3 flex-wrap mt-7 mb-4"><Btn secondary onClick={getReview} disabled={!canReviewArgument || reviewLoading}>{reviewLoading ? 'Mereview...' : 'Minta review AI'}</Btn></div>

          {!canReviewArgument && <p className="text-xs text-slate mt-2">Lengkapi klaim, alasan, dan bukti sebelum meminta review.</p>}
          {review && !reviewLoading && (
            <div className="bg-ink-2 border border-line border-l-[3px] border-l-teal rounded-r-[14px] p-4 mt-4">
              <div className="font-mono text-[11px] text-teal uppercase mb-1.5">AI · Reviewer</div>
              <p className="m-0 text-sm leading-relaxed text-paper whitespace-pre-wrap">{review}</p>
            </div>
          )}

          <div className="flex gap-3 flex-wrap mt-7">
            <Btn secondary onClick={() => goTo(3)}>← Kembali</Btn>
            <Btn onClick={() => goTo(5)} disabled={!canProceedToDebate}>Lanjut ke Uji Argumen →</Btn>
          </div>
        </div>
      );
    }

    if (stage === 'debate') {
      return (
        <div className="animate-[rise_0.35s_ease]">
          <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">05 — Debate Preparation</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Uji argumenmu</h1>
          <p className="text-slate text-base leading-relaxed max-w-[65ch] mb-6">AI di sini hanya sebagai sparring partner sebelum debat. Debat resmi tetap dilakukan siswa PRO dan KONTRA.</p>

          <div className="flex items-center gap-2 mb-4">
            <span className="font-mono text-[10px] text-teal uppercase">Sparring {sparringRound}/3</span>
            {sparringRound >= 3 && <span className="font-mono text-[10px] px-2 py-1 rounded-full bg-teal/20 text-teal uppercase">Selesai</span>}
          </div>

          <div className="flex flex-col gap-2.5 mt-4">
            {debateLog.map((message, index) => (
              <div key={index} className={`max-w-[85%] p-3 rounded-[14px] text-sm leading-relaxed break-words ${message.who === 'ai' ? 'bg-ink-2 border border-line self-start rounded-bl-sm' : 'bg-teal text-ink self-end rounded-br-sm'}`}>
                {message.text === 'mengetik...' ? <span className="text-slate font-mono text-xs">mengetik...</span> : message.text}
              </div>
            ))}
          </div>

          {sparringRound < 3 && (
            <div className="flex gap-3 items-center mt-7 flex-wrap">
              <input type="text" value={debateInput} onChange={(event) => setDebateInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && sendDebateMessage()} placeholder="Tulis responsmu..." className="flex-1 min-w-[200px] bg-ink-2 border border-line rounded-[10px] text-paper font-body text-sm p-3.5 focus:outline-teal" />
              <Btn onClick={sendDebateMessage} disabled={!debateInput.trim() || debateLoading}>{debateLoading ? 'Menilai...' : 'Kirim'}</Btn>
            </div>
          )}

          <div className="bg-ink-2 border border-line rounded-[12px] p-3 mt-6 text-xs text-slate leading-relaxed">Batas sparring adalah 3 ronde agar AI tidak terus-menerus menantang tanpa akhir.</div>

          <div className="flex gap-3 flex-wrap mt-7">
            <Btn secondary onClick={() => goTo(4)}>← Kembali</Btn>
            <Btn onClick={() => goTo(6)} disabled={!canProceedToSolution}>Lanjut ke Solution Lab →</Btn>
          </div>
        </div>
      );
    }

    if (stage === 'solution-lab') {
      return (
        <div className="animate-[rise_0.35s_ease]">
          <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">06 — Solution Lab</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Rancang solusimu</h1>
          <InputField label="Rancangan solusi" isTextarea value={solution} onChange={(event) => setSolution(event.target.value)} placeholder="Jelaskan solusi konkretmu, siapa yang terlibat, dan bagaimana mengukur keberhasilannya." />
          <div className="flex gap-3 flex-wrap mt-7 mb-4"><Btn secondary onClick={getSolutionEvaluation} disabled={!solution.trim() || evalLoading}>{evalLoading ? 'Mengevaluasi...' : 'Evaluasi kelayakan'}</Btn></div>
          {evalReply && !evalLoading && (
            <div className="bg-ink-2 border border-line border-l-[3px] border-l-teal rounded-r-[14px] p-4 mt-4">
              <div className="font-mono text-[11px] text-teal uppercase mb-1.5">AI · Evaluator</div>
              <p className="m-0 text-sm leading-relaxed text-paper whitespace-pre-wrap">{evalReply}</p>
            </div>
          )}
          <div className="flex gap-3 flex-wrap mt-7">
            <Btn secondary onClick={() => goTo(5)}>← Kembali</Btn>
            <Btn onClick={() => goTo(7)} disabled={!canProceedToImpact}>Lihat Impact →</Btn>
          </div>
        </div>
      );
    }

    return (
      <div className="animate-[rise_0.35s_ease]">
        <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">07 — Impact</p>
        <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Perjalananmu</h1>
        <p className="text-slate text-base leading-relaxed max-w-[65ch] mb-7">Ringkasan akhir perjalananmu dari isu, klaim, argumen, uji argumen, sampai solusi.</p>

        <div className="space-y-4">
          <SummaryCard label="Isu" value={`${selectedIssue?.title || '-'}${debatePosition ? ` — Posisi ${debatePosition}` : ''}`} />
          <SummaryCard label="Klaim" value={argument.claim || '-'} />
          <SummaryCard label="Alasan" value={argument.reason || '-'} />
          <SummaryCard label="Bukti" value={argument.evidence || '-'} />
          <SummaryCard label="Solusi" value={solution || '-'} />
          <SummaryCard label="Evaluasi Solusi" value={evalReply || '-'} />
        </div>

        <div className="bg-ink-2 border border-line rounded-[14px] p-4 mt-5 text-sm text-paper">
          <strong>Catatan:</strong> debat resmi tetap dilakukan antara siswa PRO dan KONTRA. Sparring AI pada tahap 05 hanya membantu menguji argumen sebelum debat.
        </div>

        <div className="flex gap-3 flex-wrap mt-7">
          <Btn secondary onClick={() => goTo(6)}>← Kembali</Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[88px_1fr] min-h-screen max-md:grid-cols-1">
      <nav className="relative border-r border-line flex flex-col items-center pt-7 pb-7 max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:top-auto max-md:w-full max-md:h-[76px] max-md:flex-row max-md:px-3 max-md:py-0 max-md:border-t max-md:border-r-0 max-md:overflow-x-auto max-md:bg-ink max-md:z-[100] max-md:shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
        <div className="relative flex flex-col items-center gap-0.5 w-full max-md:w-max max-md:flex-row max-md:h-full max-md:items-center">
          <div className="absolute left-1/2 top-[20px] bottom-[20px] w-[2px] bg-line -translate-x-1/2 z-[0] max-md:hidden" />
          <div className="absolute left-1/2 top-[20px] w-[2px] bg-gradient-to-b from-teal to-amber -translate-x-1/2 z-[1] transition-[height] duration-400 ease-[ease] max-md:hidden" style={{ height: `calc((100% - 40px) * ${furthestStage / (STAGES.length - 1 || 1)})` }} />
          {STAGES.map((stage, index) => {
            const isActive = index === currentStage;
            const isDone = index < furthestStage;
            return (
              <button key={stage.id} type="button" onClick={() => goTo(index)} className={`relative z-[2] w-10 h-10 shrink-0 rounded-full border flex items-center justify-center font-mono text-xs cursor-pointer m-0 transition-all duration-200 group max-md:flex-[0_0_40px] max-md:mx-2 ${isActive ? 'bg-teal border-teal text-ink font-semibold' : isDone ? 'bg-ink-2 border-amber text-amber' : 'bg-ink-2 border-line text-slate'}`}>
                {stage.short}
                <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-ink-2 border border-line px-2.5 py-1.5 rounded-lg font-body text-xs whitespace-nowrap opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 max-md:hidden text-paper font-normal">{stage.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <main className="py-14 px-16 max-w-[1080px] max-md:py-8 max-md:px-5 max-md:pb-[120px]">
        {renderPanel()}
      </main>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line rounded-[14px] p-4 bg-gradient-to-br from-teal/10 to-amber/5">
      <div className="font-mono text-[10px] text-teal uppercase mb-2">{label}</div>
      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-paper">{value}</div>
    </div>
  );
}

function Btn({ children, onClick, secondary, disabled }: { children: ReactNode; onClick?: () => void; secondary?: boolean; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`font-body font-semibold text-sm px-6 py-3 rounded-full transition-all whitespace-nowrap ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-px'} ${secondary ? 'bg-transparent text-paper border border-line hover:border-paper' : 'bg-teal text-ink hover:bg-[#1ec4b6]'}`}>
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
      <label className="font-mono text-[11px] text-slate uppercase tracking-wider block mb-2 mt-5">{label}</label>
      {isTextarea ? (
        <textarea value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-ink-2 border border-line rounded-[10px] text-paper font-body text-sm p-3.5 resize-y min-h-[96px] focus:outline focus:outline-2 focus:outline-teal focus:outline-offset-2" />
      ) : (
        <input type="text" value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-ink-2 border border-line rounded-[10px] text-paper font-body text-sm p-3.5 min-h-[48px] focus:outline focus:outline-2 focus:outline-teal focus:outline-offset-2" />
      )}
    </div>
  );
}
