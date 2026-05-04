import { pickActiveWorkspaceId, resolveActiveWorkspace } from './workspace-context-internal';
import type { DelegateWorkspaceSummary } from '../services/delegate-workspaces';

const W1: DelegateWorkspaceSummary = {
  id: 'ws-1',
  name: 'Alpha',
  slug: 'alpha',
  icon: '🅰️',
  color: null,
  isOwner: true,
  role: 'owner',
  memberCount: 3,
  projectCount: 1,
  serverCount: 0,
};
const W2: DelegateWorkspaceSummary = {
  id: 'ws-2',
  name: 'Bravo',
  slug: 'bravo',
  icon: '🅱️',
  color: null,
  isOwner: false,
  role: 'member',
  memberCount: 5,
  projectCount: 2,
  serverCount: 0,
};
const W3: DelegateWorkspaceSummary = {
  ...W2,
  id: 'ws-3',
  name: 'Charlie',
  isOwner: false,
  role: 'viewer',
};

describe('WorkspaceContext (pure helpers)', () => {
  describe('pickActiveWorkspaceId', () => {
    it('preserves the previously-selected id when it still exists in the list', () => {
      expect(pickActiveWorkspaceId('ws-2', [W1, W2])).toBe('ws-2');
    });

    it('falls back to the first owner-workspace when the previous id is gone', () => {
      expect(pickActiveWorkspaceId('ws-stale', [W2, W1])).toBe('ws-1');
    });

    it('falls back to the first list item when no owner-workspace is present', () => {
      expect(pickActiveWorkspaceId(null, [W2, W3])).toBe('ws-2');
    });

    it('returns null when the list is empty', () => {
      expect(pickActiveWorkspaceId('ws-anything', [])).toBe(null);
      expect(pickActiveWorkspaceId(null, [])).toBe(null);
    });
  });

  describe('resolveActiveWorkspace', () => {
    it('returns the matching summary for the given id', () => {
      expect(resolveActiveWorkspace('ws-2', [W1, W2])).toEqual(W2);
    });

    it('returns null when no id is set', () => {
      expect(resolveActiveWorkspace(null, [W1, W2])).toBe(null);
    });

    it('returns null when the id is not present', () => {
      expect(resolveActiveWorkspace('ws-missing', [W1, W2])).toBe(null);
    });
  });
});
