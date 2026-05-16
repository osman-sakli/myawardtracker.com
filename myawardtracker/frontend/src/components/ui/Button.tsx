import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap ' +
  'transition-all duration-200 focus-visible:outline-none ' +
  'disabled:pointer-events-none disabled:opacity-50';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-white hover:bg-brand-hover shadow-[0_10px_34px_-10px_rgba(124,107,255,0.75)]',
  secondary:
    'bg-surface-raised text-content border border-border hover:bg-surface-hover hover:border-border-strong',
  outline:
    'border border-border-strong text-content hover:bg-surface-hover',
  ghost: 'text-content-muted hover:text-content hover:bg-surface-hover',
  danger: 'bg-danger/90 text-white hover:bg-danger',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-7 text-[0.95rem]',
};

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading, className, children, disabled, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
