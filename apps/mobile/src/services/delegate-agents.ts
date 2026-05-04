/**
 * Typed service wrappers for Delegate agent-profile endpoints.
 * All functions take a DelegateConnectionConfig and return typed JSON
 * unwrapped from the Delegate `{ data, success }` envelope.
 *
 * Endpoints mirrored:
 *   GET    /api/agents
 *   GET    /api/agents/[agentId]
 *   PATCH  /api/agents/[agentId]
 *   GET    /api/agents/[agentId]/feed
 *   GET    /api/agents/[agentId]/messages
 *   GET    /api/agents/templates
 *   POST   /api/agents/from-template
 *   POST   /api/agent/delegate-agent/sync-profiles
 */

import { type DelegateConnectionConfig, normalizeUrl } from './delegate-http-adapter';

export type AgentProfileRow = {
  id: string;
  name: string;
  isActive: boolean;
  avatar?: string | null;
  heartbeatAt?: string | null;
  lastMessageAt?: string | null;
  role?: string | null;
  color?: string | null;
};

export type AgentProfileDetail = AgentProfileRow & {
  description?: string | null;
  model?: string | null;
  instructions?: string | null;
  skills?: Array<{ id: string; name: string }>;
  orchestrationStatus?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AgentFeedEvent = {
  id: string;
  type: string;
  title?: string | null;
  description?: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type AgentChannelMessage = {
  id: string;
  text: string;
  role: string;
  sender?: string | null;
  timestamp: string;
  isAI: boolean;
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

export async function listDelegateAgents(
  config: DelegateConnectionConfig,
  opts?: { workspaceId?: string },
): Promise<{ agents: AgentProfileRow[] }> {
  const search = new URLSearchParams();
  if (opts?.workspaceId) search.set('workspaceId', opts.workspaceId);
  const qs = search.toString();
  const url = `${normalizeUrl(config.apiUrl)}/api/agents${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: authHeaders(config) });
  const data = await unwrap<AgentProfileRow[] | { agents: AgentProfileRow[] }>(res, 'listDelegateAgents');
  const agents = Array.isArray(data) ? data : data.agents ?? [];
  return { agents };
}

export async function getDelegateAgent(
  config: DelegateConnectionConfig,
  agentId: string,
): Promise<AgentProfileDetail> {
  const url = `${normalizeUrl(config.apiUrl)}/api/agents/${encodeURIComponent(agentId)}`;
  const res = await fetch(url, { headers: authHeaders(config) });
  return unwrap<AgentProfileDetail>(res, 'getDelegateAgent');
}

export async function updateDelegateAgent(
  config: DelegateConnectionConfig,
  agentId: string,
  patch: Partial<
    Pick<AgentProfileDetail, 'name' | 'description' | 'isActive' | 'model' | 'instructions' | 'avatar' | 'color'>
  >,
): Promise<AgentProfileDetail> {
  const url = `${normalizeUrl(config.apiUrl)}/api/agents/${encodeURIComponent(agentId)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: authHeaders(config, true),
    body: JSON.stringify(patch),
  });
  return unwrap<AgentProfileDetail>(res, 'updateDelegateAgent');
}

export async function getDelegateAgentFeed(
  config: DelegateConnectionConfig,
  agentId: string,
  params?: { limit?: number; since?: string },
): Promise<{ events: AgentFeedEvent[] }> {
  const search = new URLSearchParams();
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.since) search.set('since', params.since);
  const qs = search.toString();
  const url = `${normalizeUrl(config.apiUrl)}/api/agents/${encodeURIComponent(agentId)}/feed${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: authHeaders(config) });
  const data = await unwrap<AgentFeedEvent[] | { events: AgentFeedEvent[] }>(res, 'getDelegateAgentFeed');
  const events = Array.isArray(data) ? data : data.events ?? [];
  return { events };
}

export async function getDelegateAgentMessages(
  config: DelegateConnectionConfig,
  agentId: string,
  params?: { limit?: number; since?: string },
): Promise<{ messages: AgentChannelMessage[] }> {
  const search = new URLSearchParams();
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.since) search.set('since', params.since);
  const qs = search.toString();
  const url = `${normalizeUrl(config.apiUrl)}/api/agents/${encodeURIComponent(agentId)}/messages${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: authHeaders(config) });
  const data = await unwrap<AgentChannelMessage[] | { messages: AgentChannelMessage[] }>(
    res,
    'getDelegateAgentMessages',
  );
  const messages = Array.isArray(data) ? data : data.messages ?? [];
  return { messages };
}

/**
 * Sync local agent profiles to the remote NanoClaw instance (droplet).
 * Backed by POST /api/agent/delegate-agent/sync-profiles.
 */
export async function syncDelegateProfiles(
  config: DelegateConnectionConfig,
): Promise<{ ok: boolean; synced?: number }> {
  const url = `${normalizeUrl(config.apiUrl)}/api/agent/delegate-agent/sync-profiles`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(config, true),
    body: JSON.stringify({}),
  });
  return unwrap<{ ok: boolean; synced?: number }>(res, 'syncDelegateProfiles');
}

export type AgentTemplateRow = {
  id: string;
  name: string;
  role: string;
  description?: string | null;
  avatar?: string | null;
  color?: string | null;
  category?: string | null;
  personality?: string | null;
  systemPrompt?: string | null;
  defaultSkills?: string[] | null;
};

/**
 * List available agent templates.
 * Backed by GET /api/agents/templates.
 */
export async function listAgentTemplates(
  config: DelegateConnectionConfig,
  params?: { category?: string; workspaceId?: string },
): Promise<{ templates: AgentTemplateRow[] }> {
  const search = new URLSearchParams();
  if (params?.category) search.set('category', params.category);
  if (params?.workspaceId) search.set('workspaceId', params.workspaceId);
  const qs = search.toString();
  const url = `${normalizeUrl(config.apiUrl)}/api/agents/templates${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: authHeaders(config) });
  const data = await unwrap<AgentTemplateRow[] | { templates: AgentTemplateRow[] }>(
    res,
    'listAgentTemplates',
  );
  const templates = Array.isArray(data) ? data : data.templates ?? [];
  return { templates };
}

/**
 * Create a new agent from a template.
 * Backed by POST /api/agents/from-template.
 */
export async function createAgentFromTemplate(
  config: DelegateConnectionConfig,
  templateId: string,
  name: string,
  opts?: { workspaceId?: string; overrides?: Record<string, unknown> },
): Promise<{ agent: AgentProfileRow }> {
  const url = `${normalizeUrl(config.apiUrl)}/api/agents/from-template`;
  const body: Record<string, unknown> = { templateId };
  if (opts?.workspaceId) body.workspaceId = opts.workspaceId;
  // The Delegate endpoint accepts an `overrides` object that can include `name`.
  body.overrides = { ...(opts?.overrides ?? {}), name };
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(config, true),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`createAgentFromTemplate failed: ${res.status}`);
  const json = await res.json();
  // The route returns either the created user (with agentProfile) or a data envelope.
  const raw = json.data ?? json;
  // Normalize to { agent: AgentProfileRow } — agentProfile is the one we care about.
  const profile = raw.agentProfile ?? raw;
  const agent: AgentProfileRow = {
    id: profile.id,
    name: raw.name ?? profile.name ?? name,
    isActive: profile.isActive ?? true,
    avatar: profile.avatar ?? null,
    heartbeatAt: profile.heartbeatAt ?? null,
    lastMessageAt: profile.lastMessageAt ?? null,
    role: profile.role ?? null,
    color: profile.color ?? null,
  };
  return { agent };
}
