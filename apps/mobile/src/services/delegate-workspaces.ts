/**
 * Typed service wrapper for Delegate workspace endpoints.
 *
 * Endpoints mirrored:
 *   GET /api/workspaces (returns user's workspaces with members + projects)
 *
 * Per apps/mobile/CLAUDE.md rule 10, backend-specific request shapes live in
 * dedicated services, not in `gateway.ts`. Mobile only consumes a lighter
 * `DelegateWorkspaceSummary` shape — full member/project payloads are
 * left server-side.
 */

import { type DelegateConnectionConfig, normalizeUrl } from './delegate-http-adapter';

export type DelegateWorkspaceSummary = {
  id: string;
  name: string;
  slug: string | null;
  icon: string | null;
  color: string | null;
  isOwner: boolean;
  role: 'owner' | 'admin' | 'member' | 'viewer' | null;
  memberCount: number;
  projectCount: number;
  serverCount: number;
};

type RawWorkspace = {
  id: string;
  name: string;
  slug?: string | null;
  icon?: string | null;
  color?: string | null;
  userId?: string | null;
  createdAt?: string;
  members?: Array<{ id: string; userId: string; role?: string | null }>;
  projects?: unknown[];
  _count?: { projects?: number; members?: number };
};

function authHeaders(config: DelegateConnectionConfig): Record<string, string> {
  return { Authorization: `Bearer ${config.apiToken}` };
}

function normalizeRole(role: string | null | undefined): DelegateWorkspaceSummary['role'] {
  if (role === 'owner' || role === 'admin' || role === 'member' || role === 'viewer') {
    return role;
  }
  return null;
}

function toSummary(raw: RawWorkspace, currentUserId: string | null): DelegateWorkspaceSummary {
  const isOwner = !!(currentUserId && raw.userId && raw.userId === currentUserId);
  const ownerMember = currentUserId
    ? raw.members?.find((m) => m.userId === currentUserId)
    : undefined;
  const memberCount = raw._count?.members ?? raw.members?.length ?? 0;
  const projectCount = raw._count?.projects ?? raw.projects?.length ?? 0;
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug ?? null,
    icon: raw.icon ?? null,
    color: raw.color ?? null,
    isOwner,
    role: isOwner ? 'owner' : normalizeRole(ownerMember?.role ?? null),
    memberCount,
    projectCount,
    serverCount: 0,
  };
}

/**
 * Lists the authenticated user's workspaces. Owner-workspaces sort first.
 * `currentUserId` (when known) is used to compute `isOwner` and `role`. The
 * mobile bridge JWT response already includes `userId` (see
 * `/api/auth/realtime-token`), but it is also acceptable to pass `null` here
 * — `isOwner`/`role` will degrade to false/null but `id`+`name` are still
 * correct.
 */
export async function listDelegateWorkspaces(
  config: DelegateConnectionConfig,
  opts?: { currentUserId?: string | null },
): Promise<DelegateWorkspaceSummary[]> {
  const url = `${normalizeUrl(config.apiUrl)}/api/workspaces`;
  const res = await fetch(url, { headers: authHeaders(config) });
  if (!res.ok) throw new Error(`listDelegateWorkspaces failed: ${res.status}`);
  const json = await res.json();
  // `apiList` envelope is `{ data: T[], success: true }`. Some routes return
  // a bare array; tolerate both.
  const raw: RawWorkspace[] = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json)
      ? json
      : [];
  const userId = opts?.currentUserId ?? null;
  const summaries = raw.map((w) => toSummary(w, userId));
  // Owner workspaces first, then by name for stability.
  summaries.sort((a, b) => {
    if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return summaries;
}
