import type { PropsWithChildren } from 'react';
import { useLocation } from 'react-router-dom';
import { AppShell as AstryxAppShell } from '@astryxdesign/core/AppShell';
import { TopNav, TopNavHeading, TopNavItem } from '@astryxdesign/core/TopNav';
import { AuthStatus } from './auth-status';

export function AppShellLayout({ children }: PropsWithChildren) {
  const location = useLocation();
  const path = location.pathname;
  return (
    <AstryxAppShell
      variant="section"
      height="auto"
      contentPadding={4}
      topNav={
        <TopNav
          label="Main navigation"
          heading={<TopNavHeading heading="ContextPort" headingHref="/" />}
          endContent={<AuthStatus />}
        >
          <TopNavItem href="/" label="Temporary Context" isSelected={path === '/'} />
          <TopNavItem href="/contexts" label="My Contexts" isSelected={path.startsWith('/contexts')} />
          <TopNavItem href="/keys" label="API Keys" isSelected={path.startsWith('/keys')} />
        </TopNav>
      }
    >
      {children}
    </AstryxAppShell>
  );
}

// Keep old name for routes.tsx compatibility.
export const AppShellWrapper = AppShellLayout;
export { AppShellLayout as AppShell };
