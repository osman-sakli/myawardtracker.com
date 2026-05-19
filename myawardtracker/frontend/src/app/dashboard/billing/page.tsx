'use client';

import { PLAN_BY_ID } from '@myawardtracker/shared';
import { Check } from 'lucide-react';
import { useState } from 'react';

import { ErrorState, LoadingState } from '@/components/dashboard/PageState';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';

const STATUS_TONE: Record<string, BadgeTone> = {
  active: 'success',
  trialing: 'info',
  expired: 'danger',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  trialing: 'Free trial',
  expired: 'Expired',
};

export default function BillingPage() {
  const toast = useToast();
  const me = useAsync(() => api.getMe());
  const [busy, setBusy] = useState(false);

  if (me.loading) return <LoadingState />;
  if (me.error || !me.data) {
    return <ErrorState message={me.error ?? 'No billing data.'} onRetry={me.reload} />;
  }

  const sub = me.data.subscription;
  const plan = PLAN_BY_ID['individual'];
  const isActive = sub.status === 'active';
  const isTrialing = sub.status === 'trialing';

  const headline =
    sub.status === 'active'
      ? 'Paid access'
      : sub.status === 'trialing'
        ? 'Free trial'
        : 'Access expired';

  const detail =
    sub.status === 'active'
      ? `Your access runs through ${formatDate(sub.paidUntil)} — ${sub.daysRemaining} day${sub.daysRemaining === 1 ? '' : 's'} left.`
      : sub.status === 'trialing'
        ? `Your free trial ends ${formatDate(sub.trialEndsAt)} — ${sub.daysRemaining} day${sub.daysRemaining === 1 ? '' : 's'} left. No card required until then.`
        : 'Your free trial has ended. Purchase access to keep adding records.';

  const ctaLabel = isActive ? 'Extend access — $9.99' : 'Buy access — $9.99';

  const startCheckout = () => {
    setBusy(true);
    const origin = window.location.origin;
    api
      .checkout({
        planId: 'individual',
        successUrl: `${origin}/dashboard/billing/`,
        cancelUrl: `${origin}/dashboard/billing/`,
      })
      .then((res) => {
        window.location.href = res.checkoutUrl;
      })
      .catch((err: unknown) => {
        toast(
          err instanceof Error ? err.message : 'Could not start checkout.',
          'error',
        );
        setBusy(false);
      });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="One simple price. A single payment keeps your account active for 12 months."
      />

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-content">Account access</h3>
          <Badge tone={STATUS_TONE[sub.status] ?? 'neutral'}>
            {STATUS_LABEL[sub.status] ?? sub.status}
          </Badge>
        </CardHeader>
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-content">{headline}</p>
            <p className="mt-0.5 text-sm text-content-muted">{detail}</p>
          </div>
          <Button loading={busy} onClick={startCheckout}>
            {ctaLabel}
          </Button>
        </CardBody>
      </Card>

      {plan && (
        <Card className={cn('flex flex-col', 'border-brand/40')}>
          <CardBody className="flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-content">{plan.name}</p>
                <Badge tone="brand">One-time</Badge>
              </div>
              <p className="mt-2">
                <span className="text-3xl font-semibold text-content">
                  {plan.priceLabel}
                </span>
              </p>
              <p className="mt-1 text-xs text-content-subtle">
                {plan.billingNote}
              </p>
            </div>
            <ul className="space-y-1.5">
              {plan.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-1.5 text-xs text-content-muted"
                >
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-soft" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              variant={isActive ? 'secondary' : 'primary'}
              loading={busy}
              onClick={startCheckout}
            >
              {ctaLabel}
            </Button>
          </CardBody>
        </Card>
      )}

      <p className="text-xs text-content-subtle">
        Payments are processed securely by Stripe. We never see or store your
        card details — your card is not retained after the purchase completes.
        {isTrialing
          ? ' Buy now and your 12 months start the day you pay.'
          : ''}
      </p>
    </div>
  );
}
