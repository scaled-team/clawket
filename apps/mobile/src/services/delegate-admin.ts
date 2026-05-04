/**
 * Typed service wrappers for Delegate admin REST endpoints.
 *
 * Endpoints mirrored:
 *   GET /api/admin/users
 *   GET /api/admin/workspaces
 *   GET /api/admin/audit
 *
 * All three require admin privileges server-side. Client-side code should
 * also gate access on `adminRole` from /api/user before rendering the
 * admin menu.
 */

import { type DelegateConnectionConfig, normalizeUrl } from './delegate-http-adapter';

export type AdminUserRow = {
  id: string;
  email: string | null;
  name: string | null;
  isAdmin: boolean;
  adminRole?: string | null;
  isDisabled?: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  lastActivityAt?: string | null;
};

export type AdminWorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  color?: string | null;
  createdAt: string;
  _count?: { members: number; projects: number };
  entitlement?: {
    tier: string;
    billingCycle?: string | null;
    includedBundles?: string[];
    purchasedBundles?: string[];
    individualApps?: string[];
    grandfatheredUntil?: string | null;
    trialEndsAt?: string | null;
  } | null;
  user?: { id: string; email: string | null; name: string | null };
};

export type AdminAuditEntry = {
  id: string;
  adminEmail: string;
  action: string;
  targetUserId?: string | null;
  targetEmail?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type ListAdminParams = {
  limit?: number;
  offset?: number;
  q?: string;
};

function authHeaders(config: DelegateConnectionConfig): Record<string, string> {
  return { Authorization: `Bearer ${config.apiToken}` };
}

function buildQuery(params: ListAdminParams & Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') continue;
    search.set(k, String(v));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

async function fetchPaginated<T>(
  config: DelegateConnectionConfig,
  path: string,
  params: ListAdminParams,
  label: string,
): Promise<PaginatedResult<T>> {
  const url = `${normalizeUrl(config.apiUrl)}${path}${buildQuery(params)}`;
  const res = await fetch(url, { headers: authHeaders(config) });
  if (!res.ok) throw new Error(`${label} failed: ${res.status}`);
  const json = await res.json();
  const items = (json.data ?? []) as T[];
  const meta = json.meta ?? {};
  return {
    items,
    total: typeof meta.total === 'number' ? meta.total : items.length,
    limit: typeof meta.limit === 'number' ? meta.limit : params.limit ?? 50,
    offset: typeof meta.offset === 'number' ? meta.offset : params.offset ?? 0,
  };
}

export async function listAdminUsers(
  config: DelegateConnectionConfig,
  params: ListAdminParams = {},
): Promise<PaginatedResult<AdminUserRow>> {
  return fetchPaginated<AdminUserRow>(config, '/api/admin/users', params, 'listAdminUsers');
}

export async function listAdminWorkspaces(
  config: DelegateConnectionConfig,
  params: ListAdminParams = {},
): Promise<PaginatedResult<AdminWorkspaceRow>> {
  return fetchPaginated<AdminWorkspaceRow>(config, '/api/admin/workspaces', params, 'listAdminWorkspaces');
}

export async function listAdminAudit(
  config: DelegateConnectionConfig,
  params: ListAdminParams & { action?: string } = {},
): Promise<PaginatedResult<AdminAuditEntry>> {
  return fetchPaginated<AdminAuditEntry>(config, '/api/admin/audit', params, 'listAdminAudit');
}

export type AdminSessionRow = {
  id: string;
  email: string | null;
  name: string | null;
  isDisabled?: boolean;
  lastLoginAt?: string | null;
  lastActivityAt?: string | null;
  sessionRevokedAt?: string | null;
  createdAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function listAdminSessions(
  config: DelegateConnectionConfig,
  params: ListAdminParams = {},
): Promise<PaginatedResult<AdminSessionRow>> {
  return fetchPaginated<AdminSessionRow>(
    config,
    '/api/admin/sessions',
    params,
    'listAdminSessions',
  );
}

export async function revokeAdminSession(
  config: DelegateConnectionConfig,
  userId: string,
): Promise<{ userId: string; action: string; message?: string }> {
  const url = `${normalizeUrl(config.apiUrl)}/api/admin/sessions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...authHeaders(config),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, action: 'revoke' }),
  });
  if (!res.ok) throw new Error(`revokeAdminSession failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

export type AdminBillingStats = {
  totalWorkspaces: number;
  activeTrials: number;
  expiredTrials: number;
  activeSubscriptions: number;
  tierCounts: Record<string, number>;
};

export async function getAdminBillingStats(
  config: DelegateConnectionConfig,
): Promise<AdminBillingStats> {
  const url = `${normalizeUrl(config.apiUrl)}/api/admin/workspace-billing-stats`;
  const res = await fetch(url, { headers: authHeaders(config) });
  if (!res.ok) throw new Error(`getAdminBillingStats failed: ${res.status}`);
  const json = await res.json();
  return (json.data ?? json) as AdminBillingStats;
}

export type CurrentUserInfo = {
  id: string;
  name?: string | null;
  email?: string | null;
  isAdmin?: boolean;
  adminRole?: string | null;
};

export async function getCurrentUser(
  config: DelegateConnectionConfig,
): Promise<CurrentUserInfo> {
  const url = `${normalizeUrl(config.apiUrl)}/api/users/me`;
  const res = await fetch(url, { headers: authHeaders(config) });
  if (!res.ok) throw new Error(`getCurrentUser failed: ${res.status}`);
  const json = await res.json();
  return (json.data ?? json) as CurrentUserInfo;
}
