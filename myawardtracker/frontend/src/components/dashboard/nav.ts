import {
  Activity,
  Award,
  CreditCard,
  History,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const DASHBOARD_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/activities', label: 'Activities', icon: Activity },
  { href: '/dashboard/profiles', label: 'Profiles', icon: Users },
  { href: '/dashboard/awards', label: 'Award progress', icon: Award },
  { href: '/dashboard/history', label: 'History', icon: History },
  { href: '/dashboard/account', label: 'Account', icon: Settings },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
];

export function navTitle(pathname: string): string {
  const exact = DASHBOARD_NAV.find((n) => n.href === pathname);
  if (exact) return exact.label;
  const nested = DASHBOARD_NAV.filter((n) => n.href !== '/dashboard').find((n) =>
    pathname.startsWith(n.href),
  );
  return nested?.label ?? 'Dashboard';
}
