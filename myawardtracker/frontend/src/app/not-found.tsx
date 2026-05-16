import Link from 'next/link';

import { buttonClasses } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Link href="/" aria-label="My Award Tracker home">
        <Logo />
      </Link>
      <p className="mt-12 text-sm font-medium text-brand-soft">Error 404</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-content">
        This page wandered off.
      </h1>
      <p className="mt-3 max-w-md text-content-muted">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className={buttonClasses('primary', 'md')}>
          Back home
        </Link>
        <Link href="/dashboard" className={buttonClasses('secondary', 'md')}>
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
