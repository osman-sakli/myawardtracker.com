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

export interface PlanDef {
  id: PlanId;
  name: string;
  /** Monthly price in USD. 0 means "contact us". */
  price: number;
  priceLabel: string;
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
    price: 4.99,
    priceLabel: '$4.99',
    tagline: 'For a single student tracking their own journey.',
    seats: '1 profile',
    features: [
      'Unlimited activity logging',
      'All activity categories',
      'Hours & award progress tracking',
      'Evidence file uploads',
      'College application summaries',
    ],
    stripePriceEnvKey: 'STRIPE_PRICE_INDIVIDUAL',
  },
  {
    id: 'family',
    name: 'Family',
    price: 9.99,
    priceLabel: '$9.99',
    tagline: 'For families managing multiple students.',
    seats: 'Up to 5 profiles',
    features: [
      'Everything in Individual',
      'Up to 5 student profiles',
      'Parent oversight dashboard',
      'Per-student summaries & exports',
      'Shared evidence library',
    ],
    stripePriceEnvKey: 'STRIPE_PRICE_FAMILY',
    highlighted: true,
  },
  {
    id: 'small_group',
    name: 'Small Group',
    price: 19.99,
    priceLabel: '$19.99',
    tagline: 'For clubs and small organizations.',
    seats: '8–20 members',
    features: [
      'Everything in Family',
      '8–20 member seats',
      'Organization admin dashboard',
      'Member management',
      'Group reporting & exports',
    ],
    stripePriceEnvKey: 'STRIPE_PRICE_SMALL_GROUP',
  },
  {
    id: 'medium_group',
    name: 'Medium Group',
    price: 29.99,
    priceLabel: '$29.99',
    tagline: 'For larger programs and chapters.',
    seats: '20–40 members',
    features: [
      'Everything in Small Group',
      '20–40 member seats',
      'Coordinator approval workflow',
      'Award program templates',
      'Priority support',
    ],
    stripePriceEnvKey: 'STRIPE_PRICE_MEDIUM_GROUP',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0,
    priceLabel: 'Custom',
    tagline: 'For schools, nonprofits, universities, and corporations.',
    seats: 'Unlimited members',
    features: [
      'Everything in Medium Group',
      'Unlimited member seats',
      'Multi-group / multi-tenant',
      'SSO & advanced security',
      'Dedicated onboarding & SLA',
    ],
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
