/**
 * Core domain types for My Award Tracker.
 * Shared by the frontend (Next.js) and backend (Lambda) so the API contract
 * stays in one place.
 */

export type UserRole =
  | 'individual'
  | 'parent'
  | 'org_admin'
  | 'coordinator'
  | 'enterprise_admin';

export type PlanId =
  | 'individual'
  | 'family'
  | 'small_group'
  | 'medium_group'
  | 'enterprise';

export type SubscriptionStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled';

/** Lifecycle of a logged activity. */
export type ActivityStatus =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'verified';

/** Built-in activity category identifiers. Custom categories use a UUID. */
export type BuiltInCategoryId =
  | 'volunteer_service'
  | 'personal_development'
  | 'physical_fitness'
  | 'expedition'
  | 'internship'
  | 'leadership'
  | 'award'
  | 'certification'
  | 'extracurricular'
  | 'community_service'
  | 'membership';

export type CategoryId = BuiltInCategoryId | string;

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface User {
  /** Cognito subject — primary identity. */
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  /** Profile id used by single-user (individual) accounts by default. */
  defaultProfileId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  /** Display name of the student/member this profile represents. */
  name: string;
  gradeLevel?: string;
  schoolName?: string;
  graduationYear?: number;
  /** Award programs this profile is working toward. */
  awardPrograms?: string[];
  avatarColor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  userId: string;
  profileId: string;
  title: string;
  description?: string;
  categoryId: CategoryId;
  status: ActivityStatus;
  /** ISO date (YYYY-MM-DD) the activity took place / starts. */
  date: string;
  /** Hours contributed by this activity. 0 for non-hour categories. */
  hours: number;
  organization?: string;
  location?: string;
  /** Free-form notes. */
  notes?: string;
  /** Award program ids this activity counts toward. */
  awardPrograms?: string[];
  evidenceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceFile {
  id: string;
  userId: string;
  activityId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  /** S3 object key (private bucket). */
  storageKey: string;
  caption?: string;
  createdAt: string;
}

export interface CustomCategory {
  id: string;
  userId: string;
  label: string;
  color: string;
  tracksHours: boolean;
  createdAt: string;
}

export interface Subscription {
  userId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  /** ISO timestamp when the current period ends. */
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  userId: string;
  /** e.g. activity.created, activity.deleted, profile.updated */
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  detail?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Aggregates
// ---------------------------------------------------------------------------

export interface CategoryHours {
  categoryId: CategoryId;
  label: string;
  hours: number;
  activityCount: number;
}

export interface AwardProgress {
  programId: string;
  programName: string;
  /** Goal hours for this program, if hour-based. */
  goalHours?: number;
  loggedHours: number;
  percentComplete: number;
}

export interface DashboardSummary {
  totalHours: number;
  totalActivities: number;
  activitiesThisMonth: number;
  byCategory: CategoryHours[];
  awardProgress: AwardProgress[];
  recentActivities: Activity[];
}

// ---------------------------------------------------------------------------
// API request / response shapes
// ---------------------------------------------------------------------------

export interface CreateActivityInput {
  profileId: string;
  title: string;
  description?: string;
  categoryId: CategoryId;
  status?: ActivityStatus;
  date: string;
  hours?: number;
  organization?: string;
  location?: string;
  notes?: string;
  awardPrograms?: string[];
}

export type UpdateActivityInput = Partial<Omit<CreateActivityInput, 'profileId'>>;

export interface ActivityListQuery {
  profileId?: string;
  categoryId?: CategoryId;
  status?: ActivityStatus;
  from?: string;
  to?: string;
  awardProgram?: string;
}

export interface CreateProfileInput {
  name: string;
  gradeLevel?: string;
  schoolName?: string;
  graduationYear?: number;
  awardPrograms?: string[];
}

export type UpdateProfileInput = Partial<CreateProfileInput>;

export interface UploadUrlRequest {
  activityId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface UploadUrlResponse {
  evidenceId: string;
  uploadUrl: string;
  storageKey: string;
}

export interface CheckoutSessionRequest {
  planId: PlanId;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResponse {
  url: string;
}

export interface MeResponse {
  user: User;
  profiles: Profile[];
  subscription: Subscription;
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

export interface ListResponse<T> {
  items: T[];
  nextCursor?: string;
}
