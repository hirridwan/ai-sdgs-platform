import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';

type Issue = {
  id: number;
  sdg: string;
  title: string;
  blurb: string;
};

type Source = {
  title: string;
  url: string;
  domain: string;
  quality: 'tinggi' | 'sedang' | 'lainnya';
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

const STAGES = [
  { id: 'home', label: 'Home', short: 'H' },
  { id: 'issue-bank', label: 'SDGs Issue Bank', short: '01' },
  { id: 'ai-exploration', label: 'AI Exploration', short: '02' },
  { id: 'fact-check', label: 'Fact Check', short: '03' },
  { id: 'argument-builder', label: 'Argument Builder', short: '04' },
  { id: 'debate', label: 'Debate', short: '05' },
  { id: 'solution-lab', label: 'Solution Lab', short: '06' },
  { id: 'impact', label: 'Impact', short: '07' },
];

const SAMPLE_ISSUES: Issue[] = [
  {
    id: 1,
    sdg: 'SDG 6',
    title: 'Krisis Air Bersih di Wilayah Perkotaan Padat',
    blurb: 'Akses air bersih tidak merata di permukiman padat penduduk.',
  },
  {
    id: 2,
    sdg: 'SDG 13',
    title: 'Kenaikan Suhu & Banjir Rob Pesisir',
    blurb: 'Perubahan iklim mempercepat abrasi dan banjir di kota pesisir.',
  },
  {
    id: 3,
    sdg: 'SDG 4',
    title: 'Kesenjangan Akses Pendidikan Digital',
    blurb: 'Tidak semua siswa punya akses perangkat/internet yang setara.',
  },
  {
    id: 4,
    sdg: 'SDG 12',
    title: 'Sampah Plastik Sekali Pakai di Sekolah',
    blurb: 'Konsumsi plastik sekali pakai tinggi di lingkungan sekolah.',
  },
];

const fakeDelay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));


const MOCK_FACT_CHECK = true;

type MockProfile = {
  defaultClaims: string[];
  explanation: string;
  caveat: string;
  sources: Source[];
  searchQueries: string[];
};

