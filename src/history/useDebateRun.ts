import { useEffect, useMemo, useState } from 'react';
import { api } from '../team/api';

export type DebateJourneySnapshot = {
  currentStage?: number;
  furthestStage?: number;
  exploration?: string;
  explorerReply?: string;
  explorerSources?: unknown[];
  claims?: unknown[];
  argument?: Record<string, unknown>;
  review?: string;
  debateLog?: { who: 'ai' | 'user'; text: string }[];
  sparringRound?: number;
  solution?: string;
  recommendation?: string;
  evaluation?: string;
};

// Menyimpan satu perjalanan belajar tim ke /api/debate-sessions.
// Snapshot dikirim pada setiap perubahan penting supaya progres tidak hanya
// tersimpan saat tahap Impact.
export function useDebateRun(
  issue: { id: number } | null,
  position: string,
  backend: string,
  journey: DebateJourneySnapshot | null,
) {
  const issueId = issue?.id;
  const id = useMemo(
    () => crypto.randomUUID(),
    [issueId, position, backend],
  );
  const [status, setStatus] = useState('');
  const [retry, setRetry] = useState(0);

  const snapshot = useMemo(() => ({
    ...journey,
    issueId: issue?.id ?? null,
    position: position || null,
  }), [journey, issue?.id, position]);

  const serialized = useMemo(() => JSON.stringify({
    id,
    backend,
    issue,
    position,
    // Tetap kirim field "impact" agar kompatibel dengan endpoint lama yang
    // memakai impact_json sebagai penyimpanan ringkasan sesi.
    impact: snapshot,
    journey: snapshot,
  }), [id, backend, issue, position, snapshot]);

  useEffect(() => {
    if (!issueId || !position) return;

    let active = true;
    setStatus('Menyimpan sesi…');

    api('/api/debate-sessions', {
      method: 'POST',
      body: serialized,
    })
      .then(() => {
        if (!active) return;
        const data = JSON.parse(serialized) as { journey?: DebateJourneySnapshot };
        const complete = Boolean(
          data.journey?.solution?.trim() && data.journey?.evaluation?.trim(),
        );
        setStatus(complete ? 'Perjalanan belajar tersimpan.' : 'Sesi tersimpan.');
      })
      .catch((error: unknown) => {
        if (active) {
          setStatus(`Gagal menyimpan: ${error instanceof Error ? error.message : 'Coba lagi.'}`);
        }
      });

    return () => {
      active = false;
    };
  }, [serialized, issueId, position, retry]);

  return {
    id,
    status,
    retry: () => setRetry(value => value + 1),
  };
}
