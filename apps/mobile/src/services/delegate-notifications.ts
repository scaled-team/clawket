/**
 * Typed service wrappers for Delegate notification endpoints.
 *
 * Endpoints mirrored:
 *   GET  /api/notifications/logs
 *   GET  /api/notifications/preferences
 *   PUT  /api/notifications/preferences
 *   POST /api/notifications/test
 */

import { type DelegateConnectionConfig, normalizeUrl } from './delegate-http-adapter';

export type NotificationLog = {
  id: string;
  channel: string;
  subject?: string | null;
  body?: string | null;
  recipient?: string | null;
  status: string;
  error?: string | null;
  createdAt: string;
};

export type NotificationPreferences = {
  email?: { enabled: boolean; address?: string };
  sms?: { enabled: boolean; phone?: string };
  push?: { enabled: boolean };
  webhook?: { enabled: boolean; url?: string };
  categories?: Record<string, boolean>;
};

export type NotificationChannel = 'email' | 'sms' | 'push' | 'webhook';

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

export async function listNotificationLogs(
  config: DelegateConnectionConfig,
  params?: { limit?: number; offset?: number; channel?: string },
): Promise<{ logs: NotificationLog[]; total?: number }> {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.offset != null) search.set('offset', String(params.offset));
  if (params?.channel) search.set('channel', params.channel);
  const qs = search.toString();
  const url = `${normalizeUrl(config.apiUrl)}/api/notifications/logs${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: authHeaders(config) });
  if (!res.ok) throw new Error(`listNotificationLogs failed: ${res.status}`);
  const json = await res.json();
  const data = json.data ?? json;
  const logs = Array.isArray(data) ? data : data.logs ?? [];
  return { logs, total: json.meta?.total };
}

export async function getNotificationPreferences(
  config: DelegateConnectionConfig,
): Promise<NotificationPreferences> {
  const url = `${normalizeUrl(config.apiUrl)}/api/notifications/preferences`;
  const res = await fetch(url, { headers: authHeaders(config) });
  return unwrap<NotificationPreferences>(res, 'getNotificationPreferences');
}

export async function updateNotificationPreferences(
  config: DelegateConnectionConfig,
  prefs: NotificationPreferences,
): Promise<NotificationPreferences> {
  const url = `${normalizeUrl(config.apiUrl)}/api/notifications/preferences`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: authHeaders(config, true),
    body: JSON.stringify(prefs),
  });
  return unwrap<NotificationPreferences>(res, 'updateNotificationPreferences');
}

export async function testNotification(
  config: DelegateConnectionConfig,
  channel: NotificationChannel,
): Promise<{ ok: boolean; messageId?: string }> {
  const url = `${normalizeUrl(config.apiUrl)}/api/notifications/test`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(config, true),
    body: JSON.stringify({ channel }),
  });
  return unwrap<{ ok: boolean; messageId?: string }>(res, 'testNotification');
}
