'use client';

import { AWARD_PROGRAMS } from '@myawardtracker/shared';
import { useEffect, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/form';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { Profile, ProfileInput } from '@/lib/types';

interface ProfileFormModalProps {
  open: boolean;
  onClose: () => void;
  profile?: Profile | null;
  onSaved: (profile: Profile) => void;
}

export function ProfileFormModal({
  open,
  onClose,
  profile,
  onSaved,
}: ProfileFormModalProps) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [gradYear, setGradYear] = useState('');
  const [programs, setPrograms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(profile?.name ?? '');
    setGradeLevel(profile?.gradeLevel ?? '');
    setSchoolName(profile?.schoolName ?? '');
    setGradYear(profile?.graduationYear ? String(profile.graduationYear) : '');
    setPrograms(profile?.awardPrograms ?? []);
    setError('');
  }, [open, profile]);

  const toggleProgram = (id: string) => {
    setPrograms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const input: ProfileInput = {
      name: name.trim(),
      gradeLevel: gradeLevel.trim() || undefined,
      schoolName: schoolName.trim() || undefined,
      graduationYear: gradYear ? Number(gradYear) : undefined,
      awardPrograms: programs,
    };
    const op = profile
      ? api.updateProfile(profile.id, input)
      : api.createProfile(input);
    op.then((res) => {
      onSaved(res.profile);
      toast(profile ? 'Profile updated.' : 'Profile created.', 'success');
      onClose();
    })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Could not save profile.'),
      )
      .finally(() => setSaving(false));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={profile ? 'Edit profile' : 'New profile'}
      description="A profile represents one student whose activities you track."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button form="profile-form" type="submit" loading={saving}>
            {profile ? 'Save changes' : 'Create profile'}
          </Button>
        </>
      }
    >
      <form id="profile-form" onSubmit={submit} className="space-y-4">
        {error && (
          <p className="rounded-lg border border-danger/25 bg-danger/10 p-2.5 text-sm text-danger">
            {error}
          </p>
        )}
        <FormField label="Student name" htmlFor="p-name" required>
          <Input
            id="p-name"
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jordan Lee"
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Grade level" htmlFor="p-grade">
            <Input
              id="p-grade"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              placeholder="e.g. 11th grade"
            />
          </FormField>
          <FormField label="Graduation year" htmlFor="p-year">
            <Input
              id="p-year"
              type="number"
              min={1990}
              max={2100}
              value={gradYear}
              onChange={(e) => setGradYear(e.target.value)}
              placeholder="2027"
            />
          </FormField>
        </div>
        <FormField label="School" htmlFor="p-school">
          <Input
            id="p-school"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="e.g. Lincoln High School"
          />
        </FormField>
        <FormField
          label="Award programs"
          hint="Select the programs this student is working toward."
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
