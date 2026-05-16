'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/cn';
import { DASHBOARD_NAV } from './nav';

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-6">
        <Link href="/" aria-label="My Award Tracker home">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {DASHBOARD_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-brand/12 text-content'
                  : 'text-content-muted hover:bg-surface-hover hover:text-content',
              )}
            >
              <item.icon
                className={cn('h-[1.05rem] w-[1.05rem]', active && 'text-brand-soft')}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl border border-border bg-bg-soft p-4">
        <p className="text-sm font-medium text-content">Need more profiles?</p>
        <p className="mt-1 text-xs text-content-muted">
          Upgrade your plan to track a whole family or group.
        </p>
        <Link
          href="/dashboard/billing"
          onClick={onNavigate}
          className="mt-3 inline-block text-xs font-semibold text-brand-soft hover:text-brand"
        >
          View plans →
        </Link>
      </div>
    </div>
  );
}
