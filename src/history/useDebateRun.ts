import { useEffect, useMemo, useState } from 'react';
import { api } from '../team/api';

// A mounted learning journey survives dashboard navigation (TeamShell keeps it mounted).
// Changing the issue/position or explicitly restarting creates another journey.
export function useDebateRun(issue: { id: number } | null, position: string, backend: string, impact: Record<string, string> | null) {
  const issueId = issue?.id;
  const id = useMemo(() => { void issueId; void position; void backend; return crypto.randomUUID(); }, [issueId, position, backend]);
  const [status, setStatus] = useState('');
  const [retry, setRetry] = useState(0);
  const serialized = JSON.stringify({ id, backend, issue, position, ...(impact ? { impact } : {}) });
  useEffect(() => {
    if (!issueId || !position) return;
    let active = true;
    setStatus('Menyimpan sesi…');
    api('/api/debate-sessions', { method: 'POST', body: serialized }).then(() => {
      if (active) setStatus(JSON.parse(serialized).impact ? 'Impact tersimpan di riwayat sesi.' : 'Sesi tersimpan.');
    }).catch((error: unknown) => { if (active) setStatus(`Gagal menyimpan: ${error instanceof Error ? error.message : 'Coba lagi.'}`); });
    return () => { active = false; };
  }, [serialized, issueId, position, retry]);
  return { id, status, retry: () => setRetry(value => value + 1) };
}
