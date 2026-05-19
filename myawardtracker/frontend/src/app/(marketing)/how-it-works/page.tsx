import { AWARD_PROGRAMS } from '@myawardtracker/shared';
import {
  ArrowRight,
  CalendarCheck,
  CloudUpload,
  Download,
  Sparkles,
  Target,
  UserPlus,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Reveal } from '@/components/marketing/Reveal';
import { Eyebrow, SectionHeading } from '@/components/marketing/Section';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';

export const metadata: Metadata = {
  title: 'How It Works',
  description:
    'A step-by-step walkthrough of My Award Tracker — create a profile, log activities, attach evidence, track award progress, and export an application-ready portfolio.',
};

const STEPS = [
  {
    icon: UserPlus,
    title: 'Create a profile',
    body: 'Add the student — grade, school, and the award programs they are working toward. Families and organizations can add a profile for every student in minutes.',
  },
  {
    icon: CalendarCheck,
    title: 'Log activities',
    body: 'Record volunteering, leadership, fitness, internships, and more as life happens. Pick a category, add hours, set a status, and you are done in under a minute.',
  },
  {
    icon: CloudUpload,
    title: 'Attach evidence',
    body: 'Upload photos and PDFs — sign-in sheets, certificates, project documentation — directly to any activity. Files stay private behind secure, expiring links.',
  },
  {
    icon: Target,
    title: 'Track award progress',
    body: 'Tag activities to programs like the Congressional Award or PVSA. Hours and milestones roll up into live progress bars, so you always know what is left.',
  },
  {
    icon: Download,
    title: 'Export a portfolio',
    body: 'When application season arrives, turn a year of effort into a clean, organized summary for colleges and scholarships — ready to share in seconds.',
  },
];

const HABITS = [
  {
    title: 'Log little and often',
    body: 'A two-minute entry after each activity beats reconstructing a whole year from memory. The totals build themselves.',
  },
  {
    title: 'Attach evidence right away',
    body: 'Snap a photo of the sign-in sheet before you leave. Verified records carry far more weight on applications.',
  },
  {
    title: 'Check progress monthly',
    body: 'A quick monthly review keeps award goals on track and surfaces categories that need attention.',
  },
];

export default function HowItWorksPage() {
  const hourPrograms = AWARD_PROGRAMS.filter((p) => p.goalHours);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[560px] bg-grid-fade" />
        <div className="container-page relative py-20 text-center lg:py-28">
          <Reveal>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>How it works</Eyebrow>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-content sm:text-5xl">
                From first activity to{' '}
                <span className="text-gradient">finished portfolio</span>.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-content-muted">
                Getting started takes minutes. Here is exactly how My Award
                Tracker turns everyday effort into a record you can be proud of.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/signup" className={buttonClasses('primary', 'lg')}>
                  Start tracking free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/features"
                  className={buttonClasses('secondary', 'lg')}
                >
                  Explore features
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Steps */}
      <section className="border-t border-border py-24">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrow="The walkthrough"
              title="Five steps, then it runs on its own"
              description="The tracking, totals, and progress bars all happen automatically — you just keep logging."
            />
          </Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 70}>
                <Card className="h-full p-6 transition-colors hover:border-border-strong">
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/12 text-brand-soft">
                      <step.icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold text-content-subtle">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-content">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-content-muted">
                    {step.body}
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Progress in action */}
      <section className="border-t border-border bg-bg-soft py-24">
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="Step 4, up close"
              title="Watch the goals fill in"
              description="Every activity you tag to a program nudges its progress bar forward. There is nothing to recalculate — open the dashboard and the numbers are already current."
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
                  const logged = [168, 110][i] ?? 60;
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

      {/* Habits */}
      <section className="border-t border-border py-24">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrow="Make it stick"
              title="Three habits that make tracking effortless"
              description="A little consistency is all it takes to reach application season with a complete, verified record."
            />
          </Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {HABITS.map((habit, i) => (
              <Reveal key={habit.title} delay={i * 80}>
                <Card className="h-full p-6">
                  <span className="text-sm font-semibold text-brand-soft">
                    Tip {i + 1}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-content">
                    {habit.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-content-muted">
                    {habit.body}
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
                  Ready in minutes
                </span>
                <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-content sm:text-4xl">
                  Take the first step today.
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-content-muted">
                  Create a profile, log your first activity, and watch your
                  record start to build.
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
