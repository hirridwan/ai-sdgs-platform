export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...init, headers, credentials: 'same-origin' });
  const data = await response.json().catch(() => null);
  if (response.status === 401 && path !== '/api/auth/login') {
    window.dispatchEvent(new Event('team-session-expired'));
  }
  if (!response.ok) throw new ApiError(data?.error || `Permintaan gagal (${response.status}).`, response.status);
  if (!data) throw new Error('Respons bukan JSON. Periksa apakah Worker lokal berjalan.');
  return data as T;
}

/** Used by the existing callAPI functions; does not change their response format. */
export async function fetchAI(path: string, init: RequestInit): Promise<Response> {
  const response = await fetch(path, { ...init, credentials: 'same-origin' });
  if (response.status === 401) window.dispatchEvent(new Event('team-session-expired'));
  if (response.ok && response.headers.get('X-Interaction-Saved') === 'false') {
    window.dispatchEvent(new Event('team-save-failed'));
  }
  return response;
}

export type TeamData = {
  team: { id: number; username: string; team_name: string; motion: string | null; sdg_number: number | null; sdg_title: string | null };
  members: { id: number; name: string; position: number }[];
};

export type Interaction = {
  id: number; action: string; position: string | null; requestText: string;
  requestMeta: unknown; aiResponse: unknown; aiMeta: unknown; createdAt: string;
};
export type HistoryData = {
  interactions: Interaction[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean };
};
export function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function text(value: unknown): string { return typeof value === 'string' ? value : ''; }
