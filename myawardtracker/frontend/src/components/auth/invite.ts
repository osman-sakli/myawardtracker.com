/** Helpers for the `?invite=<token>` flow.
 *
 * The invite email links to `/signup/?invite=<token>`. Either signup or login
 * can complete the flow — we stash the token in sessionStorage when the page
 * mounts (so it survives the Cognito email-confirmation round trip), then
 * redeem it once the caller has a valid JWT.
 */

'use client';

import { api, ApiError } from '@/lib/api';

const KEY = 'mat.inviteToken';

export function captureInviteFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const token = params.get('invite');
  if (token) {
    try {
      window.sessionStorage.setItem(KEY, token);
    } catch {
      /* sessionStorage disabled — fall back to in-memory only */
    }
  }
  return token;
}

export function getPendingInvite(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function clearPendingInvite(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Redeem a stashed invite after auth completes.
 *
 * Returns the orgId on success, or null if there was nothing to redeem.
 * Throws if the token is bad — caller can show the error message.
 */
export async function consumePendingInvite(): Promise<string | null> {
  const token = getPendingInvite();
  if (!token) return null;
  try {
    const res = await api.acceptInvite(token);
    clearPendingInvite();
    return res.orgId;
  } catch (err) {
    // Bad token (expired/wrong email) — drop it so we don't loop on retry.
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
      clearPendingInvite();
    }
    throw err;
  }
}
