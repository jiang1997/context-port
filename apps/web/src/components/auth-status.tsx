import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { fetchMe, googleLoginUrl, logout, type SessionUser } from '../api/auth';

function UserMenu({ user }: { user: SessionUser }) {
  const mutation = useMutation({
    mutationFn: logout,
    // A full navigation discards every cached private query after the server
    // revokes the session, including details currently mounted off-screen.
    onSuccess: () => window.location.replace('/'),
  });
  return (
    <span className="user-menu" title={user.email}>
      {user.avatarUrl
        ? <img className="user-avatar" src={user.avatarUrl} alt="" width={24} height={24} referrerPolicy="no-referrer" />
        : <span className="user-avatar user-avatar-fallback" aria-hidden>{user.email.slice(0, 1).toUpperCase()}</span>}
      <span className="user-name">{user.name ?? user.email}</span>
      <button type="button" className="user-logout" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        退出
      </button>
    </span>
  );
}

export function useAuthSession() {
  return useQuery({ queryKey: ['auth', 'me'], queryFn: fetchMe, staleTime: 60_000 });
}

export function LoginButton() {
  const location = useLocation();
  return (
    <a className="button button-small" href={googleLoginUrl(location.pathname)} rel="noreferrer">
      Google 登录
    </a>
  );
}

export function AuthStatus() {
  const { data, isLoading } = useAuthSession();
  if (isLoading) return <span className="auth-loading">…</span>;
  if (data?.user) return <UserMenu user={data.user} />;
  return <LoginButton />;
}
