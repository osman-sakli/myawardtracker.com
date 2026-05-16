'use client';

import { useEffect, useState, type FormEvent } from 'react';

import { ErrorState, LoadingState } from '@/components/dashboard/PageState';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { FormField, Input, Select } from '@/components/ui/form';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';

export default function AccountPage() {
  const toast = useToast();
  const me = useAsync(() => api.getMe());
  const profiles = useAsync(() => api.listProfiles());

  const [fullName, setFullName] = useState('');
  const [defaultProfileId, setDefaultProfileId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!me.data) return;
    setFullName(me.data.user.fullName ?? '');
    setDefaultProfileId(me.data.user.defaultProfileId ?? '');
  }, [me.data]);

  if (me.loading) return <LoadingState />;
  if (me.error || !me.data) {
    return <ErrorState message={me.error ?? 'No account data.'} onRetry={me.reload} />;
  }

  const user = me.data.user;

  const save = (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    api
      .updateMe({
        fullName: fullName.trim(),
        defaultProfileId: defaultProfileId || undefined,
      })
      .then((res) => {
        me.setData({ ...me.data!, user: res.user });
        toast('Account updated.', 'success');
      })
      .catch((err: unknown) =>
        setError(
          err instanceof Error ? err.message : 'Could not save changes.',
        ),
      )
      .finally(() => setSaving(false));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account"
        description="Manage your profile details and preferences."
      />

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-content">Your details</h3>
        </CardHeader>
        <CardBody>
          <form onSubmit={save} className="space-y-4">
            {error && (
              <p className="rounded-lg border border-danger/25 bg-danger/10 p-2.5 text-sm text-danger">
                {error}
              </p>
            )}
            <FormField label="Full name" htmlFor="acc-name" required>
              <Input
                id="acc-name"
                required
                maxLength={120}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </FormField>
            <FormField
              label="Email"
              htmlFor="acc-email"
              hint="Email is managed through your sign-in and cannot be changed here."
            >
              <Input id="acc-email" value={user.email} disabled readOnly />
            </FormField>
            <FormField
              label="Default profile"
              htmlFor="acc-default"
              hint="The profile selected first when you log a new activity."
            >
              <Select
                id="acc-default"
                value={defaultProfileId}
                onChange={(e) => setDefaultProfileId(e.target.value)}
              >
                <option value="">No default</option>
                {profiles.data?.profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="flex justify-end">
              <Button type="submit" loading={saving}>
                Save changes
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-content">Account info</h3>
        </CardHeader>
        <CardBody>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-content-subtle">Account type</dt>
              <dd className="mt-0.5 text-sm capitalize text-content">
                {user.role}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-content-subtle">Member since</dt>
              <dd className="mt-0.5 text-sm text-content">
                {formatDate(user.createdAt)}
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>
    </div>
  );
}
