'use client';

import { AWARD_PROGRAM_BY_ID } from '@myawardtracker/shared';
import { Award, CheckCircle2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ErrorState, LoadingState } from '@/components/dashboard/PageState';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/form';
import { Progress } from '@/components/ui/Progress';
import { api } from '@/lib/api';
import { formatHours } from '@/lib/format';
import type { DashboardSummary } from '@/lib/types';
import { useAsync } from '@/lib/useAsync';

export default function AwardsPage() {
  const profiles = useAsync(() => api.listProfiles());
  const [profileId, setProfileId] = useState('all');
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .getSummary(profileId === 'all' ? undefined : profileId)
      .then(setData)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Could not load progress.'),
      )
      .finally(() => setLoading(false));
  }, [profileId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const rows = data?.awardProgress ?? [];
  const active = rows.filter((r) => r.activityCount > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Award progress"
        description="Track how logged activities accumulate toward each award program."
        action={
          <div className="w-52">
            <Select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
            >
              <option value="all">All profiles</option>
              {profiles.data?.profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      {active.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No award progress yet"
          description="Map activities to award programs when you log them to see progress here."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {active.map((r) => {
            const def = AWARD_PROGRAM_BY_ID[r.programId];
            const complete =
              r.percentComplete !== null && r.percentComplete >= 100;
            return (
              <Card key={r.programId}>
                <CardBody className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-content">
                        {r.name}
                      </p>
                      {def?.description && (
                        <p className="mt-0.5 text-xs text-content-subtle">
                          {def.description}
                        </p>
                      )}
                    </div>
                    {complete ? (
                      <Badge tone="success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Complete
                      </Badge>
                    ) : (
                      <Badge tone="brand">{r.activityCount} logged</Badge>
                    )}
                  </div>

                  {r.goalHours !== null ? (
                    <>
                      <Progress
                        value={r.percentComplete ?? 0}
                        tone={complete ? 'success' : 'brand'}
                      />
                      <div className="flex items-center justify-between text-xs text-content-muted">
                        <span>
                          {formatHours(r.hours)} of {formatHours(r.goalHours)}
                        </span>
                        <span>
                          {r.percentComplete !== null
                            ? `${Math.round(r.percentComplete)}%`
                            : '—'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-content-muted">
                      {formatHours(r.hours)} logged across {r.activityCount}{' '}
                      {r.activityCount === 1 ? 'activity' : 'activities'}
                    </p>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
