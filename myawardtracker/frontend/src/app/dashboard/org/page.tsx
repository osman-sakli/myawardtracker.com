'use client';

/**
 * Single dispatcher page for every per-organization screen.
 *
 * Why: the frontend ships via `next build && output: 'export'` to S3 +
 * CloudFront, so dynamic file routes (`[orgId]`) would need a generated
 * shell per id — impossible without server-side rendering. We collapse the
 * route to one static page and read `?id=<orgId>&tab=<members|chat|...>`
 * at runtime. All eight views render under one URL prefix
 * (`/dashboard/org/`), each backed by a client component in ./views.
 *
 * The Sidebar generates these URLs via `orgNav(orgId)` in components/
 * dashboard/nav.ts.
 */

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { OrgGuard } from '@/components/dashboard/OrgContext';
import { LoadingState } from '@/components/dashboard/PageState';

import { BillingView } from './views/BillingView';
import { ChatView } from './views/ChatView';
import { ClockView } from './views/ClockView';
import { LeaderboardView } from './views/LeaderboardView';
import { MembersView } from './views/MembersView';
import { OverviewView } from './views/OverviewView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';

const VIEWS = {
  overview: OverviewView,
  members: MembersView,
  chat: ChatView,
  clock: ClockView,
  leaderboard: LeaderboardView,
  reports: ReportsView,
  billing: BillingView,
  settings: SettingsView,
} as const;

type TabId = keyof typeof VIEWS;

function pickTab(value: string | null): TabId {
  if (value && value in VIEWS) return value as TabId;
  return 'overview';
}

function Dispatcher() {
  const params = useSearchParams();
  const orgId = params.get('id') ?? '';
  const tab = pickTab(params.get('tab'));

  if (!orgId) {
    return (
      <div className="rounded-2xl border border-warning/30 bg-warning/5 p-5 text-sm text-content">
        No organization selected. Open one from your{' '}
        <a href="/dashboard/organizations/" className="font-medium text-brand hover:text-brand-hover">
          organizations list
        </a>
        .
      </div>
    );
  }

  const View = VIEWS[tab];
  return (
    <OrgGuard orgId={orgId}>
      <View />
    </OrgGuard>
  );
}

export default function OrgDispatchPage() {
  // useSearchParams must be inside a Suspense boundary when static-exported.
  return (
    <Suspense fallback={<LoadingState />}>
      <Dispatcher />
    </Suspense>
  );
}
