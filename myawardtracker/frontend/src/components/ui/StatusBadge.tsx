import { Badge, type BadgeTone } from './Badge';

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  planned: { label: 'Planned', tone: 'neutral' },
  in_progress: { label: 'In Progress', tone: 'info' },
  completed: { label: 'Completed', tone: 'brand' },
  verified: { label: 'Verified', tone: 'success' },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS[status] ?? { label: status, tone: 'neutral' as BadgeTone };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
