import { useEffect, useMemo, useRef, useState } from 'react';
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
// Snapshot disimpan dengan debounce agar perubahan cepat (misalnya saat siswa
// sedang mengetik) tidak membuat request POST pada setiap karakter.
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

  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const latestSerializedRef = useRef('');
  const sequenceRef = useRef(0);

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
    // memakai impact_json sebagai penyimpanan ringkasan ringkas sesi.
    impact: snapshot,
    journey: snapshot,
  }), [id, backend, issue, position, snapshot]);

  useEffect(() => {
    if (!issueId || !position) return;

    latestSerializedRef.current = serialized;
    const sequence = ++sequenceRef.current;
    const timer = window.setTimeout(() => {
      setStatus('Menyimpan sesi…');

      // Pastikan hanya ada satu request simpan yang aktif. Jika ada perubahan
      // baru ketika request sebelumnya masih berjalan, request berikutnya akan
      // mengambil snapshot terbaru saat gilirannya tiba.
      saveChainRef.current = saveChainRef.current
        .catch(() => undefined)
        .then(async () => {
          const body = latestSerializedRef.current;

          try {
            await api('/api/debate-sessions', {
              method: 'POST',
              body,
            });

            // Jangan menimpa status baru dengan hasil dari snapshot lama.
            if (sequence !== sequenceRef.current) return;

            const data = JSON.parse(body) as { journey?: DebateJourneySnapshot };
            const complete = Boolean(
              data.journey?.solution?.trim() && data.journey?.evaluation?.trim(),
            );
            setStatus(complete ? 'Perjalanan belajar tersimpan.' : 'Sesi tersimpan.');
          } catch (error: unknown) {
            if (sequence !== sequenceRef.current) return;
            setStatus(`Gagal menyimpan: ${error instanceof Error ? error.message : 'Coba lagi.'}`);
          }
        });
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [serialized, issueId, position, retry]);

  return {
    id,
    status,
    retry: () => setRetry(value => value + 1),
  };
}
