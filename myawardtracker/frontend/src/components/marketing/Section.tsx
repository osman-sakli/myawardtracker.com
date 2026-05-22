import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type EyebrowTone = 'brand' | 'teal' | 'coral' | 'sun' | 'violet' | 'mint';

const TONE_CLASSES: Record<EyebrowTone, { text: string; dot: string; bg: string }> = {
  brand: {
    text: 'text-brand',
    dot: 'bg-brand',
    bg: 'bg-brand/5 border-brand/25',
  },
  teal: { text: 'text-teal', dot: 'bg-teal', bg: 'bg-teal/8 border-teal/25' },
  coral: { text: 'text-coral', dot: 'bg-coral', bg: 'bg-coral/8 border-coral/25' },
  sun: { text: 'text-sun', dot: 'bg-sun', bg: 'bg-sun/10 border-sun/30' },
  violet: { text: 'text-violet', dot: 'bg-violet', bg: 'bg-violet/8 border-violet/25' },
  mint: { text: 'text-mint', dot: 'bg-mint', bg: 'bg-mint/10 border-mint/30' },
};

export function Eyebrow({
  children,
  tone = 'brand',
}: {
  children: ReactNode;
  tone?: EyebrowTone;
}) {
  const t = TONE_CLASSES[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
        t.bg,
        t.text,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} />
      {children}
    </span>
  );
}

interface SectionHeadingProps {
  eyebrow?: string;
  eyebrowTone?: EyebrowTone;
  title: ReactNode;
  description?: ReactNode;
  align?: 'center' | 'left';
  className?: string;
}

export function SectionHeading({
  eyebrow,
  eyebrowTone = 'brand',
  title,
  description,
  align = 'center',
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'max-w-2xl',
        align === 'center' && 'mx-auto text-center',
        className,
      )}
    >
      {eyebrow && <Eyebrow tone={eyebrowTone}>{eyebrow}</Eyebrow>}
      <h2
        className={cn(
          'text-3xl font-semibold tracking-tight text-content sm:text-[2.5rem] sm:leading-[1.1]',
          eyebrow && 'mt-4',
        )}
      >
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base leading-relaxed text-content-muted">
          {description}
        </p>
      )}
    </div>
  );
}
