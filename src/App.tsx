import { useState, useRef, useEffect } from 'react';

// Data Statis
const STAGES = [
  { id:"home", label:"Home", short:"H" },
  { id:"issue-bank", label:"SDGs Issue Bank", short:"01" },
  { id:"ai-exploration", label:"AI Exploration", short:"02" },
  { id:"fact-check", label:"Fact Check", short:"03" },
  { id:"argument-builder", label:"Argument Builder", short:"04" },
  { id:"debate", label:"Debate", short:"05" },
  { id:"solution-lab", label:"Solution Lab", short:"06" },
  { id:"impact", label:"Impact", short:"07" },
];

const SAMPLE_ISSUES = [
  { id:1, sdg:"SDG 6", title:"Krisis Air Bersih di Wilayah Perkotaan Padat", blurb:"Akses air bersih tidak merata di permukiman padat penduduk." },
  { id:2, sdg:"SDG 13", title:"Kenaikan Suhu & Banjir Rob Pesisir", blurb:"Perubahan iklim mempercepat abrasi dan banjir di kota pesisir." },
  { id:3, sdg:"SDG 4", title:"Kesenjangan Akses Pendidikan Digital", blurb:"Tidak semua siswa punya akses perangkat/internet yang setara." },
  { id:4, sdg:"SDG 12", title:"Sampah Plastik Sekali Pakai di Sekolah", blurb:"Konsumsi plastik sekali pakai tinggi di lingkungan sekolah." },
];

// Helper Fetch API
const fakeDelay = (ms = 600) => new Promise(r => setTimeout(r, ms));