const MOCK_FACT_CHECK_PROFILES: Record<number, MockProfile> = {
  1: {
    defaultClaims: [
      'Masyarakat berpenghasilan rendah di permukiman padat perkotaan cenderung menghadapi akses air bersih yang lebih rendah dibandingkan masyarakat perkotaan lainnya.',
      'Ketimpangan akses air di kawasan perkotaan tidak hanya dipengaruhi oleh ketersediaan air, tetapi juga oleh infrastruktur dan kondisi sosial ekonomi masyarakat.',
    ],
    explanation: 'Simulasi menunjukkan bahwa inti klaim didukung oleh referensi umum mengenai ketimpangan layanan air, tetapi istilah “akses air bersih” perlu didefinisikan secara spesifik sebelum digunakan sebagai bukti debat.',
    caveat: 'Ini adalah hasil DUMMY untuk pengujian alur aplikasi. Sistem belum melakukan pencarian atau verifikasi web secara langsung.',
    sources: [
      { title: 'WHO — Drinking-water', url: 'https://www.who.int/news-room/fact-sheets/detail/drinking-water', domain: 'who.int', quality: 'tinggi' },
      { title: 'WHO/UNICEF Joint Monitoring Programme (JMP)', url: 'https://washdata.org/', domain: 'washdata.org', quality: 'tinggi' },
    ],
    searchQueries: ['simulasi: ketimpangan akses air bersih perkotaan', 'simulasi: low income informal settlements drinking water access'],
  },
  2: {
    defaultClaims: [
      'Perubahan iklim dapat meningkatkan risiko banjir pesisir melalui kenaikan muka laut dan perubahan pola kejadian ekstrem.',
      'Wilayah pesisir yang padat penduduk dapat menghadapi risiko banjir yang lebih besar ketika paparan penduduk dan infrastruktur tinggi.',
    ],
    explanation: 'Simulasi menilai klaim sebagai didukung secara umum oleh literatur perubahan iklim, tetapi dampak spesifik berbeda menurut lokasi, elevasi, perlindungan pantai, dan kondisi setempat.',
    caveat: 'Ini adalah hasil DUMMY untuk pengujian alur aplikasi. Sistem belum melakukan pencarian atau verifikasi web secara langsung.',
    sources: [
      { title: 'IPCC — AR6 Synthesis Report', url: 'https://www.ipcc.ch/report/ar6/syr/', domain: 'ipcc.ch', quality: 'tinggi' },
      { title: 'NOAA — Climate & Coastal Resources', url: 'https://www.noaa.gov/climate', domain: 'noaa.gov', quality: 'tinggi' },
    ],
    searchQueries: ['simulasi: climate change coastal flooding sea level rise', 'simulasi: coastal flood risk urban areas'],
  },
  3: {
    defaultClaims: [
      'Siswa yang memiliki akses internet dan perangkat digital yang lebih baik memiliki kesempatan belajar yang lebih besar dibandingkan siswa yang akses digitalnya terbatas.',
      'Kesenjangan akses perangkat dan koneksi internet dapat menjadi salah satu hambatan dalam penerapan pembelajaran digital secara merata.',
    ],
    explanation: 'Simulasi menunjukkan bahwa akses perangkat dan konektivitas merupakan faktor yang relevan dalam pembelajaran digital. Namun, akses teknologi bukan satu-satunya faktor yang menentukan kualitas atau hasil belajar.',
    caveat: 'Ini adalah hasil DUMMY untuk pengujian alur aplikasi. Sistem belum melakukan pencarian atau verifikasi web secara langsung.',
    sources: [
      { title: 'UNESCO — Global Education Monitoring Report: Technology in education', url: 'https://www.unesco.org/gem-report/en/technology', domain: 'unesco.org', quality: 'tinggi' },
      { title: 'UNICEF — Digital Learning', url: 'https://www.unicef.org/education/digital-learning', domain: 'unicef.org', quality: 'tinggi' },
    ],
    searchQueries: ['simulasi: digital divide students internet devices education', 'simulasi: access to technology digital learning students'],
  },
  4: {
    defaultClaims: [
      'Penggunaan plastik sekali pakai yang tinggi di lingkungan sekolah dapat meningkatkan jumlah sampah plastik yang perlu dikelola.',
      'Upaya mengurangi plastik sekali pakai di sekolah dapat melibatkan perubahan kebiasaan, penyediaan alternatif guna ulang, dan pengelolaan sampah yang lebih baik.',
    ],
    explanation: 'Simulasi menilai klaim sebagai masuk akal dan relevan dengan isu pengurangan sampah plastik, tetapi besarnya dampak perlu dibuktikan dengan data sekolah atau wilayah yang spesifik.',
    caveat: 'Ini adalah hasil DUMMY untuk pengujian alur aplikasi. Sistem belum melakukan pencarian atau verifikasi web secara langsung.',
    sources: [
      { title: 'UNEP — Plastic Pollution', url: 'https://www.unep.org/plastic-pollution', domain: 'unep.org', quality: 'tinggi' },
      { title: 'UNEP — Single-Use Plastics', url: 'https://www.unep.org/interactives/beat-plastic-pollution/', domain: 'unep.org', quality: 'tinggi' },
    ],
    searchQueries: ['simulasi: single use plastic waste schools', 'simulasi: reducing plastic waste school environment'],
  },
};

