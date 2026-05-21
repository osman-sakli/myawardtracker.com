'use client';

import { Download, FileText, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useOrgContext } from '@/components/dashboard/OrgContext';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { ErrorState, LoadingState } from '@/components/dashboard/PageState';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField, Input, Select } from '@/components/ui/form';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { roleHas } from '@/lib/rbac';
import type { ReportJob } from '@/lib/types';
import { useAsync } from '@/lib/useAsync';

const KIND_LABELS: Record<string, string> = {
  volunteer_summary: 'Volunteer summary',
  leadership: 'Leadership report',
  participation: 'Participation',
  attendance: 'Attendance',
  org_contribution: 'Organization contribution',
  student_timeline: 'Student timeline',
};

const STATUS_TONE: Record<ReportJob['status'], BadgeTone> = {
  queued: 'neutral',
  running: 'info',
  done: 'success',
  failed: 'danger',
};

export function ReportsView() {
  const { org, role } = useOrgContext();
  const reports = useAsync(() => api.listReports(org.id));
  const [createOpen, setCreateOpen] = useState(false);
  const canGenerate = roleHas(role, 'reports:generate');

  // Poll while any job is queued/running.
  useEffect(() => {
    const anyPending = reports.data?.jobs.some(
      (j) => j.status === 'queued' || j.status === 'running',
    );
    if (!anyPending) return undefined;
    const id = setInterval(() => reports.reload(), 5000);
    return () => clearInterval(id);
  }, [reports]);

  if (reports.loading) return <LoadingState />;
  if (reports.error || !reports.data) {
    return (
      <ErrorState
        message={reports.error ?? 'Failed to load reports.'}
        onRetry={reports.reload}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Exports run in the background. Downloads stay live for 7 days."
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={reports.reload}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            {canGenerate && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                New report
              </Button>
            )}
          </div>
        }
      />

      {reports.data.jobs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          description={
            canGenerate
              ? 'Generate your first volunteer summary or leadership report.'
              : 'Ask a manager or admin to generate one.'
          }
          action={
            canGenerate ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Generate report
              </Button>
            ) : null
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {reports.data.jobs.map((job) => (
              <li
                key={job.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-content">
                    {KIND_LABELS[job.kind] ?? job.kind} · {job.format.toUpperCase()}
                  </p>
                  <p className="text-xs text-content-subtle">
                    {job.from} → {job.to} · requested {formatDateTime(job.createdAt)}
                  </p>
                  {job.error && (
                    <p className="mt-1 text-xs text-danger">{job.error}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge tone={STATUS_TONE[job.status]}>{job.status}</Badge>
                  {job.status === 'done' && job.downloadUrl && (
                    <a
                      href={job.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-content hover:bg-surface-hover"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {canGenerate && (
        <CreateReportModal
          open={createOpen}
          orgId={org.id}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            reports.reload();
          }}
        />
      )}
    </div>
  );
}

function CreateReportModal({
  open,
  orgId,
  onClose,
  onCreated,
}: {
  open: boolean;
  orgId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const [kind, setKind] = useState('volunteer_summary');
  const [format, setFormat] = useState<'csv' | 'pdf'>('pdf');
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.createReport(orgId, { kind, format, from, to });
      toast('Report queued — it will appear in the list shortly.', 'success');
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue report.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title="Generate report">
      <form onSubmit={submit} className="space-y-4">
        <FormField label="Report type">
          <Select value={kind} onChange={(e) => setKind(e.target.value)}>
            {Object.entries(KIND_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="From">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
          </FormField>
          <FormField label="To">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} required />
          </FormField>
        </div>
        <FormField label="Format">
          <Select value={format} onChange={(e) => setFormat(e.target.value as 'csv' | 'pdf')}>
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
          </Select>
        </FormField>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Queue report
          </Button>
        </div>
      </form>
    </Modal>
  );
}
