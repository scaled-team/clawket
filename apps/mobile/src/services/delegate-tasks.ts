/**
 * Typed service wrappers for Delegate task endpoints.
 *
 * Endpoints mirrored:
 *   GET    /api/tasks                         (list, supports scope/status/limit/offset filters)
 *   GET    /api/tasks/[id]
 *   POST   /api/tasks
 *   PATCH  /api/tasks/[id]
 *   DELETE /api/tasks/[id]
 *   GET    /api/tasks/[id]/comments
 *   POST   /api/tasks/[id]/comments
 *   GET    /api/tasks/[id]/subtasks
 *   POST   /api/tasks/[id]/workflow/start
 */

import { type DelegateConnectionConfig, normalizeUrl } from './delegate-http-adapter';

export type DelegateTaskRow = {
  id: string;
  title: string;
  status: string;
  priority?: string | null;
  dueDate?: string | null;
  assignedAgentId?: string | null;
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DelegateTaskDetail = DelegateTaskRow & {
  description?: string | null;
  subtasks?: Array<{ id: string; title: string; done: boolean }>;
  comments?: Array<{ id: string; body: string; authorName?: string; createdAt: string }>;
  delegations?: Array<{ id: string; status: string; agentId?: string | null }>;
};

export type TaskComment = {
  id: string;
  body: string;
  authorName?: string | null;
  authorId?: string | null;
  createdAt: string;
};

export type TaskSubtask = {
  id: string;
  title: string;
  done: boolean;
  orderIndex?: number;
};

export type ListDelegateTasksParams = {
  scope?: 'mine' | 'workspace' | 'project';
  status?: string;
  limit?: number;
  offset?: number;
  projectId?: string;
  workspaceId?: string;
  q?: string;
};

export type CreateDelegateTaskInput = {
  title: string;
  description?: string;
  priority?: string;
  projectId?: string;
  dueDate?: string;
  assignedAgentId?: string;
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

export async function listDelegateTasks(
  config: DelegateConnectionConfig,
  params: ListDelegateTasksParams = {},
): Promise<{ tasks: DelegateTaskRow[]; total?: number }> {
  const search = new URLSearchParams();
  if (params.scope) search.set('scope', params.scope);
  if (params.status) search.set('status', params.status);
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.offset != null) search.set('offset', String(params.offset));
  if (params.projectId) search.set('projectId', params.projectId);
  if (params.workspaceId) search.set('workspaceId', params.workspaceId);
  if (params.q) search.set('q', params.q);
  const qs = search.toString();
  const url = `${normalizeUrl(config.apiUrl)}/api/tasks${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: authHeaders(config) });
  if (!res.ok) throw new Error(`listDelegateTasks failed: ${res.status}`);
  const json = await res.json();
  const data = json.data ?? json;
  const tasks = Array.isArray(data) ? data : data.tasks ?? [];
  return { tasks, total: json.meta?.total };
}

export async function getDelegateTask(
  config: DelegateConnectionConfig,
  taskId: string,
): Promise<DelegateTaskDetail> {
  const url = `${normalizeUrl(config.apiUrl)}/api/tasks/${encodeURIComponent(taskId)}`;
  const res = await fetch(url, { headers: authHeaders(config) });
  return unwrap<DelegateTaskDetail>(res, 'getDelegateTask');
}

export async function createDelegateTask(
  config: DelegateConnectionConfig,
  input: CreateDelegateTaskInput,
): Promise<DelegateTaskDetail> {
  const url = `${normalizeUrl(config.apiUrl)}/api/tasks`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(config, true),
    body: JSON.stringify(input),
  });
  return unwrap<DelegateTaskDetail>(res, 'createDelegateTask');
}

export async function updateDelegateTask(
  config: DelegateConnectionConfig,
  taskId: string,
  patch: Partial<Pick<DelegateTaskDetail, 'title' | 'description' | 'status' | 'priority' | 'dueDate' | 'assignedAgentId'>>,
): Promise<DelegateTaskDetail> {
  const url = `${normalizeUrl(config.apiUrl)}/api/tasks/${encodeURIComponent(taskId)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: authHeaders(config, true),
    body: JSON.stringify(patch),
  });
  return unwrap<DelegateTaskDetail>(res, 'updateDelegateTask');
}

export async function deleteDelegateTask(
  config: DelegateConnectionConfig,
  taskId: string,
): Promise<{ ok: boolean }> {
  const url = `${normalizeUrl(config.apiUrl)}/api/tasks/${encodeURIComponent(taskId)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: authHeaders(config),
  });
  if (!res.ok) throw new Error(`deleteDelegateTask failed: ${res.status}`);
  return { ok: true };
}

export async function listTaskComments(
  config: DelegateConnectionConfig,
  taskId: string,
): Promise<{ comments: TaskComment[] }> {
  const url = `${normalizeUrl(config.apiUrl)}/api/tasks/${encodeURIComponent(taskId)}/comments`;
  const res = await fetch(url, { headers: authHeaders(config) });
  const data = await unwrap<TaskComment[] | { comments: TaskComment[] }>(res, 'listTaskComments');
  const comments = Array.isArray(data) ? data : data.comments ?? [];
  return { comments };
}

export async function addTaskComment(
  config: DelegateConnectionConfig,
  taskId: string,
  body: string,
): Promise<TaskComment> {
  const url = `${normalizeUrl(config.apiUrl)}/api/tasks/${encodeURIComponent(taskId)}/comments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(config, true),
    body: JSON.stringify({ body }),
  });
  return unwrap<TaskComment>(res, 'addTaskComment');
}

export async function listTaskSubtasks(
  config: DelegateConnectionConfig,
  taskId: string,
): Promise<{ subtasks: TaskSubtask[] }> {
  const url = `${normalizeUrl(config.apiUrl)}/api/tasks/${encodeURIComponent(taskId)}/subtasks`;
  const res = await fetch(url, { headers: authHeaders(config) });
  const data = await unwrap<TaskSubtask[] | { subtasks: TaskSubtask[] }>(res, 'listTaskSubtasks');
  const subtasks = Array.isArray(data) ? data : data.subtasks ?? [];
  return { subtasks };
}

/**
 * Kick off the workflow runner for a task. Backed by
 * POST /api/tasks/[id]/workflow/start.
 */
export async function startTaskWorkflow(
  config: DelegateConnectionConfig,
  taskId: string,
): Promise<{ ok: boolean; workflowId?: string }> {
  const url = `${normalizeUrl(config.apiUrl)}/api/tasks/${encodeURIComponent(taskId)}/workflow/start`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(config, true),
    body: JSON.stringify({}),
  });
  return unwrap<{ ok: boolean; workflowId?: string }>(res, 'startTaskWorkflow');
}

export type EnhanceTaskDraftInput = {
  title: string;
  description?: string;
  workspaceId?: string;
  projectId?: string;
};

export type EnhanceTaskDraftResult = {
  enhancedDescription: string;
  newSubtasks: string[];
  relevantKnowledge: Array<{ id: string; title: string }>;
};

/**
 * AI-enhance a task draft before it is saved. Backed by
 * POST /api/tasks/enhance/draft.
 */
export async function enhanceTaskDraft(
  config: DelegateConnectionConfig,
  input: EnhanceTaskDraftInput,
): Promise<EnhanceTaskDraftResult> {
  const url = `${normalizeUrl(config.apiUrl)}/api/tasks/enhance/draft`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(config, true),
    body: JSON.stringify(input),
  });
  return unwrap<EnhanceTaskDraftResult>(res, 'enhanceTaskDraft');
}
