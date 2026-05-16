import {
  ACTIVITY_CATEGORIES,
  AWARD_PROGRAMS,
  PLANS,
} from '@myawardtracker/shared';
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CloudUpload,
  FileText,
  ShieldCheck,
  Sparkles,
  Target,
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
    'Track activities, service hours, and award progress in one polished dashboard built for students, families, and organizations.',
};

const FEATURES = [
  {
    icon: CalendarCheck,
    title: 'Effortless activity logging',
    body: 'Capture what you did, when, and for how long across 11 categories — in seconds, on any device.',
  },
  {
    icon: BarChart3,
    title: 'Hours that add up',
    body: 'Service and development hours roll up automatically into clear totals and category breakdowns.',
  },
  {
    icon: Target,
    title: 'Award goal tracking',
    body: 'Map activities to the Congressional Award, PVSA, and more — and watch progress fill in real time.',
  },
  {
    icon: CloudUpload,
    title: 'Evidence, organized',
    body: 'Attach photos and PDFs to any activity. Files stay private, secured behind expiring links.',
  },
  {
    icon: FileText,
    title: 'Application-ready summaries',
    body: 'Turn a year of effort into a clean portfolio for college and scholarship applications.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by design',
    body: 'Every record is scoped to your account. Your data is encrypted and never shared or sold.',
  },
];

const STEPS = [
  {
    title: 'Create a profile',
    body: 'Add the student — grade, school, and the award programs they are working toward.',
  },
  {
    title: 'Log activities',
    body: 'Record volunteering, leadership, fitness, and more as life happens. Add hours and evidence.',
  },
  {
    title: 'Track progress',
    body: 'See hours accumulate, goals fill in, and a polished summary come together automatically.',
  },
];

export default function HomePage() {
  const featuredCategories = ACTIVITY_CATEGORIES.slice(0, 8);
  const hourPrograms = AWARD_PROGRAMS.filter((p) => p.goalHours);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[640px] bg-grid-fade" />
        <div className="container-page relative grid gap-14 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
          <div>
            <Eyebrow>Activity &amp; award tracking, reimagined</Eyebrow>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-content sm:text-5xl lg:text-[3.4rem]">
              Track every activity, hour, and{' '}
              <span className="text-gradient">award</span> in one place.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-content-muted">
              My Award Tracker helps high school students, families, and
              organizations log activities, accumulate service hours, and reach
              award goals — without spreadsheets.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className={buttonClasses('primary', 'lg')}>
                Start tracking free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/how-it-works"
                className={buttonClasses('secondary', 'lg')}
              >
                See how it works
              </Link>
            </div>
            <p className="mt-5 text-sm text-content-subtle">
              No credit card to get started · Cancel anytime
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

      {/* Features */}
      <section className="border-t border-border py-24">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrow="Features"
              title="Everything you need to show your impact"
              description="A focused toolkit that turns scattered effort into a record you can be proud of."
            />
          </Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 60}>
                <Card className="h-full p-6 transition-colors hover:border-border-strong">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/12 text-brand-soft">
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

      {/* How it works */}
      <section className="border-t border-border bg-bg-soft py-24">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrow="How it works"
              title="From first activity to finished portfolio"
              description="Three simple steps — the tracking and totals happen on their own."
            />
          </Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 80}>
                <Card className="h-full p-6">
                  <span className="text-sm font-semibold text-brand-soft">
                    Step {i + 1}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-content">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-content-muted">
                    {step.body}
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/how-it-works" className={buttonClasses('outline', 'md')}>
              Explore the full walkthrough
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-t border-border py-24">
        <div className="container-page">
          <Reveal>
            <SectionHeading
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
                  <Card className="h-full p-5">
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

      {/* Pricing teaser */}
      <section className="border-t border-border py-24">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrow="Pricing"
              title="Plans for students, families, and groups"
              description="Start as an individual and scale up to a whole organization whenever you need."
            />
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.filter((p) => p.id !== 'enterprise').map((plan, i) => (
              <Reveal key={plan.id} delay={i * 60}>
                <Card
                  className={`h-full p-6 ${plan.highlighted ? 'border-brand/40 shadow-glow' : ''}`}
                >
                  {plan.highlighted && (
                    <Badge tone="brand" className="mb-3">
                      <Sparkles className="h-3 w-3" />
                      Most popular
                    </Badge>
                  )}
                  <h3 className="text-sm font-semibold text-content">
                    {plan.name}
                  </h3>
                  <p className="mt-3">
                    <span className="text-3xl font-semibold tracking-tight text-content">
                      {plan.priceLabel}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-sm text-content-subtle"> /mo</span>
                    )}
                  </p>
                  <p className="mt-2 text-xs text-content-muted">{plan.seats}</p>
                </Card>
              </Reveal>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/pricing" className={buttonClasses('primary', 'md')}>
              Compare all plans
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border py-24">
        <div className="container-page">
          <Reveal>
            <Card className="relative overflow-hidden p-10 text-center sm:p-16">
              <div className="absolute inset-0 bg-grid-fade" />
              <div className="relative">
                <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-content sm:text-4xl">
                  Start building your record today.
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-content-muted">
                  Join students turning everyday effort into awards, scholarships,
                  and standout applications.
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

function HeroPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-[2rem] bg-brand/10 blur-2xl" />
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
            { label: 'Activities', value: '47' },
            { label: 'Categories', value: '9' },
            { label: 'Evidence', value: '23' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-bg-soft p-3"
            >
              <p className="text-lg font-semibold text-content">{stat.value}</p>
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
            { title: 'Food bank volunteering', tag: 'Volunteer · 4h' },
            { title: 'Robotics club lead', tag: 'Leadership · 3h' },
          ].map((row) => (
            <div
              key={row.title}
              className="flex items-center justify-between rounded-lg border border-border bg-bg-soft px-3 py-2.5"
            >
              <span className="text-sm text-content">{row.title}</span>
              <span className="text-xs text-content-subtle">{row.tag}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
