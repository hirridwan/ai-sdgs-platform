import { useEffect, useState } from 'react';
import { api, object, text } from '../team/api';
import { adminApi } from '../admin/api';
import './history.css';

type Entry = { id: number; action: string; requestText: string; aiResponse: unknown; aiMeta: unknown; createdAt: string };
type Session = { id: string; backend: string; position: string; issue: unknown; impact: unknown; createdAt: string; interactions: Entry[] };
type Data = { sessions: Session[]; pagination: { page: number; total: number; totalPages: number; hasNextPage: boolean } };
const stages = [['explore', '2. Hasil Eksplorasi AI'], ['factCheck', '3. Fact Check'], ['reviewArgument', '4. Argument Builder'], ['evaluateSolution', '5. Solution Lab']];
function date(value: string) { return new Date(value).toLocaleString('id-ID'); }
function Sources({ value }: { value: unknown }) {
  if (!Array.isArray(value)) return null;
  return <ul>{value.map((entry, i) => {
    const source = object(entry); const url = text(source.url);
    if (!/^https?:\/\//i.test(url)) return null;
    return <li key={i}><a href={url} target="_blank" rel="noopener noreferrer">{text(source.title) || url}</a></li>;
  })}</ul>;
}
function ResponseText({ value }: { value: unknown }) {
  if (Array.isArray(value)) return <>{value.map((raw, i) => {
    const claim = object(raw);
    return <article key={i}><strong>{text(claim.claim)}</strong><p>{text(claim.verdict)}</p><p>{text(claim.explanation)}</p><p>{text(claim.caveat)}</p><Sources value={claim.sources} /></article>;
  })}</>;
  return <p>{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</p>;
}
function Activity({ items, title, admin }: { items: Entry[]; title: string; admin: boolean }) {
  return <details className="history-stage"><summary>{title} <span>{items.length ? `${items.length} interaksi` : 'Belum ada data tersimpan'}</span></summary>
    {!items.length && <p>Belum ada hasil yang tersimpan untuk tahap ini.</p>}
    {items.map((item, i) => <details key={item.id} className="history-entry" open={items.length === 1}><summary>Percobaan {i + 1} · {date(item.createdAt)}</summary>
      <div className="history-columns"><section><h4>Input tim</h4><div className="history-scroll" tabIndex={0} role="region" aria-label="Input tim"><p>{item.requestText || 'Berdasarkan isu dan posisi yang dipilih.'}</p></div></section>
      <section><h4>Hasil AI</h4><div className="history-scroll" tabIndex={0} role="region" aria-label="Hasil AI"><ResponseText value={item.aiResponse} /><Sources value={object(item.aiMeta).sources} /></div></section></div>
      {admin && <a href={`/admin/interactions/${item.id}`}>Detail interaksi #{item.id} →</a>}
    </details>)}
  </details>;
}
export default function SessionHistory({ teamId }: { teamId?: string }) {
  const [page, setPage] = useState(1), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<Data | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null);
    const path = teamId ? `/api/admin/debate-sessions?teamId=${encodeURIComponent(teamId)}&page=${page}` : `/api/debate-sessions?page=${page}`;
    const request = teamId ? adminApi : api;
    request<Data>(path, { signal: controller.signal }).then(result => { if (!controller.signal.aborted) setData(result); })
      .catch((caught: unknown) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Riwayat gagal dimuat.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, refresh, teamId]);
  useEffect(() => {
    const changed = () => setRefresh(value => value + 1);
    window.addEventListener('admin-interactions-changed', changed);
    return () => window.removeEventListener('admin-interactions-changed', changed);
  }, []);
  return <section className="session-history"><div className="history-heading"><div><h2>Riwayat per sesi debat</h2><p>Satu kelompok berisi perjalanan tim dari isu sampai Impact.</p></div><button onClick={() => setRefresh(value => value + 1)} disabled={loading}>Muat ulang</button></div>
    <p>Riwayat sebelum pembaruan belum memiliki penanda sesi. Data tersebut tetap tersedia pada “Riwayat per interaksi” di bawah.</p>
    {loading && <p role="status">Memuat sesi…</p>}{error && <p role="alert">{error}</p>}
    {data && <><p>{data.pagination.total} sesi tersimpan</p>{!data.sessions.length && <p>Belum ada sesi baru yang tersimpan.</p>}
      {data.sessions.map((session, index) => {
        const issue = object(session.issue), impact = object(session.impact);
        const sdg = typeof issue.sdg === 'string' || typeof issue.sdg === 'number' ? String(issue.sdg) : '';
        return <details className="history-session" key={session.id}><summary><strong>Sesi {data.pagination.total - (page - 1) * 5 - index} · {text(issue.title) || 'Isu SDGs'}</strong><span>{date(session.createdAt)} · {session.backend === 'v1' ? 'Source Pack' : 'AI + Web'} · {session.position} · {session.impact ? 'Impact tersimpan' : 'Impact belum tersimpan'}</span></summary>
          <section className="history-stage"><h3>1. SDGs / isu yang dipilih</h3><div className="history-scroll" tabIndex={0} role="region" aria-label="Isu sesi"><p>{sdg}</p><strong>{text(issue.title)}</strong><p>{text(issue.motion)}</p><p>{text(issue.context)}</p></div></section>
          {stages.map(([action, title]) => <Activity key={action} title={title} items={session.interactions.filter(item => item.action === action)} admin={Boolean(teamId)} />)}
          <details className="history-stage"><summary>6. Impact <span>{session.impact ? 'Tersimpan' : 'Belum ada data tersimpan'}</span></summary>{session.impact ? <div className="history-scroll" tabIndex={0} role="region" aria-label="Ringkasan Impact">{[['claim', 'Klaim'], ['reason', 'Alasan'], ['evidence', 'Bukti'], ['solution', 'Solusi'], ['evaluation', 'Evaluasi solusi']].map(([key, label]) => <section key={key}><h4>{label}</h4><p>{text(impact[key])}</p></section>)}</div> : <p>Impact tersimpan setelah tim membuka halaman Impact dengan solusi dan evaluasi yang lengkap.</p>}</details>
          <Activity title="Tambahan: latihan debat / uji argumen" items={session.interactions.filter(item => item.action === 'debate')} admin={Boolean(teamId)} />
        </details>;
      })}<div className="history-pager"><button disabled={loading || page === 1} onClick={() => setPage(value => value - 1)}>← Sebelumnya</button><span>Halaman {page} / {Math.max(1, data.pagination.totalPages)}</span><button disabled={loading || !data.pagination.hasNextPage} onClick={() => setPage(value => value + 1)}>Berikutnya →</button></div></>}
  </section>;
}
