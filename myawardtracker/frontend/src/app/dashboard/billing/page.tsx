'use client';

import { PLAN_BY_ID, PLANS } from '@myawardtracker/shared';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { ErrorState, LoadingState } from '@/components/dashboard/PageState';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';

const STATUS_TONE: Record<string, BadgeTone> = {
  active: 'success',
  trialing: 'info',
  past_due: 'warning',
  canceled: 'danger',
  none: 'neutral',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  trialing: 'Trialing',
  past_due: 'Past due',
  canceled: 'Canceled',
  none: 'No plan',
};

export default function BillingPage() {
  const toast = useToast();
  const me = useAsync(() => api.getMe());
  const [busy, setBusy] = useState('');

  if (me.loading) return <LoadingState />;
  if (me.error || !me.data) {
    return <ErrorState message={me.error ?? 'No billing data.'} onRetry={me.reload} />;
  }

  const sub = me.data.subscription;
  const hasPlan = sub.status === 'active' || sub.status === 'trialing';
  const currentPlan = PLAN_BY_ID[sub.planId];

  const startCheckout = (planId: string) => {
    setBusy(planId);
    const origin = window.location.origin;
    api
      .checkout({
        planId,
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
        setBusy('');
      });
  };

  const openPortal = () => {
    setBusy('portal');
    api
      .billingPortal(`${window.location.origin}/dashboard/billing/`)
      .then((res) => {
        window.location.href = res.portalUrl;
      })
      .catch((err: unknown) => {
        toast(
          err instanceof Error ? err.message : 'Could not open billing portal.',
          'error',
        );
        setBusy('');
      });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Manage your subscription and payment details."
      />

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-content">Current plan</h3>
          <Badge tone={STATUS_TONE[sub.status] ?? 'neutral'}>
            {STATUS_LABEL[sub.status] ?? sub.status}
          </Badge>
        </CardHeader>
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-content">
              {hasPlan && currentPlan ? currentPlan.name : 'No active plan'}
            </p>
            <p className="mt-0.5 text-sm text-content-muted">
              {hasPlan && sub.currentPeriodEnd
                ? sub.cancelAtPeriodEnd
                  ? `Cancels on ${formatDate(sub.currentPeriodEnd)}`
                  : `Renews on ${formatDate(sub.currentPeriodEnd)}`
                : 'Choose a plan below to unlock full tracking.'}
            </p>
          </div>
          {hasPlan && (
            <Button
              variant="secondary"
              loading={busy === 'portal'}
              onClick={openPortal}
            >
              Manage billing
            </Button>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.filter((p) => p.id !== 'enterprise').map((plan) => {
          const isCurrent = hasPlan && sub.planId === plan.id;
          return (
            <Card
              key={plan.id}
              className={cn(
                'flex flex-col',
                plan.highlighted && 'border-brand/40',
              )}
            >
              <CardBody className="flex flex-1 flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-content">
                      {plan.name}
                    </p>
                    {plan.highlighted && <Badge tone="brand">Popular</Badge>}
                  </div>
                  <p className="mt-2">
                    <span className="text-2xl font-semibold text-content">
                      {plan.priceLabel}
                    </span>
                    <span className="text-sm text-content-subtle">/mo</span>
                  </p>
                  <p className="mt-1 text-xs text-content-subtle">
                    {plan.seats}
                  </p>
                </div>
                <ul className="flex-1 space-y-1.5">
                  {plan.features.slice(0, 4).map((f) => (
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
                  variant={plan.highlighted ? 'primary' : 'secondary'}
                  disabled={isCurrent}
                  loading={busy === plan.id}
                  onClick={() => startCheckout(plan.id)}
                >
                  {isCurrent ? 'Current plan' : 'Choose plan'}
                </Button>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-content">
              Need more than 40 members?
            </p>
            <p className="mt-0.5 text-sm text-content-muted">
              Enterprise plans include unlimited seats, SSO, and a dedicated SLA.
            </p>
          </div>
          <Link
            href="/contact"
            className={buttonClasses('outline', 'md', 'shrink-0')}
          >
            Contact sales
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
