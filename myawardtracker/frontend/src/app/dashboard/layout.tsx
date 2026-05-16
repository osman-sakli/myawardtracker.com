'use client';

import { AuthGuard } from '@/components/dashboard/AuthGuard';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
