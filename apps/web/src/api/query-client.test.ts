import { afterEach, describe, expect, it } from 'vitest';
import { createQueryClient, accountQueryKey, sessionQueryKey } from './query-client';
import { ApiError } from './client';
import type { MeResponse } from './auth';

const session = (id: string): MeResponse => ({
  user: { id, email: `${id}@example.com`, name: id, avatarUrl: null }, csrfToken: 'csrf',
});

describe('private account cache lifecycle', () => {
  const clients: ReturnType<typeof createQueryClient>[] = [];
  function setup() {
    const client = createQueryClient();
    clients.push(client);
    client.setQueryData(sessionQueryKey, session('alice'));
    for (const type of ['contexts', 'context', 'thread', 'keys']) {
      client.setQueryData([...accountQueryKey('alice'), type], 'private');
    }
    client.setQueryData(['temporary-context', 'shared'], 'public');
    return client;
  }
  afterEach(() => { clients.splice(0).forEach(client => client.clear()); });

  it('clears every private query on 401 while preserving temporary contexts', async () => {
    const client = setup();
    let requests = 0;
    await expect(client.fetchQuery({
      queryKey: [...accountQueryKey('alice'), 'context'], staleTime: 0,
      queryFn: async () => { requests++; throw new ApiError(401, {}); },
    })).rejects.toMatchObject({ status: 401 });
    expect(requests).toBe(1);
    expect(client.getQueryData(sessionQueryKey)).toEqual({ user: null, csrfToken: null });
    expect(client.getQueryCache().findAll({ queryKey: ['account'] })).toHaveLength(0);
    expect(client.getQueryData(['temporary-context', 'shared'])).toBe('public');
  });

  it.each([null, 'bob'])('cleans previous user data when session refresh returns %s', async id => {
    const client = setup();
    await client.fetchQuery({ queryKey: sessionQueryKey, staleTime: 0,
      queryFn: async () => id ? session(id) : { user: null, csrfToken: null } });
    expect(client.getQueryCache().findAll({ queryKey: accountQueryKey('alice') })).toHaveLength(0);
    expect(client.getQueryData([...accountQueryKey('bob'), 'context'])).toBeUndefined();
    expect(client.getQueryData(['temporary-context', 'shared'])).toBe('public');
  });

  it('cancels pending reads so late responses cannot restore private data', async () => {
    const client = setup();
    let complete!: (value: string) => void;
    let signal!: AbortSignal;
    const pending = client.fetchQuery({
      queryKey: [...accountQueryKey('alice'), 'slow-context'],
      queryFn: context => { signal = context.signal; return new Promise<string>(resolve => { complete = resolve; }); },
    }).catch(() => undefined);
    await client.fetchQuery({ queryKey: sessionQueryKey, staleTime: 0,
      queryFn: async () => ({ user: null, csrfToken: null }) });
    expect(signal.aborted).toBe(true);
    complete('late private response');
    await pending;
    expect(client.getQueryCache().findAll({ queryKey: ['account'] })).toHaveLength(0);
  });

  it('does not log out the new user when an old account request fails', async () => {
    const client = setup();
    client.setQueryData(sessionQueryKey, session('bob'));
    await expect(client.fetchQuery({ queryKey: [...accountQueryKey('alice'), 'old'],
      queryFn: async () => { throw new ApiError(401, {}); } })).rejects.toMatchObject({ status: 401 });
    expect(client.getQueryData(sessionQueryKey)).toEqual(session('bob'));
  });

  it.each([403, 503])('does not end the session for HTTP %s', async status => {
    const client = setup();
    await expect(client.fetchQuery({ queryKey: [...accountQueryKey('alice'), 'context'],
      staleTime: 0, retry: false, queryFn: async () => { throw new ApiError(status, {}); },
    })).rejects.toMatchObject({ status });
    expect(client.getQueryData(sessionQueryKey)).toEqual(session('alice'));
  });

  it('handles unauthorized writes as well as reads', async () => {
    const client = setup();
    const mutation = client.getMutationCache().build(client, {
      mutationKey: [...accountQueryKey('alice'), 'create-thread'],
      mutationFn: async () => { throw new ApiError(401, {}); },
    });
    await expect(mutation.execute(undefined)).rejects.toMatchObject({ status: 401 });
    expect(client.getQueryData(sessionQueryKey)).toEqual({ user: null, csrfToken: null });
    expect(client.getQueryCache().findAll({ queryKey: ['account'] })).toHaveLength(0);
  });
});