export default function App() {
  // State Management
  const [currentStage, setCurrentStage] = useState(0);
  const [furthestStage, setFurthestStage] = useState(0);
  
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [exploration, setExploration] = useState("");
  const [claims, setClaims] = useState<any[]>([]);
  const [argument, setArgument] = useState({ claim:"", reason:"", evidence:"" });
  const [debateLog, setDebateLog] = useState<any[]>([]);
  const [solution, setSolution] = useState("");

  const goTo = (index: number) => {
    setCurrentStage(index);
    setFurthestStage(Math.max(furthestStage, index));
  };

  const callAPI = async (action: string, payload: any, fallbackData: any) => {
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload })
      });
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      return data.result;
    } catch (e) {
      console.warn("Backend API belum terhubung. Menggunakan data fallback lokal.");
      await fakeDelay();
      return fallbackData;
    }
  };

  // Komponen Tombol Bawaan
  const Btn = ({ children, onClick, secondary, disabled }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`font-body font-semibold text-sm px-6 py-3 rounded-full transition-all whitespace-nowrap 
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-px'}
        ${secondary ? 'bg-transparent text-paper border border-line hover:border-paper' : 'bg-teal text-ink hover:bg-[#1ec4b6]'}`}
    >
      {children}
    </button>
  );

  const InputField = ({ label, value, onChange, placeholder, isTextarea }: any) => (
    <div className="mb-4 w-full">
      <label className="font-mono text-[11px] text-slate uppercase tracking-wider block mb-2 mt-5">{label}</label>
      {isTextarea ? (
        <textarea 
          value={value} onChange={onChange} placeholder={placeholder}
          className="w-full bg-ink-2 border border-line rounded-[10px] text-paper font-body text-sm p-3.5 resize-y min-h-[96px] focus:outline focus:outline-2 focus:outline-teal focus:outline-offset-2"
        />
      ) : (
        <input 
          type="text" value={value} onChange={onChange} placeholder={placeholder}
          className="w-full bg-ink-2 border border-line rounded-[10px] text-paper font-body text-sm p-3.5 min-h-[48px] focus:outline focus:outline-2 focus:outline-teal focus:outline-offset-2"
        />
      )}
    </div>
  );

  // Render Panel Berdasarkan Stage
  const renderPanel = () => {
    switch(STAGES[currentStage].id) {
      case "home":
        return (
          <div className="animate-[rise_0.35s_ease]">
            <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">AI × SDGs Platform</p>
            <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Dari isu global<br/>ke solusi nyata.</h1>
            <p className="text-slate text-base leading-relaxed max-w-[60ch] mb-8">Delapan tahap — mulai dari eksplorasi isu SDGs, diuji lewat fact-check dan debat, sampai merancang solusi yang bisa diukur dampaknya. AI berperan sebagai pembimbing berpikir, bukan pemberi jawaban.</p>
            <div className="flex gap-3 flex-wrap mt-7"><Btn onClick={() => goTo(1)}>Mulai Eksplorasi</Btn></div>
          </div>
        );
      
      case "issue-bank":
        return (
          <div className="animate-[rise_0.35s_ease]">
            <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">01 — Issue Bank</p>
            <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Pilih satu isu SDGs</h1>
            <p className="text-slate text-base leading-relaxed max-w-[60ch] mb-8">Isu ini akan jadi dasar seluruh perjalananmu di platform.</p>
            
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 mt-2 items-stretch">
              {SAMPLE_ISSUES.map(issue => (
                <div 
                  key={issue.id} 
                  onClick={() => setSelectedIssue(issue)}
                  className={`h-full flex flex-col bg-ink-2 border rounded-[14px] p-[18px] cursor-pointer transition-all hover:-translate-y-0.5 hover:border-teal 
                    ${selectedIssue?.id === issue.id ? 'border-amber bg-amber/10' : 'border-line'}`}
                >
                  <div className="font-mono text-[11px] text-teal">{issue.sdg}</div>
                  <h3 className="font-display text-base my-1.5">{issue.title}</h3>
                  <p className="text-[13px] text-slate m-0 leading-relaxed flex-grow">{issue.blurb}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 flex-wrap mt-7"><Btn onClick={() => goTo(2)} disabled={!selectedIssue}>Lanjut ke AI Exploration →</Btn></div>
          </div>
        );

      case "ai-exploration":
        return <ExplorationPanel />;
        
      case "fact-check":
        return <FactCheckPanel />;
        
      case "argument-builder":
        return <ArgumentBuilderPanel />;
        
      case "debate":
        return <DebatePanel />;
        
      case "solution-lab":
        return <SolutionLabPanel />;
        
      case "impact":
        return (
          <div className="animate-[rise_0.35s_ease]">
            <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">07 — Impact</p>
            <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Perjalananmu</h1>
            <div className="border border-line rounded-[14px] p-6 mt-2.5 bg-gradient-to-br from-teal/10 to-amber/5">
              <div className="font-mono text-xs text-slate leading-loose">
                ISU &nbsp;→&nbsp; {selectedIssue ? selectedIssue.title : "(belum ada isu)"}<br/>
                ARGUMEN &nbsp;→&nbsp; {argument.claim || "-"}<br/>
                SOLUSI &nbsp;→&nbsp; {solution ? (solution.length > 80 ? solution.slice(0,80) + "..." : solution) : "-"}
              </div>
            </div>
            <p className="text-slate text-base leading-relaxed max-w-[60ch] mb-8 mt-6">Ringkasan ini bisa dikembangkan jadi sertifikat/badge digital untuk tiap siswa.</p>
            <div className="flex gap-3 flex-wrap mt-7"><Btn secondary onClick={() => goTo(6)}>← Kembali</Btn></div>
          </div>
        );
      
      default: return null;
    }
  };

  // Sub-komponen agar file rapi
  const ExplorationPanel = () => {
    const [aiReply, setAiReply] = useState<any>(null);
    useEffect(() => {
      const fetchExplore = async () => {
        const issueData = selectedIssue || {title:"isu ini", sdg:""};
        const fallback = `Isu "${issueData.title}" (${issueData.sdg}) berkaitan dengan beberapa faktor: kepadatan penduduk, infrastruktur yang belum merata, dan pola konsumsi. Coba gali: siapa yang paling terdampak? Data apa yang bisa mendukung klaimmu? Sumber apa yang kredibel untuk isu ini?`;
        const reply = await callAPI('explore', issueData, fallback);
        setAiReply(reply);
      };
      fetchExplore();
    }, []);

    return (
      <div className="animate-[rise_0.35s_ease]">
        <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">02 — AI Exploration</p>
        <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Eksplorasi isu</h1>
        <p className="text-slate text-base leading-relaxed max-w-[60ch] mb-8">Isu: <strong>{selectedIssue ? selectedIssue.title : "(belum dipilih)"}</strong></p>
        
        <div className="mb-6">
          {!aiReply ? <p className="text-slate font-mono text-xs">AI sedang menyiapkan pertanyaan pemantik...</p> : 
            <div className="bg-ink-2 border border-line border-l-[3px] border-l-teal rounded-r-[14px] p-4 mt-4.5">
              <div className="font-mono text-[11px] text-teal uppercase mb-1.5">AI · Explorer</div>
              <p className="m-0 text-sm leading-relaxed text-paper">{aiReply}</p>
            </div>
          }
        </div>

        <InputField label="Catatan eksplorasimu" isTextarea value={exploration} onChange={(e:any) => setExploration(e.target.value)} placeholder="Tulis ringkasan hasil risetmu di sini..." />
        <div className="flex gap-3 flex-wrap mt-7">
          <Btn secondary onClick={() => goTo(1)}>← Kembali</Btn>
          <Btn onClick={() => goTo(3)}>Lanjut ke Fact Check →</Btn>
        </div>
      </div>
    );
  };

  const FactCheckPanel = () => {
    const [loading, setLoading] = useState(false);
    
    const runFactCheck = async () => {
      setLoading(true);
      if (!exploration.trim()) {
        setClaims([]); setLoading(false); return;
      }
      const sentences = exploration.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0,4);
      const statuses = ["verified","check","weak"];
      const fallback = sentences.map((s,i)=>({ claim:s, status: statuses[i % statuses.length] }));
      const result = await callAPI('factCheck', { text: exploration }, fallback);
      setClaims(result);
      setLoading(false);
    };

    useEffect(() => { if (claims.length > 0) runFactCheck(); }, []);

    const labels: any = { verified:"Masuk akal", check:"Perlu sumber", weak:"Lemah" };
    const tagColors: any = { verified:"bg-teal/20 text-teal", check:"bg-amber/20 text-amber", weak:"bg-coral/20 text-coral" };

    return (
      <div className="animate-[rise_0.35s_ease]">
        <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">03 — Fact Check</p>
        <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Verifikasi klaimmu</h1>
        <p className="text-slate text-base leading-relaxed max-w-[60ch] mb-8">AI menandai klaim dari catatan eksplorasimu — kamu putuskan mana yang perlu diperkuat.</p>
        
        <div className="flex gap-3 flex-wrap mt-7 mb-4"><Btn secondary onClick={runFactCheck}>Jalankan Fact Check</Btn></div>
        
        <div>
          {loading ? <p className="text-slate font-mono text-xs">Memeriksa klaim...</p> : 
           claims.length === 0 ? <p className="text-slate font-mono text-xs">Belum ada teks eksplorasi untuk diperiksa.</p> :
           claims.map((r, i) => (
            <div key={i} className="flex gap-3 items-start bg-ink-2 border border-line rounded-[10px] p-3 mt-2.5">
              <span className={`font-mono text-[10px] px-2 py-1 rounded-full whitespace-nowrap uppercase ${tagColors[r.status]}`}>{labels[r.status]}</span>
              <span className="text-sm">{r.claim}</span>
            </div>
           ))
          }
        </div>

        <div className="flex gap-3 flex-wrap mt-7">
          <Btn secondary onClick={() => goTo(2)}>← Kembali</Btn>
          <Btn onClick={() => goTo(4)}>Lanjut ke Argument Builder →</Btn>
        </div>
      </div>
    );
  };

  const ArgumentBuilderPanel = () => {
    const [review, setReview] = useState<any>(null);
    const getReview = async () => {
      setReview("loading");
      const fallback = `Strukturmu sudah punya klaim dan alasan. Perkuat bagian bukti (evidence) dengan data atau contoh spesifik supaya argumen lebih meyakinkan lawan debat.`;
      const reply = await callAPI('reviewArgument', argument, fallback);
      setReview(reply);
    };

    return (
      <div className="animate-[rise_0.35s_ease]">
        <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">04 — Argument Builder</p>
        <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Susun argumenmu</h1>
        <p className="text-slate text-base leading-relaxed max-w-[60ch] mb-8">Gunakan struktur klaim → alasan → bukti.</p>
        
        <InputField label="Klaim" value={argument.claim} onChange={(e:any)=>setArgument({...argument, claim: e.target.value})} placeholder="Apa yang kamu yakini benar?" />
        <InputField label="Alasan" value={argument.reason} onChange={(e:any)=>setArgument({...argument, reason: e.target.value})} placeholder="Mengapa itu benar?" />
        <InputField label="Bukti" isTextarea value={argument.evidence} onChange={(e:any)=>setArgument({...argument, evidence: e.target.value})} placeholder="Data/contoh pendukung" />
        
        <div className="flex gap-3 flex-wrap mt-7 mb-4"><Btn secondary onClick={getReview}>Minta review AI</Btn></div>
        
        {review === "loading" && <p className="text-slate font-mono text-xs">AI membaca argumenmu...</p>}
        {review && review !== "loading" && (
          <div className="bg-ink-2 border border-line border-l-[3px] border-l-teal rounded-r-[14px] p-4 mt-4.5">
            <div className="font-mono text-[11px] text-teal uppercase mb-1.5">AI · Reviewer</div>
            <p className="m-0 text-sm leading-relaxed text-paper">{review}</p>
          </div>
        )}

        <div className="flex gap-3 flex-wrap mt-7">
          <Btn secondary onClick={() => goTo(3)}>← Kembali</Btn>
          <Btn onClick={() => goTo(5)}>Lanjut ke Debate →</Btn>
        </div>
      </div>
    );
  };

  const DebatePanel = () => {
    const [inputStr, setInputStr] = useState("");
    const logRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (debateLog.length === 0) {
        setDebateLog([{ who:"ai", text:`Argumenmu: "${argument.claim || '(belum diisi)'}". Coba yakinkan aku kenapa itu benar.` }]);
      }
    }, []);

    const sendMsg = async () => {
      if(!inputStr.trim()) return;
      const newLog = [...debateLog, {who: "user", text: inputStr}];
      setDebateLog(newLog);
      setInputStr("");
      
      const loadingLog = [...newLog, {who: "ai", text: "mengetik..."}];
      setDebateLog(loadingLog);

      const fallback = `Menarik, tapi bagaimana dengan pihak yang tidak punya sumber daya untuk menerapkan solusi itu? Apa argumenmu tetap berlaku untuk kondisi keterbatasan anggaran?`;
      const reply = await callAPI('debate', { msg: inputStr, arg: argument }, fallback);
      
      setDebateLog([...newLog, {who: "ai", text: reply}]);
    };

    return (
      <div className="animate-[rise_0.35s_ease]">
        <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">05 — Debate</p>
        <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Uji argumenmu</h1>
        <p className="text-slate text-base leading-relaxed max-w-[60ch] mb-8">AI berperan sebagai lawan debat — balas argumennya.</p>
        
        <div className="flex flex-col gap-2.5 mt-4.5" ref={logRef}>
          {debateLog.map((m, i) => (
            <div key={i} className={`max-w-[85%] p-3 rounded-[14px] text-sm leading-relaxed break-words ${m.who === 'ai' ? 'bg-ink-2 border border-line self-start rounded-bl-sm' : 'bg-teal text-ink self-end rounded-br-sm'}`}>
              {m.text === "mengetik..." ? <span className="text-slate font-mono text-xs">mengetik...</span> : m.text}
            </div>
          ))}
        </div>

        <div className="flex gap-3 items-center mt-7 flex-wrap">
          <input type="text" value={inputStr} onChange={e=>setInputStr(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()} placeholder="Tulis responsmu..." className="flex-1 min-w-[200px] bg-ink-2 border border-line rounded-[10px] text-paper font-body text-sm p-3.5 focus:outline-teal" />
          <Btn onClick={sendMsg}>Kirim</Btn>
        </div>

        <div className="flex gap-3 flex-wrap mt-7">
          <Btn secondary onClick={() => goTo(4)}>← Kembali</Btn>
          <Btn onClick={() => goTo(6)}>Lanjut ke Solution Lab →</Btn>
        </div>
      </div>
    );
  };

  const SolutionLabPanel = () => {
    const [evalReply, setEvalReply] = useState<any>(null);
    const getEval = async () => {
      setEvalReply("loading");
      const fallback = `Solusi ini cukup layak (feasible) untuk skala sekolah/komunitas. Pertimbangkan juga: siapa pelaksananya, berapa lama, dan bagaimana mengukur keberhasilannya.`;
      const reply = await callAPI('evaluateSolution', { solution }, fallback);
      setEvalReply(reply);
    };

    return (
      <div className="animate-[rise_0.35s_ease]">
        <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">06 — Solution Lab</p>
        <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Rancang solusimu</h1>
        
        <InputField label="Rancangan solusi" isTextarea value={solution} onChange={(e:any)=>setSolution(e.target.value)} placeholder="Jelaskan solusi konkretmu, siapa yang terlibat, dan bagaimana caranya." />
        
        <div className="flex gap-3 flex-wrap mt-7 mb-4"><Btn secondary onClick={getEval}>Evaluasi kelayakan</Btn></div>
        
        {evalReply === "loading" && <p className="text-slate font-mono text-xs">Mengevaluasi kelayakan...</p>}
        {evalReply && evalReply !== "loading" && (
          <div className="bg-ink-2 border border-line border-l-[3px] border-l-teal rounded-r-[14px] p-4 mt-4.5">
            <div className="font-mono text-[11px] text-teal uppercase mb-1.5">AI · Evaluator</div>
            <p className="m-0 text-sm leading-relaxed text-paper">{evalReply}</p>
          </div>
        )}

        <div className="flex gap-3 flex-wrap mt-7">
          <Btn secondary onClick={() => goTo(5)}>← Kembali</Btn>
          <Btn onClick={() => goTo(7)}>Lihat Impact →</Btn>
        </div>
      </div>
    );
  };

  // Render Utama App
  return (
    <div className="grid grid-cols-[88px_1fr] min-h-screen max-md:grid-cols-1">
      <nav className="relative border-r border-line flex flex-col items-center pt-7 pb-7 max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:top-auto max-md:w-full max-md:h-[76px] max-md:flex-row max-md:px-3 max-md:py-0 max-md:border-t max-md:border-r-0 max-md:overflow-x-auto max-md:bg-ink max-md:z-[100] max-md:shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
        <div className="relative flex flex-col items-center gap-0.5 w-full max-md:w-max max-md:flex-row max-md:h-full max-md:items-center">
          {/* Garis background statis yang mengikat dari tombol pertama ke tombol terakhir */}
          <div className="absolute left-1/2 top-[20px] bottom-[20px] w-[2px] bg-line -translate-x-1/2 z-[0] max-md:hidden"></div>
          
          {/* Garis progress gradien */}
          <div 
            className="absolute left-1/2 top-[20px] w-[2px] bg-gradient-to-b from-teal to-amber -translate-x-1/2 z-[1] transition-[height] duration-400 ease-[ease] max-md:hidden"
            style={{ height: `calc((100% - 40px) * ${STAGES.length > 1 ? (furthestStage / (STAGES.length - 1)) : 0})` }}
          ></div>
          
          {STAGES.map((s, i) => {
            const isActive = i === currentStage;
            const isDone = i < furthestStage;
            return (
              <button 
                key={s.id} onClick={() => goTo(i)}
                className={`relative z-[2] w-10 h-10 shrink-0 rounded-full border flex items-center justify-center font-mono text-xs cursor-pointer m-0 transition-all duration-200 group max-md:flex-[0_0_40px] max-md:mx-2
                  ${isActive ? 'bg-teal border-teal text-ink font-semibold' : 
                    isDone ? 'bg-ink-2 border-amber text-amber' : 'bg-ink-2 border-line text-slate'}`}
              >
                {s.short}
                <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-ink-2 border border-line px-2.5 py-1.5 rounded-lg font-body text-xs whitespace-nowrap opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 max-md:hidden text-paper font-normal">
                  {s.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      <main className="py-14 px-16 max-w-[920px] max-md:py-8 max-md:px-5 max-md:pb-[120px]">
        {renderPanel()}
      </main>
    </div>
  );
}