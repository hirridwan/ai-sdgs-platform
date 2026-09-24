import { useEffect, useRef, useState } from 'react';
import type { FormEvent, MouseEvent } from 'react';
import App from '../App';
import AppAI from '../AppAI';
import Home from '../Home';
import Dashboard from './Dashboard';
import { api, ApiError } from './api';
import type { TeamData } from './api';
import './team.css';

const routes = ['/', '/login', '/dashboard', '/source-pack', '/ai'];
const currentPath = () => window.location.pathname.replace(/\/+$/, '') || '/';

export default function TeamShell() {
  const [path, setPath] = useState(currentPath);
  const [status, setStatus] = useState<'checking' | 'in' | 'out' | 'error'>('checking');
  const [team, setTeam] = useState<TeamData['team'] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [visited, setVisited] = useState<string[]>([]);
  const [epoch, setEpoch] = useState(0);
  const previousTeam = useRef<number | null>(null);

  function navigate(next: string) {
    if (!routes.includes(next)) return;
    window.history.pushState({}, '', next);
    setPath(next);
  }

  function acceptTeam(next: TeamData['team']) {
    if (previousTeam.current !== null && previousTeam.current !== next.id) {
      setVisited([]);
      setEpoch(value => value + 1);
    }
    previousTeam.current = next.id;
    setTeam(next);
    setStatus('in');
    setError('');
    setNotice('');
  }

  async function checkSession() {
    setStatus('checking');
    setError('');
    try {
      const data = await api<TeamData>('/api/team');
      acceptTeam(data.team);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) setStatus('out');
      else {
        setStatus('error');
        setError(caught instanceof Error ? caught.message : 'Sesi belum dapat diperiksa.');
      }
    }
  }

  useEffect(() => {
    // Only session reads run automatically; no AI requests here.
    let active = true;
    api<TeamData>('/api/team').then(data => {
      if (!active) return;
      previousTeam.current = data.team.id;
      setTeam(data.team);
      setStatus('in');
    }).catch((caught: unknown) => {
      if (!active) return;
      if (caught instanceof ApiError && caught.status === 401) setStatus('out');
      else { setStatus('error'); setError(caught instanceof Error ? caught.message : 'Sesi belum dapat diperiksa.'); }
    });
    const pop = () => setPath(currentPath());
    const expired = () => { setStatus('out'); setNotice('Sesi berakhir. Login kembali untuk melanjutkan.'); };
    const unsaved = () => setNotice('Jawaban AI sudah diterima, tetapi belum tersimpan di riwayat. Salin jawaban penting sebelum menutup halaman.');
    window.addEventListener('popstate', pop);
    window.addEventListener('team-session-expired', expired);
    window.addEventListener('team-save-failed', unsaved);
    return () => {
      active = false;
      window.removeEventListener('popstate', pop);
      window.removeEventListener('team-session-expired', expired);
      window.removeEventListener('team-save-failed', unsaved);
    };
  }, []);

  useEffect(() => {
    if (status === 'in' && (path === '/ai' || path === '/source-pack')) {
      setVisited(values => values.includes(path) ? values : [...values, path]);
    }
  }, [status, path]);

  useEffect(() => {
    const bar = document.querySelector('.team-topbar');
    if (!bar) return;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--team-topbar-height', `${bar.getBoundingClientRect().height}px`);
    });
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  async function logout() {
    if (visited.length && !window.confirm('Keluar dari akun? Draf aktivitas yang belum dikirim akan hilang. Riwayat AI yang tersimpan tetap tersedia.')) return;
    setLoggingOut(true);
    setError('');
    try {
      await api('/api/auth/logout', { method: 'POST' });
      setTeam(null);
      previousTeam.current = null;
      setVisited([]);
      setEpoch(value => value + 1);
      setStatus('out');
      setNotice('');
      navigate('/login');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Logout gagal.'); }
    finally { setLoggingOut(false); }
  }

  function follow(event: MouseEvent<HTMLAnchorElement>, next: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); navigate(next);
  }

  const protectedPath = ['/dashboard', '/source-pack', '/ai'].includes(path);
  const showLogin = status === 'out' && (protectedPath || path === '/login');
  return <>
    <nav className="team-ui team-topbar" aria-label="Navigasi akun tim">
      <a className="team-brand" href="/" onClick={event => follow(event, '/')}>AI × SDGs</a>
      <div className="team-toplinks">
        <a aria-current={path === '/dashboard' ? 'page' : undefined} href="/dashboard" onClick={event => follow(event, '/dashboard')}>Dashboard</a>
        <a aria-current={path === '/source-pack' ? 'page' : undefined} href="/source-pack" onClick={event => follow(event, '/source-pack')}>Source Pack</a>
        <a aria-current={path === '/ai' ? 'page' : undefined} href="/ai" onClick={event => follow(event, '/ai')}>AI + Web</a>
      </div>
            {status === 'in' ? <div className="team-account"><span>{team?.team_name}</span><button disabled={loggingOut} onClick={logout}>{loggingOut ? 'Keluar…' : 'Logout'}</button></div>
        : <div className="team-auth-links">
            <a href="/login" className="team-login-button" onClick={event => follow(event, '/login')}>Login tim</a>
            {/* Sengaja bukan follow()/routes client-side: /admin dimuat main.tsx sebagai app React terpisah (AdminApp). */}
            <a href="/admin" className="team-admin-link">Login admin</a>
          </div>}
    </nav>
    <div className="team-ui team-alerts">
      {notice && <div className="team-notice" role="status">{notice}<button aria-label="Tutup pemberitahuan" onClick={() => setNotice('')}>×</button></div>}
      {error && status !== 'error' && <p className="team-error" role="alert">{error}</p>}
    </div>
    {path === '/' && <Home />}
    {!routes.includes(path) && <main className="team-ui team-page"><h1>Halaman tidak ditemukan</h1><a href="/dashboard">Buka dashboard</a></main>}
    {(protectedPath || path === '/login') && status === 'checking' && <main className="team-ui team-page" role="status">Memeriksa sesi…</main>}
    {(protectedPath || path === '/login') && status === 'error' && <main className="team-ui team-page"><p role="alert">{error}</p><button onClick={checkSession}>Coba lagi</button></main>}
    {showLogin && <Login onSuccess={async () => {
      const data = await api<TeamData>('/api/team');
      acceptTeam(data.team);
      if (path === '/login') navigate('/dashboard');
    }} />}
    {status === 'in' && (path === '/dashboard' || path === '/login') && <Dashboard key={`${epoch}-${team?.id}`} onTeamChange={setTeam} onOpen={navigate} />}
    {/* Keep activity state mounted during dashboard navigation and same-team re-login. */}
    <div key={epoch}>
      {visited.includes('/source-pack') && <section hidden={status !== 'in' || path !== '/source-pack'}><App /></section>}
      {visited.includes('/ai') && <section data-team-activity="ai" hidden={status !== 'in' || path !== '/ai'}><AppAI /></section>}
    </div>
  </>;
}

function Login({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: username.trim(), password }) });
      await onSuccess();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Login gagal.'); }
    finally { setBusy(false); }
  }
  return <main className="team-ui team-login">
    <div className="team-login-story"><p className="team-eyebrow">RUANG BELAJAR TIM</p><h1>Telusuri ide.<br />Bangun argumen.<br /><em>Ciptakan dampak.</em></h1><p>Satu akun untuk timmu. Kumpulkan bukti, tinjau jawaban AI, dan kembangkan solusi bersama.</p><div className="team-chips"><span>Discovery</span><span>Reasoning</span><span>Action</span></div></div>
    <form className="team-card" onSubmit={submit}>
      <p className="team-eyebrow">SELAMAT DATANG</p><h2>Masuk sebagai tim</h2><p className="team-muted">Gunakan akun yang diberikan pendamping.</p>
      <label>Username tim<input autoComplete="username" required value={username} onChange={event => setUsername(event.target.value)} /></label>
      <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>
      {error && <p className="team-error" role="alert">{error}</p>}
      <button className="team-primary" disabled={busy}>{busy ? 'Memproses…' : 'Masuk ke ruang tim →'}</button>
    </form>
  </main>;
}
