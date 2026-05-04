/**
 * Typed service wrappers for Delegate droplet group / session endpoints.
 *
 * Endpoints mirrored:
 *   GET    /api/delegate-agent/groups
 *   GET    /api/agent/delegate-agent/status
 *   POST   /api/agent/delegate-agent/ensure-group
 *   GET    /api/agents/server/health
 *   POST   /api/agents/server/sync
 */

import { type DelegateConnectionConfig, normalizeUrl } from './delegate-http-adapter';

export type DelegateGroup = {
  jid: string;
  name?: string | null;
  members?: number;
  lastActivityAt?: string | null;
  createdAt?: string;
};

export type DelegateAgentStatus = {
  connected: boolean;
  serverUrl?: string;
  sessionId?: string | null;
  groups?: string[];
  version?: string | null;
  lastHeartbeatAt?: string | null;
};

export type DelegateServerHealth = {
  ok: boolean;
  uptimeSec?: number;
  cpuPct?: number;
  memPct?: number;
  diskPct?: number;
  services?: Record<string, 'up' | 'down' | 'unknown'>;
  timestamp: string;
};

export type EnsureGroupOptions = {
  agents?: string[];
  skills?: string[];
  autoJoin?: boolean;
};

function authHeaders(config: DelegateConnectionConfig, json = false): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiToken}`,
  };
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

async function unwrap<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) throw new Error(`${label} failed: ${res.status}`);
  const json = await res.json();
  return (json.data ?? json) as T;
}

export async function listDelegateGroups(
  config: DelegateConnectionConfig,
): Promise<{ groups: DelegateGroup[] }> {
  const url = `${normalizeUrl(config.apiUrl)}/api/delegate-agent/groups`;
  const res = await fetch(url, { headers: authHeaders(config) });
  const data = await unwrap<DelegateGroup[] | { groups: DelegateGroup[] }>(res, 'listDelegateGroups');
  const groups = Array.isArray(data) ? data : data.groups ?? [];
  return { groups };
}

export async function getDelegateAgentStatus(
  config: DelegateConnectionConfig,
): Promise<DelegateAgentStatus> {
  const url = `${normalizeUrl(config.apiUrl)}/api/agent/delegate-agent/status`;
  const res = await fetch(url, { headers: authHeaders(config) });
  return unwrap<DelegateAgentStatus>(res, 'getDelegateAgentStatus');
}

export async function ensureDelegateGroup(
  config: DelegateConnectionConfig,
  jid: string,
  name: string,
  opts: EnsureGroupOptions = {},
): Promise<{ ok: boolean; jid: string; created?: boolean }> {
  const url = `${normalizeUrl(config.apiUrl)}/api/agent/delegate-agent/ensure-group`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(config, true),
    body: JSON.stringify({ jid, name, ...opts }),
  });
  return unwrap<{ ok: boolean; jid: string; created?: boolean }>(res, 'ensureDelegateGroup');
}

export async function getDelegateServerHealth(
  config: DelegateConnectionConfig,
): Promise<DelegateServerHealth> {
  const url = `${normalizeUrl(config.apiUrl)}/api/agents/server/health`;
  const res = await fetch(url, { headers: authHeaders(config) });
  return unwrap<DelegateServerHealth>(res, 'getDelegateServerHealth');
}

export async function syncDelegateServer(
  config: DelegateConnectionConfig,
): Promise<{ ok: boolean; message?: string }> {
  const url = `${normalizeUrl(config.apiUrl)}/api/agents/server/sync`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(config, true),
    body: JSON.stringify({}),
  });
  return unwrap<{ ok: boolean; message?: string }>(res, 'syncDelegateServer');
}
