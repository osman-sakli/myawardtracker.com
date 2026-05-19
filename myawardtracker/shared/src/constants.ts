/**
 * Application constants shared by frontend and backend:
 * built-in activity categories, subscription plans, and award programs.
 */

import type { BuiltInCategoryId, PlanId } from './types';

export interface CategoryDef {
  id: BuiltInCategoryId;
  label: string;
  description: string;
  /** lucide-react icon name used by the frontend. */
  icon: string;
  /** Tailwind-friendly accent hex. */
  color: string;
  /** Whether the category accumulates hours. */
  tracksHours: boolean;
}

export const ACTIVITY_CATEGORIES: CategoryDef[] = [
  {
    id: 'volunteer_service',
    label: 'Volunteer Service',
    description: 'Hours given to community and service organizations.',
    icon: 'HeartHandshake',
    color: '#34d399',
    tracksHours: true,
  },
  {
    id: 'personal_development',
    label: 'Personal Development',
    description: 'Skills, hobbies, and growth pursued over time.',
    icon: 'Sprout',
    color: '#60a5fa',
    tracksHours: true,
  },
  {
    id: 'physical_fitness',
    label: 'Physical Fitness',
    description: 'Wellness goals, training, and athletic improvement.',
    icon: 'Dumbbell',
    color: '#f472b6',
    tracksHours: true,
  },
  {
    id: 'expedition',
    label: 'Expedition / Exploration',
    description: 'Planned trips, expeditions, and exploration activities.',
    icon: 'Compass',
    color: '#fbbf24',
    tracksHours: true,
  },
  {
    id: 'internship',
    label: 'Internship',
    description: 'Professional internships and work experience.',
    icon: 'Briefcase',
    color: '#a78bfa',
    tracksHours: true,
  },
  {
    id: 'leadership',
    label: 'Leadership',
    description: 'Roles where you led a team, project, or initiative.',
    icon: 'Flag',
    color: '#fb923c',
    tracksHours: true,
  },
  {
    id: 'award',
    label: 'Award',
    description: 'Recognitions, honors, and awards received.',
    icon: 'Trophy',
    color: '#facc15',
    tracksHours: false,
  },
  {
    id: 'certification',
    label: 'Certification',
    description: 'Certifications and credentials earned.',
    icon: 'BadgeCheck',
    color: '#22d3ee',
    tracksHours: false,
  },
  {
    id: 'extracurricular',
    label: 'Extracurricular',
    description: 'Clubs, teams, arts, and activities outside class.',
    icon: 'Star',
    color: '#818cf8',
    tracksHours: true,
  },
  {
    id: 'community_service',
    label: 'Community Service',
    description: 'Service projects benefiting your local community.',
    icon: 'Users',
    color: '#4ade80',
    tracksHours: true,
  },
  {
    id: 'membership',
    label: 'Organization Membership',
    description: 'Active memberships in organizations and societies.',
    icon: 'IdCard',
    color: '#2dd4bf',
    tracksHours: false,
  },
];

export const CATEGORY_BY_ID: Record<string, CategoryDef> = Object.fromEntries(
  ACTIVITY_CATEGORIES.map((c) => [c.id, c]),
);

/** Length of the free trial every new account gets, in days. */
export const FREE_TRIAL_DAYS = 15;

/** How long a single one-time purchase keeps an account active, in days. */
export const PAID_ACCESS_DAYS = 365;

export interface PlanDef {
  id: PlanId;
  name: string;
  /** One-time price in USD. */
  price: number;
  priceLabel: string;
  /** Short line describing the billing model shown under the price. */
  billingNote: string;
  /** Free trial length in days. */
  trialDays: number;
  tagline: string;
  seats: string;
  features: string[];
  /** Env var holding the Stripe price id for this plan. */
  stripePriceEnvKey?: string;
  highlighted?: boolean;
}

export const PLANS: PlanDef[] = [
  {
    id: 'individual',
    name: 'Individual',
    price: 9.99,
    priceLabel: '$9.99',
    billingNote: 'one-time payment · 12 months of access',
    trialDays: FREE_TRIAL_DAYS,
    tagline: 'Everything one student needs to track activities and awards.',
    seats: '1 student',
    features: [
      '15-day free trial — no card required',
      'Unlimited activity logging',
      'All activity categories',
      'Hours & award progress tracking',
      'Evidence file uploads',
      'College application summaries',
      'Bi-weekly progress report emails',
    ],
    stripePriceEnvKey: 'STRIPE_PRICE_INDIVIDUAL',
    highlighted: true,
  },
];

export const PLAN_BY_ID: Record<string, PlanDef> = Object.fromEntries(
  PLANS.map((p) => [p.id, p]),
);

/** Award programs the app can map activities to (catalog seed). */
export interface AwardProgramDef {
  id: string;
  name: string;
  description: string;
  /** Hour goal for the program's top tier, if hour-based. */
  goalHours?: number;
}

export const AWARD_PROGRAMS: AwardProgramDef[] = [
  {
    id: 'congressional_award',
    name: 'Congressional Award',
    description:
      'Voluntary public service, personal development, physical fitness, and expedition goals.',
    goalHours: 400,
  },
  {
    id: 'pvsa',
    name: "President's Volunteer Service Award",
    description: 'Annual volunteer service hours recognition.',
    goalHours: 250,
  },
  {
    id: 'girl_scouts',
    name: 'Girl Scouts Awards',
    description: 'Bronze, Silver, and Gold Award project tracking.',
  },
  {
    id: 'school_club',
    name: 'School Club Record',
    description: 'Track club participation and leadership hours.',
  },
  {
    id: 'nonprofit_volunteer',
    name: 'Nonprofit Volunteer Record',
    description: 'General volunteer hour tracking for nonprofits.',
  },
  {
    id: 'general',
    name: 'College Application Portfolio',
    description: 'A general portfolio of activities for college applications.',
  },
];

export const AWARD_PROGRAM_BY_ID: Record<string, AwardProgramDef> =
  Object.fromEntries(AWARD_PROGRAMS.map((p) => [p.id, p]));

export const ACTIVITY_STATUSES = [
  { id: 'planned', label: 'Planned' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'verified', label: 'Verified' },
] as const;

/** Max evidence file size accepted by presigned uploads (10 MB). */
export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_EVIDENCE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
];
