import type { LucideIcon } from 'lucide-react';

import { Card } from '@/components/ui/Card';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
}

export function StatCard({ label, value, icon: Icon, hint }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-content-muted">{label}</span>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/12 text-brand-soft">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-content">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-content-subtle">{hint}</p>}
    </Card>
  );
}
