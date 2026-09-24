import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const AdminApp = lazy(() => import('./admin/AdminApp'));
const TeamShell = lazy(() => import('./team/TeamShell'));
const path = window.location.pathname.replace(/\/+$/, '') || '/';
const isAdmin = path === '/admin' || path.startsWith('/admin/');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<p style={{ padding: 24 }} role="status">Memuat aplikasi…</p>}>
      {isAdmin ? <AdminApp /> : <TeamShell />}
    </Suspense>
  </StrictMode>,
);
