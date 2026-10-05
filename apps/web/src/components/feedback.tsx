import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Skeleton as AstryxSkeleton } from '@astryxdesign/core/Skeleton';
import { Stack } from '@astryxdesign/core/Stack';
import { googleLoginUrl } from '../api/auth';
import { useI18n } from '../i18n';

export function Skeleton({ lines = 3, heading = false }: { lines?: number; heading?: boolean }) {
  return (
    <Stack gap={2}>
      {heading && <AstryxSkeleton width="45%" height={28} />}
      {Array.from({ length: lines }, (_, index) => (
        <AstryxSkeleton key={index} index={index} width="100%" height={16} />
      ))}
    </Stack>
  );
}

export function LoadingList({ rows = 3 }: { rows?: number }) {
  return (
    <Stack gap={3}>
      {Array.from({ length: rows }, (_, index) => (
        <Stack key={index} gap={2}>
          <AstryxSkeleton width="40%" height={22} index={index} />
          <AstryxSkeleton width="100%" height={16} index={index + 1} />
        </Stack>
      ))}
    </Stack>
  );
}

export function Notice({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  // EmptyState only takes a string description, so rich children (lists,
  // links, markup) render below the empty state instead of being dropped.
  const description = typeof children === 'string' ? children : null;
  return (
    <Stack gap={2}>
      <EmptyState
        title={title}
        {...(description != null ? { description } : {})}
        actions={action}
      />
      {typeof children === 'string' ? null : children}
    </Stack>
  );
}

export function SignedOutNotice() {
  const location = useLocation();
  const { t } = useI18n();
  return (
    <EmptyState
      title={t('@app.auth.signedOutTitle')}
      description={t('@app.auth.signedOutDescription')}
      actions={<Button label={t('@app.auth.signInWithGoogle')} variant="primary" href={googleLoginUrl(location.pathname + location.search + location.hash)} />}
    />
  );
}

export function LoginResultNotice() {
  const { search } = useLocation();
  const { t } = useI18n();
  const result = new URLSearchParams(search).get('login');
  if (result !== 'failed' && result !== 'denied') return null;
  return <Banner status={result === 'denied' ? 'warning' : 'error'} title={t(result === 'denied' ? '@app.auth.loginDenied' : '@app.auth.loginFailed')} container="card" />;
}

export function ErrorNotice({ error }: { error: Error | null }) {
  const { t } = useI18n();
  if (!error) return null;
  return <Banner status="error" title={t('@app.common.somethingWentWrong')} description={error.message} container="card" />;
}
