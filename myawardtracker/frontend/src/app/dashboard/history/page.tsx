'use client';

import {
  FilePlus2,
  FileX2,
  History as HistoryIcon,
  PencilLine,
  Upload,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { ErrorState, LoadingState } from '@/components/dashboard/PageState';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';

function actionMeta(action: string): { icon: LucideIcon; label: string } {
  const verb = action.split(/[._]/).pop() ?? action;
  if (verb.startsWith('creat'))
    return { icon: FilePlus2, label: 'Created' };
  if (verb.startsWith('updat'))
    return { icon: PencilLine, label: 'Updated' };
  if (verb.startsWith('delet'))
    return { icon: FileX2, label: 'Deleted' };
  if (verb.startsWith('upload'))
    return { icon: Upload, label: 'Uploaded' };
  return { icon: HistoryIcon, label: 'Activity' };
}

function humanize(value: string): string {
  return value
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function HistoryPage() {
  const audit = useAsync(() => api.listAudit());

  if (audit.loading) return <LoadingState />;
  if (audit.error) {
    return <ErrorState message={audit.error} onRetry={audit.reload} />;
  }

  const entries = audit.data?.audit ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="History"
        description="A running log of every change made to your account."
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No history yet"
          description="Changes to profiles, activities, and evidence will appear here."
        />
      ) : (
        <Card className="divide-y divide-border">
          {entries.map((e) => {
            const { icon: Icon, label } = actionMeta(e.action);
            return (
              <div key={e.id} className="flex items-start gap-3 p-4">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-raised text-content-muted">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-content">
                    <span className="font-medium">{label}</span>{' '}
                    <span className="text-content-muted">
                      {humanize(e.targetType)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-content-subtle">
                    {formatDateTime(e.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
