'use client';

import {
  ALLOWED_EVIDENCE_TYPES,
  MAX_EVIDENCE_BYTES,
} from '@myawardtracker/shared';
import { Download, FileText, Trash2, UploadCloud } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { api, uploadToS3 } from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/format';
import type { Activity, Evidence } from '@/lib/types';

interface EvidenceModalProps {
  open: boolean;
  onClose: () => void;
  activity: Activity | null;
  onChanged: () => void;
}

export function EvidenceModal({
  open,
  onClose,
  activity,
  onChanged,
}: EvidenceModalProps) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    if (!open || !activity) return;
    setError('');
    setLoading(true);
    api
      .listEvidence(activity.id)
      .then((res) => setItems(res.evidence))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Could not load evidence.'),
      )
      .finally(() => setLoading(false));
  }, [open, activity]);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activity) return;

    if (!ALLOWED_EVIDENCE_TYPES.includes(file.type)) {
      setError('Unsupported file type. Upload an image or PDF.');
      return;
    }
    if (file.size > MAX_EVIDENCE_BYTES) {
      setError(
        `File is too large. The limit is ${formatBytes(MAX_EVIDENCE_BYTES)}.`,
      );
      return;
    }

    setError('');
    setUploading(true);
    try {
      const { uploadUrl, evidence } = await api.createUploadUrl({
        activityId: activity.id,
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });
      await uploadToS3(uploadUrl, file);
      setItems((prev) => [evidence, ...prev]);
      toast('Evidence uploaded.', 'success');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const download = async (id: string) => {
    setBusyId(id);
    try {
      const { downloadUrl } = await api.getDownloadUrl(id);
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open file.');
    } finally {
      setBusyId('');
    }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      await api.deleteEvidence(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast('Evidence removed.', 'success');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete file.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Evidence"
      description={activity ? activity.title : undefined}
      footer={
        <Button variant="ghost" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-4">
        {error && (
          <p className="rounded-lg border border-danger/25 bg-danger/10 p-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        <input
          ref={fileRef}
          type="file"
          accept={ALLOWED_EVIDENCE_TYPES.join(',')}
          className="hidden"
          onChange={onPick}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-bg-soft px-6 py-8 text-center transition-colors hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? (
            <Spinner className="h-6 w-6 text-brand-soft" />
          ) : (
            <UploadCloud className="h-6 w-6 text-brand-soft" />
          )}
          <span className="text-sm font-medium text-content">
            {uploading ? 'Uploading…' : 'Upload evidence'}
          </span>
          <span className="text-xs text-content-subtle">
            Images or PDF, up to {formatBytes(MAX_EVIDENCE_BYTES)}
          </span>
        </button>

        {loading ? (
          <div className="flex justify-center py-6">
            <Spinner className="h-5 w-5 text-brand-soft" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-sm text-content-subtle">
            No evidence attached yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((ev) => (
              <li key={ev.id} className="flex items-center gap-3 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-raised text-content-muted">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-content">
                    {ev.fileName}
                  </p>
                  <p className="text-xs text-content-subtle">
                    {formatBytes(ev.sizeBytes)} · {formatDate(ev.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => download(ev.id)}
                  disabled={busyId === ev.id}
                  aria-label="Download"
                  className="rounded-lg p-2 text-content-subtle transition-colors hover:bg-surface-hover hover:text-content disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(ev.id)}
                  disabled={busyId === ev.id}
                  aria-label="Delete"
                  className="rounded-lg p-2 text-content-subtle transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
