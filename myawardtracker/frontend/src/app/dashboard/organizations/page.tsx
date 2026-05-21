'use client';

import { Building2, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { PageHeader } from '@/components/dashboard/PageHeader';
import { ErrorState, LoadingState } from '@/components/dashboard/PageState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { roleLabel } from '@/lib/rbac';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';

import { CreateOrgModal } from './CreateOrgModal';

export default function OrganizationsPage() {
  const memberships = useAsync(() => api.listOrgs());
  const [createOpen, setCreateOpen] = useState(false);

  if (memberships.loading) return <LoadingState />;
  if (memberships.error || !memberships.data) {
    return (
      <ErrorState
        message={memberships.error ?? 'Failed to load organizations.'}
        onRetry={memberships.reload}
      />
    );
  }

  const rows = memberships.data.memberships;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        description="Clubs, schools, and groups you belong to or own."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New organization
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="You haven't joined or created any organizations yet"
          description="Start one for your club, scout troop, school, or nonprofit. Members never pay — only the owner does."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create organization
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map(({ org, role }) => (
            <Link
              key={org.id}
              href={`/dashboard/org/?id=${org.id}`}
              className="block transition-transform hover:-translate-y-0.5"
            >
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-content">{org.name}</h3>
                    <p className="mt-1 text-xs uppercase tracking-wide text-content-subtle">
                      {org.type.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <Badge tone={role === 'owner' ? 'brand' : 'neutral'}>
                    {roleLabel(role)}
                  </Badge>
                </div>
                {org.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-content-muted">
                    {org.description}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between text-xs text-content-subtle">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {org.memberCount} {org.memberCount === 1 ? 'member' : 'members'}
                  </span>
                  <span className="rounded-full bg-surface-raised px-2 py-0.5 capitalize">
                    {org.tier} tier
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateOrgModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          memberships.reload();
        }}
      />
    </div>
  );
}
