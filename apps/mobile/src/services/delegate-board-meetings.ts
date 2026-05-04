/**
 * Typed service wrappers for Delegate board-meeting endpoints.
 *
 * Endpoints mirrored:
 *   GET  /api/board-meetings
 *   GET  /api/board-meetings/[id]
 *   POST /api/board-meetings/[id]/start
 *   POST /api/board-meetings/[id]/cancel
 */

import { type DelegateConnectionConfig, normalizeUrl } from './delegate-http-adapter';

export type BoardMeetingRow = {
  id: string;
  title: string;
  status: string;
  scheduledFor?: string | null;
  workspaceId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BoardMeetingDetail = BoardMeetingRow & {
  description?: string | null;
  participants?: Array<{ id: string; name: string; role?: string }>;
  rounds?: Array<{ id: string; roundNumber: number; status: string }>;
  actions?: Array<{ id: string; description: string; assignedTo?: string | null }>;
  decisions?: Array<{ id: string; content: string }>;
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

export type CreateBoardMeetingInput = {
  title: string;
  description?: string;
  scheduledAt?: string;
};

export async function createBoardMeeting(
  config: DelegateConnectionConfig,
  input: CreateBoardMeetingInput,
): Promise<BoardMeetingDetail> {
  const url = `${normalizeUrl(config.apiUrl)}/api/board-meetings`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(config, true),
    body: JSON.stringify(input),
  });
  return unwrap<BoardMeetingDetail>(res, 'createBoardMeeting');
}

export async function listBoardMeetings(
  config: DelegateConnectionConfig,
  opts?: { workspaceId?: string },
): Promise<{ meetings: BoardMeetingRow[] }> {
  const search = new URLSearchParams();
  if (opts?.workspaceId) search.set('workspaceId', opts.workspaceId);
  const qs = search.toString();
  const url = `${normalizeUrl(config.apiUrl)}/api/board-meetings${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: authHeaders(config) });
  const data = await unwrap<BoardMeetingRow[] | { meetings: BoardMeetingRow[] }>(res, 'listBoardMeetings');
  const meetings = Array.isArray(data) ? data : data.meetings ?? [];
  return { meetings };
}

export async function getBoardMeeting(
  config: DelegateConnectionConfig,
  id: string,
): Promise<BoardMeetingDetail> {
  const url = `${normalizeUrl(config.apiUrl)}/api/board-meetings/${encodeURIComponent(id)}`;
  const res = await fetch(url, { headers: authHeaders(config) });
  return unwrap<BoardMeetingDetail>(res, 'getBoardMeeting');
}

export async function startBoardMeeting(
  config: DelegateConnectionConfig,
  id: string,
): Promise<{ ok: boolean; status?: string }> {
  const url = `${normalizeUrl(config.apiUrl)}/api/board-meetings/${encodeURIComponent(id)}/start`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(config, true),
    body: JSON.stringify({}),
  });
  return unwrap<{ ok: boolean; status?: string }>(res, 'startBoardMeeting');
}

export async function cancelBoardMeeting(
  config: DelegateConnectionConfig,
  id: string,
): Promise<{ ok: boolean; status?: string }> {
  const url = `${normalizeUrl(config.apiUrl)}/api/board-meetings/${encodeURIComponent(id)}/cancel`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(config, true),
    body: JSON.stringify({}),
  });
  return unwrap<{ ok: boolean; status?: string }>(res, 'cancelBoardMeeting');
}
