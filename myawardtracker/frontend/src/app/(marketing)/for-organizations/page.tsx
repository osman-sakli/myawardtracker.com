import { PLANS } from '@myawardtracker/shared';
import {
  ArrowRight,
  ClipboardCheck,
  LayoutDashboard,
  Sparkles,
  UserCog,
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
  title: 'For Organizations',
  description:
    'My Award Tracker gives clubs, schools, and nonprofits member management, group reporting, and coordinator workflows — with plans built to scale from small groups to enterprise.',
};

const BENEFITS = [
  {
    icon: Users,
    title: 'Member management',
    body: 'Invite members, organize them into your program, and keep every student’s activities and hours in one shared workspace.',
  },
  {
    icon: LayoutDashboard,
    title: 'Group reporting',
    body: 'See total service hours, participation, and award progress across your whole group — and export it for boards, grants, and renewals.',
  },
  {
    icon: ClipboardCheck,
    title: 'Coordinator workflows',
    body: 'Review and verify member submissions with an approval flow, so the hours you report are accurate and trustworthy.',
  },
  {
    icon: UserCog,
    title: 'Admin dashboard',
    body: 'A single control center for seats, roles, and program templates — manage the whole organization without spreadsheets.',
  },
];

const USE_CASES = [
  {
    label: 'Clubs',
    title: 'Service and honor clubs',
    body: 'Track member volunteer hours for chapter requirements and report them with confidence at the end of each term.',
  },
  {
    label: 'Schools',
    title: 'Schools & districts',
    body: 'Give every student a structured record and roll up service-hour data for graduation requirements and recognition.',
  },
  {
    label: 'Nonprofits',
    title: 'Nonprofits & programs',
    body: 'Document volunteer impact across your youth programs and produce clean reports for funders and stakeholders.',
  },
];

export default function ForOrganizationsPage() {
  const groupPlans = PLANS.filter(
    (p) => p.id === 'small_group' || p.id === 'medium_group',
  );
  const enterprisePlan = PLANS.find((p) => p.id === 'enterprise');

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[600px] bg-grid-fade" />
        <div className="container-page relative grid gap-14 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
          <div>
            <Eyebrow>For organizations</Eyebrow>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-content sm:text-5xl">
              Track your group’s{' '}
              <span className="text-gradient">impact</span>, all in one place.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-content-muted">
              Clubs, schools, and nonprofits use My Award Tracker to manage
              members, verify hours, and report participation — without
              chasing down spreadsheets or sign-in sheets.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact" className={buttonClasses('primary', 'lg')}>
                Talk to our team
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className={buttonClasses('secondary', 'lg')}
              >
                See group plans
              </Link>
            </div>
            <p className="mt-5 text-sm text-content-subtle">
              Plans from small clubs to district-wide deployments
            </p>
          </div>

          <Reveal>
            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-brand/10 blur-2xl" />
              <Card className="relative overflow-hidden p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-content-subtle">
                      Group service hours
                    </p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight text-content">
                      2,840h
                    </p>
                  </div>
                  <Badge tone="success">+312h this term</Badge>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Members', value: '34' },
                    { label: 'Activities', value: '512' },
                    { label: 'Pending', value: '11' },
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
                <div className="mt-4 space-y-2">
                  {[
                    { title: 'Park cleanup — 12 members', tag: 'Approved' },
                    { title: 'Food drive — 8 members', tag: 'Pending review' },
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
              eyebrow="Built for coordinators"
              title="Everything a program lead needs"
              description="Spend less time collecting hours and more time running great programs."
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

      {/* Use cases */}
      <section className="border-t border-border bg-bg-soft py-24">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrow="Who it’s for"
              title="One platform, every kind of group"
              description="From a 12-member club to a multi-school district, the same tracking and reporting scales with you."
            />
          </Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {USE_CASES.map((useCase, i) => (
              <Reveal key={useCase.title} delay={i * 80}>
                <Card className="h-full p-6">
                  <Badge tone="info">{useCase.label}</Badge>
                  <h3 className="mt-3 text-lg font-semibold text-content">
                    {useCase.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-content-muted">
                    {useCase.body}
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Plans for groups */}
      <section className="border-t border-border py-24">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrow="Plans for groups"
              title="Pricing that scales with your program"
              description="Start with a group plan and move up to Enterprise when you need multi-group management, SSO, and dedicated onboarding."
            />
          </Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {groupPlans.map((plan, i) => (
              <Reveal key={plan.id} delay={i * 70}>
                <Card className="h-full p-7">
                  <h3 className="text-sm font-semibold text-content">
                    {plan.name}
                  </h3>
                  <p className="mt-3">
                    <span className="text-3xl font-semibold tracking-tight text-content">
                      {plan.priceLabel}
                    </span>
                    <span className="text-sm text-content-subtle"> /mo</span>
                  </p>
                  <p className="mt-2 text-xs text-content-muted">
                    {plan.seats}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-content-muted">
                    {plan.tagline}
                  </p>
                </Card>
              </Reveal>
            ))}
            {enterprisePlan && (
              <Reveal delay={140}>
                <Card className="h-full border-brand/40 p-7 shadow-glow">
                  <Badge tone="brand" className="mb-3">
                    <Sparkles className="h-3 w-3" />
                    For large programs
                  </Badge>
                  <h3 className="text-sm font-semibold text-content">
                    {enterprisePlan.name}
                  </h3>
                  <p className="mt-3">
                    <span className="text-3xl font-semibold tracking-tight text-content">
                      {enterprisePlan.priceLabel}
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-content-muted">
                    {enterprisePlan.seats}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-content-muted">
                    {enterprisePlan.tagline}
                  </p>
                </Card>
              </Reveal>
            )}
          </div>
          <div className="mt-10 text-center">
            <Link href="/pricing" className={buttonClasses('outline', 'md')}>
              Compare all plans
              <ArrowRight className="h-4 w-4" />
            </Link>
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
                  Bring your whole organization on board.
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-content-muted">
                  Tell us about your group and we’ll help you pick the right
                  plan and get every member set up.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/contact"
                    className={buttonClasses('primary', 'lg')}
                  >
                    Talk to our team
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/signup"
                    className={buttonClasses('secondary', 'lg')}
                  >
                    Create an account
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
