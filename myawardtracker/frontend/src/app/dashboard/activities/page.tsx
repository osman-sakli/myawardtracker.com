'use client';

import {
  ACTIVITY_STATUSES,
  CATEGORY_BY_ID,
} from '@myawardtracker/shared';
import { Activity as ActivityIcon, Paperclip, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ActivityFormModal } from '@/components/dashboard/ActivityFormModal';
import { EvidenceModal } from '@/components/dashboard/EvidenceModal';
import { ErrorState, LoadingState } from '@/components/dashboard/PageState';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { categoryIcon } from '@/components/ui/CategoryIcon';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/form';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { formatDate, formatHours } from '@/lib/format';
import type { Activity } from '@/lib/types';
import { useAsync } from '@/lib/useAsync';

export default function ActivitiesPage() {
  const toast = useToast();
  const profiles = useAsync(() => api.listProfiles());
  const activities = useAsync(() => api.listActivities());

  const [profileFilter, setProfileFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [evidenceFor, setEvidenceFor] = useState<Activity | null>(null);
  const [toDelete, setToDelete] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState(false);

  const profileName = useMemo(() => {
    const map = new Map<string, string>();
    profiles.data?.profiles.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [profiles.data]);

  const filtered = useMemo(() => {
    const list = activities.data?.activities ?? [];
    return list
      .filter((a) => profileFilter === 'all' || a.profileId === profileFilter)
      .filter((a) => statusFilter === 'all' || a.status === statusFilter)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [activities.data, profileFilter, statusFilter]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (a: Activity) => {
    setEditing(a);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    setDeleting(true);
    api
      .deleteActivity(toDelete.id)
      .then(() => {
        activities.reload();
        toast('Activity deleted.', 'success');
        setToDelete(null);
      })
      .catch((e: unknown) =>
        toast(
          e instanceof Error ? e.message : 'Could not delete activity.',
          'error',
        ),
      )
      .finally(() => setDeleting(false));
  };

  const hasProfiles = (profiles.data?.profiles.length ?? 0) > 0;

  if (activities.loading || profiles.loading) return <LoadingState />;
  if (activities.error) {
    return (
      <ErrorState message={activities.error} onRetry={activities.reload} />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activities"
        description="Every logged activity across your profiles."
        action={
          <Button onClick={openNew} disabled={!hasProfiles}>
            <Plus className="h-4 w-4" />
            Log activity
          </Button>
        }
      />

      {!hasProfiles ? (
        <EmptyState
          icon={ActivityIcon}
          title="Create a profile first"
          description="Activities belong to a student profile. Add a profile to start logging."
          action={
            <Button onClick={() => (window.location.href = '/dashboard/profiles')}>
              Go to profiles
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="w-48">
              <Select
                value={profileFilter}
                onChange={(e) => setProfileFilter(e.target.value)}
              >
                <option value="all">All profiles</option>
                {profiles.data?.profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-44">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                {ACTIVITY_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={ActivityIcon}
              title="No activities to show"
              description="Log an activity or adjust the filters above."
              action={
                <Button onClick={openNew}>
                  <Plus className="h-4 w-4" />
                  Log activity
                </Button>
              }
            />
          ) : (
            <Card className="divide-y divide-border">
              {filtered.map((a) => {
                const cat = CATEGORY_BY_ID[a.categoryId];
                const Icon = categoryIcon(cat?.icon);
                return (
                  <div
                    key={a.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand/12 text-brand-soft">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-content">
                          {a.title}
                        </p>
                        <StatusBadge status={a.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-content-subtle">
                        {profileName.get(a.profileId) ?? 'Unknown profile'} ·{' '}
                        {cat?.label ?? a.categoryId} · {formatDate(a.date)} ·{' '}
                        {formatHours(a.hours)}
                        {a.evidenceCount > 0 &&
                          ` · ${a.evidenceCount} file${a.evidenceCount === 1 ? '' : 's'}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEvidenceFor(a)}
                        aria-label="Evidence"
                        className="rounded-lg p-2 text-content-subtle transition-colors hover:bg-surface-hover hover:text-content"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(a)}
                        aria-label="Edit"
                        className="rounded-lg p-2 text-content-subtle transition-colors hover:bg-surface-hover hover:text-content"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setToDelete(a)}
                        aria-label="Delete"
                        className="rounded-lg p-2 text-content-subtle transition-colors hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </>
      )}

      <ActivityFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        activity={editing}
        profiles={profiles.data?.profiles ?? []}
        defaultProfileId={profileFilter !== 'all' ? profileFilter : undefined}
        onSaved={() => activities.reload()}
      />

      <EvidenceModal
        open={Boolean(evidenceFor)}
        onClose={() => setEvidenceFor(null)}
        activity={evidenceFor}
        onChanged={() => activities.reload()}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete activity"
        message={`"${toDelete?.title}" and its attached evidence will be permanently deleted.`}
      />
    </div>
  );
}