async function mockFactCheck(payload: { text?: string; claim?: string; issue?: Issue | null; maxClaims?: number }): Promise<ClaimResult[]> {
  await fakeDelay(850);
  const issueId = payload.issue?.id || 1;
  const profile = MOCK_FACT_CHECK_PROFILES[issueId] || MOCK_FACT_CHECK_PROFILES[1];
  const singleClaim = (payload.claim || '').trim();
  const inputText = singleClaim || (payload.text || '').trim();

  const claims = singleClaim
    ? [singleClaim]
    : profile.defaultClaims.slice(0, Math.min(Number(payload.maxClaims || 2), 2));

  return claims.map((claim, index) => ({
    id: `mock-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    claim: claim || inputText,
    normalizedClaim: claim || inputText,
    type: 'factual',
    verdict: index === 0 ? 'mostly_true' : 'verified',
    confidence: index === 0 ? 86 : 91,
    explanation: profile.explanation,
    caveat: profile.caveat,
    sources: profile.sources,
    searchQueries: profile.searchQueries,
    checkedAt: new Date().toISOString(),
  }));
}

const verdictMeta: Record<ClaimResult['verdict'], { label: string; color: string; description: string }> = {
  verified: {
    label: 'Terverifikasi',
    color: 'bg-teal/20 text-teal',
    description: 'Bukti web yang kredibel mendukung klaim tanpa kontradiksi material.',
  },
  mostly_true: {
    label: 'Sebagian besar benar',
    color: 'bg-teal/20 text-teal',
    description: 'Inti klaim didukung, tetapi ada konteks atau batasan penting.',
  },
  misleading: {
    label: 'Menyesatkan',
    color: 'bg-amber/20 text-amber',
    description: 'Ada unsur benar, tetapi cara penyajiannya dapat memberi kesan yang keliru.',
  },
  false: {
    label: 'Bertentangan',
    color: 'bg-coral/20 text-coral',
    description: 'Bukti kredibel justru bertentangan dengan klaim.',
  },
  unverifiable: {
    label: 'Belum terverifikasi',
    color: 'bg-amber/20 text-amber',
    description: 'Bukti yang cukup belum ditemukan untuk mengambil keputusan yang bertanggung jawab.',
  },
  not_fact: {
    label: 'Bukan klaim fakta',
    color: 'bg-slate/20 text-slate',
    description: 'Pernyataan berupa opini/nilai atau prediksi, sehingga tidak bisa diputuskan benar-salah dengan fact check biasa.',
  },
};

const qualityLabel: Record<Source['quality'], string> = {
  tinggi: 'Sumber prioritas',
  sedang: 'Sumber pendukung',
  lainnya: 'Sumber web',
};

export default function App() {
  const [currentStage, setCurrentStage] = useState(0);
  const [furthestStage, setFurthestStage] = useState(0);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [exploration, setExploration] = useState('');
  const [claims, setClaims] = useState<ClaimResult[]>([]);
  const [argument, setArgument] = useState({ claim: '', reason: '', evidence: '' });
  const [debateLog, setDebateLog] = useState<{ who: 'ai' | 'user'; text: string }[]>([]);
  const [solution, setSolution] = useState('');

  const goTo = (index: number) => {
    setCurrentStage(index);
    setFurthestStage((previous) => Math.max(previous, index));
  };

  const callAPI = async (action: string, payload: unknown, fallbackData?: unknown) => {
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data?.error || `API gagal (${res.status})`) as ApiError;
        err.code = data?.code;
        throw err;
      }

      if (data?.result === undefined) {
        throw new Error('Respons API tidak memiliki field result.');
      }

      return data.result;
    } catch (error) {
      if (action === 'factCheck') throw error;
      console.warn('Backend API gagal. Menggunakan fallback lokal.', error);
      await fakeDelay();
      return fallbackData;
    }
  };

  const verifiedClaims = useMemo(
    () => claims.filter((claim) => ['verified', 'mostly_true'].includes(claim.verdict)),
    [claims],
  );

  const blockingClaims = useMemo(
    () => claims.filter((claim) => !['verified', 'mostly_true', 'not_fact'].includes(claim.verdict)),
    [claims],
  );

  useEffect(() => {
    if (!argument.claim && verifiedClaims[0]) {
      setArgument((previous) => ({
        ...previous,
        claim: verifiedClaims[0].claim,
        evidence: verifiedClaims[0].sources
          .map((source) => `${source.title} — ${source.url}`)
          .join('\n'),
      }));
    }
  }, [verifiedClaims, argument.claim]);

  const renderPanel = () => {
    switch (STAGES[currentStage].id) {
      case 'home':
        return (
          <div className="animate-[rise_0.35s_ease]">
            <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">AI × SDGs Platform</p>
            <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">
              Dari isu global<br />ke solusi nyata.
            </h1>
            <p className="text-slate text-base leading-relaxed max-w-[60ch] mb-8">
              Eksplorasi isu SDGs, periksa klaim dengan sumber web, bangun argumen, lalu uji dan kembangkan solusi.
              AI digunakan sebagai pembimbing berpikir, bukan pengganti penilaian siswa.
            </p>
            <Btn onClick={() => goTo(1)}>Mulai Eksplorasi</Btn>
          </div>
        );

      case 'issue-bank':
        return (
          <div className="animate-[rise_0.35s_ease]">
            <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">01 — Issue Bank</p>
            <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Pilih satu isu SDGs</h1>
            <p className="text-slate text-base leading-relaxed max-w-[60ch] mb-8">Pilih satu dari 4 isu demo. Isu yang dipilih akan menjadi konteks seluruh perjalananmu.</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
              {SAMPLE_ISSUES.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => setSelectedIssue(issue)}
                  className={`text-left h-full flex flex-col bg-ink-2 border rounded-[14px] p-[18px] cursor-pointer transition-all hover:-translate-y-0.5 hover:border-teal ${
                    selectedIssue?.id === issue.id ? 'border-amber bg-amber/10' : 'border-line'
                  }`}
                >
                  <div className="font-mono text-[11px] text-teal">{issue.sdg}</div>
                  <h3 className="font-display text-base my-1.5">{issue.title}</h3>
                  <p className="text-[13px] text-slate m-0 leading-relaxed flex-grow">{issue.blurb}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-3 flex-wrap mt-7">
              <Btn onClick={() => goTo(2)} disabled={!selectedIssue}>Lanjut ke AI Exploration →</Btn>
            </div>
          </div>
        );

      case 'ai-exploration':
        return <ExplorationPanel />;
      case 'fact-check':
        return <FactCheckPanel />;
      case 'argument-builder':
        return <ArgumentBuilderPanel />;
      case 'debate':
        return <DebatePanel />;
      case 'solution-lab':
        return <SolutionLabPanel />;
      case 'impact':
        return (
          <div className="animate-[rise_0.35s_ease]">
            <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">07 — Impact</p>
            <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Perjalananmu</h1>
            <div className="border border-line rounded-[14px] p-6 mt-2.5 bg-gradient-to-br from-teal/10 to-amber/5">
              <div className="font-mono text-xs text-slate leading-loose">
                ISU → {selectedIssue?.title || '(belum ada isu)'}<br />
                KLAIM → {argument.claim || '-'}<br />
                SOLUSI → {solution ? (solution.length > 100 ? `${solution.slice(0, 100)}...` : solution) : '-'}
              </div>
            </div>
            <p className="text-slate text-base leading-relaxed max-w-[60ch] mb-8 mt-6">
              Ringkasan ini menunjukkan perjalanan dari isu, klaim tervalidasi, argumen, sampai solusi.
            </p>
            <Btn secondary onClick={() => goTo(6)}>← Kembali</Btn>
          </div>
        );
      default:
        return null;
    }
  };

  const ExplorationPanel = () => {
    const [aiReply, setAiReply] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      let cancelled = false;
      const fetchExplore = async () => {
        setLoading(true);
        const issueData = selectedIssue || { title: 'isu ini', sdg: '' };
        const fallback = `Untuk isu "${issueData.title}", identifikasi siapa yang terdampak, data apa yang diperlukan, dan sumber primer apa yang cocok untuk memeriksanya.`;
        const reply = await callAPI('explore', issueData, fallback);
        if (!cancelled) setAiReply(String(reply || fallback));
        if (!cancelled) setLoading(false);
      };
      fetchExplore();
      return () => { cancelled = true; };
    }, []);

    return (
      <div className="animate-[rise_0.35s_ease]">
        <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">02 — AI Exploration</p>
        <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Eksplorasi isu</h1>
        <p className="text-slate text-base leading-relaxed max-w-[60ch] mb-8">
          Isu: <strong>{selectedIssue?.title || '(belum dipilih)'}</strong>
        </p>

        <div className="bg-ink-2 border border-line border-l-[3px] border-l-teal rounded-r-[14px] p-4 mb-6">
          <div className="font-mono text-[11px] text-teal uppercase mb-1.5">AI · Explorer</div>
          <p className="m-0 text-sm leading-relaxed text-paper whitespace-pre-line">
            {loading ? 'AI sedang menyiapkan pertanyaan pemantik...' : aiReply}
          </p>
        </div>

        <InputField
          label="Catatan eksplorasimu"
          isTextarea
          value={exploration}
          onChange={(event) => setExploration(event.target.value)}
          placeholder="Tulis hasil eksplorasi, data, atau pernyataan yang ingin kamu periksa. Contoh: 'Sebanyak ...% rumah tangga ...'"
        />

        <div className="flex gap-3 flex-wrap mt-7">
          <Btn secondary onClick={() => goTo(1)}>← Kembali</Btn>
          <Btn onClick={() => goTo(3)} disabled={!exploration.trim()}>Lanjut ke Fact Check →</Btn>
        </div>
      </div>
    );
  };

  const FactCheckPanel = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [draftClaim, setDraftClaim] = useState('');
    const [recheckingId, setRecheckingId] = useState<string | null>(null);

    const runFactCheck = async () => {
      if (!exploration.trim()) {
        setClaims([]);
        setError('Masukkan catatan eksplorasi terlebih dahulu.');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const result = MOCK_FACT_CHECK
          ? await mockFactCheck({ text: exploration, issue: selectedIssue, maxClaims: 2 })
          : await callAPI('factCheck', { text: exploration, issue: selectedIssue, maxClaims: 8 });
        if (!Array.isArray(result)) throw new Error('Hasil fact check tidak berbentuk daftar klaim.');
        setClaims(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fact check gagal dijalankan.');
      } finally {
        setLoading(false);
      }
    };

    const addAndCheckClaim = async () => {
      const claim = draftClaim.trim();
      if (!claim) return;
      setDraftClaim('');
      setRecheckingId(`new-${Date.now()}`);
      setError(null);
      try {
        const result = MOCK_FACT_CHECK
          ? await mockFactCheck({ claim, issue: selectedIssue, maxClaims: 1 })
          : await callAPI('factCheck', { claim, issue: selectedIssue, maxClaims: 1 });
        if (!Array.isArray(result) || result.length === 0) throw new Error('Klaim tidak menghasilkan hasil pemeriksaan.');
        setClaims((previous) => [...previous, result[0]]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Klaim gagal diperiksa.');
      } finally {
        setRecheckingId(null);
      }
    };

    const recheckClaim = async (claim: ClaimResult) => {
      setRecheckingId(claim.id);
      setError(null);
      try {
        const result = MOCK_FACT_CHECK
          ? await mockFactCheck({ claim: claim.claim, issue: selectedIssue, maxClaims: 1 })
          : await callAPI('factCheck', { claim: claim.claim, issue: selectedIssue, maxClaims: 1 });
        if (!Array.isArray(result) || result.length === 0) throw new Error('Tidak ada hasil baru untuk klaim tersebut.');
        setClaims((previous) => previous.map((item) => (item.id === claim.id ? result[0] : item)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Klaim gagal diperiksa ulang.');
      } finally {
        setRecheckingId(null);
      }
    };

    const canProceed = claims.length > 0 && blockingClaims.length === 0 && verifiedClaims.length > 0;

    return (
      <div className="animate-[rise_0.35s_ease]">
        <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">03 — Fact Check</p>
        <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Periksa klaim dengan bukti</h1>
        <p className="text-slate text-base leading-relaxed max-w-[70ch] mb-4">
          Untuk sementara, Fact Check berjalan dalam <strong>mode simulasi (dummy)</strong> agar alur pembelajaran dapat diuji tanpa bergantung pada quota API.
          Hasil di halaman ini bukan hasil verifikasi web nyata.
        </p>

        <div className="bg-amber/10 border border-amber/20 rounded-[12px] p-3 mb-6 text-sm leading-relaxed text-paper">
          <strong>MODE SIMULASI:</strong> 4 topik Issue Bank tetap tersedia. Gunakan tahap ini untuk menguji alur
          <strong> klaim → verdict → sumber → Argument Builder</strong> sebelum Fact Check nyata diaktifkan kembali.
        </div>

        <div className="flex gap-3 flex-wrap mb-5">
          <Btn onClick={runFactCheck} disabled={loading || !exploration.trim()}>{loading ? 'Memeriksa...' : 'Jalankan Fact Check'}</Btn>
          <Btn secondary onClick={() => setClaims([])} disabled={loading || claims.length === 0}>Bersihkan hasil</Btn>
        </div>

        <div className="bg-ink-2 border border-line rounded-[14px] p-4 mb-6">
          <div className="font-mono text-[11px] text-teal uppercase mb-2">Tambah klaim spesifik</div>
          <div className="flex gap-3 items-start flex-wrap">
            <textarea
              value={draftClaim}
              onChange={(event) => setDraftClaim(event.target.value)}
              placeholder="Tulis satu klaim yang ingin diuji. Contoh: 'Siswa dengan akses internet lebih baik memiliki kesempatan belajar yang lebih besar.'"
              className="flex-1 min-w-[260px] bg-ink border border-line rounded-[10px] text-paper font-body text-sm p-3.5 resize-y min-h-[90px] focus:outline focus:outline-2 focus:outline-teal focus:outline-offset-2"
            />
            <Btn secondary onClick={addAndCheckClaim} disabled={!draftClaim.trim() || recheckingId !== null}>Periksa klaim</Btn>
          </div>
        </div>

        {error && (
          <div className="bg-coral/10 border border-coral/30 text-paper rounded-[12px] p-4 mb-5 text-sm leading-relaxed">
            <strong>Fact check gagal:</strong> {error}
          </div>
        )}

        {loading && (
          <div className="bg-ink-2 border border-line rounded-[14px] p-4 mb-4">
            <p className="text-slate font-mono text-xs m-0">Menjalankan simulasi pemeriksaan klaim dan menyiapkan bukti contoh...</p>
          </div>
        )}

        {!loading && claims.length === 0 && !error && (
          <div className="bg-ink-2 border border-dashed border-line rounded-[14px] p-5 text-slate text-sm">
            Belum ada hasil. Klik <strong>Jalankan Fact Check</strong> untuk memulai simulasi pada isu yang dipilih.
          </div>
        )}

        <div className="space-y-3">
          {claims.map((claim) => {
            const meta = verdictMeta[claim.verdict] || verdictMeta.unverifiable;
            const isRechecking = recheckingId === claim.id;
            return (
              <article key={claim.id} className="bg-ink-2 border border-line rounded-[14px] p-4">
                <div className="flex gap-3 items-start justify-between flex-wrap">
                  <div className="flex gap-2 items-center flex-wrap">
                    <span className={`font-mono text-[10px] px-2 py-1 rounded-full whitespace-nowrap uppercase ${meta.color}`}>{meta.label}</span>
                    <span className="font-mono text-[10px] px-2 py-1 rounded-full bg-slate/10 text-slate uppercase">{claim.type}</span>
                    <span className="font-mono text-[10px] text-slate">Confidence {claim.confidence}%</span>
                  </div>
                  <Btn secondary onClick={() => recheckClaim(claim)} disabled={isRechecking}>
                    {isRechecking ? 'Memeriksa...' : 'Periksa ulang'}
                  </Btn>
                </div>

                <h3 className="font-display text-base mt-3 mb-2">{claim.claim}</h3>
                <p className="text-sm leading-relaxed text-paper m-0">{claim.explanation}</p>

                {claim.caveat && (
                  <div className="bg-amber/10 border border-amber/20 rounded-[10px] p-3 mt-3 text-sm leading-relaxed">
                    <strong>Catatan konteks:</strong> {claim.caveat}
                  </div>
                )}

                {claim.sources.length > 0 ? (
                  <div className="mt-4">
                    <div className="font-mono text-[10px] text-teal uppercase mb-2">Referensi simulasi</div>
                    <div className="space-y-2">
                      {claim.sources.map((source) => (
                        <a
                          key={`${claim.id}-${source.url}`}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block bg-ink border border-line rounded-[10px] p-3 hover:border-teal transition-colors"
                        >
                          <div className="font-mono text-[10px] text-slate uppercase">{qualityLabel[source.quality]} · {source.domain}</div>
                          <div className="text-sm text-paper mt-1">{source.title}</div>
                          <div className="text-[11px] text-teal break-all mt-1">{source.url}</div>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-slate">Belum ada referensi simulasi untuk klaim ini.</div>
                )}

                {claim.searchQueries?.length > 0 && (
                  <div className="mt-3 font-mono text-[10px] text-slate">
                    Query simulasi: {claim.searchQueries.join(' · ')}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {claims.length > 0 && (
          <div className="mt-5 bg-ink-2 border border-line rounded-[14px] p-4">
            <div className="flex gap-4 flex-wrap text-sm">
              <span><strong>{claims.length}</strong> klaim diperiksa</span>
              <span><strong>{verifiedClaims.length}</strong> bisa dipakai</span>
              <span><strong>{blockingClaims.length}</strong> perlu diperbaiki/diperiksa lagi</span>
            </div>
            <p className="text-xs text-slate mt-3 mb-0">
              Mode simulasi ini hanya untuk menguji alur. Pada versi produksi, verdict dan sumber harus berasal dari proses fact-check yang benar-benar memeriksa bukti.
            </p>
          </div>
        )}

        <div className="flex gap-3 flex-wrap mt-7">
          <Btn secondary onClick={() => goTo(2)}>← Kembali</Btn>
          <Btn onClick={() => goTo(4)} disabled={!canProceed}>Lanjut ke Argument Builder →</Btn>
        </div>
      </div>
    );
  };

  const ArgumentBuilderPanel = () => {
    const [review, setReview] = useState<string | null>(null);

    const getReview = async () => {
      setReview('loading');
      const fallback = 'Perkuat argumen dengan bukti yang spesifik, relevan, dan dapat ditelusuri kembali ke sumber.';
      const reply = await callAPI('reviewArgument', argument, fallback);
      setReview(String(reply || fallback));
    };

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
                <button
                  type="button"
                  key={claim.id}
                  onClick={() => setArgument((previous) => ({
                    ...previous,
                    claim: claim.claim,
                    evidence: claim.sources.map((source) => `${source.title} — ${source.url}`).join('\n'),
                  }))}
                  className="block text-left w-full bg-ink border border-line rounded-[10px] p-3 text-sm hover:border-teal"
                >
                  <span className="text-paper">{claim.claim}</span>
                  <span className="block text-[11px] text-slate mt-1">{claim.sources.length} sumber grounding</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <InputField label="Klaim" value={argument.claim} onChange={(event) => setArgument({ ...argument, claim: event.target.value })} placeholder="Apa yang kamu nyatakan?" />
        <InputField label="Alasan" value={argument.reason} onChange={(event) => setArgument({ ...argument, reason: event.target.value })} placeholder="Mengapa klaim itu penting/masuk akal?" />
        <InputField label="Bukti" isTextarea value={argument.evidence} onChange={(event) => setArgument({ ...argument, evidence: event.target.value })} placeholder="Masukkan data, sumber, atau penjelasan yang mendukung." />

        <div className="flex gap-3 flex-wrap mt-7 mb-4">
          <Btn secondary onClick={getReview} disabled={!argument.claim.trim()}>Minta review AI</Btn>
        </div>

        {review === 'loading' && <p className="text-slate font-mono text-xs">AI membaca argumenmu...</p>}
        {review && review !== 'loading' && (
          <div className="bg-ink-2 border border-line border-l-[3px] border-l-teal rounded-r-[14px] p-4 mt-4.5">
            <div className="font-mono text-[11px] text-teal uppercase mb-1.5">AI · Reviewer</div>
            <p className="m-0 text-sm leading-relaxed text-paper whitespace-pre-wrap">{review}</p>
          </div>
        )}

        <div className="flex gap-3 flex-wrap mt-7">
          <Btn secondary onClick={() => goTo(3)}>← Kembali</Btn>
          <Btn onClick={() => goTo(5)} disabled={!argument.claim.trim()}>Lanjut ke Debate →</Btn>
        </div>
      </div>
    );
  };

  const DebatePanel = () => {
    const [inputStr, setInputStr] = useState('');
    const logRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (debateLog.length === 0) {
        setDebateLog([{ who: 'ai', text: `Argumenmu: "${argument.claim || '(belum diisi)'}". Coba jelaskan mengapa bukti yang kamu punya cukup kuat.` }]);
      }
    }, []);

    useEffect(() => {
      logRef.current?.scrollIntoView({ block: 'end' });
    }, [debateLog]);

    const sendMsg = async () => {
      const message = inputStr.trim();
      if (!message) return;
      const newLog = [...debateLog, { who: 'user' as const, text: message }];
      setDebateLog([...newLog, { who: 'ai', text: 'mengetik...' }]);
      setInputStr('');
      const fallback = 'Argumenmu menarik. Sekarang uji apakah bukti tersebut benar-benar mendukung klaim, bukan hanya berkaitan dengannya.';
      const reply = await callAPI('debate', { msg: message, arg: argument }, fallback);
      setDebateLog([...newLog, { who: 'ai', text: String(reply || fallback) }]);
    };

    return (
      <div className="animate-[rise_0.35s_ease]">
        <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">05 — Debate</p>
        <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Uji argumenmu</h1>
        <p className="text-slate text-base leading-relaxed max-w-[60ch] mb-8">AI menjadi sparring partner untuk menguji ketahanan alasanmu.</p>

        <div className="flex flex-col gap-2.5 mt-4.5" ref={logRef}>
          {debateLog.map((message, index) => (
            <div key={index} className={`max-w-[85%] p-3 rounded-[14px] text-sm leading-relaxed break-words ${message.who === 'ai' ? 'bg-ink-2 border border-line self-start rounded-bl-sm' : 'bg-teal text-ink self-end rounded-br-sm'}`}>
              {message.text === 'mengetik...' ? <span className="text-slate font-mono text-xs">mengetik...</span> : message.text}
            </div>
          ))}
        </div>

        <div className="flex gap-3 items-center mt-7 flex-wrap">
          <input
            type="text"
            value={inputStr}
            onChange={(event) => setInputStr(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && sendMsg()}
            placeholder="Tulis responsmu..."
            className="flex-1 min-w-[200px] bg-ink-2 border border-line rounded-[10px] text-paper font-body text-sm p-3.5 focus:outline-teal"
          />
          <Btn onClick={sendMsg} disabled={!inputStr.trim()}>Kirim</Btn>
        </div>

        <div className="flex gap-3 flex-wrap mt-7">
          <Btn secondary onClick={() => goTo(4)}>← Kembali</Btn>
          <Btn onClick={() => goTo(6)}>Lanjut ke Solution Lab →</Btn>
        </div>
      </div>
    );
  };

  const SolutionLabPanel = () => {
    const [evalReply, setEvalReply] = useState<string | null>(null);

    const getEval = async () => {
      setEvalReply('loading');
      const fallback = 'Periksa siapa pelaksana, sumber daya yang dibutuhkan, rentang waktu, dan indikator keberhasilan solusi.';
      const reply = await callAPI('evaluateSolution', { solution }, fallback);
      setEvalReply(String(reply || fallback));
    };

    return (
      <div className="animate-[rise_0.35s_ease]">
        <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">06 — Solution Lab</p>
        <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Rancang solusimu</h1>
        <InputField label="Rancangan solusi" isTextarea value={solution} onChange={(event) => setSolution(event.target.value)} placeholder="Jelaskan solusi konkretmu, siapa yang terlibat, dan bagaimana mengukur keberhasilannya." />
        <div className="flex gap-3 flex-wrap mt-7 mb-4">
          <Btn secondary onClick={getEval} disabled={!solution.trim()}>Evaluasi kelayakan</Btn>
        </div>
        {evalReply === 'loading' && <p className="text-slate font-mono text-xs">Mengevaluasi kelayakan...</p>}
        {evalReply && evalReply !== 'loading' && (
          <div className="bg-ink-2 border border-line border-l-[3px] border-l-teal rounded-r-[14px] p-4 mt-4.5">
            <div className="font-mono text-[11px] text-teal uppercase mb-1.5">AI · Evaluator</div>
            <p className="m-0 text-sm leading-relaxed text-paper whitespace-pre-wrap">{evalReply}</p>
          </div>
        )}
        <div className="flex gap-3 flex-wrap mt-7">
          <Btn secondary onClick={() => goTo(5)}>← Kembali</Btn>
          <Btn onClick={() => goTo(7)} disabled={!solution.trim()}>Lihat Impact →</Btn>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-[88px_1fr] min-h-screen max-md:grid-cols-1">
      <nav className="relative border-r border-line flex flex-col items-center pt-7 pb-7 max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:top-auto max-md:w-full max-md:h-[76px] max-md:flex-row max-md:px-3 max-md:py-0 max-md:border-t max-md:border-r-0 max-md:overflow-x-auto max-md:bg-ink max-md:z-[100] max-md:shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
        <div className="relative flex flex-col items-center gap-0.5 w-full max-md:w-max max-md:flex-row max-md:h-full max-md:items-center">
          <div className="absolute left-1/2 top-[20px] bottom-[20px] w-[2px] bg-line -translate-x-1/2 z-[0] max-md:hidden" />
          <div
            className="absolute left-1/2 top-[20px] w-[2px] bg-gradient-to-b from-teal to-amber -translate-x-1/2 z-[1] transition-[height] duration-400 ease-[ease] max-md:hidden"
            style={{ height: `calc((100% - 40px) * ${furthestStage / (STAGES.length - 1 || 1)})` }}
          />
          {STAGES.map((stage, index) => {
            const isActive = index === currentStage;
            const isDone = index < furthestStage;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => goTo(index)}
                className={`relative z-[2] w-10 h-10 shrink-0 rounded-full border flex items-center justify-center font-mono text-xs cursor-pointer m-0 transition-all duration-200 group max-md:flex-[0_0_40px] max-md:mx-2 ${
                  isActive ? 'bg-teal border-teal text-ink font-semibold' : isDone ? 'bg-ink-2 border-amber text-amber' : 'bg-ink-2 border-line text-slate'
                }`}
              >
                {stage.short}
                <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-ink-2 border border-line px-2.5 py-1.5 rounded-lg font-body text-xs whitespace-nowrap opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 max-md:hidden text-paper font-normal">
                  {stage.label}
                </span>
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

function Btn({ children, onClick, secondary, disabled }: { children: ReactNode; onClick?: () => void; secondary?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`font-body font-semibold text-sm px-6 py-3 rounded-full transition-all whitespace-nowrap ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-px'
      } ${secondary ? 'bg-transparent text-paper border border-line hover:border-paper' : 'bg-teal text-ink hover:bg-[#1ec4b6]'}`}
    >
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
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-ink-2 border border-line rounded-[10px] text-paper font-body text-sm p-3.5 resize-y min-h-[96px] focus:outline focus:outline-2 focus:outline-teal focus:outline-offset-2"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-ink-2 border border-line rounded-[10px] text-paper font-body text-sm p-3.5 min-h-[48px] focus:outline focus:outline-2 focus:outline-teal focus:outline-offset-2"
        />
      )}
    </div>
  );
}
