import type {
  AiAnalysis,
  AiConnectionResult,
  GeotransSyncResult,
  Group,
  Load,
  LocalSettings,
  LoadSearchParams,
  PlacesResponse,
  ReanalysisResult,
  SavedSearch,
  DestinationType,
  WhatsappStatus
} from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? '';
    const body = contentType.includes('application/json') ? await response.json().catch(() => ({})) : {};
    throw new Error(body.error ?? `Cererea a eșuat (${response.status}).`);
  }

  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error('API-ul local nu raspunde corect. Verifica daca serverul este pornit si proxy-ul Vite trimite catre portul 3000.');
  }
  return response.json() as Promise<T>;
}

export const api = {
  status: () => request<WhatsappStatus>('/api/whatsapp/status'),
  connectWhatsapp: (phoneNumber?: string) =>
    request<WhatsappStatus>('/api/whatsapp/connect', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber: phoneNumber ?? null })
    }),
  disconnectWhatsapp: () => request<WhatsappStatus>('/api/whatsapp/disconnect', { method: 'POST' }),
  groups: () => request<Group[]>('/api/groups'),
  refreshGroups: () => request<Group[]>('/api/groups/refresh', { method: 'POST' }),
  updateGroup: (id: number, patch: Partial<Group>) =>
    request<Group>(`/api/groups/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  places: (type: DestinationType, q = '', limit = 50) =>
    request<PlacesResponse>(
      `/api/places?type=${encodeURIComponent(type)}&q=${encodeURIComponent(q)}&limit=${encodeURIComponent(String(limit))}`
    ),
  loads: (query = '', filters: LoadSearchParams = {}) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, String(value));
    }
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return request<Load[]>(`/api/loads${suffix}`);
  },
  load: (id: number) => request<Load>(`/api/loads/${id}`),
  updateLoad: (id: number, patch: Partial<Load>) =>
    request<Load>(`/api/loads/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  searches: () => request<SavedSearch[]>('/api/searches'),
  alertMatches: (limit = 20) => request<Load[]>(`/api/searches/matches?limit=${encodeURIComponent(String(limit))}`),
  createSearch: (query: string) =>
    request<SavedSearch>('/api/searches', {
      method: 'POST',
      body: JSON.stringify({ query, notificationsEnabled: true })
    }),
  updateSearch: (id: number, patch: Partial<SavedSearch>) =>
    request<SavedSearch>(`/api/searches/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteSearch: (id: number) => request<void>(`/api/searches/${id}`, { method: 'DELETE' }),
  settings: () => request<LocalSettings>('/api/settings'),
  updateSettings: (patch: Partial<LocalSettings>) =>
    request<LocalSettings>('/api/settings', { method: 'PATCH', body: JSON.stringify(patch) }),
  analyzeLoad: (loadId: number) =>
    request<AiAnalysis>('/api/ai/analyze', { method: 'POST', body: JSON.stringify({ loadId }) }),
  reanalyzeAllLoads: (onlyOutdated = false) =>
    request<ReanalysisResult>('/api/ai/reanalyze-all', { method: 'POST', body: JSON.stringify({ onlyOutdated }) }),
  testAi: (patch: Partial<LocalSettings>) =>
    request<AiConnectionResult>('/api/ai/test', { method: 'POST', body: JSON.stringify(patch) }),
  syncGeotrans: (pageSize = 50) =>
    request<GeotransSyncResult>('/api/geotrans/sync', { method: 'POST', body: JSON.stringify({ pageSize }) }),
  clearLocalData: () => request<void>('/api/local-data', { method: 'DELETE' })
};
