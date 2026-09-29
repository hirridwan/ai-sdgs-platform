import { useEffect, useState } from 'react';
import { api, object, text } from '../team/api';
import { adminApi } from '../admin/api';
import './history.css';

type Entry = {
  id: number;
  action: string;
  requestText: string;
  aiResponse: unknown;
  aiMeta: unknown;
  createdAt: string;
};

type Session = {
  id: string;
  backend: string;
  position: string;
  issue: unknown;
  impact: unknown;
  createdAt: string;
  interactions: Entry[];
};

type Data = {
  sessions: Session[];
  pagination: { page: number; total: number; totalPages: number; hasNextPage: boolean };
};

const stages = [
  ['explore', '2. Hasil Eksplorasi AI'],
  ['factCheck', '3. Fact Check'],
  ['reviewArgument', '4. Argument Builder'],
  ['evaluateSolution', '5. Solution Lab'],
  ['recommendSolution', '6. Rekomendasi AI'],
] as const;

function date(value: string) {
  return new Date(value).toLocaleString('id-ID');
}

function sourceDomain(source: ReturnType<typeof object>): string {
  const storedDomain = text(source.domain).trim().replace(/^www\./i, '');
  if (storedDomain && storedDomain !== 'vertexaisearch.cloud.google.com') return storedDomain;

  const url = text(source.url).trim();
  if (!/^https?:\/\//i.test(url)) return '';
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, '');
    return hostname === 'vertexaisearch.cloud.google.com' ? '' : hostname;
  } catch {
    return '';
  }
}

function isGroundingRedirect(url: string): boolean {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase() === 'vertexaisearch.cloud.google.com';
  } catch {
    return false;
  }
}

function uniqueSources(value: unknown) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: ReturnType<typeof object>[] = [];

  for (const entry of value) {
    const source = object(entry);
    const title = text(source.title).trim().toLowerCase();
    const domain = sourceDomain(source).toLowerCase();
    const key = `${title}|${domain}` || text(source.url).trim().toLowerCase();
    if (!title && !domain && !text(source.url).trim()) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(source);
  }
  return result;
}

function Sources({ value }: { value: unknown }) {
  const sources = uniqueSources(value);
  if (!sources.length) return null;

  return <ul>{sources.map((source, i) => {
    const title = text(source.title).trim() || sourceDomain(source) || 'Sumber web';
    const domain = sourceDomain(source);
    const url = text(source.url).trim();
    const canOpen = /^https?:\/\//i.test(url) && !isGroundingRedirect(url);
    return <li key={`${title}-${domain}-${i}`}>
      {canOpen
        ? <a href={url} target="_blank" rel="noopener noreferrer">{title}{domain ? ` · ${domain}` : ''} ↗</a>
        : <span>{title}{domain ? ` · ${domain}` : ''}</span>}
    </li>;
  })}</ul>;
}

function JourneySources({ value }: { value: unknown }) {
  return <Sources value={value} />;
}

function JourneyClaims({ value }: { value: unknown }) {
  if (!Array.isArray(value)) return null;
  return <div>{value.map((raw, i) => {
    const claim = object(raw);
    const sources = uniqueSources(claim.sources);
    return <article key={i}>
      <strong>{text(claim.claim)}</strong>
      {text(claim.verdict) && <p>Verdict: {text(claim.verdict)}</p>}
      {text(claim.explanation) && <p>{text(claim.explanation)}</p>}
      {text(claim.caveat) && <p>{text(claim.caveat)}</p>}
      {sources.length > 0 && <Sources value={sources} />}
    </article>;
  })}</div>;
}

