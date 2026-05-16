'use client';

import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/cn';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(
  () => undefined,
);

export function useToast() {
  return useContext(ToastContext);
}

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const TONE_CLASS = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-accent',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, message, tone }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2.5">
        {items.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3 shadow-card animate-fade-up"
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', TONE_CLASS[t.tone])} />
              <p className="flex-1 text-sm text-content">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="text-content-subtle transition-colors hover:text-content"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
