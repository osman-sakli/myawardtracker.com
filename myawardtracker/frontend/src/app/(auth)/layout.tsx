import Link from 'next/link';

import { Logo } from '@/components/ui/Logo';

const HIGHLIGHTS = [
  'Log activities across 11 categories in seconds',
  'Watch service hours roll up toward award goals',
  'Keep evidence and reflections in one organized place',
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-bg-soft p-12 lg:flex">
        <div className="absolute inset-0 bg-grid-fade" />
        <div className="absolute inset-0 bg-dots opacity-40" />
        <div className="relative">
          <Link href="/" aria-label="My Award Tracker home">
            <Logo />
          </Link>
        </div>
        <div className="relative">
          <h2 className="max-w-sm text-3xl font-semibold leading-tight tracking-tight text-content">
            Every hour, activity, and award — beautifully organized.
          </h2>
          <ul className="mt-8 space-y-3.5">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-content-muted">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/15 text-brand-soft">
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-content-subtle">
          Trusted by students pursuing the Congressional Award, PVSA, and more.
        </p>
      </aside>

      <main className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link href="/" aria-label="My Award Tracker home">
              <Logo />
            </Link>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
