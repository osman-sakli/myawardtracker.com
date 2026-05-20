/** Typed client for the My Award Tracker API. */

import { getAuthToken } from './auth';
import { env } from './env';
import type {
  Activity,
  ActivityInput,
  AuditEntry,
  Channel,
  ChatMessage,
  ClockSession,
  DashboardSummary,
  Evidence,
  Membership,
  OrgDashboardSummary,
  OrgRole,
  OrgSubscription,
  Organization,
  Profile,
  ProfileInput,
  ReportJob,
  Subscription,
  User,
} from './types';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const token = await getAuthToken();
  if (!token) {
    throw new ApiError(401, 'Your session has expired. Please sign in again.');
  }

  const res = await fetch(`${env.apiUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message =
      data?.message || data?.error || `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message, data?.errors);
  }
  return data as T;
}

const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};

function query(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v);
  if (entries.length === 0) return '';
  return `?${new URLSearchParams(entries as [string, string][]).toString()}`;
}

export const api = {
  getMe: () =>
    http.get<{
      user: User;
      subscription: Subscription;
      memberships: Array<{ org: Organization; role: OrgRole }>;
    }>('/v1/me'),
  updateMe: (patch: Partial<Pick<User, 'fullName' | 'defaultProfileId'>>) =>
    http.patch<{ user: User }>('/v1/me', patch),

  listProfiles: () => http.get<{ profiles: Profile[] }>('/v1/profiles'),
  createProfile: (input: ProfileInput) =>
    http.post<{ profile: Profile }>('/v1/profiles', input),
  updateProfile: (id: string, patch: Partial<ProfileInput>) =>
    http.patch<{ profile: Profile }>(`/v1/profiles/${id}`, patch),
  deleteProfile: (id: string) => http.del<{ deleted: boolean }>(`/v1/profiles/${id}`),

  listActivities: (profileId?: string) =>
    http.get<{ activities: Activity[] }>(`/v1/activities${query({ profileId })}`),
  getActivity: (id: string) =>
    http.get<{ activity: Activity; evidence: Evidence[] }>(`/v1/activities/${id}`),
  createActivity: (input: ActivityInput) =>
    http.post<{ activity: Activity }>('/v1/activities', input),
  updateActivity: (id: string, patch: Partial<ActivityInput>) =>
    http.patch<{ activity: Activity }>(`/v1/activities/${id}`, patch),
  deleteActivity: (id: string) =>
    http.del<{ deleted: boolean }>(`/v1/activities/${id}`),

  listEvidence: (activityId?: string) =>
    http.get<{ evidence: Evidence[] }>(`/v1/evidence${query({ activityId })}`),
  createUploadUrl: (input: {
    activityId: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    caption?: string;
  }) => http.post<{ uploadUrl: string; evidence: Evidence }>('/v1/evidence/upload-url', input),
  getDownloadUrl: (id: string) =>
    http.get<{ downloadUrl: string }>(`/v1/evidence/${id}/download-url`),
  deleteEvidence: (id: string) =>
    http.del<{ deleted: boolean }>(`/v1/evidence/${id}`),

  getSummary: (profileId?: string) =>
    http.get<DashboardSummary>(`/v1/summary${query({ profileId })}`),

  listAudit: () => http.get<{ audit: AuditEntry[] }>('/v1/audit'),

  checkout: (input: { planId: string; orgId?: string; successUrl: string; cancelUrl: string }) =>
    http.post<{ checkoutUrl: string }>('/v1/billing/checkout', input),

  // ---- Organizations -----------------------------------------------------
  listOrgs: () =>
    http.get<{ memberships: Array<{ org: Organization; role: OrgRole }> }>('/v1/orgs'),
  createOrg: (input: {
    name: string;
    slug?: string;
    type: string;
    description?: string;
    storageEnabled?: boolean;
  }) => http.post<{ org: Organization; role: OrgRole }>('/v1/orgs', input),
  getOrg: (orgId: string) =>
    http.get<{ org: Organization; role: OrgRole; subscription: OrgSubscription }>(
      `/v1/orgs/${orgId}`,
    ),
  updateOrg: (orgId: string, patch: Partial<Organization>) =>
    http.patch<{ org: Organization }>(`/v1/orgs/${orgId}`, patch),
  deleteOrg: (orgId: string) =>
    http.del<{ deleted: boolean }>(`/v1/orgs/${orgId}`),

  // ---- Members & invites -------------------------------------------------
  listMembers: (orgId: string) =>
    http.get<{ members: Membership[] }>(`/v1/orgs/${orgId}/members`),
  changeMemberRole: (orgId: string, sub: string, role: OrgRole) =>
    http.patch<{ member: Membership }>(`/v1/orgs/${orgId}/members/${sub}`, { role }),
  removeMember: (orgId: string, sub: string) =>
    http.del<{ removed: boolean }>(`/v1/orgs/${orgId}/members/${sub}`),
  leaveOrg: (orgId: string) =>
    http.del<{ left: boolean }>(`/v1/orgs/${orgId}/members/me`),
  invite: (orgId: string, email: string, role: OrgRole) =>
    http.post<{ invite: { token: string; email: string; role: OrgRole } }>(
      `/v1/orgs/${orgId}/invites`,
      { email, role },
    ),
  listInvites: (orgId: string) =>
    http.get<{ invites: Array<{ token: string; email: string; role: OrgRole; expiresAt: string }> }>(
      `/v1/orgs/${orgId}/invites`,
    ),
  revokeInvite: (orgId: string, token: string) =>
    http.del<{ revoked: boolean }>(`/v1/orgs/${orgId}/invites/${token}`),
  acceptInvite: (token: string) =>
    http.post<{ orgId: string; role: OrgRole }>('/v1/invites/accept', { token }),

  // ---- Channels & chat ---------------------------------------------------
  listChannels: (orgId: string) =>
    http.get<{ channels: Channel[] }>(`/v1/orgs/${orgId}/channels`),
  createChannel: (
    orgId: string,
    input: { name: string; description?: string; minRole?: OrgRole },
  ) => http.post<{ channel: Channel }>(`/v1/orgs/${orgId}/channels`, input),
  listMessages: (orgId: string, channelId: string, before?: string) =>
    http.get<{ messages: ChatMessage[] }>(
      `/v1/orgs/${orgId}/channels/${channelId}/messages${query({ before })}`,
    ),
  postMessage: (orgId: string, channelId: string, body: string) =>
    http.post<{ message: ChatMessage }>(
      `/v1/orgs/${orgId}/channels/${channelId}/messages`,
      { body },
    ),

  // ---- Clock -------------------------------------------------------------
  clockIn: (orgId: string, input: { activityType: string; notes?: string; profileId?: string }) =>
    http.post<{ session: ClockSession }>(`/v1/orgs/${orgId}/clock/in`, input),
  clockOut: (orgId: string, input: { notes?: string }) =>
    http.post<{ session: ClockSession }>(`/v1/orgs/${orgId}/clock/out`, input),
  mySessions: (orgId: string) =>
    http.get<{ sessions: ClockSession[]; open: ClockSession | null }>(
      `/v1/orgs/${orgId}/clock/mine`,
    ),
  orgSessions: (orgId: string, from?: string, to?: string) =>
    http.get<{ sessions: ClockSession[]; from: string; to: string }>(
      `/v1/orgs/${orgId}/clock/all${query({ from, to })}`,
    ),
  decideSession: (
    orgId: string,
    memberSub: string,
    sessionSk: string,
    input: { decision: 'approve' | 'reject'; note?: string },
  ) =>
    http.post<{ session: ClockSession }>(
      `/v1/orgs/${orgId}/clock/${memberSub}/${encodeURIComponent(sessionSk.replaceAll('#', '__'))}/decide`,
      input,
    ),

  // ---- Dashboard / leaderboard ------------------------------------------
  orgSummary: (orgId: string, days = 30) =>
    http.get<{ summary: OrgDashboardSummary }>(`/v1/orgs/${orgId}/summary?days=${days}`),
  leaderboard: (orgId: string) =>
    http.get<{ month: string; topMembers: Array<{ userSub: string; userName: string; hours: number }>; totalHours: number }>(
      `/v1/orgs/${orgId}/leaderboard`,
    ),

  // ---- Reports -----------------------------------------------------------
  createReport: (
    orgId: string,
    input: { kind: string; format: 'csv' | 'pdf'; from: string; to: string },
  ) => http.post<{ job: ReportJob }>(`/v1/orgs/${orgId}/reports`, input),
  listReports: (orgId: string) =>
    http.get<{ jobs: ReportJob[] }>(`/v1/orgs/${orgId}/reports`),
  getReport: (orgId: string, jobId: string) =>
    http.get<{ job: ReportJob }>(`/v1/orgs/${orgId}/reports/${jobId}`),

  // ---- Org billing -------------------------------------------------------
  orgCheckout: (
    orgId: string,
    input: { planId: string; successUrl: string; cancelUrl: string },
  ) =>
    http.post<{ checkoutUrl: string }>(`/v1/orgs/${orgId}/billing/checkout`, input),

  // ---- Notifications -----------------------------------------------------
  listNotifications: () =>
    http.get<{ notifications: Array<{ id: string; title: string; body?: string; href?: string; read: boolean; createdAt: string }> }>(
      '/v1/notifications',
    ),
};

/** Upload a file straight to S3 with a presigned PUT URL. */
export async function uploadToS3(
  uploadUrl: string,
  file: File,
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'File upload failed. Please try again.');
  }
}
