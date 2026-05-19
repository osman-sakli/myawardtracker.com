/** Typed client for the My Award Tracker API. */

import { getAuthToken } from './auth';
import { env } from './env';
import type {
  Activity,
  ActivityInput,
  AuditEntry,
  DashboardSummary,
  Evidence,
  Profile,
  ProfileInput,
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
  getMe: () => http.get<{ user: User; subscription: Subscription }>('/v1/me'),
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

  checkout: (input: { planId: string; successUrl: string; cancelUrl: string }) =>
    http.post<{ checkoutUrl: string }>('/v1/billing/checkout', input),
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
