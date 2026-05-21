'use client';

import { Crown, Mail, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';

import { useOrgContext } from '@/components/dashboard/OrgContext';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { ErrorState, LoadingState } from '@/components/dashboard/PageState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField, Input, Select } from '@/components/ui/form';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { formatDate, initials } from '@/lib/format';
import {
  ASSIGNABLE_ROLES,
  roleHas,
  roleLabel,
  roleLevel,
} from '@/lib/rbac';
import type { Membership, OrgRole } from '@/lib/types';
import { useAsync } from '@/lib/useAsync';

export function MembersView() {
  const { org, role } = useOrgContext();
  const members = useAsync(() => api.listMembers(org.id));
  const invites = useAsync(() => api.listInvites(org.id));
  const [inviteOpen, setInviteOpen] = useState(false);
  const toast = useToast();

  const canInvite = roleHas(role, 'members:invite');
  const canRemove = roleHas(role, 'members:remove');
  const canChangeRole = roleHas(role, 'members:role');

  if (members.loading) return <LoadingState />;
  if (members.error || !members.data) {
    return (
      <ErrorState
        message={members.error ?? 'Failed to load members.'}
        onRetry={members.reload}
      />
    );
  }

  const rows = [...members.data.members].sort(
    (a, b) => roleLevel(a.role) - roleLevel(b.role),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description={`${rows.length} ${rows.length === 1 ? 'person' : 'people'} in this organization`}
        action={
          canInvite ? (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Invite member
            </Button>
          ) : null
        }
      />

      <Card>
        <ul className="divide-y divide-border">
          {rows.map((m) => (
            <MemberRow
              key={m.userSub}
              member={m}
              orgId={org.id}
              myRole={role}
              canChangeRole={canChangeRole && m.role !== 'owner'}
              canRemove={canRemove && m.role !== 'owner'}
              onChanged={() => {
                members.reload();
                toast('Member updated', 'success');
              }}
              onRemoved={() => {
                members.reload();
                toast('Member removed', 'success');
              }}
            />
          ))}
        </ul>
      </Card>

      {canInvite && (
        <>
          <PageHeader
            title="Pending invites"
            description="Invites expire after 14 days."
          />
          <Card>
            {invites.loading ? (
              <div className="p-6 text-sm text-content-muted">Loading…</div>
            ) : invites.data && invites.data.invites.length > 0 ? (
              <ul className="divide-y divide-border">
                {invites.data.invites.map((i) => (
                  <li
                    key={i.token}
                    className="flex items-center justify-between gap-4 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-content">{i.email}</p>
                      <p className="text-xs text-content-subtle">
                        {roleLabel(i.role)} · expires {formatDate(i.expiresAt)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await api.revokeInvite(org.id, i.token);
                        invites.reload();
                        toast('Invite revoked', 'info');
                      }}
                    >
                      Revoke
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6 text-sm text-content-muted">
                No pending invites.
              </div>
            )}
          </Card>
        </>
      )}

      <InviteMemberModal
        open={inviteOpen}
        orgId={org.id}
        onClose={() => setInviteOpen(false)}
        onSent={() => {
          setInviteOpen(false);
          invites.reload();
        }}
      />
    </div>
  );
}

function MemberRow({
  member,
  orgId,
  myRole,
  canChangeRole,
  canRemove,
  onChanged,
  onRemoved,
}: {
  member: Membership;
  orgId: string;
  myRole: OrgRole;
  canChangeRole: boolean;
  canRemove: boolean;
  onChanged: () => void;
  onRemoved: () => void;
}) {
  const [working, setWorking] = useState(false);

  const change = async (next: OrgRole) => {
    setWorking(true);
    try {
      await api.changeMemberRole(orgId, member.userSub, next);
      onChanged();
    } finally {
      setWorking(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Remove ${member.fullName || member.email} from this organization?`)) return;
    setWorking(true);
    try {
      await api.removeMember(orgId, member.userSub);
      onRemoved();
    } finally {
      setWorking(false);
    }
  };

  // A user can never edit a role above their own — backend enforces this too.
  const allowed = ASSIGNABLE_ROLES.filter((r) => roleLevel(r) >= roleLevel(myRole));

  return (
    <li className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/12 text-sm font-semibold text-brand">
          {initials(member.fullName || member.email)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-content">
            {member.fullName || member.email}
          </p>
          <p className="truncate text-xs text-content-subtle">{member.email}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {member.role === 'owner' ? (
          <Badge tone="brand" className="gap-1">
            <Crown className="h-3 w-3" />
            Owner
          </Badge>
        ) : canChangeRole ? (
          <Select
            value={member.role}
            disabled={working}
            onChange={(e) => change(e.target.value as OrgRole)}
            className="h-9 w-32"
          >
            {allowed.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </Select>
        ) : (
          <Badge>{roleLabel(member.role)}</Badge>
        )}
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            disabled={working}
            onClick={remove}
            aria-label={`Remove ${member.fullName || member.email}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </li>
  );
}

function InviteMemberModal({
  open,
  orgId,
  onClose,
  onSent,
}: {
  open: boolean;
  orgId: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('member');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiredTier, setRequiredTier] = useState<string | null>(null);
  const toast = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setRequiredTier(null);
    try {
      await api.invite(orgId, email.trim(), role);
      toast(`Invite sent to ${email}`, 'success');
      setEmail('');
      onSent();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send invite.';
      setError(message);
      // The backend returns a structured 402 when the member cap is hit.
      const maybe = (err as { details?: { requiredTier?: string } })?.details?.requiredTier;
      if (maybe) setRequiredTier(maybe);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Invite a member"
      description="They'll get a unique link that expires in 14 days."
    >
      <form onSubmit={submit} className="space-y-4">
        <FormField label="Email" required htmlFor="invite-email">
          <Input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="member@school.edu"
          />
        </FormField>
        <FormField label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as OrgRole)}>
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </Select>
        </FormField>

        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
            <p>{error}</p>
            {requiredTier && (
              <p className="mt-1 text-content-muted">
                Upgrade to the <strong className="capitalize">{requiredTier}</strong> tier
                from the billing page to keep inviting.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            <Mail className="h-4 w-4" />
            Send invite
          </Button>
        </div>
      </form>
    </Modal>
  );
}
