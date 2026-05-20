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

/** Per-organization sub-nav. Pass orgId to expand the {orgId} segment. */
export function orgNav(orgId: string): NavItem[] {
  return [
    { href: `/dashboard/org/${orgId}`, label: 'Overview', icon: LayoutDashboard },
    { href: `/dashboard/org/${orgId}/members`, label: 'Members', icon: Users },
    { href: `/dashboard/org/${orgId}/chat`, label: 'Team chat', icon: MessageSquare },
    { href: `/dashboard/org/${orgId}/clock`, label: 'Clock in/out', icon: Clock },
    { href: `/dashboard/org/${orgId}/leaderboard`, label: 'Leaderboard', icon: Trophy },
    { href: `/dashboard/org/${orgId}/reports`, label: 'Reports', icon: FileText },
    { href: `/dashboard/org/${orgId}/billing`, label: 'Billing', icon: CreditCard },
    { href: `/dashboard/org/${orgId}/settings`, label: 'Settings', icon: Settings },
  ];
}

// Legacy alias so existing imports keep working.
export const DASHBOARD_NAV = PERSONAL_NAV;

export function navTitle(pathname: string): string {
  const exact = PERSONAL_NAV.find((n) => n.href === pathname);
  if (exact) return exact.label;
  if (pathname.startsWith('/dashboard/org/')) return 'Organization';
  if (pathname.startsWith('/dashboard/organizations')) return 'Organizations';
  const nested = PERSONAL_NAV.filter((n) => n.href !== '/dashboard').find((n) =>
    pathname.startsWith(n.href),
  );
  return nested?.label ?? 'Dashboard';
}
