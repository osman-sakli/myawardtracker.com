import {
  Activity,
  BadgeCheck,
  Briefcase,
  Compass,
  Dumbbell,
  Flag,
  HeartHandshake,
  IdCard,
  Sprout,
  Star,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  HeartHandshake,
  Sprout,
  Dumbbell,
  Compass,
  Briefcase,
  Flag,
  Trophy,
  BadgeCheck,
  Star,
  Users,
  IdCard,
};

/** Resolve a lucide icon by the name stored in the shared category catalog. */
export function categoryIcon(name?: string): LucideIcon {
  return (name && ICON_MAP[name]) || Activity;
}
