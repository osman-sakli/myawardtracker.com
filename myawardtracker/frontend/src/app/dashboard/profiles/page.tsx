'use client';

import { AWARD_PROGRAM_BY_ID } from '@myawardtracker/shared';
import { GraduationCap, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';

import { ErrorState, LoadingState } from '@/components/dashboard/PageState';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { ProfileFormModal } from '@/components/dashboard/ProfileFormModal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { initials } from '@/lib/format';
import type { Profile } from '@/lib/types';
import { useAsync } from '@/lib/useAsync';

export default function ProfilesPage() {
  const toast = useToast();
  const profiles = useAsync(() => api.listProfiles());

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [toDelete, setToDelete] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (p: Profile) => {
    setEditing(p);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    setDeleting(true);
    api
      .deleteProfile(toDelete.id)
      .then(() => {
        profiles.reload();
        toast('Profile deleted.', 'success');
        setToDelete(null);
      })
      .catch((e: unknown) =>
        toast(
          e instanceof Error ? e.message : 'Could not delete profile.',
          'error',
        ),
      )
      .finally(() => setDeleting(false));
  };

  if (profiles.loading) return <LoadingState />;
  if (profiles.error) {
    return <ErrorState message={profiles.error} onRetry={profiles.reload} />;
  }

  const list = profiles.data?.profiles ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profiles"
        description="Each profile represents one student whose activities you track."
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            New profile
          </Button>
        }
      />

      {list.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No profiles yet"
          description="Create a profile for each student you want to track."
          action={
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" />
              New profile
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((p) => (
            <Card key={p.id}>
              <CardBody className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/15 text-sm font-semibold text-brand-soft">
                    {initials(p.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-content">
                      {p.name}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-content-subtle">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {[p.gradeLevel, p.schoolName]
                        .filter(Boolean)
                        .join(' · ') || 'No school details'}
                      {p.graduationYear ? ` · Class of ${p.graduationYear}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      aria-label="Edit"
                      className="rounded-lg p-2 text-content-subtle transition-colors hover:bg-surface-hover hover:text-content"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setToDelete(p)}
                      aria-label="Delete"
                      className="rounded-lg p-2 text-content-subtle transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {p.awardPrograms && p.awardPrograms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {p.awardPrograms.map((id) => (
                      <Badge key={id} tone="brand">
                        {AWARD_PROGRAM_BY_ID[id]?.name ?? id}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <ProfileFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        profile={editing}
        onSaved={() => profiles.reload()}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete profile"
        message={`Deleting "${toDelete?.name}" also removes all of their activities and evidence. This cannot be undone.`}
      />
    </div>
  );
}
