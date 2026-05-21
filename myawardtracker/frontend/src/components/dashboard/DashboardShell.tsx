'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useState, type ReactNode } from 'react';

import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { navTitle } from './nav';

function ShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const tab = pathname.startsWith('/dashboard/org') ? search.get('tab') : null;
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-border bg-bg-soft lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-black/70"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative h-full w-72 animate-fade-in border-r border-border bg-bg-soft">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-col">
        <Topbar title={navTitle(pathname, tab)} onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-7 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ShellInner>{children}</ShellInner>
    </Suspense>
  );
}
