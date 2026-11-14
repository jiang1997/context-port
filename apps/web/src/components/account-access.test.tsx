import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient, sessionQueryKey, accountQueryKey } from '../api/query-client';
import { ApiError } from '../api/client';
import { AccountAccess } from './account-access';

vi.mock('./auth-status', () => ({
  useAuthSession: () => useQuery({ queryKey: sessionQueryKey, queryFn: async () => ({ user: null }) }),
}));
vi.mock('./feedback', () => ({
  SignedOutNotice: () => <span>Sign in</span>,
  Skeleton: () => <span>Loading</span>,
  ErrorNotice: () => <span>Error</span>,
}));

describe('account access', () => {
  const client = createQueryClient();
  afterEach(() => client.clear());
  const render = () => renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <AccountAccess><div>Private document and form</div></AccountAccess>
    </QueryClientProvider>,
  );

  it('does not render private children until the session is known', () => {
    expect(render()).toBe('<span>Loading</span>');
  });

  it('does not render private children for a signed-out session', () => {
    client.setQueryData(sessionQueryKey, { user: null, csrfToken: null });
    expect(render()).toBe('<span>Sign in</span>');
  });

  it('hides already displayed content after a document request returns 401', async () => {
    client.setQueryData(sessionQueryKey, { user: { id: 'alice' }, csrfToken: 'csrf' });
    expect(render()).toContain('Private document and form');
    await expect(client.fetchQuery({ queryKey: [...accountQueryKey('alice'), 'context', 'id'],
      queryFn: async () => { throw new ApiError(401, {}); },
    })).rejects.toMatchObject({ status: 401 });
    expect(render()).toBe('<span>Sign in</span>');
  });
});
