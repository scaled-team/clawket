import {
  listNotificationLogs,
  getNotificationPreferences,
  updateNotificationPreferences,
  testNotification,
} from './delegate-notifications';

const CONFIG = { apiUrl: 'https://delegate.test', apiToken: 'tok-notif' };

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

describe('delegate-notifications', () => {
  describe('listNotificationLogs', () => {
    it('GETs with query params', async () => {
      const spy = mockFetchJson({
        data: [{ id: 'n1', channel: 'email', status: 'sent', createdAt: 't' }],
        meta: { total: 1 },
        success: true,
      });
      const result = await listNotificationLogs(CONFIG, { limit: 10, channel: 'email' });
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/api/notifications/logs?');
      expect(url).toContain('limit=10');
      expect(url).toContain('channel=email');
      expect(result.total).toBe(1);
    });

    it('throws on 500', async () => {
      mockFetchJson({}, 500);
      await expect(listNotificationLogs(CONFIG)).rejects.toThrow(/listNotificationLogs failed: 500/);
    });
  });

  describe('getNotificationPreferences', () => {
    it('GETs preferences', async () => {
      const spy = mockFetchJson({
        data: { email: { enabled: true, address: 'a@b.c' } },
        success: true,
      });
      const result = await getNotificationPreferences(CONFIG);
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/notifications/preferences');
      expect(result.email?.enabled).toBe(true);
    });

    it('throws on 401', async () => {
      mockFetchJson({}, 401);
      await expect(getNotificationPreferences(CONFIG)).rejects.toThrow(
        /getNotificationPreferences failed: 401/,
      );
    });
  });

  describe('updateNotificationPreferences', () => {
    it('PUTs preferences', async () => {
      const spy = mockFetchJson({
        data: { email: { enabled: false } },
        success: true,
      });
      await updateNotificationPreferences(CONFIG, { email: { enabled: false } });
      const init = spy.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('PUT');
      expect(init.body).toBe(JSON.stringify({ email: { enabled: false } }));
    });

    it('throws on 400', async () => {
      mockFetchJson({}, 400);
      await expect(updateNotificationPreferences(CONFIG, {})).rejects.toThrow(
        /updateNotificationPreferences failed: 400/,
      );
    });
  });

  describe('testNotification', () => {
    it('POSTs channel', async () => {
      const spy = mockFetchJson({ data: { ok: true, messageId: 'm1' }, success: true });
      const result = await testNotification(CONFIG, 'email');
      const init = spy.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify({ channel: 'email' }));
      expect(result.messageId).toBe('m1');
    });

    it('throws on 500', async () => {
      mockFetchJson({}, 500);
      await expect(testNotification(CONFIG, 'sms')).rejects.toThrow(/testNotification failed: 500/);
    });
  });
});
