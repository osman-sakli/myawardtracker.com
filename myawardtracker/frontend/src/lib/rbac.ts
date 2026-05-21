/** Frontend mirror of backend/src/app/rbac.py — used to hide buttons the
 *  caller can't actually click. The backend still enforces every permission;
 *  this is purely UX. */

import type { OrgRole } from './types';

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

const PERMISSIONS: Record<OrgRole, OrgPermission[]> = {
  owner: [
    'org:update', 'org:delete', 'billing:manage',
    'members:invite', 'members:remove', 'members:role',
    'channels:create', 'channels:moderate',
    'messages:post', 'messages:read', 'messages:pin',
    'clock:self', 'clock:approve', 'clock:view_all',
    'reports:generate', 'reports:view', 'audit:view',
  ],
  admin: [
    'org:update', 'billing:manage',
    'members:invite', 'members:remove', 'members:role',
    'channels:create', 'channels:moderate',
    'messages:post', 'messages:read', 'messages:pin',
    'clock:self', 'clock:approve', 'clock:view_all',
    'reports:generate', 'reports:view', 'audit:view',
  ],
  manager: [
    'members:invite',
    'channels:create', 'channels:moderate',
    'messages:post', 'messages:read', 'messages:pin',
    'clock:self', 'clock:approve', 'clock:view_all',
    'reports:generate', 'reports:view',
  ],
  moderator: [
    'channels:moderate',
    'messages:post', 'messages:read', 'messages:pin',
    'clock:self', 'clock:view_all',
    'reports:view',
  ],
  member: ['messages:post', 'messages:read', 'clock:self'],
  viewer: ['messages:read', 'clock:view_all', 'reports:view'],
};

export function roleHas(role: OrgRole, perm: OrgPermission): boolean {
  return PERMISSIONS[role]?.includes(perm) ?? false;
}

const ROLE_LEVEL: Record<OrgRole, number> = {
  owner: 0, admin: 1, manager: 2, moderator: 3, member: 4, viewer: 5,
};

export function roleLabel(role: OrgRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function roleLevel(role: OrgRole): number {
  return ROLE_LEVEL[role] ?? 99;
}

export const ASSIGNABLE_ROLES: OrgRole[] = [
  'admin', 'manager', 'moderator', 'member', 'viewer',
];
