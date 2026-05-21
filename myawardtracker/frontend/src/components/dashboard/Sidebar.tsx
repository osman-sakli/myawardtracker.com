'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/cn';
import { ORG_HOME, PERSONAL_NAV, orgNav, type NavItem } from './nav';

function isActive(pathname: string, href: string, currentTab: string | null): boolean {
  // Personal nav: exact / prefix match on pathname is enough.
  if (!href.startsWith('/dashboard/org/?')) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  // Org sub-nav: pathname matches and tab query matches.
  if (!pathname.startsWith('/dashboard/org')) return false;
  const url = new URL(href, 'https://x');
  const tab = url.searchParams.get('tab') ?? '';
  return (currentTab ?? '') === tab;
}

function NavLink({
  item,
  pathname,
  currentTab,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  currentTab: string | null;
  onNavigate?: () => void;
}) {
  const active = isActive(pathname, item.href, currentTab);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'bg-brand/10 text-content'
          : 'text-content-muted hover:bg-surface-hover hover:text-content',
      )}
    >
      <item.icon
        className={cn('h-[1.05rem] w-[1.05rem]', active && 'text-brand')}
      />
      {item.label}
    </Link>
  );
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const orgId = pathname.startsWith('/dashboard/org') ? search.get('id') : null;
  const currentTab = pathname.startsWith('/dashboard/org') ? search.get('tab') : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-6">
        <Link href="/" aria-label="My Award Tracker home">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {PERSONAL_NAV.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            currentTab={null}
            onNavigate={onNavigate}
          />
        ))}

        <div className="my-3 hairline" />
        <NavLink
          item={ORG_HOME}
          pathname={pathname}
          currentTab={null}
          onNavigate={onNavigate}
        />

        {orgId && (
          <div className="mt-2 space-y-1 border-l border-border pl-2">
            <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-content-subtle">
              This organization
            </p>
            {orgNav(orgId).map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                currentTab={currentTab}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </nav>

      <div className="m-3 rounded-xl border border-border bg-bg-soft p-4">
        <p className="text-sm font-medium text-content">Account access</p>
        <p className="mt-1 text-xs text-content-muted">
          Check your trial status or renew your year of access.
        </p>
        <Link
          href="/dashboard/billing"
          onClick={onNavigate}
          className="mt-3 inline-block text-xs font-semibold text-brand hover:text-brand-hover"
        >
          View billing →
        </Link>
      </div>
    </div>
  );
}

export function Sidebar(props: { onNavigate?: () => void }) {
  // Wrap useSearchParams in Suspense — required when the host page is in a
  // statically-exported tree.
  return (
    <Suspense fallback={<div className="h-full" />}>
      <SidebarInner {...props} />
    </Suspense>
  );
}
