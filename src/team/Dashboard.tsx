import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, object, text } from './api';
import type { HistoryData, Interaction, TeamData } from './api';
import SessionHistory from '../history/SessionHistory';
 
const actions: Record<string, string> = {
  explore: 'Eksplorasi isu', factCheck: 'Pemeriksaan fakta', reviewArgument: 'Ulasan argumen',
  debate: 'Latihan sanggahan', evaluateSolution: 'Evaluasi solusi',
};
function errorMessage(caught: unknown) { return caught instanceof Error ? caught.message : 'Permintaan gagal.'; }
function time(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
 
type Motion = { id: number; text: string; sdgNumber: number | null };
 
export default function Dashboard({ onTeamChange, onOpen }: {
  onTeamChange: (team: TeamData['team']) => void;
  onOpen: (path: string) => void;
}) {
  const [data, setData] = useState<TeamData | null>(null);
  const [sdgs, setSdgs] = useState<{ number: number; title: string }[]>([]);
  const [motions, setMotions] = useState<Motion[]>([]);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [tab, setTab] = useState<'history' | 'identity'>('history');
  useEffect(() => {
    const controller = new AbortController();
    setLoadError('');
    Promise.all([
      api<TeamData>('/api/team', { signal: controller.signal }),
      api<{ sdgs: { number: number; title: string }[] }>('/api/sdgs', { signal: controller.signal }),
      api<{ motions: Motion[] }>('/api/motions', { signal: controller.signal }),
    ]).then(([team, list, motionList]) => {
      if (!controller.signal.aborted) { setData(team); setSdgs(list.sdgs); setMotions(motionList.motions); }
    }).catch((caught: unknown) => { if (!controller.signal.aborted) setLoadError(errorMessage(caught)); });
    return () => controller.abort();
  }, [retry]);
 
  function changed(next: TeamData) { setData(next); onTeamChange(next.team); }
  return <main className="team-ui team-page">
    {loadError ? <div className="team-card"><p className="team-error" role="alert">{loadError}</p><button onClick={() => setRetry(value => value + 1)}>Coba lagi</button></div>
      : !data ? <p role="status">Memuat dashboard…</p> : <>
        <header className="team-hero"><div><p className="team-eyebrow">DASHBOARD TIM</p><h1>{data.team.team_name}</h1><p>Jejak diskusi, bukti, dan gagasan timmu dalam satu ruang.</p></div><button className="team-primary" onClick={() => onOpen('/ai')}>Buka aktivitas AI →</button></header>
        <div className="team-overview">
          <section className="team-card"><p className="team-eyebrow">MOSi PROFIL TIM</p><h2>{data.team.motion || 'Mosi belum diisi'}</h2><p className="team-muted">Pilihan Bank Mosi pada aktivitas masih diatur secara terpisah.</p></section>
          <section className="team-card"><p className="team-eyebrow">SDG UTAMA</p><h2>{data.team.sdg_number ? `SDG ${data.team.sdg_number}` : 'Belum dipilih'}</h2><p>{data.team.sdg_title || 'Lengkapi pada Identitas tim.'}</p></section>
          <section className="team-card"><p className="team-eyebrow">ANGGOTA</p><h2>{data.members.length} orang</h2><p className="team-muted">Satu akun, kontribusi bersama.</p></section>
        </div>
        <div className="team-tabs" aria-label="Bagian dashboard">
          <button aria-pressed={tab === 'history' } onClick={() => setTab('history')}>Riwayat AI</button>
          <button aria-pressed={tab === 'identity'} onClick={() => setTab('identity')}>Identitas tim</button>
        </div>
        {tab === 'history' ? <History /> : <Identity data={data} sdgs={sdgs} motions={motions} onChange={changed} />}
        <footer className="team-footer">AI × SDGs · Discovery / Reasoning / Action</footer>
      </>}
  </main>;
}
 
function Identity({ data, sdgs, motions, onChange }: {
  data: TeamData; sdgs: { number: number; title: string }[]; motions: Motion[]; onChange: (data: TeamData) => void;
}) {
  const [name, setName] = useState(data.team.team_name);
  const [motion, setMotion] = useState(data.team.motion || '');
  const [motionChoice, setMotionChoice] = useState(() => {
    const match = motions.find(item => item.text === (data.team.motion || ''));
    return match ? String(match.id) : '__custom__';
  });
  const [sdg, setSdg] = useState(String(data.team.sdg_number ?? ''));
  const [memberName, setMemberName] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  function pickMotion(value: string) {
    setMotionChoice(value);
    if (value === '__custom__') return;
    const picked = motions.find(item => String(item.id) === value);
    if (picked) {
      setMotion(picked.text);
      if (picked.sdgNumber) setSdg(String(picked.sdgNumber));
    }
  }
  async function mutate(path: string, method: string, body: unknown, success: string): Promise<boolean> {
    if (busy) return false;
    setBusy(true); setMessage(''); setError('');
    try {
      const result = await api<TeamData>(path, { method, body: JSON.stringify(body) });
      onChange(result); setMessage(success); return true;
    } catch (caught) { setError(errorMessage(caught)); return false; }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await mutate('/api/team', 'PATCH', { teamName: name.trim(), motion: motion.trim(), sdgNumber: sdg ? Number(sdg) : null }, 'Identitas tim tersimpan.');
  }
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await mutate('/api/team/members', 'POST', { name: memberName.trim() }, 'Anggota ditambahkan.')) setMemberName('');
  }
  return <>
    {error && <p className="team-error" role="alert">{error}</p>}
    {message && <p className="team-success" role="status">{message}</p>}
    <div className="team-two-col">
      <form className="team-card" onSubmit={save}><h2>Identitas tim</h2><p className="team-muted">Username: {data.team.username}</p>
        <fieldset disabled={busy}>
          <label>Nama tim<input required value={name} onChange={event => setName(event.target.value)} /></label>
          <label>Mosi tim<select aria-label="Pilih mosi dari Bank Mosi" value={motionChoice} onChange={event => pickMotion(event.target.value)}>
            <option value="__custom__">+ Tulis mosi sendiri</option>
            {motions.map(item => <option key={item.id} value={item.id}>{item.sdgNumber ? `SDG ${item.sdgNumber} — ` : ''}{item.text}</option>)}
          </select></label>
          {motionChoice === '__custom__'
            ? <label>Tulis mosi sendiri<textarea rows={4} value={motion} onChange={event => setMotion(event.target.value)} /></label>
            : <p className="team-muted">{motion}</p>}
          <label>SDG utama<select aria-label="SDG utama" value={sdg} onChange={event => setSdg(event.target.value)}><option value="">Belum dipilih</option>{sdgs.map(item => <option key={item.number} value={item.number}>SDG {item.number} — {item.title}</option>)}</select></label>
          <button className="team-primary" disabled={!name.trim()}>{busy ? 'Menyimpan…' : 'Simpan identitas'}</button>
        </fieldset>
      </form>
      <section className="team-card"><h2>Anggota tim</h2><p className="team-muted">Nama anggota digunakan sebagai identitas, tanpa penilaian individu.</p>
        {data.members.length === 0 && <p className="team-empty">Belum ada anggota. Tambahkan nama di bawah.</p>}
        <ul className="team-members">{data.members.map(member => <li key={member.id}>
          {editing === member.id ? <form onSubmit={async event => {
            event.preventDefault();
            if (await mutate('/api/team/members', 'PATCH', { id: member.id, name: editName.trim() }, 'Nama anggota diperbarui.')) setEditing(null);
          }}><label>Nama anggota<input autoFocus required value={editName} disabled={busy} onChange={event => setEditName(event.target.value)} /></label><div className="team-row"><button disabled={busy || !editName.trim()}>Simpan</button><button type="button" disabled={busy} onClick={() => setEditing(null)}>Batal</button></div></form>
            : <><span>{member.name}</span><div className="team-row"><button disabled={busy} onClick={() => { setEditing(member.id); setEditName(member.name); }}>Ubah</button><button className="team-danger" disabled={busy} onClick={async () => {
              if (window.confirm(`Hapus ${member.name} dari anggota tim?`)) await mutate('/api/team/members', 'DELETE', { id: member.id }, 'Anggota dihapus.');
            }}>Hapus</button></div></>}
        </li>)}</ul>
        <form onSubmit={add}><label>Nama anggota baru<input value={memberName} required disabled={busy} onChange={event => setMemberName(event.target.value)} /></label><button disabled={busy || !memberName.trim()}>+ Tambah anggota</button></form>
      </section>
    </div>
  </>;
}

