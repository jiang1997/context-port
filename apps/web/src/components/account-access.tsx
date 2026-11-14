import { Fragment, type PropsWithChildren } from 'react';
import { useAuthSession } from './auth-status';
import { ErrorNotice, SignedOutNotice, Skeleton } from './feedback';

/** Unmount private content and local drafts when the active account changes. */
export function AccountAccess({ children }: PropsWithChildren) {
  const auth = useAuthSession();
  if (auth.isPending) return <Skeleton lines={6} heading />;
  if (!auth.data?.user) return auth.error ? <ErrorNotice error={auth.error} /> : <SignedOutNotice />;
  return <Fragment key={auth.data.user.id}>{children}</Fragment>;
}
