import { PLANS } from '@myawardtracker/shared';
import {
  ArrowRight,
  Check,
  Eye,
  HeartHandshake,
  Sparkles,
  Users,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Reveal } from '@/components/marketing/Reveal';
import { Eyebrow, SectionHeading } from '@/components/marketing/Section';
import { Badge } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'For Parents',
  description:
    'My Award Tracker gives parents calm oversight of every child — one family plan, up to five student profiles, and clear progress toward awards and college goals.',
};

const BENEFITS = [
  {
    icon: Eye,
    title: 'Oversight of every child',
    body: 'A parent dashboard shows each student’s activities, hours, and award progress at a glance — no nagging, no guesswork.',
  },
  {
    icon: Users,
    title: 'One plan for the whole family',
    body: 'The Family plan covers up to five student profiles, each cleanly separated, so siblings never get tangled together.',
  },
  {
    icon: HeartHandshake,
    title: 'Help kids reach their goals',
    body: 'Spot which categories are falling behind and step in early — gentle support instead of last-minute panic.',
  },
  {
    icon: Check,
    title: 'Peace of mind year-round',
    body: 'When application season comes, the record is already complete, organized, and ready — nothing left to reconstruct.',
  },
];

const REASSURANCE = [
  {
    title: 'Kids stay in the driver’s seat',
    body: 'Students log their own activities and own their record. You get visibility and the ability to encourage — not a second job.',
  },
  {
    title: 'Everything in one trusted place',
    body: 'No more scattered screenshots, group chats, or sticky notes. Activities, hours, and evidence live together, safely.',
  },
  {
    title: 'Private and secure by design',
    body: 'Every record is scoped to your family account and encrypted. We never sell or share your family’s data.',
  },
];

export default function ForParentsPage() {
  const familyPlan = PLANS.find((p) => p.id === 'family');

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[600px] bg-grid-fade" />
        <div className="container-page relative grid gap-14 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
          <div>
            <Eyebrow>For parents</Eyebrow>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-content sm:text-5xl">
              Support every child, without the{' '}
              <span className="text-gradient">stress</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-content-muted">
              You want your kids to reach their goals — and you do not want to
              chase spreadsheets to make it happen. My Award Tracker gives you
              clear visibility and quiet confidence.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className={buttonClasses('primary', 'lg')}>
                Start your family plan
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className={buttonClasses('secondary', 'lg')}
              >
                See pricing
              </Link>
            </div>
            <p className="mt-5 text-sm text-content-subtle">
              No credit card to get started · Cancel anytime
            </p>
          </div>

          <Reveal>
            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-brand/10 blur-2xl" />
              <Card className="relative overflow-hidden p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-content-subtle">
                    Family dashboard
                  </p>
                  <Badge tone="brand">3 profiles</Badge>
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    { name: 'Maya — 11th grade', tag: '142h logged' },
                    { name: 'Ethan — 9th grade', tag: '58h logged' },
                    { name: 'Sofia — 12th grade', tag: '231h logged' },
                  ].map((row) => (
                    <div
                      key={row.name}
                      className="flex items-center justify-between rounded-lg border border-border bg-bg-soft px-3 py-3"
                    >
                      <span className="text-sm font-medium text-content">
                        {row.name}
                      </span>
                      <span className="text-xs text-content-subtle">
                        {row.tag}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { label: 'Total hours', value: '431h' },
                    { label: 'Activities', value: '96' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border border-border bg-bg-soft p-3"
                    >
                      <p className="text-lg font-semibold text-content">
                        {stat.value}
                      </p>
                      <p className="text-[0.7rem] text-content-subtle">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-t border-border py-24">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrow="Why parents choose us"
              title="Clarity for you, ownership for them"
              description="A balance that actually works — kids build their own record while you keep a clear, calm view."
            />
          </Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2">
            {BENEFITS.map((benefit, i) => (
              <Reveal key={benefit.title} delay={i * 60}>
                <Card className="h-full p-7 transition-colors hover:border-border-strong">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/12 text-brand-soft">
                    <benefit.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-content">
                    {benefit.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-content-muted">
                    {benefit.body}
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Family plan */}
      <section className="border-t border-border bg-bg-soft py-24">
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="The Family plan"
              title="One subscription, up to five students"
              description="Whether you have one teen or a houseful, the Family plan keeps every student’s record in its own clean space — with a parent view across all of them."
            />
            <Link
              href="/pricing"
              className={`${buttonClasses('secondary', 'md')} mt-8`}
            >
              Compare all plans
            </Link>
          </Reveal>
          {familyPlan && (
            <Reveal delay={120}>
              <Card className="border-brand/40 p-8 shadow-glow">
                <Badge tone="brand" className="mb-3">
                  <Sparkles className="h-3 w-3" />
                  Most popular
                </Badge>
                <h3 className="text-lg font-semibold text-content">
                  {familyPlan.name}
                </h3>
                <p className="mt-1 text-sm text-content-muted">
                  {familyPlan.tagline}
                </p>
                <p className="mt-4">
                  <span className="text-4xl font-semibold tracking-tight text-content">
                    {familyPlan.priceLabel}
                  </span>
                  <span className="text-sm text-content-subtle"> /mo</span>
                </p>
                <p className="mt-1 text-xs text-content-subtle">
                  {familyPlan.seats}
                </p>
                <ul className="mt-6 space-y-2.5">
                  {familyPlan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm text-content-muted"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`${buttonClasses('primary', 'md')} mt-7 w-full`}
                >
                  Start the Family plan
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Card>
            </Reveal>
          )}
        </div>
      </section>

      {/* Reassurance */}
      <section className="border-t border-border py-24">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrow="Peace of mind"
              title="Built to make parenting easier"
              description="My Award Tracker is designed to reduce friction at home, not add another thing to manage."
            />
          </Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {REASSURANCE.map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <Card className="h-full p-6">
                  <h3 className="text-lg font-semibold text-content">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-content-muted">
                    {item.body}
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-bg-soft py-24">
        <div className="container-page">
          <Reveal>
            <Card className="relative overflow-hidden p-10 text-center sm:p-16">
              <div className="absolute inset-0 bg-grid-fade" />
              <div className="relative">
                <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-content sm:text-4xl">
                  Give your family a head start.
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-content-muted">
                  Set up profiles for your kids and watch their achievements
                  add up — all from one calm, organized dashboard.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/signup"
                    className={buttonClasses('primary', 'lg')}
                  >
                    Create your account
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/contact"
                    className={buttonClasses('secondary', 'lg')}
                  >
                    Talk to us
                  </Link>
                </div>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>
    </>
  );
}
