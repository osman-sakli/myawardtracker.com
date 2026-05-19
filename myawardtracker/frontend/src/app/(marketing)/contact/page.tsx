import { Clock, LifeBuoy, Mail } from 'lucide-react';
import type { Metadata } from 'next';

import { ContactForm } from '@/components/marketing/ContactForm';
import { Reveal } from '@/components/marketing/Reveal';
import { Eyebrow } from '@/components/marketing/Section';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with the My Award Tracker team — questions about plans, organizations, or getting started.',
};

const DETAILS = [
  {
    icon: Mail,
    title: 'Email us',
    body: 'hello@myawardtracker.com',
  },
  {
    icon: Clock,
    title: 'Response time',
    body: 'Within 1–2 business days',
  },
  {
    icon: LifeBuoy,
    title: 'Getting started',
    body: 'Questions about the 15-day trial or your account',
  },
];

export default function ContactPage() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[420px] bg-grid-fade" />
      <div className="container-page relative py-20 lg:py-24">
        <Reveal>
          <div className="max-w-2xl">
            <Eyebrow>Contact</Eyebrow>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight text-content sm:text-5xl">
              Let&apos;s talk
            </h1>
            <p className="mt-5 text-lg text-content-muted">
              Questions about plans, setting up an organization, or getting the
              most out of My Award Tracker? We&apos;re here to help.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal>
            <div className="space-y-4">
              {DETAILS.map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand-soft">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-content">
                      {item.title}
                    </h2>
                    <p className="mt-0.5 text-sm text-content-muted">
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <ContactForm />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
