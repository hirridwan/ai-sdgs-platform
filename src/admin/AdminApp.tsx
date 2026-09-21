import { useEffect, useState } from 'react';
import type { FormEvent, MouseEvent, ReactNode } from 'react';
import { ACTIONS, AdminApiError, adminApi, backendName, date, message, object, text, useLoad } from './api';
import type { Admin, Counts, Interaction, Interactions, Overview, Pagination, TeamDetail, TeamList } from './api';
import './admin.css';

type Navigate = (path: string) => void;
const locationValue = () => (window.location.pathname.replace(/\/+$/, '') || '/') + window.location.search;

export default function AdminApp() {
  const [location, setLocation] = useState(locationValue);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [auth, setAuth] = useState<'loading' | 'ready' | 'out' | 'error'>('loading');
  const [authError, setAuthError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  function navigate(path: string) {
    if (!path.startsWith('/admin')) return;
    window.history.pushState({}, '', path); setLocation(locationValue()); window.scrollTo(0, 0);
  }
  useEffect(() => {
    const pop = () => setLocation(locationValue());
    const expired = () => { setAdmin(null); setAuth('out'); };
    window.addEventListener('popstate', pop); window.addEventListener('admin-session-expired', expired);
    return () => { window.removeEventListener('popstate', pop); window.removeEventListener('admin-session-expired', expired); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setAuth('loading'); setAuthError('');
    adminApi<{ admin: Admin }>('/api/admin/auth/me', { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) { setAdmin(data.admin); setAuth('ready'); }
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      if (error instanceof AdminApiError && error.status === 401) setAuth('out');
      else { setAuth('error'); setAuthError(message(error)); }
    });
    return () => controller.abort();
  }, [attempt]);
  async function logout() {
    if (!window.confirm('Keluar dari akun admin? Perubahan form yang belum disimpan akan hilang.')) return;
    setBusy(true); setLogoutError('');
    try {
      await adminApi('/api/admin/auth/logout', { method: 'POST' });
      setAdmin(null); setAuth('out'); navigate('/admin/login');
    } catch (error) { setLogoutError(message(error)); }
    finally { setBusy(false); }
  }
  if (auth === 'loading') return <div className="adm"><main className="adm-center" role="status">Memeriksa sesi admin…</main></div>;
  if (auth === 'error') return <div className="adm"><main className="adm-center"><h1>Belum dapat terhubung</h1><p role="alert">{authError}</p><button onClick={() => setAttempt(value => value + 1)}>Coba lagi</button></main></div>;
  if (auth === 'out' || !admin) return <div className="adm"><Login onSuccess={value => { setAdmin(value); setAuth('ready'); if (location.startsWith('/admin/login')) navigate('/admin'); }} /></div>;
  const url = new URL(location, window.location.origin), path = url.pathname;
  const teamMatch = path.match(/^\/admin\/teams\/([1-9]\d*)$/);
  const interactionMatch = path.match(/^\/admin\/interactions\/([1-9]\d*)$/);
  const title = path.startsWith('/admin/teams') ? 'Tim & identitas' : path.startsWith('/admin/interactions') ? 'Jejak interaksi' : 'Ringkasan';
  return <div className="adm">
    <aside className="adm-sidebar"><Link to="/admin" navigate={navigate} className="adm-brand"><span>AI</span><strong>AI × SDGs<small>RUANG ADMIN</small></strong></Link>
      <p className="adm-nav-label">PEMANTAUAN</p><nav aria-label="Menu admin">
        {[['/admin', 'Ringkasan', '01'], ['/admin/teams', 'Tim & identitas', '02'], ['/admin/interactions', 'Jejak interaksi', '03']].map(([to, label, number]) => <Link key={to} to={to} navigate={navigate} className={(to === '/admin' ? path === to || path === '/admin/login' : path.startsWith(to)) ? 'active' : ''}><span>{number}</span>{label}</Link>)}
      </nav><div className="adm-sidebar-foot"><p>Amati proses.<br />Pahami perkembangan.</p><a href="/dashboard">Buka ruang tim ↗</a><a href="/">Beranda platform ↗</a></div>
    </aside>
    <div className="adm-body"><header className="adm-top"><div><span className="adm-eyebrow">PENDAMPINGAN PEMBELAJARAN</span><strong>{title}</strong></div><div className="adm-account"><span>{admin.displayName}</span><button disabled={busy} onClick={logout}>{busy ? 'Keluar…' : 'Logout admin'}</button></div></header>
      <main className="adm-main">
        {logoutError && <p className="adm-error" role="alert">{logoutError}</p>}
        {path === '/admin' || path === '/admin/login' ? <OverviewPage navigate={navigate} />
          : path === '/admin/teams' ? <TeamsPage key={location} search={url.searchParams} navigate={navigate} />
          : teamMatch ? <TeamPage key={teamMatch[1]} id={teamMatch[1]} navigate={navigate} />
          : path === '/admin/interactions' ? <InteractionsPage key={location} search={url.searchParams} navigate={navigate} />
          : interactionMatch ? <InteractionPage key={interactionMatch[1]} id={interactionMatch[1]} navigate={navigate} />
          : <section className="adm-card"><h1>Halaman tidak ditemukan</h1><Link to="/admin" navigate={navigate}>Kembali ke ringkasan</Link></section>}
        <footer className="adm-footer">AI × SDGs · Catatan proses belajar tim · Waktu tampilan mengikuti zona waktu perangkat</footer>
      </main>
    </div>
  </div>;
}

function Link({ to, navigate, children, className = '' }: { to: string; navigate: Navigate; children: ReactNode; className?: string }) {
  function click(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); navigate(to);
  }
  return <a className={className} href={to} onClick={click}>{children}</a>;
}
function Login({ onSuccess }: { onSuccess: (admin: Admin) => void }) {
  const [username, setUsername] = useState(''), [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try { const data = await adminApi<{ admin: Admin }>('/api/admin/auth/login', { method: 'POST', body: JSON.stringify({ username: username.trim(), password }) }); onSuccess(data.admin); }
    catch (caught) { setError(message(caught)); } finally { setBusy(false); }
  }
  return <main className="adm-login"><section className="adm-login-story"><p className="adm-eyebrow">AI × SDGs / RUANG ADMIN</p><h1>Di balik argumen,<br />ada proses<br /><em>yang bertumbuh.</em></h1><p>Telusuri cara tim mencari informasi, menguji bukti, dan menyusun solusi bersama.</p><div className="adm-login-line"><span>Discovery</span><span>Reasoning</span><span>Action</span></div></section>
    <form onSubmit={submit} className="adm-card"><p className="adm-eyebrow">AKSES PENDAMPING</p><h2>Masuk sebagai admin</h2><p className="adm-muted">Akun tim siswa tidak dapat digunakan di halaman ini.</p><label>Username admin<input autoComplete="username" required value={username} onChange={event => setUsername(event.target.value)} /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>{error && <p className="adm-error" role="alert">{error}</p>}<button className="adm-primary" disabled={busy}>{busy ? 'Memproses…' : 'Masuk ke dashboard →'}</button><a className="adm-login-back" href="/">Kembali ke platform</a></form>
  </main>;
}
function LoadState({ loading, error, reload }: { loading: boolean; error: string; reload: () => void }) {
  return loading ? <p className="adm-empty" role="status">Memuat data…</p> : error ? <div className="adm-error" role="alert"><p>{error}</p><button onClick={reload}>Coba lagi</button></div> : null;
}
function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="adm-heading"><p className="adm-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="adm-muted">{description}</p></div>;
}
function ActivityCounts({ counts }: { counts: Counts }) {
  const max = Math.max(1, ...counts.map(item => item.total));
  return <ul className="adm-bars">{counts.map(item => <li key={item.action}><div><span>{ACTIONS[item.action] || item.action}</span><strong>{item.total}</strong></div><div className="adm-bar-track" aria-hidden="true"><span style={{ width: `${item.total / max * 100}%` }} /></div></li>)}</ul>;
}
function OverviewPage({ navigate }: { navigate: Navigate }) {
  const state = useLoad<Overview>('/api/admin/overview'), data = state.data?.overview;
  return <><PageHeading eyebrow="GAMBARAN KEGIATAN" title="Setiap tim, setiap langkah." description="Pantau aktivitas yang tercatat dan buka percakapan untuk memahami prosesnya." /><LoadState {...state} />{data && <>
    <div className="adm-metrics">{[['Total tim', data.totalTeams, `${data.totalMembers} anggota terdaftar`], ['Sudah berinteraksi', data.teamsWithInteractions, 'Pernah mengirim interaksi tersimpan'], ['Interaksi tersimpan', data.totalInteractions, 'Respons AI sukses yang tercatat'], ['Belum berinteraksi', data.teamsWithoutInteractions, 'Belum ada interaksi tersimpan']].map(([label, value, note]) => <section className="adm-card adm-metric" key={label}><p>{label}</p><strong>{value}</strong><small>{note}</small></section>)}</div>
    <div className="adm-overview-grid"><section className="adm-card"><div className="adm-section-head"><h2>Aktivitas per tahap</h2><span className="adm-tag">Seluruh tim</span></div><ActivityCounts counts={data.byAction} /><p className="adm-footnote">Jumlah aktivitas bukan nilai kualitas berpikir atau persentase penyelesaian.</p></section>
      <section className="adm-card adm-feature"><p className="adm-eyebrow">DARI DATA KE PEMAHAMAN</p><h2>Baca pertanyaannya.<br />Telusuri alasannya.</h2><p>Bandingkan input tim dengan respons AI. Perhatikan bukti yang digunakan, batas klaim, dan perubahan arah penelitian.</p><Link to="/admin/interactions" navigate={navigate} className="adm-button">Buka jejak interaksi →</Link><small>Aktivitas terakhir: {date(data.lastInteractionAt)}</small></section></div>
    <section className="adm-card"><div className="adm-section-head"><h2>Interaksi terbaru</h2><Link to="/admin/interactions" navigate={navigate}>Lihat semua →</Link></div>{data.recentInteractions.length ? <div className="adm-table-wrap"><table><thead><tr><th>Tim</th><th>Aktivitas</th><th>Posisi</th><th>Waktu</th><th>Detail</th></tr></thead><tbody>{data.recentInteractions.map(item => <tr key={item.id}><td><Link to={`/admin/teams/${item.teamId}`} navigate={navigate}>{item.teamName}</Link></td><td>{ACTIONS[item.action] || item.action}</td><td>{item.position || '—'}</td><td>{date(item.createdAt)}</td><td><Link to={`/admin/interactions/${item.id}`} navigate={navigate}>Buka #{item.id}</Link></td></tr>)}</tbody></table></div> : <p className="adm-empty">Belum ada interaksi AI yang tersimpan.</p>}</section>
  </>}</>;
}
function Pager({ pagination, navigate, path, search }: { pagination: Pagination; navigate: Navigate; path: string; search: URLSearchParams }) {
  function go(page: number) { const next = new URLSearchParams(search); next.set('page', String(page)); navigate(`${path}?${next}`); }
  return <div className="adm-pager"><button disabled={pagination.page <= 1} onClick={() => go(pagination.page - 1)}>← Sebelumnya</button><span>Halaman {pagination.page} / {Math.max(1, pagination.totalPages)} · {pagination.total} hasil</span><button disabled={!pagination.hasNextPage} onClick={() => go(pagination.page + 1)}>Berikutnya →</button></div>;
}
function TeamsPage({ search, navigate }: { search: URLSearchParams; navigate: Navigate }) {
  const [q, setQ] = useState(search.get('q') || '');
  const [creating, setCreating] = useState(false);
  const state = useLoad<TeamList>(`/api/admin/teams?${search}`);
  return <><PageHeading eyebrow="TIM & IDENTITAS" title="Kenali tim di balik gagasan." description="Lihat anggota, konteks mosi, dan jejak aktivitas setiap tim." />
    <div className="adm-team-actions"><button className="adm-primary" onClick={() => setCreating(value => !value)}>{creating ? '× Batal' : '+ Tambah tim baru'}</button></div>
    {creating && <CreateTeamForm onCreated={id => { setCreating(false); navigate(`/admin/teams/${id}`); }} />}
    <form className="adm-filter adm-card" onSubmit={event => { event.preventDefault(); const params = new URLSearchParams({ page: '1', limit: '10' }); if (q.trim()) params.set('q', q.trim()); navigate(`/admin/teams?${params}`); }}><label>Cari tim<input placeholder="Nama tim, username, atau mosi" value={q} maxLength={200} onChange={event => setQ(event.target.value)} /></label><button className="adm-primary">Cari</button><button type="button" onClick={() => navigate('/admin/teams')}>Reset</button></form>
    <LoadState {...state} />{state.data && <><section className="adm-card"><h2>{state.data.pagination.total} tim ditemukan</h2>{state.data.teams.length ? <div className="adm-table-wrap"><table><thead><tr><th>Tim</th><th>Mosi profil</th><th>Anggota</th><th>Interaksi</th><th>Terakhir aktif*</th><th>Kelola</th></tr></thead><tbody>{state.data.teams.map(team => <tr key={team.id}><td><strong>{team.teamName}</strong><small>@{team.username} · ID {team.id}</small></td><td className="adm-cell-copy">{team.motion || 'Belum diisi'}<small>{team.sdgNumber ? `SDG ${team.sdgNumber} · ${team.sdgTitle}` : 'SDG belum dipilih'}</small></td><td>{team.memberCount}</td><td>{team.interactionCount}</td><td>{date(team.lastInteractionAt)}</td><td><Link to={`/admin/teams/${team.id}`} navigate={navigate}>Detail tim →</Link></td></tr>)}</tbody></table></div> : <p className="adm-empty">Tidak ada tim yang cocok pada halaman ini.</p>}<p className="adm-footnote">*Waktu interaksi tersimpan terakhir, bukan status online.</p></section><Pager pagination={state.data.pagination} navigate={navigate} path="/admin/teams" search={search} /></>}</>;
}
function CreateTeamForm({ onCreated }: { onCreated: (id: number) => void }) {
  const [username, setUsername] = useState(''), [password, setPassword] = useState(''), [teamName, setTeamName] = useState('');
  const [motion, setMotion] = useState(''), [sdg, setSdg] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const sdgs = useLoad<{ sdgs: { number: number; title: string }[] }>('/api/sdgs');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try {
      const result = await adminApi<TeamDetail>('/api/admin/teams', { method: 'POST', body: JSON.stringify({ username: username.trim(), password, teamName: teamName.trim(), motion: motion.trim(), sdgNumber: sdg ? Number(sdg) : null }) });
      onCreated(result.team.id);
    } catch (caught) { setError(message(caught)); } finally { setBusy(false); }
  }
  return <form className="adm-card" onSubmit={submit}><h2>Buat tim baru</h2><p className="adm-muted">Akun login (username &amp; password) dan identitas awal tim dibuat sekaligus di sini.</p>
    <fieldset disabled={busy}>
      <label>Username login<input autoComplete="off" required minLength={3} maxLength={50} pattern="[a-zA-Z0-9_.-]+" value={username} onChange={event => setUsername(event.target.value)} /></label>
      <label>Password awal<input type="password" autoComplete="new-password" required minLength={8} maxLength={200} value={password} onChange={event => setPassword(event.target.value)} /></label>
      <label>Nama tim<input required maxLength={150} value={teamName} onChange={event => setTeamName(event.target.value)} /></label>
      <label>Mosi profil (opsional)<textarea maxLength={5000} rows={3} value={motion} onChange={event => setMotion(event.target.value)} /></label>
      <label>SDG utama (opsional)<select aria-label="SDG utama" value={sdg} disabled={!sdgs.data} onChange={event => setSdg(event.target.value)}><option value="">Belum dipilih</option>{sdgs.data?.sdgs.map(item => <option key={item.number} value={item.number}>SDG {item.number} — {item.title}</option>)}</select></label>
      <LoadState {...sdgs} />
      {error && <p className="adm-error" role="alert">{error}</p>}
      <button className="adm-primary" disabled={!username.trim() || password.length < 8 || !teamName.trim()}>{busy ? 'Membuat…' : 'Buat tim'}</button>
    </fieldset>
  </form>;
}

function TeamPage({ id, navigate }: { id: string; navigate: Navigate }) {
  const state = useLoad<TeamDetail>(`/api/admin/teams/${id}`);
  return <><Link to="/admin/teams" navigate={navigate}>← Daftar tim</Link><LoadState {...state} />{state.data && <TeamEditor initial={state.data} navigate={navigate} />}</>;
}
function TeamEditor({ initial, navigate }: { initial: TeamDetail; navigate: Navigate }) {
  const [data, setData] = useState(initial), [name, setName] = useState(initial.team.teamName), [motion, setMotion] = useState(initial.team.motion || ''), [sdg, setSdg] = useState(String(initial.team.sdgNumber ?? ''));
  const [newName, setNewName] = useState(''), [editId, setEditId] = useState<number | null>(null), [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const sdgs = useLoad<{ sdgs: { number: number; title: string }[] }>('/api/sdgs');
  const base = `/api/admin/teams/${data.team.id}`;
  async function mutate(path: string, method: string, body: unknown, success: string) {
    if (busy) return false; setBusy(true); setError(''); setNotice('');
    try { const result = await adminApi<TeamDetail>(path, { method, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }); setData(result); setNotice(success); return true; }
    catch (caught) { setError(message(caught)); return false; } finally { setBusy(false); }
  }
  return <><PageHeading eyebrow={`DETAIL TIM / #${data.team.id}`} title={data.team.teamName} description={`@${data.team.username} · ${data.activity.totalInteractions} interaksi tersimpan · Terakhir: ${date(data.activity.lastInteractionAt)}`} />
    <div className="adm-inline-note">Mosi profil saat ini dapat berbeda dari konteks interaksi lama. Perubahan profil tidak menulis ulang riwayat atau pilihan Bank Mosi siswa.</div>
    <div className="adm-team-actions"><Link to={`/admin/interactions?teamId=${data.team.id}&page=1&limit=10`} navigate={navigate} className="adm-button">Lihat riwayat tim →</Link></div>
    {error && <p className="adm-error" role="alert">{error}</p>}{notice && <p className="adm-success" role="status">{notice}</p>}
    <div className="adm-editor-grid"><form className="adm-card" onSubmit={async event => { event.preventDefault(); await mutate(base, 'PATCH', { teamName: name.trim(), motion: motion.trim(), sdgNumber: sdg ? Number(sdg) : null }, 'Identitas tim berhasil disimpan.'); }}><h2>Identitas tim</h2><fieldset disabled={busy}><label>Nama tim<input maxLength={150} required value={name} onChange={event => setName(event.target.value)} /></label><label>Mosi profil<textarea maxLength={5000} rows={5} value={motion} onChange={event => setMotion(event.target.value)} /></label><label>SDG utama<select aria-label="SDG utama" value={sdg} disabled={!sdgs.data} onChange={event => setSdg(event.target.value)}><option value="">Belum dipilih</option>{sdgs.data?.sdgs.map(item => <option key={item.number} value={item.number}>SDG {item.number} — {item.title}</option>)}</select></label><LoadState {...sdgs} /><button className="adm-primary" disabled={!name.trim() || !sdgs.data}>{busy ? 'Menyimpan…' : 'Simpan identitas'}</button></fieldset></form>
      <section className="adm-card"><h2>Anggota tim <span className="adm-tag">{data.members.length}</span></h2><p className="adm-muted">Identitas anggota, tanpa penilaian individu.</p><ul className="adm-members">{data.members.map(member => <li key={member.id}>{editId === member.id ? <form onSubmit={async event => { event.preventDefault(); if (await mutate(`${base}/members/${member.id}`, 'PATCH', { name: editName.trim() }, 'Nama anggota diperbarui.')) setEditId(null); }}><label>Nama anggota<input autoFocus required maxLength={150} disabled={busy} value={editName} onChange={event => setEditName(event.target.value)} /></label><div className="adm-row"><button disabled={busy || !editName.trim()}>Simpan nama</button><button type="button" disabled={busy} onClick={() => setEditId(null)}>Batal</button></div></form> : <><span>{member.name}</span><div className="adm-row"><button disabled={busy} onClick={() => { setEditId(member.id); setEditName(member.name); }}>Ubah</button><button className="adm-danger" disabled={busy} onClick={async () => { if (window.confirm(`Hapus ${member.name} dari tim ${data.team.teamName}?`)) await mutate(`${base}/members/${member.id}`, 'DELETE', undefined, 'Anggota dihapus.'); }}>Hapus</button></div></>}</li>)}</ul>{!data.members.length && <p className="adm-empty">Belum ada anggota.</p>}
      <form onSubmit={async event => { event.preventDefault(); if (await mutate(`${base}/members`, 'POST', { name: newName.trim() }, 'Anggota ditambahkan.')) setNewName(''); }}><label>Nama anggota baru<input required maxLength={150} disabled={busy} value={newName} onChange={event => setNewName(event.target.value)} /></label><button disabled={busy || !newName.trim()}>+ Tambah anggota</button></form></section>
    </div><section className="adm-card"><h2>Aktivitas yang tercatat</h2><ActivityCounts counts={data.activity.byAction} /></section>
  </>;
}

function InteractionsPage({ search, navigate }: { search: URLSearchParams; navigate: Navigate }) {
  const [teamId, setTeamId] = useState(search.get('teamId') || ''), [action, setAction] = useState(search.get('action') || ''), [backend, setBackend] = useState(search.get('backend') || '');
  const [from, setFrom] = useState(search.get('dateFrom') || ''), [to, setTo] = useState(search.get('dateTo') || ''), [error, setError] = useState('');
  const state = useLoad<Interactions>(`/api/admin/interactions?${search}`);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); if (from && to && from > to) { setError('Tanggal awal tidak boleh melewati tanggal akhir.'); return; }
    const params = new URLSearchParams({ page: '1', limit: '10' });
    for (const [key, value] of [['teamId', teamId], ['action', action], ['backend', backend], ['dateFrom', from], ['dateTo', to]]) if (value) params.set(key, value);
    navigate(`/admin/interactions?${params}`);
  }
  return <><PageHeading eyebrow="JEJAK INTERAKSI" title="Dari pertanyaan ke pemahaman." description="Telusuri input yang dikirim tim dan respons AI dalam konteks aktivitasnya." />
    <form className="adm-card adm-filters" onSubmit={submit}><label>ID tim<input type="number" min={1} step={1} placeholder="Semua tim" value={teamId} onChange={event => setTeamId(event.target.value)} /></label><label>Aktivitas<select aria-label="Aktivitas" value={action} onChange={event => setAction(event.target.value)}><option value="">Semua aktivitas</option>{Object.entries(ACTIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Versi backend<select aria-label="Versi backend" value={backend} onChange={event => setBackend(event.target.value)}><option value="">Semua versi</option><option value="v1">V1 · Source Pack</option><option value="v2">V2 · AI + Web</option></select></label><label>Dari tanggal (UTC)<input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label>Sampai tanggal (UTC)<input type="date" value={to} onChange={event => setTo(event.target.value)} /></label><div className="adm-row"><button className="adm-primary">Terapkan filter</button><button type="button" onClick={() => navigate('/admin/interactions')}>Reset</button></div><p className="adm-filter-help">Temukan ID di <Link to="/admin/teams" navigate={navigate}>daftar tim</Link>, atau buka riwayat langsung dari detail tim. Rentang tanggal menggunakan UTC.</p></form>
    {error && <p className="adm-error" role="alert">{error}</p>}<LoadState {...state} />{state.data && <><p className="adm-result-count">{state.data.pagination.total} interaksi ditemukan</p><div className="adm-interactions">{state.data.interactions.map(item => <article className="adm-card" key={item.id}><div className="adm-section-head"><span className="adm-tag">{ACTIONS[item.action] || item.action}</span><small>{date(item.createdAt)} · #{item.id}</small></div><h2><Link to={`/admin/teams/${item.teamId}`} navigate={navigate}>{item.teamName}</Link></h2><p className="adm-muted">{backendName(item.backend)} · {item.position || 'Tanpa posisi'}</p><div className="adm-preview"><section><h3>Input tim</h3><p>{item.requestPreview || 'Tidak ada teks input baru; aktivitas menggunakan konteks pilihan isu.'}</p></section><section><h3>Cuplikan respons AI</h3><p>{item.action === 'factCheck' ? 'Hasil pemeriksaan klaim tersedia sebagai daftar. Buka detail untuk membaca hasil dan sumbernya.' : item.responsePreview}</p></section></div><Link className="adm-detail-link" to={`/admin/interactions/${item.id}`} navigate={navigate}>Baca interaksi lengkap →</Link></article>)}</div>{!state.data.interactions.length && <section className="adm-card adm-empty"><h2>Belum ada hasil pada halaman ini</h2><p>Ubah filter atau kembali ke halaman sebelumnya.</p></section>}<Pager pagination={state.data.pagination} navigate={navigate} path="/admin/interactions" search={search} /></>}</>;
}

function InteractionPage({ id, navigate }: { id: string; navigate: Navigate }) {
  const state = useLoad<{ interaction: Interaction }>(`/api/admin/interactions/${id}`), item = state.data?.interaction;
  const meta = object(item?.requestMeta), payload = object(meta.payload), issue = object(payload.issue);
  return <><Link to="/admin/interactions" navigate={navigate}>← Semua interaksi</Link><LoadState {...state} />{item && <>
    <PageHeading eyebrow={`INTERAKSI #${item.id}`} title={ACTIONS[item.action] || item.action} description={`${item.teamName} · ${date(item.createdAt)} · ${backendName(text(meta.backend))}`} />
    <section className="adm-card adm-context"><p className="adm-eyebrow">KONTEKS SAAT INTERAKSI</p><h2>{text(issue.motion) || text(payload.motion) || 'Mosi tidak tercatat'}</h2><p>{text(issue.title) || 'Isu tidak tercatat'}</p><div className="adm-row"><span className="adm-tag">{text(issue.sdg) || text(payload.sdg) || 'SDG tidak tercatat'}</span><span className="adm-tag">{item.position || 'Posisi tidak tercatat'}</span><Link to={`/admin/teams/${item.teamId}`} navigate={navigate}>Profil tim saat ini →</Link></div><p className="adm-footnote">Konteks historis ini dapat berbeda dari identitas tim yang telah diperbarui.</p></section>
    <div className="adm-conversation"><section className="adm-card adm-input"><h2>Input yang dikirim tim</h2><p className="adm-pre">{item.requestText || (item.action === 'explore' ? 'Eksplorasi menggunakan pilihan isu dan posisi, bukan pertanyaan bebas siswa.' : 'Tidak ada teks input baru.')}</p><p className="adm-footnote">Teks terkirim dapat memuat hasil AI atau sumber yang disalin; bukan bukti otomatis bahwa seluruhnya ditulis sendiri.</p>
      {item.action === 'debate' && Object.keys(object(payload.arg)).length > 0 && <details><summary>Argumen awal dan ronde</summary><p>Ronde: {String(payload.round ?? 'Tidak tercatat')}</p>{['claim', 'reason', 'evidence'].map(key => <p className="adm-pre" key={key}>{key === 'claim' ? 'Klaim' : key === 'reason' ? 'Alasan' : 'Bukti'}: {text(object(payload.arg)[key]) || '—'}</p>)}</details>}
    </section><section className="adm-card"><h2>Respons AI</h2><AiResponse value={item.aiResponse} /><Sources value={object(item.aiMeta).sources} /><Queries value={object(item.aiMeta).searchQueries} /></section></div>
  </>}</>;
}
function AiResponse({ value }: { value: unknown }) {
  if (typeof value === 'string') return <p className="adm-pre">{value}</p>;
  if (Array.isArray(value)) return <div>{value.map((raw, index) => {
    const claim = object(raw), verdict = text(claim.verdict);
    const labels: Record<string, string> = { verified: 'Terverifikasi', mostly_true: 'Sebagian besar benar', misleading: 'Menyesatkan', false: 'Bertentangan', unverifiable: 'Belum terverifikasi', not_fact: 'Bukan klaim fakta' };
    return <article className="adm-claim" key={index}><h3>{text(claim.claim) || `Klaim ${index + 1}`}</h3><span className="adm-tag">{labels[verdict] || verdict || 'Status tidak tercatat'}</span><p className="adm-pre">{text(claim.explanation)}</p>{text(claim.caveat) && <p className="adm-inline-note">{text(claim.caveat)}</p>}<Sources value={claim.sources} /><Queries value={claim.searchQueries} /></article>;
  })}<p className="adm-footnote">Status di atas adalah hasil pemeriksaan AI. Buka sumber asli sebelum menarik kesimpulan.</p></div>;
  return <p>Format jawaban tidak dikenali.</p>;
}
function Sources({ value }: { value: unknown }) {
  if (!Array.isArray(value) || !value.length) return null;
  return <section className="adm-sources"><h3>Sumber yang disertakan</h3><ul>{value.map((raw, index) => {
    const source = object(raw); let href = '';
    try { const url = new URL(text(source.url)); if (['http:', 'https:'].includes(url.protocol)) href = url.href; } catch { /* Invalid URLs remain plain labels. */ }
    return <li key={index}>{href ? <a href={href} target="_blank" rel="noopener noreferrer">{text(source.title) || href} ↗</a> : <span>{text(source.title) || 'Tautan sumber tidak valid'}</span>}{text(source.summary) && <p className="adm-muted">{text(source.summary)}</p>}</li>;
  })}</ul></section>;
}
function Queries({ value }: { value: unknown }) {
  const queries = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  return queries.length ? <details className="adm-queries"><summary>Kueri pencarian AI</summary><ul>{queries.map((query, index) => <li key={index}>{query}</li>)}</ul></details> : null;
}