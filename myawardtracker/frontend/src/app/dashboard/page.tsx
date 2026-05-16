'use client';

import { CATEGORY_BY_ID } from '@myawardtracker/shared';
import { Activity, Award, Clock, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { ActivityFormModal } from '@/components/dashboard/ActivityFormModal';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { useAuthUser } from '@/components/dashboard/AuthGuard';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { categoryIcon } from '@/components/ui/CategoryIcon';
import { EmptyState } from '@/components/ui/EmptyState';
import { Progress } from '@/components/ui/Progress';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api } from '@/lib/api';
import { formatDate, formatHours } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';

export default function OverviewPage() {
  const user = useAuthUser();
  const summary = useAsync(() => api.getSummary());
  const profiles = useAsync(() => api.listProfiles());
  const [logOpen, setLogOpen] = useState(false);

  const firstName = user.name?.split(' ')[0] || 'there';

  if (summary.loading) return <LoadingState />;
  if (summary.error || !summary.data) {
    return <ErrorState message={summary.error ?? 'No data.'} onRetry={summary.reload} />;
  }

  const s = summary.data;
  const topCategories = [...s.categoryBreakdown]
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);
  const maxHours = Math.max(1, ...topCategories.map((c) => c.hours));

  return (
    <div className="space-y-7">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="A snapshot of every student's progress across your account."
        action={
          <Button onClick={() => setLogOpen(true)}>
            <Plus className="h-4 w-4" />
            Log activity
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Profiles" value={s.profileCount} icon={Users} />
        <StatCard label="Activities" value={s.activityCount} icon={Activity} />
        <StatCard
          label="Total hours"
          value={formatHours(s.totalHours)}
          icon={Clock}
        />
        <StatCard
          label="Verified"
          value={s.statusCounts.verified ?? 0}
          icon={Award}
          hint="Activities confirmed with evidence"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <h3 className="text-sm font-semibold text-content">
              Hours by category
            </h3>
            <Link
              href="/dashboard/activities"
              className="text-xs font-medium text-brand-soft hover:underline"
            >
              View activities
            </Link>
          </CardHeader>
          <CardBody>
            {topCategories.length === 0 ? (
              <p className="py-6 text-center text-sm text-content-subtle">
                Log an activity to see your category breakdown.
              </p>
            ) : (
              <ul className="space-y-4">
                {topCategories.map((c) => {
                  const Icon = categoryIcon(CATEGORY_BY_ID[c.categoryId]?.icon);
                  return (
                    <li key={c.categoryId}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-content">
                          <Icon className="h-4 w-4 text-brand-soft" />
                          {c.label}
                        </span>
                        <span className="text-content-muted">
                          {formatHours(c.hours)} · {c.activityCount}
                        </span>
                      </div>
                      <Progress value={(c.hours / maxHours) * 100} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="text-sm font-semibold text-content">
              Award progress
            </h3>
            <Link
              href="/dashboard/awards"
              className="text-xs font-medium text-brand-soft hover:underline"
            >
              All programs
            </Link>
          </CardHeader>
          <CardBody>
            {s.awardProgress.filter((a) => a.activityCount > 0).length === 0 ? (
              <p className="py-6 text-center text-sm text-content-subtle">
                No award programs have activity yet.
              </p>
            ) : (
              <ul className="space-y-4">
                {s.awardProgress
                  .filter((a) => a.activityCount > 0)
                  .slice(0, 4)
                  .map((a) => (
                    <li key={a.programId}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="text-content">{a.name}</span>
                        <span className="text-content-muted">
                          {a.percentComplete !== null
                            ? `${Math.round(a.percentComplete)}%`
                            : formatHours(a.hours)}
                        </span>
                      </div>
                      <Progress
                        value={a.percentComplete ?? 0}
                        tone="success"
                      />
                    </li>
                  ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-content">
            Recent activities
          </h3>
        </CardHeader>
        <CardBody>
          {s.recentActivities.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No activities yet"
              description="Log your first activity to start tracking hours and award progress."
              action={
                <Button onClick={() => setLogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Log activity
                </Button>
              }
              className="border-0 bg-transparent py-6"
            />
          ) : (
            <ul className="divide-y divide-border">
              {s.recentActivities.map((a) => {
                const Icon = categoryIcon(CATEGORY_BY_ID[a.categoryId]?.icon);
                return (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/12 text-brand-soft">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-content">
                        {a.title}
                      </p>
                      <p className="text-xs text-content-subtle">
                        {formatDate(a.date)} · {formatHours(a.hours)}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <ActivityFormModal
        open={logOpen}
        onClose={() => setLogOpen(false)}
        profiles={profiles.data?.profiles ?? []}
        onSaved={() => {
          summary.reload();
        }}
      />
    </div>
  );
}
