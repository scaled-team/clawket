import {
  getAdminBillingStats,
  getCurrentUser,
  listAdminAudit,
  listAdminSessions,
  listAdminUsers,
  listAdminWorkspaces,
  revokeAdminSession,
} from './delegate-admin';

const CONFIG = { apiUrl: 'https://delegate.test', apiToken: 'tok-admin' };

function mockFetchJson(body: unknown, status = 200) {
  return jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('delegate-admin', () => {
  describe('listAdminUsers', () => {
    it('GETs /api/admin/users with pagination and search', async () => {
      const spy = mockFetchJson({
        data: [
          {
            id: 'u1',
            email: 'a@b.c',
            name: 'Alice',
            isAdmin: false,
            adminRole: null,
            createdAt: 't',
          },
        ],
        meta: { total: 150, limit: 25, offset: 50 },
        success: true,
      });
      const result = await listAdminUsers(CONFIG, { limit: 25, offset: 50, q: 'alice' });
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/api/admin/users?');
      expect(url).toContain('limit=25');
      expect(url).toContain('offset=50');
      expect(url).toContain('q=alice');
      expect((spy.mock.calls[0][1] as RequestInit).headers).toEqual({
        Authorization: 'Bearer tok-admin',
      });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(150);
      expect(result.limit).toBe(25);
      expect(result.offset).toBe(50);
    });

    it('throws on 403 (non-admin)', async () => {
      mockFetchJson({ error: 'forbidden' }, 403);
      await expect(listAdminUsers(CONFIG)).rejects.toThrow(/listAdminUsers failed: 403/);
    });
  });

  describe('listAdminWorkspaces', () => {
    it('GETs /api/admin/workspaces with no params', async () => {
      const spy = mockFetchJson({
        data: [
          {
            id: 'w1',
            name: 'Acme',
            slug: 'acme',
            createdAt: 't',
            _count: { members: 5, projects: 2 },
          },
        ],
        meta: { total: 1, limit: 50, offset: 0 },
        success: true,
      });
      const result = await listAdminWorkspaces(CONFIG);
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/admin/workspaces');
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('throws on 500', async () => {
      mockFetchJson({}, 500);
      await expect(listAdminWorkspaces(CONFIG)).rejects.toThrow(/listAdminWorkspaces failed: 500/);
    });
  });

  describe('listAdminSessions', () => {
    it('GETs /api/admin/sessions', async () => {
      const spy = mockFetchJson({
        data: [
          {
            id: 'u1',
            email: 'a@b.c',
            name: 'Alice',
            lastLoginAt: 't',
            lastActivityAt: 't',
            createdAt: 't',
          },
        ],
        meta: { total: 1, limit: 50, offset: 0 },
        success: true,
      });
      const result = await listAdminSessions(CONFIG, { limit: 25 });
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/api/admin/sessions');
      expect(url).toContain('limit=25');
      expect(result.items).toHaveLength(1);
    });

    it('throws on 403', async () => {
      mockFetchJson({}, 403);
      await expect(listAdminSessions(CONFIG)).rejects.toThrow(
        /listAdminSessions failed: 403/,
      );
    });
  });

  describe('revokeAdminSession', () => {
    it('POSTs action=revoke to /api/admin/sessions', async () => {
      const spy = mockFetchJson({
        data: { userId: 'u1', action: 'revoke', message: 'Sessions revoked' },
        success: true,
      });
      const result = await revokeAdminSession(CONFIG, 'u1');
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/admin/sessions');
      const init = spy.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toEqual({ userId: 'u1', action: 'revoke' });
      expect(result.action).toBe('revoke');
    });
  });

  describe('getAdminBillingStats', () => {
    it('GETs /api/admin/workspace-billing-stats', async () => {
      const spy = mockFetchJson({
        data: {
          totalWorkspaces: 10,
          activeTrials: 2,
          expiredTrials: 1,
          activeSubscriptions: 5,
          tierCounts: { PROFESSIONAL: 3, BUSINESS: 2 },
        },
        success: true,
      });
      const result = await getAdminBillingStats(CONFIG);
      expect(spy.mock.calls[0][0]).toBe(
        'https://delegate.test/api/admin/workspace-billing-stats',
      );
      expect(result.totalWorkspaces).toBe(10);
      expect(result.tierCounts.PROFESSIONAL).toBe(3);
    });
  });

  describe('getCurrentUser', () => {
    it('GETs /api/users/me and reads adminRole', async () => {
      const spy = mockFetchJson({
        id: 'u1',
        email: 'a@b.c',
        isAdmin: true,
        adminRole: 'CS_ADMIN',
      });
      const user = await getCurrentUser(CONFIG);
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/users/me');
      expect(user.adminRole).toBe('CS_ADMIN');
    });
  });

  describe('listAdminAudit', () => {
    it('GETs /api/admin/audit with action filter', async () => {
      const spy = mockFetchJson({
        data: [
          {
            id: 'a1',
            adminEmail: 'admin@x.com',
            action: 'delete_user',
            createdAt: 't',
          },
        ],
        meta: { total: 1, limit: 50, offset: 0 },
        success: true,
      });
      const result = await listAdminAudit(CONFIG, { action: 'delete_user', limit: 20 });
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/api/admin/audit?');
      expect(url).toContain('action=delete_user');
      expect(url).toContain('limit=20');
      expect(result.items[0].action).toBe('delete_user');
    });

    it('throws on 403 (only CS_ADMIN+ allowed)', async () => {
      mockFetchJson({ error: 'forbidden' }, 403);
      await expect(listAdminAudit(CONFIG)).rejects.toThrow(/listAdminAudit failed: 403/);
    });
  });
});
