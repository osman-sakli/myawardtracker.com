import { cn } from '@/lib/cn';

interface ProgressProps {
  value: number;
  className?: string;
  tone?: 'brand' | 'success' | 'warning';
}

const TONES = {
  brand: 'from-brand to-brand-soft',
  success: 'from-success to-accent',
  warning: 'from-warning to-brand-soft',
};

export function Progress({ value, className, tone = 'brand' }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-raised', className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', TONES[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
