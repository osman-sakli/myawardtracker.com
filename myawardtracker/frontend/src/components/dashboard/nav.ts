import {
  Activity,
  Award,
  Bell,
  Building2,
  Clock,
  CreditCard,
  FileText,
  History,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const PERSONAL_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/activities', label: 'Activities', icon: Activity },
  { href: '/dashboard/profiles', label: 'Profiles', icon: Users },
  { href: '/dashboard/awards', label: 'Award progress', icon: Award },
  { href: '/dashboard/history', label: 'History', icon: History },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/account', label: 'Account', icon: Settings },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
];

export const ORG_HOME: NavItem = {
  href: '/dashboard/organizations',
  label: 'Organizations',
  icon: Building2,
};

/** Per-organization sub-nav. Pass orgId to expand the `id` query param.
 *  We route by query params because the site is statically exported and the
 *  dynamic `[orgId]` segment can't be pre-generated. See
 *  src/app/dashboard/org/page.tsx for the dispatcher. */
export function orgNav(orgId: string): NavItem[] {
  const base = `/dashboard/org/?id=${orgId}`;
  return [
    { href: base, label: 'Overview', icon: LayoutDashboard },
    { href: `${base}&tab=members`, label: 'Members', icon: Users },
    { href: `${base}&tab=chat`, label: 'Team chat', icon: MessageSquare },
    { href: `${base}&tab=clock`, label: 'Clock in/out', icon: Clock },
    { href: `${base}&tab=leaderboard`, label: 'Leaderboard', icon: Trophy },
    { href: `${base}&tab=reports`, label: 'Reports', icon: FileText },
    { href: `${base}&tab=billing`, label: 'Billing', icon: CreditCard },
    { href: `${base}&tab=settings`, label: 'Settings', icon: Settings },
  ];
}

// Legacy alias so existing imports keep working.
export const DASHBOARD_NAV = PERSONAL_NAV;

const ORG_TAB_LABELS: Record<string, string> = {
  members: 'Members',
  chat: 'Team chat',
  clock: 'Clock in/out',
  leaderboard: 'Leaderboard',
  reports: 'Reports',
  billing: 'Org billing',
  settings: 'Org settings',
};

export function navTitle(pathname: string, tab?: string | null): string {
  const exact = PERSONAL_NAV.find((n) => n.href === pathname);
  if (exact) return exact.label;
  if (pathname.startsWith('/dashboard/organizations')) return 'Organizations';
  if (pathname.startsWith('/dashboard/org')) {
    return (tab && ORG_TAB_LABELS[tab]) || 'Organization';
  }
  const nested = PERSONAL_NAV.filter((n) => n.href !== '/dashboard').find((n) =>
    pathname.startsWith(n.href),
  );
  return nested?.label ?? 'Dashboard';
}
