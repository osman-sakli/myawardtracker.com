import { PLANS } from '@myawardtracker/shared';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Reveal } from '@/components/marketing/Reveal';
import { Eyebrow, SectionHeading } from '@/components/marketing/Section';
import { Badge } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Simple, affordable plans for students, families, and organizations. Start individual and scale to a full group whenever you need.',
};

const FAQ = [
  {
    q: 'Can I switch plans later?',
    a: 'Yes. Upgrade or downgrade at any time from your billing settings — changes take effect immediately and are prorated.',
  },
  {
    q: 'Do you offer a free trial?',
    a: 'You can create an account and explore the dashboard before subscribing. A paid plan unlocks unlimited activity tracking and evidence storage.',
  },
  {
    q: 'How does billing work?',
    a: 'Plans are billed monthly through Stripe. You can manage your payment method, view invoices, or cancel anytime from the billing portal.',
  },
  {
    q: 'What happens to my data if I cancel?',
    a: 'Your records stay safe and remain accessible if you resubscribe. Nothing is deleted automatically.',
  },
];

export default function PricingPage() {
  const standardPlans = PLANS.filter((p) => p.id !== 'enterprise');
  const enterprise = PLANS.find((p) => p.id === 'enterprise');

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-grid-fade" />
        <div className="container-page relative py-20 text-center lg:py-24">
          <Reveal>
            <Eyebrow>Pricing</Eyebrow>
            <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-semibold leading-[1.1] tracking-tight text-content sm:text-5xl">
              Pricing that grows with you
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-content-muted">
              Start tracking as an individual student, or manage a whole family
              or organization. Every plan includes the full toolkit.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-8">
        <div className="container-page grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {standardPlans.map((plan, i) => (
            <Reveal key={plan.id} delay={i * 60}>
              <Card
                className={`flex h-full flex-col p-6 ${
                  plan.highlighted ? 'border-brand/45 shadow-glow' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-content">
                    {plan.name}
                  </h2>
                  {plan.highlighted && (
                    <Badge tone="brand">
                      <Sparkles className="h-3 w-3" />
                      Popular
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-content-muted">{plan.tagline}</p>
                <p className="mt-5">
                  <span className="text-4xl font-semibold tracking-tight text-content">
                    {plan.priceLabel}
                  </span>
                  <span className="text-sm text-content-subtle"> /month</span>
                </p>
                <p className="mt-1 text-xs font-medium text-brand-soft">
                  {plan.seats}
                </p>
                <Link
                  href="/signup"
                  className={`${buttonClasses(
                    plan.highlighted ? 'primary' : 'secondary',
                    'md',
                  )} mt-5`}
                >
                  Get started
                </Link>
                <ul className="mt-6 space-y-2.5 border-t border-border pt-6">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm text-content-muted"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-soft" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {enterprise && (
        <section className="py-12">
          <div className="container-page">
            <Reveal>
              <Card className="relative overflow-hidden p-8 sm:p-10">
                <div className="absolute inset-0 bg-grid-fade" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-xl">
                    <h2 className="text-2xl font-semibold tracking-tight text-content">
                      {enterprise.name}
                    </h2>
                    <p className="mt-2 text-content-muted">{enterprise.tagline}</p>
                    <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                      {enterprise.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2.5 text-sm text-content-muted"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-soft" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="shrink-0">
                    <p className="text-3xl font-semibold text-content">
                      {enterprise.priceLabel}
                    </p>
                    <Link
                      href="/contact"
                      className={`${buttonClasses('primary', 'lg')} mt-4`}
                    >
                      Contact sales
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </Card>
            </Reveal>
          </div>
        </section>
      )}

      <section className="border-t border-border bg-bg-soft py-24">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrow="FAQ"
              title="Questions, answered"
              description="Everything you need to know before choosing a plan."
            />
          </Reveal>
          <div className="mx-auto mt-12 grid max-w-3xl gap-3">
            {FAQ.map((item, i) => (
              <Reveal key={item.q} delay={i * 50}>
                <Card className="p-6">
                  <h3 className="text-base font-semibold text-content">
                    {item.q}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-content-muted">
                    {item.a}
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border py-24">
        <div className="container-page text-center">
          <Reveal>
            <h2 className="mx-auto max-w-xl text-3xl font-semibold tracking-tight text-content sm:text-4xl">
              Ready to start tracking?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-content-muted">
              Create your account in under a minute and log your first activity
              today.
            </p>
            <Link
              href="/signup"
              className={`${buttonClasses('primary', 'lg')} mt-8`}
            >
              Create your account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
