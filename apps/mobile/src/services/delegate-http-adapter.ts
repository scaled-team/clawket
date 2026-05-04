/**
 * HTTP adapter for the Delegate backend.
 *
 * Delegate uses REST endpoints (not WebSocket) for agent communication.
 * This adapter provides poll/reply/history methods that the GatewayClient
 * calls when backendKind === 'delegate'.
 */

export type DelegateMessage = {
  id: string;
  text: string;
  role: string;
  sender?: string;
  timestamp: string;
  isAI: boolean;
};

export type DelegateConnectionConfig = {
  apiUrl: string;
  apiToken: string;
};

export function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export async function testDelegateHttp(config: DelegateConnectionConfig): Promise<boolean> {
  try {
    const url = `${normalizeUrl(config.apiUrl)}/api/agent/channel/poll?jid=delegate:main&limit=1`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${config.apiToken}` },
    });
    // 401 = bad token (not connected), 5xx = server reachable but having issues (connected)
    return res.status !== 401;
  } catch {
    return false;
  }
}

export async function pollDelegateMessages(
  config: DelegateConnectionConfig,
  jid: string,
  since?: string,
  limit = 50,
  options?: { includeAgent?: boolean },
): Promise<{ messages: DelegateMessage[]; count: number }> {
  const params = new URLSearchParams({ jid, limit: String(limit) });
  if (since) params.set('since', since);
  if (options?.includeAgent) params.set('includeAgent', '1');

  const url = `${normalizeUrl(config.apiUrl)}/api/agent/channel/poll?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${config.apiToken}` },
  });

  if (!res.ok) {
    throw new Error(`Delegate poll failed: ${res.status}`);
  }

  return res.json();
}

export async function sendDelegateReply(
  config: DelegateConnectionConfig,
  jid: string,
  text: string,
  metadata?: Record<string, unknown>,
): Promise<{ ok: boolean; messageId?: string }> {
  const url = `${normalizeUrl(config.apiUrl)}/api/agent/channel/reply`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jid, text, metadata }),
  });

  if (!res.ok) {
    throw new Error(`Delegate reply failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Post a user-authored message into the delegate channel so the agent picks it
 * up on its next poll. Uses /api/agent/channel/post which stores the message
 * with role="user" (unlike /reply, which marks messages as role="agent").
 */
export async function postDelegateUserMessage(
  config: DelegateConnectionConfig,
  jid: string,
  text: string,
  metadata?: Record<string, unknown>,
): Promise<{ ok: boolean; messageId?: string }> {
  const url = `${normalizeUrl(config.apiUrl)}/api/agent/channel/post`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jid, text, metadata }),
  });

  if (!res.ok) {
    throw new Error(`Delegate post failed: ${res.status}`);
  }

  return res.json();
}

export async function fetchDelegateUsage(
  config: DelegateConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<{ usage: any; cost: any }> {
  const params = new URLSearchParams({ startDate, endDate });
  const url = `${normalizeUrl(config.apiUrl)}/api/agent/usage?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${config.apiToken}` },
  });
  if (!res.ok) throw new Error(`Delegate usage failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? { usage: {}, cost: {} };
}

/**
 * Fetch chat history from Delegate — returns the most recent messages
 * in the format the GatewayClient expects for chat.history responses.
 */
export async function fetchDelegateHistory(
  config: DelegateConnectionConfig,
  jid: string,
  limit = 50,
): Promise<Array<{ role: string; content: string; timestamp?: string }>> {
  // Poll with a wide window to get history; include agent replies so both
  // sides of the conversation render.
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const result = await pollDelegateMessages(config, jid, since, limit, {
    includeAgent: true,
  });

  return result.messages.map((m) => ({
    role: m.isAI || m.role === 'agent' ? 'assistant' : 'user',
    content: m.text,
    timestamp: m.timestamp,
  }));
}

/**
 * Fetch live progress events for an active channel run.
 * Backed by GET /api/agent/channel/progress.
 */
export async function fetchDelegateProgress(
  config: DelegateConnectionConfig,
  jid: string,
  since?: string,
): Promise<{ events: Array<{ id: string; stage?: string; message?: string; timestamp: string }>; count: number }> {
  const params = new URLSearchParams({ jid });
  if (since) params.set('since', since);
  const url = `${normalizeUrl(config.apiUrl)}/api/agent/channel/progress?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${config.apiToken}` },
  });
  if (!res.ok) throw new Error(`Delegate progress failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

/**
 * Fetch worktree metadata (repo, branch, commit) for an agent channel.
 * Backed by GET /api/agent/channel/worktree.
 */
export async function fetchDelegateWorktree(
  config: DelegateConnectionConfig,
  jid: string,
): Promise<{ repo?: string; branch?: string; commit?: string; dirty?: boolean } | null> {
  const params = new URLSearchParams({ jid });
  const url = `${normalizeUrl(config.apiUrl)}/api/agent/channel/worktree?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${config.apiToken}` },
  });
  if (!res.ok) throw new Error(`Delegate worktree failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? json ?? null;
}

/**
 * Fetch the current user's token/credit balance.
 * Backed by GET /api/usage.
 */
export async function fetchUserUsage(
  config: DelegateConnectionConfig,
): Promise<{ balance: number; used: number; limit: number | null; periodEnd?: string } | null> {
  const url = `${normalizeUrl(config.apiUrl)}/api/usage`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${config.apiToken}` },
  });
  if (!res.ok) throw new Error(`User usage failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? json ?? null;
}

/**
 * Purchase an additional usage pack. Delegate endpoint: POST /api/usage/topup.
 * Accepts amount in cents (or pack identifier, server decides). Returns the
 * Stripe checkout URL when payment is required.
 */
export async function postUsageTopup(
  config: DelegateConnectionConfig,
  amount: number,
): Promise<{ ok: boolean; checkoutUrl?: string; balance?: number }> {
  const url = `${normalizeUrl(config.apiUrl)}/api/usage/topup`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error(`Usage topup failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}
