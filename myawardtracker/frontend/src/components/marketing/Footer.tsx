import Link from 'next/link';

import { Logo } from '@/components/ui/Logo';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { href: '/features', label: 'Features' },
      { href: '/how-it-works', label: 'How it works' },
      { href: '/pricing', label: 'Pricing' },
    ],
  },
  {
    title: "Who it's for",
    links: [
      { href: '/for-students', label: 'For students' },
      { href: '/for-parents', label: 'For parents' },
      { href: '/for-organizations', label: 'For organizations' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/contact', label: 'Contact' },
      { href: '/login', label: 'Log in' },
      { href: '/signup', label: 'Get started' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-bg-soft">
      <div className="container-page py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-content-muted">
              The modern way for students, families, and organizations to track
              activities, hours, and award progress.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-content">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-content-muted transition-colors hover:text-content"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-sm text-content-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} My Award Tracker. All rights reserved.</p>
          <p>Built for students pursuing meaningful achievement.</p>
        </div>
      </div>
    </footer>
  );
}
