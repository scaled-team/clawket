/**
 * Typed service wrappers for Delegate `DelegateAgentServer` endpoints.
 *
 * Endpoints mirrored:
 *   GET /api/user/delegate-agent-servers
 *   GET /api/workspaces/[id]/delegate-agent-servers
 *   GET /api/user/delegate-agent-servers/[serverId]/health
 *
 * The `apiToken` field on each server is sensitive — UI surfaces must mask
 * it. The full token is kept on the type so consumers (e.g. server-fanout
 * code) can read it directly if they need to issue requests against the
 * remote NanoClaw gateway. UI code should use the `maskApiToken` helper.
 */

import { type DelegateConnectionConfig, normalizeUrl } from './delegate-http-adapter';

export type DelegateAgentServer = {
  id: string;
  name: string;
  url: string;
  apiToken: string;
  enabled: boolean;
  isDefault: boolean;
  workspaceId: string | null;
  health: 'unknown' | 'healthy' | 'unhealthy';
  lastHealthCheckedAt: string | null;
  agentProfileCount: number;
  description?: string | null;
};

type RawServer = {
  id: string;
  name: string;
  url: string;
  apiToken: string;
  enabled?: boolean;
  isDefault?: boolean;
  workspaceId?: string | null;
  description?: string | null;
  // Server may include richer health/profile counts in the future; tolerate
  // missing fields and default to 'unknown' / 0.
  health?: string | null;
  lastHealthCheckedAt?: string | null;
  agentProfileCount?: number;
};

function authHeaders(config: DelegateConnectionConfig): Record<string, string> {
  return { Authorization: `Bearer ${config.apiToken}` };
}

function toServer(raw: RawServer): DelegateAgentServer {
  const healthRaw = raw.health;
  const health: DelegateAgentServer['health'] =
    healthRaw === 'healthy' || healthRaw === 'unhealthy' ? healthRaw : 'unknown';
  return {
    id: raw.id,
    name: raw.name,
    url: raw.url,
    apiToken: raw.apiToken,
    enabled: raw.enabled ?? true,
    isDefault: raw.isDefault ?? false,
    workspaceId: raw.workspaceId ?? null,
    health,
    lastHealthCheckedAt: raw.lastHealthCheckedAt ?? null,
    agentProfileCount: raw.agentProfileCount ?? 0,
    description: raw.description ?? null,
  };
}

/**
 * Lists DelegateAgentServer rows. When `workspaceId` is provided, hits the
 * workspace-scoped endpoint; otherwise hits the user-wide aggregate.
 */
export async function listDelegateAgentServers(
  config: DelegateConnectionConfig,
  opts?: { workspaceId?: string },
): Promise<DelegateAgentServer[]> {
  const path = opts?.workspaceId
    ? `/api/workspaces/${encodeURIComponent(opts.workspaceId)}/delegate-agent-servers`
    : `/api/user/delegate-agent-servers`;
  const url = `${normalizeUrl(config.apiUrl)}${path}`;
  const res = await fetch(url, { headers: authHeaders(config) });
  if (!res.ok) throw new Error(`listDelegateAgentServers failed: ${res.status}`);
  const json = await res.json();
  // Backend returns `apiSuccess({ servers })` → `{ data: { servers }, success }`.
  const data = json?.data ?? json;
  const raw: RawServer[] = Array.isArray(data?.servers)
    ? data.servers
    : Array.isArray(data)
      ? data
      : [];
  return raw.map(toServer);
}

export type ServerHealthResult = {
  ok: boolean;
  status: number | null;
  error?: string;
  lastSeen?: string;
  latencyMs?: number;
  gatewayVersion?: string;
  agentCount?: number;
};

export async function getDelegateAgentServerHealth(
  config: DelegateConnectionConfig,
  serverId: string,
): Promise<ServerHealthResult> {
  const url = `${normalizeUrl(config.apiUrl)}/api/user/delegate-agent-servers/${encodeURIComponent(serverId)}/health`;
  let res: Response;
  try {
    res = await fetch(url, { headers: authHeaders(config) });
  } catch (err) {
    return {
      ok: false,
      status: null,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
  if (!res.ok) {
    return { ok: false, status: res.status, error: `HTTP ${res.status}` };
  }
  const json = await res.json();
  const data = json?.data ?? json;
  return {
    ok: !!data?.healthy,
    status: res.status,
    error: typeof data?.error === 'string' ? data.error : undefined,
    lastSeen: typeof data?.lastChecked === 'string' ? data.lastChecked : undefined,
    latencyMs: typeof data?.latencyMs === 'number' ? data.latencyMs : undefined,
    gatewayVersion: typeof data?.gatewayVersion === 'string' ? data.gatewayVersion : undefined,
    agentCount: typeof data?.agentCount === 'number' ? data.agentCount : undefined,
  };
}

/**
 * Returns the last 6 chars of an apiToken for safe display. Never logs
 * the raw token.
 */
export function maskApiToken(token: string | null | undefined): string {
  if (!token) return '';
  const tail = token.slice(-6);
  return `••••${tail}`;
}
