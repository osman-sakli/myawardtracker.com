import {
  FREE_TRIAL_DAYS,
  ORG_TIERS,
  PLAN_BY_ID,
} from '@myawardtracker/shared';
import { ArrowRight, Building2, Check, Sparkles, Users } from 'lucide-react';
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
    'Individuals are $4.99/year after a 30-day free trial. Organizations start at $39/year and cover every member — members never pay.',
};

const FAQ = [
  {
    q: 'Do you offer a free trial?',
    a: `Yes — every new account gets ${FREE_TRIAL_DAYS} days free with no credit card required. Explore the full dashboard, create profiles, and log real activities (or members, if you're spinning up an organization) before you decide.`,
  },
  {
    q: 'How does individual billing work?',
    a: 'Individuals pay $4.99/year via Stripe — a recurring yearly subscription you can cancel at any time. Free accounts can join organizations and message in chat without paying.',
  },
  {
    q: 'How does organization billing work?',
    a: "Only the owner or an admin is billed. The price is based on the organization's current member count — Small ≤ 50, Medium ≤ 300, Large ≤ 500. Add the storage add-on if your members need to upload images, certificates, or verification files. Members themselves never pay.",
  },
  {
    q: 'What happens if my org grows past its tier cap?',
    a: 'Inviting a 51st member to a Small org returns a 402 with the required tier so the owner can upgrade. The new tier takes effect immediately; renewal is automatic at the higher level.',
  },
  {
    q: 'What happens to my data if my access lapses?',
    a: 'Your records stay safe and remain readable for export. Writes (new activities, messages, clock sessions) are gated by an active plan, but nothing is deleted automatically.',
  },
];

