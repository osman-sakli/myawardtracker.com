'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { Logo } from '@/components/ui/Logo';
import { Spinner } from '@/components/ui/Spinner';
import { getCurrentUser, type AuthUser } from '@/lib/auth';
import { isAuthConfigured } from '@/lib/env';

const AuthContext = createContext<AuthUser | null>(null);

/** The signed-in Cognito user. Only valid inside <AuthGuard>. */
export function useAuthUser(): AuthUser {
  const user = useContext(AuthContext);
  if (!user) throw new Error('useAuthUser must be used within <AuthGuard>');
  return user;
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;

    if (!isAuthConfigured) {
      // Without Cognito config the dashboard cannot authenticate anyone.
      router.replace('/login');
      return;
    }

    getCurrentUser()
      .then((u) => {
        if (!active) return;
        if (u) {
          setUser(u);
          setChecked(true);
        } else {
          const next = encodeURIComponent(window.location.pathname);
          router.replace(`/login?next=${next}`);
        }
      })
      .catch(() => active && router.replace('/login'));

    return () => {
      active = false;
    };
  }, [router]);

  if (!checked || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6">
        <Logo showWordmark={false} />
        <Spinner className="h-6 w-6 text-brand-soft" />
        <p className="text-sm text-content-subtle">Loading your dashboard…</p>
      </div>
    );
  }

  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}
