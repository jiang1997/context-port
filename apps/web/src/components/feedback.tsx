import { useLocation } from 'react-router-dom';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Skeleton as AstryxSkeleton } from '@astryxdesign/core/Skeleton';
import { Stack } from '@astryxdesign/core/Stack';
import { googleLoginUrl, saveLoginFragment } from '../api/auth';
import { ApiError } from '../api/client';
import { useI18n, type AppMessageKey } from '../i18n';

const apiErrorMessages = new Map<string, AppMessageKey>([
  ['TEMPORARY_CONTEXT_FULL', '@app.error.temporaryFull'],
  ['TEMPORARY_CONTEXT_APPEND_SIZE', '@app.error.temporaryAppendSize'],
  ['TEMPORARY_CONTEXT_RATE_LIMITED', '@app.error.temporaryRateLimited'],
]);

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

export function SignedOutNotice() {
  const location = useLocation();
  const { t } = useI18n();
  const redirect = location.pathname + location.search + location.hash;
  return (
    <EmptyState
      title={t('@app.auth.signedOutTitle')}
      description={t('@app.auth.signedOutDescription')}
      actions={<Button label={t('@app.auth.signInWithGoogle')} variant="primary" href={googleLoginUrl(redirect)} onClick={() => saveLoginFragment(redirect)} />}
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
  const apiError = error instanceof ApiError ? error : undefined;
  const key = apiError?.code ? apiErrorMessages.get(apiError.code) : undefined;
  const description = key ? t(key) : apiError
    ? apiError.serverMessage ?? t('@app.error.requestFailed', { status: apiError.status })
    : error.message;
  return <Banner status="error" title={t('@app.common.somethingWentWrong')} description={description} container="card" />;
}
