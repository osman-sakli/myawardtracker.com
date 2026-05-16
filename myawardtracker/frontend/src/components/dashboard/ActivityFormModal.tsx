'use client';

import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_STATUSES,
  AWARD_PROGRAMS,
} from '@myawardtracker/shared';
import { useEffect, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { FormField, Input, Select, Textarea } from '@/components/ui/form';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { Activity, ActivityInput, ActivityStatus, Profile } from '@/lib/types';

interface ActivityFormModalProps {
  open: boolean;
  onClose: () => void;
  activity?: Activity | null;
  profiles: Profile[];
  defaultProfileId?: string;
  onSaved: (activity: Activity) => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ActivityFormModal({
  open,
  onClose,
  activity,
  profiles,
  defaultProfileId,
  onSaved,
}: ActivityFormModalProps) {
  const toast = useToast();
  const editing = Boolean(activity);

  const [profileId, setProfileId] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<string>(
    ACTIVITY_CATEGORIES[0].id,
  );
  const [status, setStatus] = useState<ActivityStatus>('in_progress');
  const [date, setDate] = useState(today());
  const [hours, setHours] = useState('');
  const [organization, setOrganization] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [programs, setPrograms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setProfileId(
      activity?.profileId ?? defaultProfileId ?? profiles[0]?.id ?? '',
    );
    setTitle(activity?.title ?? '');
    setCategoryId(activity?.categoryId ?? ACTIVITY_CATEGORIES[0].id);
    setStatus(activity?.status ?? 'in_progress');
    setDate(activity?.date ?? today());
    setHours(
      activity?.hours !== undefined && activity?.hours !== null
        ? String(activity.hours)
        : '',
    );
    setOrganization(activity?.organization ?? '');
    setLocation(activity?.location ?? '');
    setDescription(activity?.description ?? '');
    setNotes(activity?.notes ?? '');
    setPrograms(activity?.awardPrograms ?? []);
    setError('');
  }, [open, activity, defaultProfileId, profiles]);

  const tracksHours =
    ACTIVITY_CATEGORIES.find((c) => c.id === categoryId)?.tracksHours ?? true;

  const toggleProgram = (id: string) => {
    setPrograms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!profileId) {
      setError('Select a profile for this activity.');
      return;
    }
    setSaving(true);
    setError('');

    const base = {
      title: title.trim(),
      description: description.trim() || undefined,
      categoryId,
      status,
      date,
      hours: hours ? Number(hours) : 0,
      organization: organization.trim() || undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      awardPrograms: programs,
    };

    const op = activity
      ? api.updateActivity(activity.id, base)
      : api.createActivity({ ...base, profileId } satisfies ActivityInput);

    op.then((res) => {
      onSaved(res.activity);
      toast(activity ? 'Activity updated.' : 'Activity logged.', 'success');
      onClose();
    })
      .catch((err: unknown) =>
        setError(
          err instanceof Error ? err.message : 'Could not save activity.',
        ),
      )
      .finally(() => setSaving(false));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit activity' : 'Log activity'}
      description="Record what the student did, when, and how it counts toward their goals."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button form="activity-form" type="submit" loading={saving}>
            {editing ? 'Save changes' : 'Log activity'}
          </Button>
        </>
      }
    >
      <form id="activity-form" onSubmit={submit} className="space-y-4">
        {error && (
          <p className="rounded-lg border border-danger/25 bg-danger/10 p-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        <FormField
          label="Profile"
          htmlFor="a-profile"
          required
          hint={editing ? 'Activities cannot be moved between profiles.' : undefined}
        >
          <Select
            id="a-profile"
            value={profileId}
            disabled={editing}
            onChange={(e) => setProfileId(e.target.value)}
          >
            {profiles.length === 0 && <option value="">No profiles yet</option>}
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Activity title" htmlFor="a-title" required>
          <Input
            id="a-title"
            required
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Food bank weekend shift"
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Category" htmlFor="a-category" required>
            <Select
              id="a-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {ACTIVITY_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Status" htmlFor="a-status" required>
            <Select
              id="a-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ActivityStatus)}
            >
              {ACTIVITY_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Date" htmlFor="a-date" required>
            <Input
              id="a-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </FormField>
          <FormField
            label="Hours"
            htmlFor="a-hours"
            hint={tracksHours ? undefined : 'This category does not track hours.'}
          >
            <Input
              id="a-hours"
              type="number"
              min={0}
              max={10000}
              step={0.5}
              disabled={!tracksHours}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="0"
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Organization" htmlFor="a-org">
            <Input
              id="a-org"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="e.g. City Food Bank"
            />
          </FormField>
          <FormField label="Location" htmlFor="a-location">
            <Input
              id="a-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Springfield, IL"
            />
          </FormField>
        </div>

        <FormField label="Description" htmlFor="a-description">
          <Textarea
            id="a-description"
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did the student do, and what was the impact?"
          />
        </FormField>

        <FormField
          label="Private notes"
          htmlFor="a-notes"
          hint="Only visible to you — not included in exports."
        >
          <Textarea
            id="a-notes"
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reminders, follow-ups, or context."
          />
        </FormField>

        <FormField
          label="Counts toward"
          hint="Map this activity to the award programs it contributes to."
        >
          <div className="flex flex-wrap gap-2">
            {AWARD_PROGRAMS.map((program) => {
              const active = programs.includes(program.id);
              return (
                <button
                  key={program.id}
                  type="button"
                  onClick={() => toggleProgram(program.id)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    active
                      ? 'border-brand/40 bg-brand/15 text-brand-soft'
                      : 'border-border bg-bg-soft text-content-muted hover:border-border-strong',
                  )}
                >
                  {program.name}
                </button>
              );
            })}
          </div>
        </FormField>
      </form>
    </Modal>
  );
}
