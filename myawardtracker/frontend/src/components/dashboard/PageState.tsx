import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-danger/25 bg-danger/5 px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/12 text-danger">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold text-content">
        Something went wrong
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-content-muted">{message}</p>
      <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
