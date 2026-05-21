'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/dashboard/PageHeader';
import { ErrorState, LoadingState } from '@/components/dashboard/PageState';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { relativeTime } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';

export default function NotificationsPage() {
  const state = useAsync(() => api.listNotifications());

  if (state.loading) return <LoadingState />;
  if (state.error || !state.data) {
    return (
      <ErrorState
        message={state.error ?? 'Failed to load notifications.'}
        onRetry={state.reload}
      />
    );
  }

  const items = state.data.notifications;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Mentions, clock decisions, invites, and report-ready messages. Auto-clears after 30 days."
      />
      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="When something needs your attention, it'll show up here."
        />
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {items.map((n) => {
              const Wrapper: React.ElementType = n.href ? Link : 'div';
              return (
                <li key={n.id}>
                  <Wrapper
                    {...(n.href ? { href: n.href } : {})}
                    className={cn(
                      'flex items-start gap-3 px-5 py-3.5 text-sm',
                      n.href && 'transition-colors hover:bg-surface-hover',
                      !n.read && 'bg-brand/[0.04]',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                        n.read ? 'bg-border-strong' : 'bg-brand',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-content">{n.title}</p>
                      {n.body && (
                        <p className="mt-0.5 line-clamp-2 text-content-muted">{n.body}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-content-subtle">
                      {relativeTime(n.createdAt)}
                    </span>
                  </Wrapper>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
