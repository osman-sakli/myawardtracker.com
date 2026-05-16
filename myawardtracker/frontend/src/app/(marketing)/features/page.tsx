import { ACTIVITY_CATEGORIES, AWARD_PROGRAMS } from '@myawardtracker/shared';
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CloudUpload,
  FileText,
  FolderTree,
  ShieldCheck,
  Target,
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
  title: 'Features',
  description:
    'Explore every My Award Tracker feature — activity logging, hour tracking, award goal mapping, evidence uploads, application-ready summaries, multi-profile support, and privacy by design.',
};

const CORE_FEATURES = [
  {
    icon: CalendarCheck,
    title: 'Effortless activity logging',
    body: 'Record what you did, when, and how long it took across 11 built-in categories. Add a description, status, and tags in under a minute — from a laptop or a phone.',
  },
  {
    icon: BarChart3,
    title: 'Hour tracking that adds up',
    body: 'Service and development hours roll into automatic totals with category breakdowns. No formulas, no spreadsheets — just accurate numbers you can trust.',
  },
  {
    icon: Target,
    title: 'Award goal mapping',
    body: 'Tag activities to the Congressional Award, PVSA, and more. Live progress bars show exactly how close each student is to the next milestone.',
  },
  {
    icon: CloudUpload,
    title: 'Evidence uploads',
    body: 'Attach photos and PDFs to any activity — sign-in sheets, certificates, project documentation. Files are stored securely behind expiring links.',
  },
  {
    icon: FileText,
    title: 'Application-ready summaries',
    body: 'Turn a year of effort into a clean, organized portfolio for college and scholarship applications. Export when you need it, in seconds.',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy & security',
    body: 'Every record is scoped to your account and encrypted at rest. We never sell or share your data — your achievements belong to you.',
  },
];

const DEEP_DIVE = [
  {
    icon: Users,
    title: 'Multi-profile support',
    body: 'Families and organizations manage several students from one account. Each profile keeps its own activities, hours, awards, and evidence — cleanly separated.',
    points: [
      'Switch between profiles in a click',
      'Per-profile totals and summaries',
      'Parent and coordinator oversight views',
    ],
  },
  {
    icon: FolderTree,
    title: 'Categories built for real life',
    body: 'From volunteer service to certifications, every kind of achievement has a home. Hour-based and milestone-based categories work side by side.',
    points: [
      '11 categories ready out of the box',
      'Hour-tracked and milestone-tracked types',
      'Color-coded for fast scanning',
    ],
  },
];

export default function FeaturesPage() {
  const sampleCategories = ACTIVITY_CATEGORIES.slice(0, 8);
  const hourPrograms = AWARD_PROGRAMS.filter((p) => p.goalHours);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[560px] bg-grid-fade" />
        <div className="container-page relative py-20 text-center lg:py-28">
          <Reveal>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Product features</Eyebrow>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-content sm:text-5xl">
                Every tool you need to{' '}
                <span className="text-gradient">prove your impact</span>.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-content-muted">
                My Award Tracker replaces scattered notes and spreadsheets with
                one focused workspace for logging activities, accumulating
                hours, and reaching award goals.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
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
            </div>
          </Reveal>
        </div>
      </section>

      {/* Core features */}
      <section className="border-t border-border py-24">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrow="Core features"
              title="A focused toolkit, not a cluttered dashboard"
              description="Each feature exists to turn everyday effort into a record that earns awards, scholarships, and admissions."
            />
          </Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CORE_FEATURES.map((feature, i) => (
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

      {/* Award goal mapping detail */}
      <section className="border-t border-border bg-bg-soft py-24">
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="Award goal mapping"
              title="Goals that update themselves"
              description="Tag an activity to a program once and My Award Tracker keeps a running count for you. No re-tallying, no guesswork — just a live picture of where each student stands."
            />
            <ul className="mt-8 space-y-3">
              {[
                'Map to the Congressional Award, PVSA, and more',
                'Hours and milestones counted automatically',
                'Per-program progress with clear remaining totals',
              ].map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 text-sm text-content-muted"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  {point}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className={`${buttonClasses('secondary', 'md')} mt-8`}
            >
              Try it free
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

      {/* Deep dive: profiles & categories */}
      <section className="border-t border-border py-24">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrow="Built to scale"
              title="From one student to a whole organization"
              description="The same record-keeping that works for an individual scales cleanly to families and coordinator-led groups."
            />
          </Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {DEEP_DIVE.map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <Card className="h-full p-7">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/12 text-brand-soft">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-content">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-content-muted">
                    {item.body}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {item.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-2.5 text-sm text-content-muted"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-t border-border bg-bg-soft py-24">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrow="Categories"
              title="A place for every kind of achievement"
              description="Log across 11 built-in categories — hour-based and milestone-based alike — each color-coded so totals are easy to read at a glance."
            />
          </Reveal>
          <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {sampleCategories.map((category, i) => {
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
                    <div className="mt-3">
                      <Badge tone={category.tracksHours ? 'brand' : 'neutral'}>
                        {category.tracksHours ? 'Hour-tracked' : 'Milestone'}
                      </Badge>
                    </div>
                  </Card>
                </Reveal>
              );
            })}
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
                  See every feature in action.
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-content-muted">
                  Create a free account and start logging activities today — or
                  compare plans to find the right fit.
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
                    href="/pricing"
                    className={buttonClasses('secondary', 'lg')}
                  >
                    Compare plans
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
