import { cn } from '@/lib/cn';

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
}

export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-soft shadow-[0_8px_24px_-8px_rgba(124,107,255,0.8)]">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path
            d="M12 2.5l2.7 5.6 6.1.8-4.5 4.2 1.2 6-5.5-3-5.5 3 1.2-6L3 8.9l6.1-.8L12 2.5z"
            fill="white"
            fillOpacity="0.95"
          />
        </svg>
      </span>
      {showWordmark && (
        <span className="text-[0.95rem] font-semibold tracking-tight text-content">
          My Award Tracker
        </span>
      )}
    </span>
  );
}
