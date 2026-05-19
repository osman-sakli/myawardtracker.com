import { PLAN_BY_ID } from '@myawardtracker/shared';
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
    'One simple price. Start with a 15-day free trial, then a single $9.99 payment keeps your account active for a full year.',
};

const FAQ = [
  {
    q: 'Do you offer a free trial?',
    a: 'Yes — every new account gets 15 days free with no credit card required. Explore the full dashboard and log real activities before you decide.',
  },
  {
    q: 'How does the payment work?',
    a: 'It is a one-time $9.99 payment that unlocks 12 months of access. There is no recurring subscription — when the year is up, you simply pay again to renew.',
  },
  {
    q: 'Is my card stored?',
    a: 'No. Payments run through Stripe Checkout in one-time payment mode. Your card is charged once and is not saved or kept on file afterward.',
  },
  {
    q: 'What happens to my data if my access lapses?',
    a: 'Your records stay safe and remain accessible the moment you renew. Nothing is deleted automatically.',
  },
];

export default function PricingPage() {
  const plan = PLAN_BY_ID['individual'];

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-grid-fade" />
        <div className="container-page relative py-20 text-center lg:py-24">
          <Reveal>
            <Eyebrow>Pricing</Eyebrow>
            <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-semibold leading-[1.1] tracking-tight text-content sm:text-5xl">
              One price. One year. No surprises.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-content-muted">
              Try everything free for 15 days. Then a single $9.99 payment keeps
              your account active for a full year — no subscription, no stored
              card.
            </p>
          </Reveal>
        </div>
      </section>

      {plan && (
        <section className="pb-12">
          <div className="container-page">
            <Reveal>
              <Card className="mx-auto flex max-w-md flex-col border-brand/45 p-8 shadow-glow">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-content">
                    {plan.name}
                  </h2>
                  <Badge tone="brand">
                    <Sparkles className="h-3 w-3" />
                    One-time payment
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-content-muted">
                  {plan.tagline}
                </p>
                <p className="mt-6">
                  <span className="text-5xl font-semibold tracking-tight text-content">
                    {plan.priceLabel}
                  </span>
                </p>
                <p className="mt-1 text-sm font-medium text-brand-soft">
                  {plan.billingNote}
                </p>
                <Link
                  href="/signup"
                  className={`${buttonClasses('primary', 'lg')} mt-6`}
                >
                  Start your 15-day free trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="mt-2 text-center text-xs text-content-subtle">
                  No credit card required to start.
                </p>
                <ul className="mt-7 space-y-2.5 border-t border-border pt-6">
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
          </div>
        </section>
      )}

      <section className="border-t border-border bg-bg-soft py-24">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrow="FAQ"
              title="Questions, answered"
              description="Everything you need to know before you start."
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
