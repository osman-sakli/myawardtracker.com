'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useOrgContext } from '@/components/dashboard/OrgContext';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField, Input, Textarea } from '@/components/ui/form';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { roleHas } from '@/lib/rbac';

export function SettingsView() {
  const router = useRouter();
  const { org, role, reload } = useOrgContext();
  const canUpdate = roleHas(role, 'org:update');
  const canDelete = roleHas(role, 'org:delete');
  const toast = useToast();

  const [name, setName] = useState(org.name);
  const [description, setDescription] = useState(org.description ?? '');
  const [retention, setRetention] = useState(org.chatRetentionDays);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateOrg(org.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        chatRetentionDays: retention,
      });
      toast('Settings saved', 'success');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteOrg = async () => {
    if (
      !confirm(
        `Delete "${org.name}"? Members will lose access. This soft-deletes the org; data is removed by the cleanup job.`,
      )
    )
      return;
    setDeleting(true);
    try {
      await api.deleteOrg(org.id);
      toast('Organization deleted', 'info');
      router.push('/dashboard/organizations');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed.', 'error');
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization settings"
        description="Name, description, chat retention, and deletion."
      />

      <Card className="p-5">
        <form onSubmit={save} className="space-y-4">
          <FormField label="Name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canUpdate}
              minLength={2}
              maxLength={120}
              required
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canUpdate}
              maxLength={600}
            />
          </FormField>
          <FormField
            label="Chat retention (days)"
            hint="Messages auto-delete after this window. Lower means lower cost."
          >
            <Input
              type="number"
              min={1}
              max={365}
              value={retention}
              onChange={(e) => setRetention(Number(e.target.value))}
              disabled={!canUpdate}
            />
          </FormField>
          {canUpdate && (
            <div className="flex justify-end">
              <Button type="submit" loading={saving}>
                Save changes
              </Button>
            </div>
          )}
        </form>
      </Card>

      {canDelete && (
        <Card className="border-danger/30 bg-danger/5 p-5">
          <h3 className="text-sm font-semibold text-danger">Danger zone</h3>
          <p className="mt-1 text-xs text-content-muted">
            Deletes this organization for every member. Activities they logged personally stay
            on their own account.
          </p>
          <Button
            className="mt-4"
            variant="danger"
            loading={deleting}
            onClick={deleteOrg}
          >
            Delete organization
          </Button>
        </Card>
      )}
    </div>
  );
}
