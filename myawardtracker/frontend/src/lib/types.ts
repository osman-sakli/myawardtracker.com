/** API response shapes — these mirror what the Python backend actually returns. */

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  defaultProfileId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  name: string;
  gradeLevel?: string;
  schoolName?: string;
  graduationYear?: number;
  awardPrograms?: string[];
  createdAt: string;
  updatedAt: string;
}

export type ActivityStatus = 'planned' | 'in_progress' | 'completed' | 'verified';

export interface Activity {
  id: string;
  userId: string;
  profileId: string;
  title: string;
  description?: string;
  categoryId: string;
  status: ActivityStatus;
  date: string;
  hours: number;
  organization?: string;
  location?: string;
  notes?: string;
  awardPrograms?: string[];
  evidenceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Evidence {
  id: string;
  userId: string;
  activityId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  caption?: string;
  s3Key: string;
  createdAt: string;
}

export interface Subscription {
  userId: string;
  planId: string;
  /** `trialing` during the 15-day free trial, `active` while a one-time
   *  purchase is still valid, `expired` once both have lapsed. */
  status: 'trialing' | 'active' | 'expired';
  /** ISO timestamp the free trial ends. */
  trialEndsAt?: string;
  /** ISO timestamp paid access ends — set after a one-time purchase. */
  paidUntil?: string;
  /** Whole days left in the current trial or paid period (0 when expired). */
  daysRemaining: number;
  stripeCustomerId?: string;
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  timestamp: string;
  detail?: Record<string, unknown>;
}

export interface CategoryBreakdown {
  categoryId: string;
  label: string;
  hours: number;
  activityCount: number;
}

export interface AwardProgressRow {
  programId: string;
  name: string;
  goalHours: number | null;
  hours: number;
  activityCount: number;
  percentComplete: number | null;
}

export interface DashboardSummary {
  profileCount: number;
  activityCount: number;
  totalHours: number;
  statusCounts: Record<string, number>;
  categoryBreakdown: CategoryBreakdown[];
  awardProgress: AwardProgressRow[];
  recentActivities: Activity[];
}

export interface ProfileInput {
  name: string;
  gradeLevel?: string;
  schoolName?: string;
  graduationYear?: number;
  awardPrograms?: string[];
}

export interface ActivityInput {
  profileId: string;
  title: string;
  description?: string;
  categoryId: string;
  status?: ActivityStatus;
  date: string;
  hours?: number;
  organization?: string;
  location?: string;
  notes?: string;
  awardPrograms?: string[];
}

// ---------------------------------------------------------------------------
// Organization-scoped shapes (mirror shared/src/types.ts).
// ---------------------------------------------------------------------------

export type OrgRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'moderator'
  | 'member'
  | 'viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: string;
  description?: string;
  ownerSub: string;
  memberCount: number;
  tier: 'small' | 'medium' | 'large';
  storageEnabled: boolean;
  chatRetentionDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  orgId: string;
  userSub: string;
  email: string;
  fullName: string;
  role: OrgRole;
  joinedAt: string;
}

export interface OrgSubscription {
  orgId: string;
  tier: 'small' | 'medium' | 'large';
  storageEnabled: boolean;
  status: 'trialing' | 'active' | 'expired';
  paidUntil?: string;
  daysRemaining: number;
  trialEndsAt?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface Channel {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  minRole?: OrgRole;
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
  createdAt: string;
  expiresAt: number;
  pinned?: boolean;
  reactions?: Record<string, string[]>;
}

export interface ClockSession {
  id: string;
  orgId: string;
  userSub: string;
  userName: string;
  activityType: string;
  startedAt: string;
  endedAt?: string;
  hours?: number;
  status: 'open' | 'pending' | 'approved' | 'rejected';
  notes?: string;
  decidedBySub?: string;
  decidedAt?: string;
  decisionNote?: string;
}

export interface OrgDashboardSummary {
  orgId: string;
  windowDays: number;
  totalHours: number;
  approvedHours: number;
  totalClockIns: number;
  activeMembers: number;
  topMembers: Array<{ userSub: string; userName: string; hours: number }>;
  daily: Array<{ date: string; hours: number; clockIns: number }>;
}

export interface ReportJob {
  id: string;
  orgId: string;
  requestedBySub: string;
  kind: string;
  format: 'csv' | 'pdf';
  from: string;
  to: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  downloadUrl?: string;
  error?: string;
  createdAt: string;
  finishedAt?: string;
}
