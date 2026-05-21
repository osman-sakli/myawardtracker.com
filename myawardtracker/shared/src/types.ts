/**
 * Core domain types for My Award Tracker.
 * Shared by the frontend (Next.js) and backend (Lambda) so the API contract
 * stays in one place.
 *
 * The platform supports two coexisting modes:
 *   - individual: personal profiles, activities, evidence
 *   - organization: clubs/schools/nonprofits with members, chat, clock-in/out
 *
 * See docs/SAAS_ARCHITECTURE.md for the partition layout that backs these.
 */

export type UserRole =
  | 'individual'
  | 'parent'
  | 'org_admin'
  | 'coordinator'
  | 'enterprise_admin';

export type PlanId = 'individual';

/** Tier ladder for organization subscriptions. */
export type OrgTierId = 'small' | 'medium' | 'large';

/** Organization plan id — base or with-storage. */
export type OrgPlanId =
  | 'org_small'
  | 'org_medium'
  | 'org_large'
  | 'org_small_storage'
  | 'org_medium_storage'
  | 'org_large_storage';

/**
 * Access lifecycle: `trialing` during the 30-day free trial, `active` while a
 * subscription is paid-up, `expired` once both have lapsed.
 */
export type SubscriptionStatus = 'trialing' | 'active' | 'expired';

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

/** Organization role, ordered from most-privileged to least. */
export type OrgRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'moderator'
  | 'member'
  | 'viewer';

/** A single permission key — see backend/src/app/rbac.py for the full grid. */
export type OrgPermission =
  | 'org:update'
  | 'org:delete'
  | 'billing:manage'
  | 'members:invite'
  | 'members:remove'
  | 'members:role'
  | 'channels:create'
  | 'channels:moderate'
  | 'messages:post'
  | 'messages:read'
  | 'messages:pin'
  | 'clock:self'
  | 'clock:approve'
  | 'clock:view_all'
  | 'reports:generate'
  | 'reports:view'
  | 'audit:view';

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
  /** Optional — present when the activity was logged through an organization. */
  orgId?: string;
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
  /** ISO timestamp the 30-day free trial ends. */
  trialEndsAt?: string;
  /** ISO timestamp paid access ends. */
  paidUntil?: string;
  /** Whole days left in the current trial or paid period (0 when expired). */
  daysRemaining: number;
  stripeCustomerId?: string;
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  /** Tenant the audit was scoped to — user sub or `ORG#<id>`. */
  tenantId: string;
  /** The acting user. */
  actorSub: string;
  /** e.g. activity.created, member.invited, channel.created */
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  detail?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Organization entities
// ---------------------------------------------------------------------------

export interface Organization {
  id: string;
  name: string;
  /** Free-text slug used in URLs; lowercase, hyphenated, globally unique. */
  slug: string;
  type:
    | 'school_club'
    | 'school'
    | 'nonprofit'
    | 'scout_troop'
    | 'university'
    | 'leadership_program'
    | 'community';
  description?: string;
  /** Cognito sub of the user that owns billing. */
  ownerSub: string;
  /** Cached count — authoritative source is the MEMBER#* item count. */
  memberCount: number;
  /** Currently in-effect tier; derived from memberCount on every read. */
  tier: OrgTierId;
  /** True if the org has bought the storage add-on. */
  storageEnabled: boolean;
  /** Chat retention window for this org. */
  chatRetentionDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  /** Stable id for the membership row. */
  id: string;
  orgId: string;
  userSub: string;
  /** Display fields cached at join time; refreshed when the user updates. */
  email: string;
  fullName: string;
  role: OrgRole;
  /** ISO date the user joined the org. */
  joinedAt: string;
}