export default function PricingPage() {
  const individual = PLAN_BY_ID['individual'];
  const tierTones = ['#3b6df0', '#8b5cf6', '#0fb5a8'];

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-aurora" />
        <div className="container-page relative py-20 text-center lg:py-24">
          <Reveal>
            <Eyebrow tone="violet">Pricing</Eyebrow>
            <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-semibold leading-[1.1] tracking-tight text-content sm:text-5xl">
              One plan per student. One plan per organization.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-content-muted">
              Try everything free for {FREE_TRIAL_DAYS} days. Then $4.99/yr for
              an individual or from $39/yr for a whole organization — members
              never pay.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Top-row: two flagship cards */}
      <section className="pb-12">
        <div className="container-page">
          <div className="grid gap-5 md:grid-cols-2">
            {individual && (
              <Reveal>
                <Card className="flex h-full flex-col border-brand/30 p-8 shadow-card">
                  <Badge tone="brand" className="self-start">
                    <Sparkles className="h-3 w-3" />
                    Individual
                  </Badge>
                  <h2 className="mt-4 text-base font-semibold text-content">
                    {individual.name}
                  </h2>
                  <p className="mt-1 text-sm text-content-muted">
                    {individual.tagline}
                  </p>
                  <p className="mt-6">
                    <span className="text-5xl font-semibold tracking-tight text-content">
                      {individual.priceLabel}
                    </span>
                  </p>
                  <p className="mt-1 text-sm font-medium text-brand">
                    {individual.billingNote}
                  </p>
                  <Link
                    href="/signup"
                    className={`${buttonClasses('primary', 'lg')} mt-7 self-start`}
                  >
                    Start your {FREE_TRIAL_DAYS}-day free trial
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <p className="mt-2 text-xs text-content-subtle">
                    No credit card required to start.
                  </p>
                  <ul className="mt-7 space-y-2.5 border-t border-border pt-6 text-sm text-content-muted">
                    {individual.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </Card>
              </Reveal>
            )}

            <Reveal delay={80}>
              <Card className="relative flex h-full flex-col overflow-hidden border-violet/35 p-8 shadow-card">
                <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-violet/20 blur-3xl" />
                <Badge className="relative self-start border-violet/35 bg-violet/10 text-violet">
                  <Building2 className="h-3 w-3" />
                  Organization
                </Badge>
                <h2 className="relative mt-4 text-base font-semibold text-content">
                  Run your whole team
                </h2>
                <p className="relative mt-1 text-sm text-content-muted">
                  Clubs, schools, scout troops, nonprofits, universities, and
                  leadership programs — pay once for the org, everyone joins
                  free.
                </p>
                <p className="relative mt-6">
                  <span className="text-5xl font-semibold tracking-tight text-content">
                    from $39
                  </span>
                  <span className="text-base text-content-subtle">/year</span>
                </p>
                <p className="relative mt-1 text-sm font-medium text-violet">
                  Tiered by current member count
                </p>
                <Link
                  href="/signup?org=1"
                  className={`${buttonClasses('primary', 'lg')} relative mt-7 self-start bg-violet hover:bg-violet/90`}
                >
                  Start an organization
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="relative mt-2 text-xs text-content-subtle">
                  Owner/admin is billed. Members are free.
                </p>
                <ul className="relative mt-7 space-y-2.5 border-t border-border pt-6 text-sm text-content-muted">
                  <li className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
                    Members, roles, RBAC, audit log
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
                    Real-time team chat (30-day retention by default)
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
                    Clock-in/out with manager approvals
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
                    PDF/CSV reports, leaderboards, dashboards
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
                    Optional storage add-on for files & certificates
                  </li>
                </ul>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Org tier table */}
      <section className="border-t border-border bg-bg-soft py-20">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrowTone="violet"
              eyebrow="Organization tiers"
              title="Pick a size — change it any time"
              description="The tier is derived from your current member count on every billing read. Add the storage add-on for image, document, and certificate uploads."
            />
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {ORG_TIERS.map((tier, i) => {
              const color = tierTones[i] ?? '#3b6df0';
              const isMedium = tier.id === 'medium';
              return (
                <Reveal key={tier.id} delay={i * 80}>
                  <Card
                    className="relative flex h-full flex-col overflow-hidden p-7"
                    style={{ borderColor: `${color}55` }}
                  >
                    {isMedium && (
                      <span
                        className="absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
                        style={{ backgroundColor: color }}
                      >
                        Most popular
                      </span>
                    )}
                    <span
                      className="grid h-11 w-11 place-items-center rounded-xl"
                      style={{
                        backgroundColor: `${color}1f`,
                        color,
                      }}
                    >
                      <Users className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold text-content">
                      {tier.label}
                    </h3>
                    <p className="text-sm text-content-muted">
                      Up to {tier.maxMembers} members
                    </p>
                    <p className="mt-5">
                      <span className="text-4xl font-semibold tracking-tight text-content">
                        ${tier.basePriceUsd}
                      </span>
                      <span className="text-sm text-content-subtle">/year</span>
                    </p>
                    <p className="mt-1 text-xs text-content-subtle">
                      Base — chat, clock, reports, dashboards
                    </p>

                    <div
                      className="mt-5 rounded-xl border p-4"
                      style={{ borderColor: `${color}40`, backgroundColor: `${color}0d` }}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>
                        With storage add-on
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-content">
                        ${tier.storagePriceUsd}
                        <span className="text-sm text-content-subtle">/year</span>
                      </p>
                      <p className="mt-1 text-xs text-content-muted">
                        Adds image, document, and certificate uploads.
                      </p>
                    </div>

                    <Link
                      href="/signup?org=1"
                      className={`${buttonClasses('primary', 'md')} mt-6 self-start text-white`}
                      style={{ backgroundColor: color }}
                    >
                      Start {tier.label.toLowerCase()}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Card>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={200}>
            <p className="mt-10 text-center text-sm text-content-muted">
              Over 500 members?{' '}
              <Link href="/contact" className="font-medium text-brand hover:text-brand-hover">
                Talk to us
              </Link>{' '}
              — we'll size an enterprise plan with you.
            </p>
          </Reveal>
        </div>
      </section>

      {/* What every plan includes */}
      <section className="border-t border-border py-20">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrowTone="mint"
              eyebrow="Every plan includes"
              title="The same secure, low-cost backbone"
              description="We run on serverless AWS — no NAT, no idle EC2, no surprise bills. Your cost stays predictable as you grow."
            />
          </Reveal>
          <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2">
            {[
              { label: 'Encryption at rest and in transit',  color: '#3b6df0' },
              { label: 'PITR backups with 35-day window',    color: '#8b5cf6' },
              { label: 'Audit log on every important write', color: '#0fb5a8' },
              { label: 'Multi-tenant isolation by partition', color: '#fb7185' },
              { label: 'Rate-limited API + WebSocket',        color: '#f59e0b' },
              { label: 'Cancel any time — full data export',  color: '#34d399' },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
              >
                <Check className="h-4 w-4 shrink-0" style={{ color: row.color }} />
                <span className="text-sm text-content">{row.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-bg-soft py-24">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrowTone="sun"
              eyebrow="FAQ"
              title="Questions, answered"
              description="Everything you need to know before you start."
            />
          </Reveal>
          <div className="mx-auto mt-12 grid max-w-3xl gap-3">
            {FAQ.map((item, i) => (
              <Reveal key={item.q} delay={i * 50}>
                <Card className="p-6">
                  <h3 className="text-base font-semibold text-content">{item.q}</h3>
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
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/signup" className={buttonClasses('primary', 'lg')}>
                Start as an individual
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
          </Reveal>
        </div>
      </section>
    </>
  );
}
