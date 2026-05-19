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