export interface Invite {
  id: string;
  orgId: string;
  email: string;
  role: OrgRole;
  /** Opaque token used in the join URL. */
  token: string;
  invitedBySub: string;
  expiresAt: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export interface Channel {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  /** Optional role gate — null means open to all members. */
  minRole?: OrgRole;
  /** Total messages ever posted (cheap counter; not authoritative for billing). */
  messageCount: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  orgId: string;
  channelId: string;
  authorSub: string;
  authorName: string;
  body: string;
  /** ISO timestamp. */
  createdAt: string;
  /** Unix epoch second this row will be deleted by DDB TTL. */
  expiresAt: number;
  /** Map of emoji -> array of user subs who reacted. */
  reactions?: Record<string, string[]>;
  pinned?: boolean;
  /** Set when the message was edited; missing on first version. */
  editedAt?: string;
}

export interface ChannelReadState {
  channelId: string;
  userSub: string;
  /** Highest-seen message timestamp. */
  lastReadAt: string;
  unreadCount: number;
}

export interface Notification {
  id: string;
  userSub: string;
  orgId?: string;
  kind:
    | 'message_mention'
    | 'channel_announcement'
    | 'clock_approved'
    | 'clock_rejected'
    | 'invite_received'
    | 'report_ready';
  title: string;
  body?: string;
  /** Optional deep-link path within the dashboard. */
  href?: string;
  read: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Clock in / out
// ---------------------------------------------------------------------------

export type ClockStatus = 'open' | 'pending' | 'approved' | 'rejected';

export interface ClockSession {
  id: string;
  orgId: string;
  userSub: string;
  /** Display name cached at write time so report queries don't need a join. */
  userName: string;
  activityType: string;
  /** ISO timestamp. */
  startedAt: string;
  /** ISO timestamp. Missing for `open` sessions. */
  endedAt?: string;
  /** Computed at clock-out, in fractional hours. */
  hours?: number;
  notes?: string;
  status: ClockStatus;
  /** Filled when a manager approves/rejects. */
  decidedBySub?: string;
  decidedAt?: string;
  decisionNote?: string;
  /** Optional event/profile linkage. */
  eventId?: string;
  profileId?: string;
}

// ---------------------------------------------------------------------------
// Aggregates / snapshots
// ---------------------------------------------------------------------------

export interface OrgDailyStats {
  orgId: string;
  date: string; // YYYY-MM-DD
  totalHours: number;
  approvedHours: number;
  rejectedHours: number;
  totalClockIns: number;
  activeMembers: number;
  newMembers: number;
}

export interface MemberDailyStats {
  orgId: string;
  userSub: string;
  date: string;
  totalHours: number;
  sessionsCount: number;
  approvedSessions: number;
}

export interface OrgMonthlyStats {
  orgId: string;
  yearMonth: string; // YYYY-MM
  totalHours: number;
  participationCount: number;
  topMembers: Array<{ userSub: string; userName: string; hours: number }>;
}

export interface OrgYearlyStats {
  orgId: string;
  year: string; // YYYY
  totalHours: number;
  participationCount: number;
  topMembers: Array<{ userSub: string; userName: string; hours: number }>;
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export type ReportKind =
  | 'volunteer_summary'
  | 'leadership'
  | 'participation'
  | 'attendance'
  | 'org_contribution'
  | 'student_timeline';

export type ReportFormat = 'csv' | 'pdf';

export type ReportStatus = 'queued' | 'running' | 'done' | 'failed';

export interface ReportJob {
  id: string;
  orgId: string;
  requestedBySub: string;
  kind: ReportKind;
  format: ReportFormat;
  /** Date range covered by the report. */
  from: string;
  to: string;
  status: ReportStatus;
  error?: string;
  /** Set when status === done. Presigned for 7 days. */
  downloadUrl?: string;
  createdAt: string;
  finishedAt?: string;
}

// ---------------------------------------------------------------------------
// Org subscription / billing
// ---------------------------------------------------------------------------

export interface OrgSubscription {
  orgId: string;
  tier: OrgTierId;
  storageEnabled: boolean;
  status: SubscriptionStatus;
  trialEndsAt?: string;
  paidUntil?: string;
  daysRemaining: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Aggregates (personal, existing)
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

export interface OrgDashboardSummary {
  orgId: string;
  windowDays: number;
  totalHours: number;
  approvedHours: number;
  totalClockIns: number;
  activeMembers: number;
  topMembers: Array<{ userSub: string; userName: string; hours: number }>;
  /** One bar per day in the window; oldest first. */
  daily: Array<{ date: string; hours: number; clockIns: number }>;
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
  planId: PlanId | OrgPlanId;
  /** Required for org plans. */
  orgId?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResponse {
  url: string;
}

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  type: Organization['type'];
  description?: string;
  storageEnabled?: boolean;
}

export type UpdateOrganizationInput = Partial<
  Omit<CreateOrganizationInput, 'slug'>
> & {
  chatRetentionDays?: number;
};

export interface InviteMemberInput {
  email: string;
  role: OrgRole;
}

export interface ChangeMemberRoleInput {
  role: OrgRole;
}

export interface CreateChannelInput {
  name: string;
  description?: string;
  minRole?: OrgRole;
}

export interface PostMessageInput {
  body: string;
}

export interface ReactToMessageInput {
  emoji: string;
}

export interface ClockInInput {
  activityType: string;
  notes?: string;
  eventId?: string;
  profileId?: string;
}

export interface ClockOutInput {
  notes?: string;
}

export interface ApproveClockInput {
  decision: 'approve' | 'reject';
  note?: string;
}

export interface CreateReportInput {
  kind: ReportKind;
  format: ReportFormat;
  from: string;
  to: string;
}

export interface MeResponse {
  user: User;
  profiles: Profile[];
  subscription: Subscription;
  /** Orgs the caller is a member of, plus their role in each. */
  memberships: Array<{ org: Organization; role: OrgRole }>;
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
