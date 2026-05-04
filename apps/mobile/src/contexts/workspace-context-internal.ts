/**
 * Pure helpers for `WorkspaceContext`. Kept JSX-free so they're trivially
 * testable under ts-jest's node testEnvironment without a React renderer.
 */

import type { DelegateWorkspaceSummary } from '../services/delegate-workspaces';

/**
 * Reconciles the previously-selected workspace id with a freshly fetched
 * list. Preserves the previous id when it still exists; otherwise falls back
 * to the first owner-workspace, then the first item, then null.
 */
export function pickActiveWorkspaceId(
  prev: string | null,
  list: DelegateWorkspaceSummary[],
): string | null {
  if (prev && list.some((w) => w.id === prev)) return prev;
  const firstOwner = list.find((w) => w.isOwner);
  if (firstOwner) return firstOwner.id;
  return list[0]?.id ?? null;
}

/** Resolves the active workspace summary by id. */
export function resolveActiveWorkspace(
  id: string | null,
  list: DelegateWorkspaceSummary[],
): DelegateWorkspaceSummary | null {
  if (!id) return null;
  return list.find((w) => w.id === id) ?? null;
}
