import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

import { cn } from '@/lib/cn';

const FIELD =
  'w-full rounded-xl border border-border bg-bg-soft px-3.5 text-sm text-content ' +
  'placeholder:text-content-subtle transition-colors ' +
  'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const INVALID = 'border-danger focus:border-danger focus:ring-danger/25';

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(FIELD, 'h-11', invalid && INVALID, className)}
    {...props}
  />
));
Input.displayName = 'Input';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(FIELD, 'min-h-[96px] py-2.5 leading-relaxed', invalid && INVALID, className)}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(({ className, invalid, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(FIELD, 'h-11 appearance-none pr-9', invalid && INVALID, className)}
      {...props}
    >
      {children}
    </select>
    <svg
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-subtle"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
));
Select.displayName = 'Select';

interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-content">
          {label}
          {required && <span className="text-brand-soft"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-content-subtle">{hint}</p>
      ) : null}
    </div>
  );
}
