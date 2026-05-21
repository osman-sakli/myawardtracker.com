'use client';

import {
  ArrowRight,
  Clock,
  FileText,
  MessageSquare,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { useOrgContext } from '@/components/dashboard/OrgContext';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { ErrorState, LoadingState } from '@/components/dashboard/PageState';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Progress } from '@/components/ui/Progress';
import { api } from '@/lib/api';
import { formatHours } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';

export function OverviewView() {
  const { org, role, subscription } = useOrgContext();
  const summary = useAsync(() => api.orgSummary(org.id, 30));

  const tierLabel = useMemo(
    () => org.tier.charAt(0).toUpperCase() + org.tier.slice(1),
    [org.tier],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={org.name}
        description={
          org.description ||
          `${tierLabel} tier · ${org.memberCount} ${org.memberCount === 1 ? 'member' : 'members'}`
        }
        action={
          <div className="flex items-center gap-2">
            <Badge tone={role === 'owner' ? 'brand' : 'neutral'}>
              You are {role}
            </Badge>
            <Badge
              tone={
                subscription.status === 'active'
                  ? 'success'
                  : subscription.status === 'trialing'
                    ? 'warning'
                    : 'danger'
              }
            >
              {subscription.status === 'active' && `${subscription.daysRemaining}d left`}
              {subscription.status === 'trialing' &&
                `${subscription.daysRemaining}d trial`}
              {subscription.status === 'expired' && 'Subscription expired'}
            </Badge>
          </div>
        }
      />

      {summary.loading ? (
        <LoadingState />
      ) : summary.error || !summary.data ? (
        <ErrorState
          message={summary.error ?? 'Could not load dashboard.'}
          onRetry={summary.reload}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Hours (30d)"
              value={formatHours(summary.data.summary.totalHours)}
              icon={Clock}
              hint={`${formatHours(summary.data.summary.approvedHours)} approved`}
            />
            <StatCard
              label="Clock-ins"
              value={summary.data.summary.totalClockIns}
              icon={Clock}
            />
            <StatCard
              label="Active members"
              value={summary.data.summary.activeMembers}
              icon={Users}
              hint={`of ${org.memberCount} total`}
            />
            <StatCard
              label="Tier"
              value={tierLabel}
              icon={Users}
              hint={`${org.memberCount}/${capForTier(org.tier)} members`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-content">
                  Top contributors (30 days)
                </h3>
                <Link
                  href={`/dashboard/org/?id=${org.id}&tab=leaderboard`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-hover"
                >
                  Full leaderboard <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {summary.data.summary.topMembers.length === 0 ? (
                <p className="text-sm text-content-muted">
                  No clock sessions in the window yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {summary.data.summary.topMembers.slice(0, 5).map((m, idx) => {
                    const max = summary.data!.summary.topMembers[0].hours || 1;
                    return (
                      <li key={m.userSub} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-content">
                            <span className="mr-2 text-content-subtle">{idx + 1}.</span>
                            {m.userName || 'Member'}
                          </span>
                          <span className="tabular-nums text-content-muted">
                            {formatHours(m.hours)}
                          </span>
                        </div>
                        <Progress value={(m.hours / max) * 100} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="mb-4 text-base font-semibold text-content">
                Daily activity (last 14)
              </h3>
              <DailyMiniChart
                rows={summary.data.summary.daily.slice(-14)}
              />
            </Card>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <QuickLink
              href={`/dashboard/org/?id=${org.id}&tab=chat`}
              label="Open team chat"
              icon={MessageSquare}
            />
            <QuickLink
              href={`/dashboard/org/?id=${org.id}&tab=clock`}
              label="Clock in / out"
              icon={Clock}
            />
            <QuickLink
              href={`/dashboard/org/?id=${org.id}&tab=reports`}
              label="Generate report"
              icon={FileText}
            />
          </div>
        </>
      )}

      {subscription.status === 'expired' && (
        <Card className="border-warning/40 bg-warning/5 p-4 text-sm text-content">
          <p className="font-medium">This organization's subscription has lapsed.</p>
          <p className="mt-1 text-content-muted">
            Reads still work, but members can't post messages or log new clock sessions.
            {role === 'owner' || role === 'admin' ? (
              <>
                {' '}
                <Link
                  href={`/dashboard/org/?id=${org.id}&tab=billing`}
                  className="font-semibold text-brand hover:text-brand-hover"
                >
                  Renew now →
                </Link>
              </>
            ) : (
              ' Ask an owner or admin to renew.'
            )}
          </p>
        </Card>
      )}
    </div>
  );
}

function QuickLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-2xl border border-border bg-surface p-4 transition-colors hover:bg-surface-hover"
    >
      <span className="flex items-center gap-3 text-sm font-medium text-content">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand/12 text-brand">
          <Icon className="h-4 w-4" />
        </span>
        {label}
      </span>
      <ArrowRight className="h-4 w-4 text-content-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-content" />
    </Link>
  );
}

function DailyMiniChart({
  rows,
}: {
  rows: Array<{ date: string; hours: number; clockIns: number }>;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-content-muted">No daily snapshots yet — check back tomorrow.</p>
    );
  }
  const max = Math.max(1, ...rows.map((r) => r.hours));
  return (
    <div className="flex h-32 items-end gap-1.5">
      {rows.map((r) => {
        const height = Math.max(4, (r.hours / max) * 100);
        return (
          <div
            key={r.date}
            className="group flex flex-1 flex-col items-center justify-end"
            title={`${r.date}: ${formatHours(r.hours)} · ${r.clockIns} clock-ins`}
          >
            <div
              style={{ height: `${height}%` }}
              className="w-full rounded-t bg-brand/40 transition-colors group-hover:bg-brand"
            />
          </div>
        );
      })}
    </div>
  );
}

function capForTier(tier: string): number {
  if (tier === 'small') return 50;
  if (tier === 'medium') return 300;
  return 500;
}
