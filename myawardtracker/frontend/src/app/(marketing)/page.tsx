import {
  ACTIVITY_CATEGORIES,
  AWARD_PROGRAMS,
  FREE_TRIAL_DAYS,
  ORG_TIERS,
  PLAN_BY_ID,
} from '@myawardtracker/shared';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck,
  Check,
  Clock,
  CloudUpload,
  FileText,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Reveal } from '@/components/marketing/Reveal';
import { Eyebrow, SectionHeading } from '@/components/marketing/Section';
import { Badge } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { categoryIcon } from '@/components/ui/CategoryIcon';
import { Progress } from '@/components/ui/Progress';

export const metadata: Metadata = {
  description:
    'Track activities, service hours, and award progress — for one student or a whole organization. Clubs, schools, nonprofits, and scout troops run their members from one dashboard.',
};

// Each feature gets its own accent color so the grid feels like a palette,
// not a wall of one shade. The hex values mirror the tailwind tokens for
// brand/teal/coral/sun/violet/mint/sky and are inlined via `style` so we
// keep this file declarative.
const FEATURES = [
  { icon: CalendarCheck, color: '#3b6df0', title: 'Effortless activity logging', body: 'Capture what you did, when, and for how long across 11 categories — in seconds, on any device.' },
  { icon: BarChart3,     color: '#0fb5a8', title: 'Hours that add up',           body: 'Service and development hours roll up automatically into clear totals and category breakdowns.' },
  { icon: Target,        color: '#8b5cf6', title: 'Award goal tracking',         body: 'Map activities to the Congressional Award, PVSA, and more — watch progress fill in real time.' },
  { icon: CloudUpload,   color: '#38bdf8', title: 'Evidence, organized',         body: 'Attach photos and PDFs to any activity. Files stay private, secured behind expiring links.' },
  { icon: FileText,      color: '#f59e0b', title: 'Application-ready summaries', body: 'Turn a year of effort into a clean portfolio for college and scholarship applications.' },
  { icon: ShieldCheck,   color: '#fb7185', title: 'Private by design',           body: 'Every record is scoped to your account. Your data is encrypted and never shared or sold.' },
];

const ORG_FEATURES = [
  { icon: Users,         color: '#3b6df0', title: 'Member management',     body: 'Invite by email, assign roles (owner, admin, manager, moderator, member, viewer), and gate every action with built-in RBAC.' },
  { icon: MessageSquare, color: '#8b5cf6', title: 'Real-time team chat',    body: 'Channels for announcements, planning, and quick coordination. Messages auto-expire after 30 days to keep storage costs and inboxes light.' },
  { icon: Clock,         color: '#0fb5a8', title: 'Clock in / clock out',   body: 'Members log sessions on the spot; managers approve in one tap. Hours roll into per-member, per-org, monthly, and yearly aggregates.' },
  { icon: Trophy,        color: '#f59e0b', title: 'Leaderboards & reports', body: 'Top contributors update nightly. Export volunteer summaries, leadership, participation, and attendance reports to PDF or CSV.' },
];

const ORG_TYPES = [
  { label: 'School clubs',        icon: Users,       color: '#3b6df0' },
  { label: 'Schools',             icon: Building2,   color: '#0fb5a8' },
  { label: 'Nonprofits',          icon: ShieldCheck, color: '#fb7185' },
  { label: 'Scout troops',        icon: Trophy,      color: '#f59e0b' },
  { label: 'Universities',        icon: Building2,   color: '#8b5cf6' },
  { label: 'Leadership programs', icon: Target,      color: '#38bdf8' },
  { label: 'Community groups',    icon: Users,       color: '#34d399' },
];

const STEPS = [
  { title: 'Create a profile', body: 'Add the student — grade, school, and the award programs they are working toward. Or spin up an organization.' },
  { title: 'Log activities',   body: 'Record volunteering, leadership, fitness, and more as life happens. Members clock in and out from any device.' },
  { title: 'Track progress',   body: 'See hours accumulate, goals fill in, leaderboards update, and a polished summary come together automatically.' },
];

