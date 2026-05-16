import { AWARD_PROGRAMS } from '@myawardtracker/shared';
import {
  ArrowRight,
  Award,
  GraduationCap,
  ListChecks,
  Sparkles,
  Target,
  Wallet,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Reveal } from '@/components/marketing/Reveal';
import { Eyebrow, SectionHeading } from '@/components/marketing/Section';
import { Badge } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';

export const metadata: Metadata = {
  title: 'For Students',
  description:
    'My Award Tracker helps high school students stay organized for college applications, scholarships, and the Congressional Award or PVSA — without spreadsheets.',
};

const BENEFITS = [
  {
    icon: GraduationCap,
    title: 'Stand out on college applications',
    body: 'Admissions officers want depth and consistency, not a last-minute list. A complete activity record shows real commitment over time.',
  },
  {
    icon: Wallet,
    title: 'Unlock more scholarships',
    body: 'Many scholarships ask for documented service hours and leadership. Have the proof ready instead of scrambling before each deadline.',
  },
  {
    icon: Award,
    title: 'Earn recognized awards',
    body: 'Track structured programs like the Congressional Award and PVSA, with live progress so you know exactly what each tier still needs.',
  },
  {
    icon: ListChecks,
    title: 'Stay organized all year',
    body: 'No more digging through texts and photos. Every activity, hour, and certificate lives in one place you can search instantly.',
  },
];

const WORRIES = [
  {
    worry: '"I forgot how many hours I have."',
    fix: 'Totals update automatically the moment you log an activity — your numbers are always current.',
  },
  {
    worry: '"My evidence is scattered everywhere."',
    fix: 'Attach photos and PDFs directly to each activity, so proof and record stay together for good.',
  },
  {
    worry: '"Application season is overwhelming."',
    fix: 'Export a clean, organized summary in seconds — a year of effort, ready to share with one click.',
  },
];

export default function ForStudentsPage() {
  const hourPrograms = AWARD_PROGRAMS.filter((p) => p.goalHours);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[600px] bg-grid-fade" />
        <div className="container-page relative grid gap-14 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
          <div>
            <Eyebrow>For students</Eyebrow>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-content sm:text-5xl">
              Make every hour{' '}
              <span className="text-gradient">count</span> when it matters.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-content-muted">
              You are putting in the work — volunteering, leading, training,
              learning. My Award Tracker keeps the record so it pays off on
              your college and scholarship applications.
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
            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-brand/10 blur-2xl" />
              <Card className="relative overflow-hidden p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-content-subtle">
                      Service hours this year
                    </p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight text-content">
                      186h
                    </p>
                  </div>
                  <Badge tone="success">On track</Badge>
                </div>
                <div className="mt-5 rounded-xl border border-border bg-bg-soft p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-content">
                      Congressional Award
                    </span>
                    <span className="text-content-subtle">186 / 400h</span>
                  </div>
                  <Progress value={47} className="mt-2" />
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    { title: 'Tutoring at the library', tag: 'Service · 3h' },
                    { title: 'Varsity track training', tag: 'Fitness · 2h' },
                    { title: 'Debate team captain', tag: 'Leadership · 4h' },
                  ].map((row) => (
                    <div
                      key={row.title}
                      className="flex items-center justify-between rounded-lg border border-border bg-bg-soft px-3 py-2.5"
                    >
                      <span className="text-sm text-content">{row.title}</span>
                      <span className="text-xs text-content-subtle">
                        {row.tag}
                      </span>
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
              eyebrow="Why it matters"
              title="The work you do deserves a record"
              description="Four years of effort can disappear into forgotten details. Here is what staying organized gives back to you."
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

      {/* Award programs */}
      <section className="border-t border-border bg-bg-soft py-24">
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="Award programs"
              title="Chase the Congressional Award and PVSA with confidence"
              description="These programs reward sustained effort across service, personal development, and fitness. My Award Tracker keeps a live count toward every tier, so you never lose track of where you stand."
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
                  const logged = [186, 132][i] ?? 60;
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
                      <p className="mt-1.5 text-xs text-content-subtle">
                        {program.description}
                      </p>
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

      {/* Worries / fixes */}
      <section className="border-t border-border py-24">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrow="No more stress"
              title="The deadline scramble, solved"
              description="Every common headache around tracking activities has a built-in answer."
            />
          </Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {WORRIES.map((item, i) => (
              <Reveal key={item.worry} delay={i * 80}>
                <Card className="h-full p-6">
                  <Target className="h-5 w-5 text-brand-soft" />
                  <p className="mt-3 text-base font-semibold text-content">
                    {item.worry}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-content-muted">
                    {item.fix}
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
                <span className="inline-flex items-center gap-2 text-sm font-medium text-brand-soft">
                  <Sparkles className="h-4 w-4" />
                  Start your record now
                </span>
                <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-content sm:text-4xl">
                  Your future self will thank you.
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-content-muted">
                  Start logging today and reach application season with a
                  complete, ready-to-share portfolio.
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
                    See pricing
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
