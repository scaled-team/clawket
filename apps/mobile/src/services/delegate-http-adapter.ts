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

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export async function testDelegateHttp(config: DelegateConnectionConfig): Promise<boolean> {
  try {
    const url = `${normalizeUrl(config.apiUrl)}/api/agent/channel/poll?jid=delegate:main&limit=1`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${config.apiToken}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function pollDelegateMessages(
  config: DelegateConnectionConfig,
  jid: string,
  since?: string,
  limit = 50,
): Promise<{ messages: DelegateMessage[]; count: number }> {
  const params = new URLSearchParams({ jid, limit: String(limit) });
  if (since) params.set('since', since);

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
 * Fetch chat history from Delegate — returns the most recent messages
 * in the format the GatewayClient expects for chat.history responses.
 */
export async function fetchDelegateHistory(
  config: DelegateConnectionConfig,
  jid: string,
  limit = 50,
): Promise<Array<{ role: string; content: string; timestamp?: string }>> {
  // Poll with a wide window to get history
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const result = await pollDelegateMessages(config, jid, since, limit);

  return result.messages.map((m) => ({
    role: m.isAI || m.role === 'agent' ? 'assistant' : 'user',
    content: m.text,
    timestamp: m.timestamp,
  }));
}
