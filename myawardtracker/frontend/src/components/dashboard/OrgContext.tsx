'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { ErrorState, LoadingState } from '@/components/dashboard/PageState';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import type {
  OrgRole,
  OrgSubscription,
  Organization,
} from '@/lib/types';
import { roleHas, type OrgPermission } from '@/lib/rbac';

interface OrgCtx {
  org: Organization;
  role: OrgRole;
  subscription: OrgSubscription;
  reload: () => void;
}

const Context = createContext<OrgCtx | null>(null);

export function useOrgContext(): OrgCtx {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useOrgContext must be used inside <OrgGuard>');
  return ctx;
}

export function useOrgPermission(perm: OrgPermission): boolean {
  const { role } = useOrgContext();
  return roleHas(role, perm);
}

/**
 * Loads the org + caller's role and renders children only when the user is a
 * member. Renders a friendly forbidden message for non-members.
 */
export function OrgGuard({
  orgId,
  children,
}: {
  orgId: string;
  children: ReactNode;
}) {
  const state = useAsync(() => api.getOrg(orgId));

  if (state.loading) return <LoadingState />;
  if (state.error || !state.data) {
    return (
      <ErrorState
        message={state.error ?? 'Could not load this organization.'}
        onRetry={state.reload}
      />
    );
  }

  const value: OrgCtx = {
    org: state.data.org,
    role: state.data.role,
    subscription: state.data.subscription,
    reload: state.reload,
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
