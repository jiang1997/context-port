import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Button } from '@astryxdesign/core/Button';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { fetchMe, googleLoginUrl, logout, type SessionUser } from '../api/auth';
import { useI18n } from '../i18n';

function UserMenu({ user }: { user: SessionUser }) {
  const { t } = useI18n();
  const mutation = useMutation({
    mutationFn: logout,
    onSuccess: () => window.location.replace('/'),
  });
  return (
    <Stack direction="horizontal" gap={2} vAlign="center">
      <Avatar name={user.name ?? user.email} {...(user.avatarUrl ? { src: user.avatarUrl } : {})} size="sm" />
      <Text type="label" maxLines={1}>
        {user.name ?? user.email}
      </Text>
      <Button label={mutation.isPending ? t('@app.auth.signingOut') : t('@app.auth.signOut')} variant="ghost" size="sm" isDisabled={mutation.isPending} onClick={() => mutation.mutate()} />
    </Stack>
  );
}

export function useAuthSession() {
  return useQuery({ queryKey: ['auth', 'me'], queryFn: fetchMe, staleTime: 60_000 });
}

export function LoginButton() {
  const location = useLocation();
  const { t } = useI18n();
  return <Button label={t('@app.auth.signIn')} variant="primary" size="sm" href={googleLoginUrl(location.pathname)} />;
}

export function AuthStatus() {
  const { data, isLoading } = useAuthSession();
  if (isLoading) return <Skeleton width={108} height={28} radius="rounded" />;
  if (data?.user) return <UserMenu user={data.user} />;
  return <LoginButton />;
}