export default function HomePage() {
  const featuredCategories = ACTIVITY_CATEGORIES.slice(0, 8);
  const hourPrograms = AWARD_PROGRAMS.filter((p) => p.goalHours);
  const pricingPlan = PLAN_BY_ID['individual'];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-aurora" />
        <div className="container-page relative grid gap-14 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
          <div>
            <Eyebrow tone="violet">Now for individuals and organizations</Eyebrow>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-content sm:text-5xl lg:text-[3.4rem]">
              Track every activity, hour, and{' '}
              <span className="text-gradient">award</span>
              <br className="hidden sm:block" /> for one student or a whole team.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-content-muted">
              My Award Tracker started as the cleanest way for one student to log
              service hours and award progress. It's now a full SaaS platform for
              clubs, schools, scout troops, nonprofits, and universities —
              members, chat, clock-in/out, and reports included.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className={buttonClasses('primary', 'lg')}>
                Start tracking free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/signup?org=1"
                className={`${buttonClasses('secondary', 'lg')} border-violet/30 text-violet hover:bg-violet/10`}
              >
                <Building2 className="h-4 w-4" />
                Start an organization
              </Link>
            </div>
            <p className="mt-5 text-sm text-content-subtle">
              No credit card to get started · {FREE_TRIAL_DAYS}-day free trial
            </p>
          </div>

          <Reveal>
            <HeroPreview />
          </Reveal>
        </div>

        <div className="container-page relative pb-16">
          <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-content-subtle">
            Built for the programs students care about
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {AWARD_PROGRAMS.map((p) => (
              <span key={p.id} className="text-sm font-medium text-content-muted">
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features (individuals) */}
      <section className="border-t border-border py-24">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrowTone="brand"
              eyebrow="For students"
              title="Everything one student needs to show their impact"
              description="A focused toolkit that turns scattered effort into a record you can be proud of."
            />
          </Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 60}>
                <Card className="h-full p-6 transition-all hover:-translate-y-0.5 hover:shadow-card">
                  <span
                    className="grid h-11 w-11 place-items-center rounded-xl"
                    style={{
                      backgroundColor: `${feature.color}1f`,
                      color: feature.color,
                    }}
                  >
                    <feature.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-content">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-content-muted">
                    {feature.body}
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Organizations — the new SaaS layer */}
      <section className="relative overflow-hidden border-t border-border py-24">
        <div className="absolute inset-0 bg-aurora opacity-60" />
        <div className="container-page relative">
          <Reveal>
            <SectionHeading
              eyebrowTone="violet"
              eyebrow="For organizations"
              title="Run your club, school, or nonprofit from one dashboard"
              description="Members never pay — only the owner does. Built on the same low-cost serverless backbone, priced to fit a student-org budget."
            />
          </Reveal>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {ORG_FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 70}>
                <Card className="relative h-full overflow-hidden p-6">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-20 blur-3xl"
                    style={{ backgroundColor: feature.color }}
                  />
                  <span
                    className="relative grid h-12 w-12 place-items-center rounded-xl"
                    style={{
                      backgroundColor: `${feature.color}1f`,
                      color: feature.color,
                    }}
                  >
                    <feature.icon className="h-5 w-5" />
                  </span>
                  <h3 className="relative mt-4 text-lg font-semibold text-content">
                    {feature.title}
                  </h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-content-muted">
                    {feature.body}
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
              <span className="mr-2 text-xs font-medium uppercase tracking-wider text-content-subtle">
                Made for
              </span>
              {ORG_TYPES.map((t) => (
                <span
                  key={t.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-sm"
                  style={{ color: t.color }}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  <span className="text-content">{t.label}</span>
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-bg-soft py-24">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrowTone="mint"
              eyebrow="How it works"
              title="From first activity to finished portfolio"
              description="Three simple steps — the tracking and totals happen on their own."
            />
          </Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => {
              const tones = ['#3b6df0', '#8b5cf6', '#0fb5a8'];
              const color = tones[i] ?? '#3b6df0';
              return (
                <Reveal key={step.title} delay={i * 80}>
                  <Card className="h-full p-6">
                    <span
                      className="inline-flex items-center gap-2 text-sm font-semibold"
                      style={{ color }}
                    >
                      <span
                        className="grid h-6 w-6 place-items-center rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {i + 1}
                      </span>
                      Step {i + 1}
                    </span>
                    <h3 className="mt-3 text-lg font-semibold text-content">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-content-muted">
                      {step.body}
                    </p>
                  </Card>
                </Reveal>
              );
            })}
          </div>
          <div className="mt-10 text-center">
            <Link href="/how-it-works" className={buttonClasses('outline', 'md')}>
              Explore the full walkthrough
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories — colorful by definition */}
      <section className="border-t border-border py-24">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrowTone="coral"
              eyebrow="Categories"
              title="One place for every kind of achievement"
              description="Log across 11 built-in categories — hour-based and milestone-based alike."
            />
          </Reveal>
          <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featuredCategories.map((category, i) => {
              const Icon = categoryIcon(category.icon);
              return (
                <Reveal key={category.id} delay={i * 40}>
                  <Card
                    className="h-full p-5 transition-all hover:-translate-y-0.5"
                    style={{ borderColor: `${category.color}40` }}
                  >
                    <span
                      className="grid h-10 w-10 place-items-center rounded-lg"
                      style={{
                        backgroundColor: `${category.color}1f`,
                        color: category.color,
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-3.5 text-sm font-semibold text-content">
                      {category.label}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-content-muted">
                      {category.description}
                    </p>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Award progress */}
      <section className="border-t border-border bg-bg-soft py-24">
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrowTone="sun"
              eyebrow="Award progress"
              title="Watch goals fill in as you go"
              description="Tag activities to a program and My Award Tracker keeps a live count of where you stand against the goal."
            />
            <Link
              href="/features"
              className={`${buttonClasses('secondary', 'md')} mt-8`}
            >
              See all features
            </Link>
          </Reveal>
          <Reveal delay={120}>
            <Card className="p-6">
              <div className="space-y-6">
                {hourPrograms.map((program, i) => {
                  const logged = [148, 92][i] ?? 60;
                  const pct = Math.round(
                    (logged / (program.goalHours ?? 1)) * 100,
                  );
                  return (
                    <div key={program.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-content">
                          {program.name}
                        </span>
                        <span className="text-content-subtle">
                          {logged} / {program.goalHours}h
                        </span>
                      </div>
                      <Progress value={pct} className="mt-2" />
                    </div>
                  );
                })}
              </div>
              <p className="mt-6 text-xs text-content-subtle">
                Illustrative progress — your real numbers update automatically.
              </p>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* Pricing teaser — both plans now */}
      <section className="border-t border-border py-24">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrowTone="teal"
              eyebrow="Pricing"
              title="Pay for one student, or one organization."
              description={`Try everything free for ${FREE_TRIAL_DAYS} days. Then pick the plan that fits — individuals are $4.99/yr; organizations start at $39/yr and cover every member.`}
            />
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {/* Individual */}
            {pricingPlan && (
              <Reveal>
                <Card className="flex h-full flex-col border-brand/30 p-8">
                  <Badge tone="brand" className="self-start">
                    <Sparkles className="h-3 w-3" />
                    Individual
                  </Badge>
                  <h3 className="mt-4 text-base font-semibold text-content">
                    {pricingPlan.name}
                  </h3>
                  <p className="mt-3">
                    <span className="text-4xl font-semibold tracking-tight text-content">
                      {pricingPlan.priceLabel}
                    </span>
                  </p>
                  <p className="mt-1 text-sm font-medium text-brand">
                    {pricingPlan.billingNote}
                  </p>
                  <ul className="mt-6 space-y-2 border-t border-border pt-6 text-sm text-content-muted">
                    {pricingPlan.features.slice(0, 4).map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={`${buttonClasses('primary', 'md')} mt-7 self-start`}
                  >
                    Start free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Card>
              </Reveal>
            )}

            {/* Organization */}
            <Reveal delay={80}>
              <Card className="relative flex h-full flex-col overflow-hidden border-violet/35 p-8">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet/20 blur-3xl" />
                <Badge className="relative self-start border-violet/35 bg-violet/10 text-violet">
                  <Building2 className="h-3 w-3" />
                  Organization
                </Badge>
                <h3 className="relative mt-4 text-base font-semibold text-content">
                  3 tiers · members never pay
                </h3>
                <p className="relative mt-3">
                  <span className="text-4xl font-semibold tracking-tight text-content">
                    from $39
                  </span>
                  <span className="text-base text-content-subtle">/year</span>
                </p>
                <p className="relative mt-1 text-sm font-medium text-violet">
                  Small ≤ 50 · Medium ≤ 300 · Large ≤ 500 members
                </p>
                <ul className="relative mt-6 space-y-2 border-t border-border pt-6 text-sm text-content-muted">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
                    Members, roles, RBAC, audit log
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
                    Real-time team chat (30-day retention)
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
                    Clock-in/out with manager approvals
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
                    PDF/CSV reports, leaderboards, dashboards
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
                    Optional storage add-on for files & certificates
                  </li>
                </ul>
                <Link
                  href="/pricing"
                  className={`${buttonClasses('primary', 'md')} relative mt-7 self-start bg-violet hover:bg-violet/90`}
                >
                  See org pricing
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Card>
            </Reveal>
          </div>

          {/* Three tier teaser */}
          <Reveal delay={140}>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {ORG_TIERS.map((tier, i) => {
                const tones = ['#3b6df0', '#8b5cf6', '#0fb5a8'];
                const color = tones[i] ?? '#3b6df0';
                return (
                  <div
                    key={tier.id}
                    className="flex items-center justify-between rounded-2xl border border-border bg-surface px-5 py-4"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>
                        {tier.label}
                      </p>
                      <p className="text-sm text-content-muted">
                        ≤ {tier.maxMembers} members
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-content">
                        ${tier.basePriceUsd}<span className="text-xs text-content-subtle">/yr</span>
                      </p>
                      <p className="text-xs text-content-subtle">
                        + storage: ${tier.storagePriceUsd}/yr
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border py-24">
        <div className="container-page">
          <Reveal>
            <Card className="relative overflow-hidden p-10 text-center sm:p-16">
              <div className="absolute inset-0 bg-aurora" />
              <div className="relative">
                <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-content sm:text-4xl">
                  Start building your record today.
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-content-muted">
                  Whether it's one student or a whole club, your free trial
                  starts in under a minute.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link href="/signup" className={buttonClasses('primary', 'lg')}>
                    Create your account
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/contact" className={buttonClasses('secondary', 'lg')}>
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

function HeroPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-[2rem] bg-brand-mint opacity-30 blur-2xl" />
      <Card className="relative overflow-hidden p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-content-subtle">Total hours logged</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-content">
              312.5h
            </p>
          </div>
          <Badge tone="success">+18h this month</Badge>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { label: 'Activities', value: '47', tone: '#3b6df0' },
            { label: 'Members',    value: '24', tone: '#8b5cf6' },
            { label: 'Evidence',   value: '23', tone: '#0fb5a8' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-bg-soft p-3">
              <p className="text-lg font-semibold" style={{ color: stat.tone }}>
                {stat.value}
              </p>
              <p className="text-[0.7rem] text-content-subtle">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-border bg-bg-soft p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-content">Congressional Award</span>
            <span className="text-content-subtle">312 / 400h</span>
          </div>
          <Progress value={78} className="mt-2" />
        </div>

        <div className="mt-4 space-y-2">
          {[
            { title: 'Food bank volunteering', tag: 'Volunteer · 4h',  color: '#34d399' },
            { title: 'Robotics club lead',     tag: 'Leadership · 3h', color: '#fb923c' },
            { title: 'Chess tutoring',         tag: 'Service · 2h',    color: '#8b5cf6' },
          ].map((row) => (
            <div
              key={row.title}
              className="flex items-center justify-between rounded-lg border border-border bg-bg-soft px-3 py-2.5"
            >
              <span className="flex items-center gap-2 text-sm text-content">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
                {row.title}
              </span>
              <span className="text-xs text-content-subtle">{row.tag}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
