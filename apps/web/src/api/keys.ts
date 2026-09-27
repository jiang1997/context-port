import { apiRequest } from './client';

export interface ApiKeyInfo {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface CreatedApiKey extends ApiKeyInfo {
  /** Shown exactly once at creation; the server only stores a hash. */
  key: string;
}

export function listKeys(): Promise<ApiKeyInfo[]> {
  return apiRequest<ApiKeyInfo[]>('/auth/keys');
}

export function createKey(name: string): Promise<CreatedApiKey> {
  return apiRequest<CreatedApiKey>('/auth/keys', { method: 'POST', body: JSON.stringify({ name }) });
}

export function revokeKey(id: string): Promise<void> {
  return apiRequest<void>(`/auth/keys/${id}/revoke`, { method: 'POST' });
}
