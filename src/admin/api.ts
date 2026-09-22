import { useEffect, useState } from 'react'; 
export class AdminApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
export async function adminApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...init, headers, credentials: 'same-origin' });
  const data = await response.json().catch(() => null);
  if (response.status === 401 && path !== '/api/admin/auth/login') window.dispatchEvent(new Event('admin-session-expired'));
  if (!response.ok) throw new AdminApiError(data?.error || `Permintaan gagal (${response.status}).`, response.status);
  if (!data) throw new Error('Respons server tidak dapat dibaca. Periksa Worker lokal.');
  return data as T;
}
export function message(error: unknown) { return error instanceof Error ? error.message : 'Permintaan gagal.'; }
export function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
export function text(value: unknown): string { return typeof value === 'string' ? value : ''; }
export function date(value: string | null): string {
  if (!value) return 'Belum ada';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}
export const ACTIONS: Record<string, string> = {
  explore: 'Eksplorasi isu', factCheck: 'Pemeriksaan fakta', reviewArgument: 'Ulasan argumen', debate: 'Latihan sanggahan AI', evaluateSolution: 'Evaluasi solusi',
};
export const backendName = (backend: string | null) => backend === 'v1' ? 'V1 · Source Pack' : backend === 'v2' ? 'V2 · AI + Web' : 'Versi tidak tercatat';
export type Admin = { id: number; username: string; displayName: string };
export type Pagination = { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean };
export type Counts = { action: string; total: number }[];
export type Team = { id: number; username: string; teamName: string; motion: string | null; sdgNumber: number | null; sdgTitle: string | null; createdAt: string; updatedAt: string };
export type TeamList = { teams: (Team & { memberCount: number; interactionCount: number; lastInteractionAt: string | null })[]; pagination: Pagination };
export type TeamDetail = { team: Team; members: { id: number; name: string; position: number }[]; activity: { totalInteractions: number; lastInteractionAt: string | null; byAction: Counts } };
export type Overview = { overview: { totalTeams: number; totalMembers: number; totalInteractions: number; teamsWithInteractions: number; teamsWithoutInteractions: number; lastInteractionAt: string | null; byAction: Counts; recentInteractions: { id: number; teamId: number; teamName: string; action: string; position: string | null; createdAt: string }[] } };
export type Preview = { sdg: string; motion: string; id: number; teamId: number; teamName: string; sdgNumber: number | null; sdgTitle: string | null; action: string; position: string | null; backend: string | null; requestPreview: string; responsePreview: string; createdAt: string };
export type Interactions = { interactions: Preview[]; pagination: Pagination };
export type Interaction = { id: number; teamId: number; teamName: string; action: string; position: string | null; requestText: string; requestMeta: unknown; aiResponse: unknown; aiMeta: unknown; createdAt: string };
 
export function useLoad<T>(url: string) {
  const [state, setState] = useState<{ url: string; data: T | null; error: string; loading: boolean }>({ url, data: null, error: '', loading: true });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ url, data: null, error: '', loading: true });
    adminApi<T>(url, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setState({ url, data, error: '', loading: false });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ url, data: null, error: message(error), loading: false });
    });
    return () => controller.abort();
  }, [url, version]);
  const current = state.url === url ? state : { url, data: null, error: '', loading: true };
  return { ...current, reload: () => setVersion(value => value + 1) };
}
 
