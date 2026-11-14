import { MutationCache, QueryCache, QueryClient, type QueryKey } from '@tanstack/react-query';
import { ApiError } from './client';
import type { MeResponse } from './auth';

export const sessionQueryKey = ['auth', 'me'] as const;
export const accountQueryKey = (userId: string | undefined) => ['account', userId] as const;

export function createQueryClient() {
  function clearAccountData(userId?: string) {
    const filters = { predicate: (query: { queryKey: QueryKey }) =>
      query.queryKey[0] === 'account' && (!userId || query.queryKey[1] === userId) };
    // Cancel before removing so late responses cannot repopulate private data.
    void client.cancelQueries(filters);
    client.removeQueries(filters);
  }

  function handleError(error: Error, key?: QueryKey) {
    if (!(error instanceof ApiError) || error.status !== 401 || key?.[0] !== 'account') return;
    const session = client.getQueryData<MeResponse>(sessionQueryKey);
    // An old account's in-flight request must not log out a newer account.
    if (session?.user?.id !== key[1]) return;
    client.setQueryData<MeResponse>(sessionQueryKey, { user: null, csrfToken: null });
    clearAccountData();
  }

  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => handleError(error, query.queryKey),
      onSuccess: (data, query) => {
        if (query.queryKey[0] !== 'auth' || query.queryKey[1] !== 'me') return;
        const userId = (data as MeResponse).user?.id;
        const filters = { predicate: (item: { queryKey: QueryKey }) =>
          item.queryKey[0] === 'account' && item.queryKey[1] !== userId };
        void client.cancelQueries(filters);
        client.removeQueries(filters);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => handleError(error, mutation.options.mutationKey),
    }),
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        retry: (count, error) => !(error instanceof ApiError && [401, 403].includes(error.status)) && count < 1,
      },
    },
  });
  return client;
}
