/**
 * Pure role-gating helper for mobile admin surfaces.
 *
 * Mirrors Delegate `lib/admin-utils.ts::hasMinRole` so the mobile app can
 * show/hide admin menu entries without re-fetching or making the server
 * the source of truth for UI (server remains authoritative for actions).
 *
 * Role levels (higher = more access):
 *   SUPER_ADMIN = 3
 *   CS_ADMIN    = 2
 *   CS_AGENT    = 1
 *   null/undef  = 0 (no admin access)
 */

export type AdminRole = 'SUPER_ADMIN' | 'CS_ADMIN' | 'CS_AGENT';

export const ROLE_LEVELS: Record<AdminRole, number> = {
  SUPER_ADMIN: 3,
  CS_ADMIN: 2,
  CS_AGENT: 1,
};

export function roleLevel(role: AdminRole | string | null | undefined): number {
  if (!role) return 0;
  return ROLE_LEVELS[role as AdminRole] ?? 0;
}

export function hasMinRole(
  current: AdminRole | string | null | undefined,
  min: AdminRole,
): boolean {
  return roleLevel(current) >= ROLE_LEVELS[min];
}

export function isAdminRole(value: unknown): value is AdminRole {
  return value === 'SUPER_ADMIN' || value === 'CS_ADMIN' || value === 'CS_AGENT';
}
