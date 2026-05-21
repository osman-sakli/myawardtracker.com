'use client';

import { Check, CreditCard } from 'lucide-react';
import { useState } from 'react';

import { useOrgContext } from '@/components/dashboard/OrgContext';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { roleHas } from '@/lib/rbac';

interface TierDef {
  id: 'small' | 'medium' | 'large';
  label: string;
  cap: number;
  basePrice: number;
  storagePrice: number;
}

const TIERS: TierDef[] = [
  { id: 'small', label: 'Small', cap: 50, basePrice: 39, storagePrice: 69 },
  { id: 'medium', label: 'Medium', cap: 300, basePrice: 78, storagePrice: 138 },
  { id: 'large', label: 'Large', cap: 500, basePrice: 117, storagePrice: 207 },
];

export function BillingView() {
  const { org, role, subscription } = useOrgContext();
  const canManage = roleHas(role, 'billing:manage');
  const [storageWanted, setStorageWanted] = useState(subscription.storageEnabled);
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  const checkout = async (tier: TierDef) => {
    const planId = storageWanted ? `org_${tier.id}_storage` : `org_${tier.id}`;
    setBusy(planId);
    try {
      const res = await api.orgCheckout(org.id, {
        planId,
        successUrl: `${window.location.origin}/dashboard/org/?id=${org.id}&tab=billing&success=1`,
        cancelUrl: window.location.href,
      });
      window.location.href = res.checkoutUrl;
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not start checkout.', 'error');
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization billing"
        description="Only the owner or admins are billed. Members never pay."
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-content-muted">Current plan</p>
            <p className="mt-1 text-xl font-semibold capitalize text-content">
              {subscription.tier} tier
              {subscription.storageEnabled ? ' · with storage' : ''}
            </p>
            <p className="text-xs text-content-subtle">
              {org.memberCount}/{TIERS.find((t) => t.id === subscription.tier)?.cap} members ·
              {' '}
              {subscription.status === 'active' && subscription.paidUntil && (
                <>Renews {formatDate(subscription.paidUntil)}</>
              )}
              {subscription.status === 'trialing' && subscription.trialEndsAt && (
                <>Trial ends {formatDate(subscription.trialEndsAt)}</>
              )}
              {subscription.status === 'expired' && <>Subscription expired</>}
            </p>
          </div>
          <Badge
            tone={
              subscription.status === 'active'
                ? 'success'
                : subscription.status === 'trialing'
                  ? 'warning'
                  : 'danger'
            }
          >
            {subscription.status}
          </Badge>
        </div>
      </Card>

      {!canManage && (
        <Card className="p-4 text-sm text-content-muted">
          Your role can see the plan but can't make changes. Ask an owner or admin to manage
          billing.
        </Card>
      )}

      {canManage && (
        <>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-bg-soft px-5 py-4">
            <div>
              <p className="text-sm font-medium text-content">File uploads add-on</p>
              <p className="text-xs text-content-muted">
                Adds image, document, certificate, and verification file uploads — ~$30/yr extra
                at every tier.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand"
                checked={storageWanted}
                onChange={(e) => setStorageWanted(e.target.checked)}
              />
              Enable
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {TIERS.map((tier) => {
              const isCurrent = subscription.tier === tier.id;
              const overCap = org.memberCount > tier.cap;
              const price = storageWanted ? tier.storagePrice : tier.basePrice;
              const planId = storageWanted
                ? `org_${tier.id}_storage`
                : `org_${tier.id}`;
              return (
                <Card
                  key={tier.id}
                  className={cn(
                    'flex flex-col p-5',
                    isCurrent && 'border-brand/40 shadow-glow',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-content">
                      {tier.label}
                    </h3>
                    {isCurrent && <Badge tone="brand">Current</Badge>}
                  </div>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-content">
                    ${price}
                    <span className="text-sm font-normal text-content-subtle">/year</span>
                  </p>
                  <p className="text-xs text-content-subtle">
                    Up to {tier.cap} members
                  </p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm text-content-muted">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" /> Organization management
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" /> Real-time team chat
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" /> Clock-in/out + approvals
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" /> Reports + dashboards
                    </li>
                    {storageWanted && (
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-success" /> File uploads
                      </li>
                    )}
                  </ul>
                  <Button
                    className="mt-5"
                    variant={isCurrent ? 'secondary' : 'primary'}
                    disabled={overCap}
                    loading={busy === planId}
                    onClick={() => checkout(tier)}
                  >
                    <CreditCard className="h-4 w-4" />
                    {overCap
                      ? 'Member count above cap'
                      : isCurrent
                        ? 'Renew at this tier'
                        : `Subscribe — $${price}/yr`}
                  </Button>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
