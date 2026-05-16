'use client';

import { LogOut, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useAuthUser } from '@/components/dashboard/AuthGuard';
import { initials } from '@/lib/format';
import { signOut } from '@/lib/auth';

export function Topbar({
  title,
  onMenu,
}: {
  title: string;
  onMenu: () => void;
}) {
  const user = useAuthUser();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleSignOut = () => {
    signOut();
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-bg/85 px-5 backdrop-blur-xl sm:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open menu"
          className="rounded-lg p-2 text-content-muted hover:bg-surface-hover lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-content">{title}</h1>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-2 py-1.5 transition-colors hover:border-border-strong"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-soft text-xs font-semibold text-white">
            {initials(user.name || user.email)}
          </span>
          <span className="hidden max-w-[160px] truncate text-sm text-content sm:block">
            {user.name || user.email}
          </span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-surface-raised p-1.5 shadow-glow animate-scale-in">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium text-content">
                {user.name || 'Your account'}
              </p>
              <p className="truncate text-xs text-content-subtle">{user.email}</p>
            </div>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-content-muted transition-colors hover:bg-surface-hover hover:text-content"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