function History() {
  return (
    <>
      <SessionHistory />

      <details className="history-legacy">
        <summary>
          Riwayat per interaksi (termasuk data lama)
        </summary>

        <LegacyHistory />
      </details>
    </>
  );
}

function LegacyHistory() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null);
    const params = new URLSearchParams({ page: String(page), limit: '10' });
    if (action) params.set('action', action);
    api<HistoryData>(`/api/interactions?${params}`, { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setData(result);
    }).catch((caught: unknown) => { if (!controller.signal.aborted) setError(errorMessage(caught)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, action, refresh]);
  return <section className="team-history">
    <div className="team-history-head"><div><h2>Riwayat interaksi AI</h2><p className="team-muted">Baca kembali input tim dan jawaban AI. Jumlah interaksi bukan ukuran kedalaman berpikir.</p></div><div className="team-row"><label>Aktivitas<select aria-label="Aktivitas" value={action} onChange={event => { setAction(event.target.value); setPage(1); }}><option value="">Semua aktivitas</option>{Object.entries(actions).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><button disabled={loading} onClick={() => setRefresh(value => value + 1)}>Muat ulang</button></div></div>
    {loading && <p role="status" className="team-empty">Memuat riwayat…</p>}
    {error && <p role="alert" className="team-error">{error}</p>}
    {data && <><p className="team-count">{data.pagination.total} interaksi tersimpan{action ? ' untuk aktivitas ini' : ''}</p>
      {data.interactions.length === 0 && <div className="team-card team-empty"><h3>Belum ada interaksi pada halaman ini</h3><p>Interaksi AI yang berhasil disimpan akan muncul di sini.</p></div>}
      <div className="team-history-list">{data.interactions.map(item => <InteractionCard key={item.id} item={item} />)}</div>
    </>}
    <div className="team-pagination"><button disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>← Sebelumnya</button><span>Halaman {page}{data ? ` / ${Math.max(1, data.pagination.totalPages)}` : ''}</span><button disabled={loading || !data?.pagination.hasNextPage} onClick={() => setPage(value => value + 1)}>Berikutnya →</button></div>
  </section>;
}
 
function InteractionCard({ item }: { item: Interaction }) {
  const meta = object(item.requestMeta);
  const issue = object(object(meta.payload).issue);
  return <details className="team-card team-interaction"><summary>
    <span className="team-activity-label">{actions[item.action] || item.action}</span>
    <span className="team-muted">{time(item.createdAt)} · {item.position || 'Tanpa posisi'} · {text(meta.backend).toUpperCase()}</span>
    <strong>{text(issue.motion) || text(issue.title) || 'Lihat input dan jawaban AI'}</strong>
    <span className="team-open-label">Buka detail ↗</span>
  </summary>
    <div className="team-conversation"><section><h3>Input yang dikirim tim</h3><p className="team-pre">{item.requestText || (item.action === 'explore' ? 'Eksplorasi dibuat dari pilihan isu dan posisi. Tidak ada pertanyaan bebas siswa pada interaksi ini.' : 'Tidak ada teks input baru.')}</p></section><section><h3>Jawaban AI</h3><AiResponse value={item.aiResponse} /></section></div>
    <Sources value={object(item.aiMeta).sources} />
    <details className="team-context"><summary>Konteks interaksi</summary><pre>{JSON.stringify(item.requestMeta, null, 2)}</pre></details>
  </details>;
}
 
function AiResponse({ value }: { value: unknown }) {
  if (typeof value === 'string') return <p className="team-pre">{value}</p>;
  if (Array.isArray(value)) return <div>{value.map((entry, index) => {
    const claim = object(entry);
    const labels: Record<string, string> = { verified: 'Terverifikasi', mostly_true: 'Sebagian besar benar', misleading: 'Menyesatkan', false: 'Bertentangan', unverifiable: 'Belum terverifikasi', not_fact: 'Bukan klaim fakta' };
    return <article className="team-claim" key={index}><h4>{text(claim.claim) || `Klaim ${index + 1}`}</h4><p className="team-badge">{labels[text(claim.verdict)] || text(claim.verdict)}</p><p className="team-pre">{text(claim.explanation)}</p>{text(claim.caveat) && <p className="team-muted">Catatan: {text(claim.caveat)}</p>}<Sources value={claim.sources} /></article>;
  })}</div>;
  return <p>Jawaban tidak tersedia dalam format yang dikenali.</p>;
}
 
function Sources({ value }: { value: unknown }) {
  if (!Array.isArray(value) || value.length === 0) return null;
  return <div className="team-sources"><h4>Sumber yang disertakan AI</h4><ul>{value.map((entry, index) => {
    const source = object(entry);
    const raw = text(source.url);
    let safe = '';
    try { const url = new URL(raw); if (url.protocol === 'http:' || url.protocol === 'https:') safe = url.href; } catch { /* Render label without unsafe link. */ }
    return <li key={index}>{safe ? <a href={safe} target="_blank" rel="noopener noreferrer">{text(source.title) || safe}</a> : <span>{text(source.title) || 'Sumber tanpa tautan valid'}</span>}</li>;
  })}</ul></div>;
}