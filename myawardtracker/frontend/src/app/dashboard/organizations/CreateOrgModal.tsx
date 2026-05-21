'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { FormField, Input, Select, Textarea } from '@/components/ui/form';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';

const ORG_TYPES: Array<{ id: string; label: string }> = [
  { id: 'school_club', label: 'School club' },
  { id: 'school', label: 'School' },
  { id: 'nonprofit', label: 'Nonprofit' },
  { id: 'scout_troop', label: 'Scout troop' },
  { id: 'university', label: 'University organization' },
  { id: 'leadership_program', label: 'Leadership program' },
  { id: 'community', label: 'Community organization' },
];

export function CreateOrgModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState('');
  const [type, setType] = useState('school_club');
  const [description, setDescription] = useState('');
  const [storageEnabled, setStorageEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setType('school_club');
    setDescription('');
    setStorageEnabled(false);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createOrg({
        name: name.trim(),
        type,
        description: description.trim() || undefined,
        storageEnabled,
      });
      toast(`Created ${res.org.name}`, 'success');
      reset();
      if (onCreated) {
        onCreated();
      }
      router.push(`/dashboard/org/?id=${res.org.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create organization.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!submitting) {
          reset();
          onClose();
        }
      }}
      title="Create organization"
      description="Becomes yours as Owner. Members never pay — only the owner does."
    >
      <form onSubmit={submit} className="space-y-4">
        <FormField label="Name" required htmlFor="org-name">
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Riverside High Volunteer Club"
            required
            minLength={2}
            maxLength={120}
          />
        </FormField>

        <FormField label="Type" required>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {ORG_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Description" hint="Optional — shown on the dashboard.">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does your organization do?"
            maxLength={600}
          />
        </FormField>

        <label className="flex items-start gap-3 rounded-xl border border-border bg-bg-soft p-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-brand"
            checked={storageEnabled}
            onChange={(e) => setStorageEnabled(e.target.checked)}
          />
          <span>
            <span className="block font-medium text-content">Enable file uploads</span>
            <span className="text-xs text-content-muted">
              Members can attach photos, certificates, and verification files. Costs extra
              at renewal — start without it, you can toggle later.
            </span>
          </span>
        </label>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Create organization
          </Button>
        </div>
      </form>
    </Modal>
  );
}
