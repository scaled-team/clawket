/**
 * Typed service wrappers for Delegate skill endpoints.
 *
 * Endpoints mirrored:
 *   GET    /api/skills
 *   GET    /api/skills/[id]
 *   POST   /api/skills/import
 *   POST   /api/skills/seed
 */

import { type DelegateConnectionConfig, normalizeUrl } from './delegate-http-adapter';

export type SkillRow = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  tags?: string[];
  version?: string | null;
  updatedAt?: string;
};

export type SkillDetail = SkillRow & {
  content?: string | null;
  frontmatter?: Record<string, unknown>;
  source?: string | null;
};

export type ImportSkillInput = {
  name: string;
  content: string;
  description?: string;
  category?: string;
  tags?: string[];
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

export async function listSkills(
  config: DelegateConnectionConfig,
): Promise<{ skills: SkillRow[] }> {
  const url = `${normalizeUrl(config.apiUrl)}/api/skills`;
  const res = await fetch(url, { headers: authHeaders(config) });
  const data = await unwrap<SkillRow[] | { skills: SkillRow[] }>(res, 'listSkills');
  const skills = Array.isArray(data) ? data : data.skills ?? [];
  return { skills };
}

export async function getSkill(
  config: DelegateConnectionConfig,
  id: string,
): Promise<SkillDetail> {
  const url = `${normalizeUrl(config.apiUrl)}/api/skills/${encodeURIComponent(id)}`;
  const res = await fetch(url, { headers: authHeaders(config) });
  return unwrap<SkillDetail>(res, 'getSkill');
}

export async function importSkill(
  config: DelegateConnectionConfig,
  input: ImportSkillInput,
): Promise<SkillDetail> {
  const url = `${normalizeUrl(config.apiUrl)}/api/skills/import`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(config, true),
    body: JSON.stringify(input),
  });
  return unwrap<SkillDetail>(res, 'importSkill');
}

export async function seedSkills(
  config: DelegateConnectionConfig,
): Promise<{ ok: boolean; seeded?: number }> {
  const url = `${normalizeUrl(config.apiUrl)}/api/skills/seed`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(config, true),
    body: JSON.stringify({}),
  });
  return unwrap<{ ok: boolean; seeded?: number }>(res, 'seedSkills');
}
