import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-brand-soft">
      <span className="h-1.5 w-1.5 rounded-full bg-brand" />
      {children}
    </span>
  );
}

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'center' | 'left';
  className?: string;
}

export function SectionHeading({
  eyebrow,
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
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
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