function ResponseText({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    return <>{value.map((raw, i) => {
      const claim = object(raw);
      return <article key={i}>
        <strong>{text(claim.claim)}</strong>
        <p>{text(claim.verdict)}</p>
        <p>{text(claim.explanation)}</p>
        <p>{text(claim.caveat)}</p>
        <Sources value={claim.sources} />
      </article>;
    })}</>;
  }
  return <p>{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</p>;
}

function Activity({ items, title, admin }: { items: Entry[]; title: string; admin: boolean }) {
  return <details className="history-stage">
    <summary>{title} <span>{items.length ? `${items.length} interaksi` : 'Belum ada data tersimpan'}</span></summary>
    {!items.length && <p>Belum ada hasil yang tersimpan untuk tahap ini.</p>}
    {items.map((item, i) => <details key={item.id} className="history-entry" open={items.length === 1}>
      <summary>Percobaan {i + 1} · {date(item.createdAt)}</summary>
      <div className="history-columns">
        <section>
          <h4>Input tim</h4>
          <div className="history-scroll" tabIndex={0} role="region" aria-label="Input tim">
            <p>{item.requestText || 'Berdasarkan isu dan posisi yang dipilih.'}</p>
          </div>
        </section>
        <section>
          <h4>Hasil AI</h4>
          <div className="history-scroll" tabIndex={0} role="region" aria-label="Hasil AI">
            <ResponseText value={item.aiResponse} />
            <Sources value={object(item.aiMeta).sources} />
          </div>
        </section>
      </div>
      {admin && <a href={`/admin/interactions/${item.id}`}>Detail interaksi #{item.id} →</a>}
    </details>)}
  </details>;
}

function JourneyField({ label, value }: { label: string; value: unknown }) {
  const rendered = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  if (!rendered) return null;
  return <section><h4>{label}</h4><p className="history-pre">{rendered}</p></section>;
}

export default function SessionHistory({ teamId }: { teamId?: string }) {
  const [page, setPage] = useState(1), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<Data | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setData(null);
    const path = teamId
      ? `/api/admin/debate-sessions?teamId=${encodeURIComponent(teamId)}&page=${page}`
      : `/api/debate-sessions?page=${page}`;
    const request = teamId ? adminApi : api;
    request<Data>(path, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch((caught: unknown) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Riwayat gagal dimuat.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, refresh, teamId]);

  useEffect(() => {
    const changed = () => setRefresh(value => value + 1);
    window.addEventListener('admin-interactions-changed', changed);
    return () => window.removeEventListener('admin-interactions-changed', changed);
  }, []);

  return <section className="session-history">
    <div className="history-heading">
      <div><h2>Riwayat per sesi debat</h2><p>Satu kelompok berisi perjalanan tim dari isu sampai Impact.</p></div>
      <button onClick={() => setRefresh(value => value + 1)} disabled={loading}>Muat ulang</button>
    </div>
    <p>Riwayat sebelum pembaruan belum memiliki penanda sesi. Data tersebut tetap tersedia pada “Riwayat per interaksi” di bawah.</p>
    {loading && <p role="status">Memuat sesi…</p>}
    {error && <p role="alert">{error}</p>}
    {data && <><p>{data.pagination.total} sesi tersimpan</p>
      {!data.sessions.length && <p>Belum ada sesi baru yang tersimpan.</p>}
      {data.sessions.map((session, index) => {
        const issue = object(session.issue);
        const journey = object(session.impact);
        const sdg = typeof issue.sdg === 'string' || typeof issue.sdg === 'number' ? String(issue.sdg) : '';
        const complete = Boolean(text(journey.solution).trim() && text(journey.evaluation).trim());
        return <details className="history-session" key={session.id}>
          <summary>
            <strong>Sesi {data.pagination.total - (page - 1) * 5 - index} · {text(issue.title) || 'Isu SDGs'}</strong>
            <span>{date(session.createdAt)} · {session.backend === 'v1' ? 'Source Pack' : 'AI + Web'} · {session.position} · {complete ? 'Perjalanan lengkap' : 'Progres tersimpan'}</span>
          </summary>

          <section className="history-stage">
            <h3>1. SDGs / isu yang dipilih</h3>
            <div className="history-scroll" tabIndex={0} role="region" aria-label="Isu sesi">
              <p>{sdg}</p><strong>{text(issue.title)}</strong><p>{text(issue.motion)}</p><p>{text(issue.context)}</p>
            </div>
          </section>

          {stages.map(([action, title]) => <Activity key={action} title={title} items={session.interactions.filter(item => item.action === action)} admin={Boolean(teamId)} />)}

          <details className="history-stage">
            <summary>Snapshot perjalanan V2 <span>{session.impact ? 'Tersimpan' : 'Belum ada data tersimpan'}</span></summary>
            {session.impact ? <div className="history-scroll" tabIndex={0} role="region" aria-label="Snapshot perjalanan V2">
              <JourneyField label="Tahap aktif" value={journey.currentStage} />
              <JourneyField label="Tahap terjauh" value={journey.furthestStage} />
              <JourneyField label="Eksplorasi siswa" value={journey.exploration} />
              <JourneyField label="Respons AI Explorer" value={journey.explorerReply} />
              <section><h4>Sumber Explorer</h4><JourneySources value={journey.explorerSources} /></section>
              <section><h4>Claims</h4><JourneyClaims value={journey.claims} /></section>
              <JourneyField label="Argumen" value={journey.argument} />
              <JourneyField label="Review argumen" value={journey.review} />
              <JourneyField label="Log sparring" value={journey.debateLog} />
              <JourneyField label="Jumlah ronde sparring" value={journey.sparringRound} />
              <JourneyField label="Solusi siswa" value={journey.solution} />
              <JourneyField label="Rekomendasi AI" value={journey.recommendation} />
              <JourneyField label="Evaluasi AI atas solusi" value={journey.evaluation} />
            </div> : <p>Snapshot akan muncul saat perjalanan mulai tersimpan.</p>}
          </details>

          <Activity title="Tambahan: latihan debat / uji argumen" items={session.interactions.filter(item => item.action === 'debate')} admin={Boolean(teamId)} />
        </details>;
      })}

      <div className="history-pager">
        <button disabled={loading || page === 1} onClick={() => setPage(value => value - 1)}>← Sebelumnya</button>
        <span>Halaman {page} / {Math.max(1, data.pagination.totalPages)}</span>
        <button disabled={loading || !data.pagination.hasNextPage} onClick={() => setPage(value => value + 1)}>Berikutnya →</button>
      </div>
    </>}
  </section>;
}
