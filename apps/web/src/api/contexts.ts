import type {
  CreateSharedContextInput,
  SharedContext,
  UpdateSharedContextInput,
} from '@contextport/contracts';
import { apiRequest } from './client';

export function listContexts() {
  return apiRequest<SharedContext[]>('/contexts');
}

export function getContext(contextId: string) {
  return apiRequest<SharedContext>(`/contexts/${contextId}`);
}

export function createContext(input: CreateSharedContextInput) {
  return apiRequest<SharedContext>('/contexts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateContext(contextId: string, input: UpdateSharedContextInput) {
  return apiRequest<SharedContext>(`/contexts/${contextId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteContext(contextId: string) {
  return apiRequest<void>(`/contexts/${contextId}`, { method: 'DELETE' });
}
