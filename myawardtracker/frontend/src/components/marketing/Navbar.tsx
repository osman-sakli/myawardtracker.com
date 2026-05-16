'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Logo } from '@/components/ui/Logo';
import { buttonClasses } from '@/components/ui/Button';
import { getCurrentUser } from '@/lib/auth';
import { cn } from '@/lib/cn';

const NAV_LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/for-students', label: 'For students' },
  { href: '/contact', label: 'Contact' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    getCurrentUser()
      .then((u) => setAuthed(Boolean(u)))
      .catch(() => setAuthed(false));
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-colors duration-300',
        scrolled
          ? 'border-b border-border bg-bg/85 backdrop-blur-xl'
          : 'border-b border-transparent',
      )}
    >
      <nav className="container-page flex h-16 items-center justify-between">
        <Link href="/" aria-label="My Award Tracker home">
          <Logo />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-content-muted transition-colors hover:text-content"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          {authed ? (
            <Link href="/dashboard" className={buttonClasses('primary', 'sm')}>
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className={buttonClasses('ghost', 'sm')}>
                Log in
              </Link>
              <Link href="/signup" className={buttonClasses('primary', 'sm')}>
                Get started
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-content-muted lg:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-border bg-bg lg:hidden">
          <div className="container-page flex flex-col gap-1 py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-content-muted hover:bg-surface-hover hover:text-content"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              {authed ? (
                <Link href="/dashboard" className={buttonClasses('primary', 'md')}>
                  Go to dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" className={buttonClasses('secondary', 'md')}>
                    Log in
                  </Link>
                  <Link href="/signup" className={buttonClasses('primary', 'md')}>
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
