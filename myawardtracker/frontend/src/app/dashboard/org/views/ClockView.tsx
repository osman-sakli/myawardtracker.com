'use client';

import { Clock, LogIn, LogOut, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useOrgContext } from '@/components/dashboard/OrgContext';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { ErrorState, LoadingState } from '@/components/dashboard/PageState';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField, Input, Textarea } from '@/components/ui/form';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { formatDateTime, formatHours, relativeTime } from '@/lib/format';
import { roleHas } from '@/lib/rbac';
import type { ClockSession } from '@/lib/types';
import { useAsync } from '@/lib/useAsync';

const STATUS_TONES: Record<ClockSession['status'], BadgeTone> = {
  open: 'info',
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

export function ClockView() {
  const { org, role } = useOrgContext();
  const canApprove = roleHas(role, 'clock:approve');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clock in / out"
        description="Track volunteer, leadership, or work hours for this organization."
      />
      <MyClockCard orgId={org.id} />
      {canApprove && <ApprovalQueue orgId={org.id} />}
    </div>
  );
}

function MyClockCard({ orgId }: { orgId: string }) {
  const state = useAsync(() => api.mySessions(orgId));
  const [activityType, setActivityType] = useState('Volunteer service');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  // Live tick for the open-session timer.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (state.loading) return <LoadingState />;
  if (state.error || !state.data) {
    return (
      <ErrorState
        message={state.error ?? 'Could not load your clock sessions.'}
        onRetry={state.reload}
      />
    );
  }

  const open = state.data.open;
  const sessions = state.data.sessions;

  const startedMs = open ? new Date(open.startedAt).getTime() : 0;
  const liveHours = open ? Math.max(0, (now - startedMs) / 3600_000) : 0;

  const clockIn = async () => {
    setBusy(true);
    try {
      await api.clockIn(orgId, { activityType, notes: notes.trim() || undefined });
      toast('Clocked in', 'success');
      setNotes('');
      state.reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to clock in.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const clockOut = async () => {
    setBusy(true);
    try {
      await api.clockOut(orgId, { notes: notes.trim() || undefined });
      toast('Clocked out — session pending approval.', 'success');
      setNotes('');
      state.reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to clock out.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card className="p-5">
        {open ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-content-subtle">
                  Clocked in
                </p>
                <p className="text-lg font-semibold text-content">{open.activityType}</p>
                <p className="text-xs text-content-muted">
                  Since {formatDateTime(open.startedAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-semibold tabular-nums text-brand">
                  {formatHours(liveHours)}
                </p>
                <p className="text-xs text-content-subtle">elapsed</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional note for the session"
                className="min-h-[44px]"
                maxLength={1000}
              />
              <Button onClick={clockOut} loading={busy} variant="primary" size="lg">
                <LogOut className="h-4 w-4" />
                Clock out
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/12 text-brand">
                <Clock className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-content">Ready to clock in</p>
                <p className="text-xs text-content-muted">
                  Pick what you're doing and start tracking hours.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <FormField label="Activity type">
                <Input
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  required
                  maxLength={80}
                />
              </FormField>
              <FormField label="Note">
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional"
                  maxLength={1000}
                />
              </FormField>
              <Button
                onClick={clockIn}
                loading={busy}
                size="lg"
                className="self-end"
                disabled={!activityType.trim()}
              >
                <LogIn className="h-4 w-4" />
                Clock in
              </Button>
            </div>
          </>
        )}
      </Card>

      <Card>
        <div className="border-b border-border px-5 py-3 text-sm font-semibold">
          Your recent sessions
        </div>
        {sessions.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No sessions yet"
            description="Clock in above to start tracking hours."
            className="rounded-none border-0"
          />
        ) : (
          <ul className="divide-y divide-border">
            {sessions.slice(0, 25).map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function SessionRow({
  session,
  action,
}: {
  session: ClockSession;
  action?: React.ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium text-content">{session.activityType}</p>
        <p className="text-xs text-content-subtle">
          {session.userName ? <>{session.userName} · </> : null}
          {formatDateTime(session.startedAt)}
          {session.endedAt && (
            <>
              {' '}
              → {relativeTime(session.endedAt)}
            </>
          )}
        </p>
        {session.notes && (
          <p className="mt-1 line-clamp-2 text-xs text-content-muted">{session.notes}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="tabular-nums text-content">{formatHours(session.hours ?? 0)}</span>
        <Badge tone={STATUS_TONES[session.status]}>{session.status}</Badge>
        {action}
      </div>
    </li>
  );
}

function ApprovalQueue({ orgId }: { orgId: string }) {
  const queue = useAsync(() => api.orgSessions(orgId));
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (queue.loading) {
    return (
      <Card className="p-5">
        <p className="text-sm text-content-muted">Loading approval queue…</p>
      </Card>
    );
  }
  if (queue.error || !queue.data) {
    return (
      <ErrorState
        message={queue.error ?? 'Failed to load approval queue.'}
        onRetry={queue.reload}
      />
    );
  }

  // The SK is reconstructible from sessionId + startedAt + userSub.
  const sessionSk = (s: ClockSession) =>
    `CLOCK#${s.userSub}#${s.startedAt}#${s.id}`;

  const decide = async (s: ClockSession, decision: 'approve' | 'reject') => {
    setBusyId(s.id);
    try {
      await api.decideSession(orgId, s.userSub, sessionSk(s), { decision });
      toast(`Session ${decision}d`, decision === 'approve' ? 'success' : 'info');
      queue.reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Action failed.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const pending = queue.data.sessions.filter((s) => s.status === 'pending');

  return (
    <Card>
      <div className="border-b border-border px-5 py-3 text-sm font-semibold">
        Approval queue
        <span className="ml-2 text-xs font-normal text-content-subtle">
          ({pending.length} awaiting)
        </span>
      </div>
      {pending.length === 0 ? (
        <div className="px-5 py-6 text-sm text-content-muted">
          Nothing waiting — you're all caught up.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {pending.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              action={
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => decide(s, 'reject')}
                    disabled={busyId === s.id}
                    aria-label="Reject"
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => decide(s, 'approve')}
                    disabled={busyId === s.id}
                    aria-label="Approve"
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                </div>
              }
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
