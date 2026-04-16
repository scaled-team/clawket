import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export type DelegateInfo = {
  configFound: boolean;
  apiUrl: string | null;
  apiToken: string | null;
  displayName: string | null;
};

export type DelegateConfig = {
  apiUrl: string;
  apiToken: string;
  displayName?: string;
  pollIntervalMs?: number;
};

const DEFAULT_API_URL = 'https://delegate.ws';
const CONFIG_DIR = join(homedir(), '.clawket');
const DELEGATE_CONFIG_PATH = join(CONFIG_DIR, 'delegate.json');

export function readDelegateInfo(): DelegateInfo {
  // Check env vars first
  const envUrl = process.env.DELEGATE_API_URL?.trim() || null;
  const envToken = process.env.DELEGATE_API_TOKEN?.trim() || null;

  if (!existsSync(DELEGATE_CONFIG_PATH)) {
    return {
      configFound: false,
      apiUrl: envUrl,
      apiToken: envToken,
      displayName: null,
    };
  }

  try {
    const raw = readFileSync(DELEGATE_CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as {
      apiUrl?: unknown;
      apiToken?: unknown;
      displayName?: unknown;
    };

    return {
      configFound: true,
      apiUrl: envUrl ?? (typeof parsed.apiUrl === 'string' ? parsed.apiUrl.trim() : null),
      apiToken: envToken ?? (typeof parsed.apiToken === 'string' ? parsed.apiToken.trim() : null),
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName.trim() : null,
    };
  } catch {
    return {
      configFound: false,
      apiUrl: envUrl,
      apiToken: envToken,
      displayName: null,
    };
  }
}

export function resolveDelegateApiUrl(explicitUrl?: string | null): string {
  const trimmed = explicitUrl?.trim();
  if (trimmed) return trimmed;
  const info = readDelegateInfo();
  return info.apiUrl ?? DEFAULT_API_URL;
}

export function resolveDelegateApiToken(explicitToken?: string | null): string | null {
  const trimmed = explicitToken?.trim();
  if (trimmed) return trimmed;
  const info = readDelegateInfo();
  return info.apiToken;
}

/**
 * Test connectivity to a Delegate instance by polling the agent channel.
 * Returns true if the API responds with a valid JSON response.
 */
export async function testDelegateConnection(apiUrl: string, apiToken: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const url = `${apiUrl.replace(/\/$/, '')}/api/agent/channel/poll?jid=delegate:main&limit=1`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 401) {
      return { ok: false, error: 'Invalid API token' };
    }
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
    }

    const body = await res.json() as { messages?: unknown[] };
    if (!Array.isArray(body.messages)) {
      return { ok: false, error: 'Unexpected response format' };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/**
 * Poll Delegate's agent channel for new messages.
 */
export async function pollDelegateChannel(
  apiUrl: string,
  apiToken: string,
  jid: string,
  since?: string,
  limit?: number,
): Promise<{
  messages: Array<{
    id: string;
    text: string;
    role: string;
    sender?: string;
    timestamp: string;
    isAI: boolean;
  }>;
  count: number;
}> {
  const params = new URLSearchParams({ jid });
  if (since) params.set('since', since);
  if (limit) params.set('limit', String(limit));

  const url = `${apiUrl.replace(/\/$/, '')}/api/agent/channel/poll?${params}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Poll failed: HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Post a reply to Delegate's agent channel.
 */
export async function replyDelegateChannel(
  apiUrl: string,
  apiToken: string,
  jid: string,
  text: string,
  metadata?: Record<string, unknown>,
): Promise<{ ok: boolean; messageId?: string }> {
  const url = `${apiUrl.replace(/\/$/, '')}/api/agent/channel/reply`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jid, text, metadata }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Reply failed: HTTP ${res.status}`);
  }

  return res.json();
}
