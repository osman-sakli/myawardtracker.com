/**
 * Application constants shared by frontend and backend:
 * built-in activity categories, subscription plans, award programs, and the
 * organization tier ladder.
 */

import type {
  BuiltInCategoryId,
  OrgPermission,
  OrgPlanId,
  OrgRole,
  OrgTierId,
  PlanId,
} from './types';

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
export const FREE_TRIAL_DAYS = 30;

/** How long an active individual subscription lasts before it auto-renews, in days. */
export const PAID_ACCESS_DAYS = 365;

/** Chat retention default — see Organization.chatRetentionDays for per-org override. */
export const DEFAULT_CHAT_RETENTION_DAYS = 30;

/** Raw clock-session retention; aggregates outlive this. */
export const CLOCK_SESSION_RETENTION_DAYS = 90;

/** Daily snapshot retention. */
export const SNAPSHOT_RETENTION_DAYS = 730;

// ---------------------------------------------------------------------------
// Individual plan
// ---------------------------------------------------------------------------

export interface PlanDef {
  id: PlanId;
  name: string;
  /** Yearly price in USD. */
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
    price: 4.99,
    priceLabel: '$4.99',
    billingNote: 'per year · cancel anytime',
    trialDays: FREE_TRIAL_DAYS,
    tagline:
      'Everything one student needs to track activities and awards, plus join organizations free.',
    seats: '1 student',
    features: [
      '30-day free trial — no card required',
      'Unlimited activity logging',
      'All activity categories',
      'Hours & award progress tracking',
      'Evidence file uploads',
      'Personal reporting & college portfolio',
      'Join unlimited organizations as a free member',
    ],
    stripePriceEnvKey: 'STRIPE_PRICE_INDIVIDUAL',
    highlighted: false,
  },
];

export const PLAN_BY_ID: Record<string, PlanDef> = Object.fromEntries(
  PLANS.map((p) => [p.id, p]),
);

// ---------------------------------------------------------------------------
// Organization plans
// ---------------------------------------------------------------------------

export interface OrgTierDef {
  id: OrgTierId;
  label: string;
  /** Inclusive member cap for the tier. */
  maxMembers: number;
  /** Yearly base price in USD. */
  basePriceUsd: number;
  /** Yearly price with the storage add-on enabled. */
  storagePriceUsd: number;
  /** Env var name carrying the Stripe price id for the base plan. */
  stripePriceEnvKey: string;
  /** Env var name for the storage-add-on Stripe price id. */
  stripeStoragePriceEnvKey: string;
}

export const ORG_TIERS: OrgTierDef[] = [
  {
    id: 'small',
    label: 'Small organization',
    maxMembers: 50,
    basePriceUsd: 39,
    storagePriceUsd: 69,
    stripePriceEnvKey: 'STRIPE_PRICE_ORG_SMALL',
    stripeStoragePriceEnvKey: 'STRIPE_PRICE_ORG_SMALL_STORAGE',
  },
  {
    id: 'medium',
    label: 'Medium organization',
    maxMembers: 300,
    basePriceUsd: 78,
    storagePriceUsd: 138,
    stripePriceEnvKey: 'STRIPE_PRICE_ORG_MEDIUM',
    stripeStoragePriceEnvKey: 'STRIPE_PRICE_ORG_MEDIUM_STORAGE',
  },
  {
    id: 'large',
    label: 'Large organization',
    maxMembers: 500,
    basePriceUsd: 117,
    storagePriceUsd: 207,
    stripePriceEnvKey: 'STRIPE_PRICE_ORG_LARGE',
    stripeStoragePriceEnvKey: 'STRIPE_PRICE_ORG_LARGE_STORAGE',
  },
];

export const ORG_TIER_BY_ID: Record<OrgTierId, OrgTierDef> = Object.fromEntries(
  ORG_TIERS.map((t) => [t.id, t]),
) as Record<OrgTierId, OrgTierDef>;

/** Derive the tier for a current memberCount. Returns the smallest sufficient tier. */
export function tierForMemberCount(memberCount: number): OrgTierDef {
  for (const tier of ORG_TIERS) {
    if (memberCount <= tier.maxMembers) return tier;
  }
  // Above 500 members → still treated as Large until enterprise contact-sales path.
  return ORG_TIERS[ORG_TIERS.length - 1]!;
}

/** Returns the Stripe price env-key for a given org plan id. */
export function orgPlanToEnvKey(plan: OrgPlanId): string {
  const storage = plan.endsWith('_storage');
  const tierId = plan.replace('org_', '').replace('_storage', '') as OrgTierId;
  const tier = ORG_TIER_BY_ID[tierId];
  return storage ? tier.stripeStoragePriceEnvKey : tier.stripePriceEnvKey;
}

// ---------------------------------------------------------------------------
// RBAC — must stay in sync with backend/src/app/rbac.py
// ---------------------------------------------------------------------------

/** Permission matrix; the source of truth lives in rbac.py. */
export const ORG_ROLE_PERMISSIONS: Record<OrgRole, OrgPermission[]> = {
  owner: [
    'org:update',
    'org:delete',
    'billing:manage',
    'members:invite',
    'members:remove',
    'members:role',
    'channels:create',
    'channels:moderate',
    'messages:post',
    'messages:read',
    'messages:pin',
    'clock:self',
    'clock:approve',
    'clock:view_all',
    'reports:generate',
    'reports:view',
    'audit:view',
  ],
  admin: [
    'org:update',
    'billing:manage',
    'members:invite',
    'members:remove',
    'members:role',
    'channels:create',
    'channels:moderate',
    'messages:post',
    'messages:read',
    'messages:pin',
    'clock:self',
    'clock:approve',
    'clock:view_all',
    'reports:generate',
    'reports:view',
    'audit:view',
  ],
  manager: [
    'members:invite',
    'channels:create',
    'channels:moderate',
    'messages:post',
    'messages:read',
    'messages:pin',
    'clock:self',
    'clock:approve',
    'clock:view_all',
    'reports:generate',
    'reports:view',
  ],
  moderator: [
    'channels:moderate',
    'messages:post',
    'messages:read',
    'messages:pin',
    'clock:self',
    'clock:view_all',
    'reports:view',
  ],
  member: ['messages:post', 'messages:read', 'clock:self'],
  viewer: ['messages:read', 'clock:view_all', 'reports:view'],
};

export function roleHas(role: OrgRole, perm: OrgPermission): boolean {
  return ORG_ROLE_PERMISSIONS[role]?.includes(perm) ?? false;
}

// ---------------------------------------------------------------------------
// Award programs (unchanged from v1)
// ---------------------------------------------------------------------------

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
