'use client';

import { Crown, Trophy } from 'lucide-react';

import { useOrgContext } from '@/components/dashboard/OrgContext';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { ErrorState, LoadingState } from '@/components/dashboard/PageState';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Progress } from '@/components/ui/Progress';
import { api } from '@/lib/api';
import { formatHours, initials } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';

export function LeaderboardView() {
  const { org } = useOrgContext();
  const board = useAsync(() => api.leaderboard(org.id));

  if (board.loading) return <LoadingState />;
  if (board.error || !board.data) {
    return (
      <ErrorState
        message={board.error ?? 'Failed to load leaderboard.'}
        onRetry={board.reload}
      />
    );
  }

  const rows = board.data.topMembers;
  const max = rows[0]?.hours || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Leaderboard · ${board.data.month}`}
        description={`Top contributors this month — ${formatHours(board.data.totalHours)} in total.`}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No hours yet this month"
          description="Hours show up here once the daily snapshot runs (02:00 UTC)."
        />
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {rows.map((row, i) => (
              <li
                key={row.userSub}
                className="flex items-center gap-4 px-5 py-3.5"
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-semibold ${
                    i === 0
                      ? 'bg-warning/20 text-warning'
                      : 'bg-surface-raised text-content-muted'
                  }`}
                >
                  {i === 0 ? <Crown className="h-4 w-4" /> : i + 1}
                </span>
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/12 text-xs font-semibold text-brand">
                  {initials(row.userName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-content">
                    {row.userName}
                  </p>
                  <div className="mt-1.5">
                    <Progress value={(row.hours / max) * 100} />
                  </div>
                </div>
                <span className="shrink-0 tabular-nums text-sm font-medium text-content">
                  {formatHours(row.hours)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
