import {
  createBoardMeeting,
  listBoardMeetings,
  getBoardMeeting,
  startBoardMeeting,
  cancelBoardMeeting,
} from './delegate-board-meetings';

const CONFIG = { apiUrl: 'https://delegate.test', apiToken: 'tok-bm' };

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

describe('delegate-board-meetings', () => {
  describe('listBoardMeetings', () => {
    it('GETs /api/board-meetings', async () => {
      const spy = mockFetchJson({
        data: [{ id: 'b1', title: 'Kickoff', status: 'SCHEDULED', createdAt: 't', updatedAt: 't' }],
        success: true,
      });
      const result = await listBoardMeetings(CONFIG);
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/board-meetings');
      expect(result.meetings).toHaveLength(1);
    });

    it('throws on 500', async () => {
      mockFetchJson({}, 500);
      await expect(listBoardMeetings(CONFIG)).rejects.toThrow(/listBoardMeetings failed: 500/);
    });
  });

  describe('getBoardMeeting', () => {
    it('fetches meeting detail', async () => {
      const spy = mockFetchJson({
        data: { id: 'b1', title: 'Kickoff', status: 'SCHEDULED', createdAt: 't', updatedAt: 't' },
        success: true,
      });
      await getBoardMeeting(CONFIG, 'b1');
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/board-meetings/b1');
    });

    it('throws on 404', async () => {
      mockFetchJson({}, 404);
      await expect(getBoardMeeting(CONFIG, 'missing')).rejects.toThrow(/getBoardMeeting failed: 404/);
    });
  });

  describe('startBoardMeeting', () => {
    it('POSTs to /start', async () => {
      const spy = mockFetchJson({ data: { ok: true, status: 'IN_PROGRESS' }, success: true });
      const result = await startBoardMeeting(CONFIG, 'b1');
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/board-meetings/b1/start');
      const init = spy.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('POST');
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('throws on 409', async () => {
      mockFetchJson({}, 409);
      await expect(startBoardMeeting(CONFIG, 'b1')).rejects.toThrow(/startBoardMeeting failed: 409/);
    });
  });

  describe('createBoardMeeting', () => {
    it('POSTs to /api/board-meetings with title/description/scheduledAt', async () => {
      const spy = mockFetchJson({
        data: {
          id: 'b2',
          title: 'Kickoff',
          status: 'SCHEDULED',
          createdAt: 't',
          updatedAt: 't',
        },
        success: true,
      }, 201);
      const result = await createBoardMeeting(CONFIG, {
        title: 'Kickoff',
        description: 'agenda',
        scheduledAt: '2026-05-01T14:00:00Z',
      });
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/board-meetings');
      const init = spy.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toEqual({
        title: 'Kickoff',
        description: 'agenda',
        scheduledAt: '2026-05-01T14:00:00Z',
      });
      expect(result.id).toBe('b2');
    });

    it('throws on 400', async () => {
      mockFetchJson({}, 400);
      await expect(createBoardMeeting(CONFIG, { title: '' })).rejects.toThrow(
        /createBoardMeeting failed: 400/,
      );
    });
  });

  describe('cancelBoardMeeting', () => {
    it('POSTs to /cancel', async () => {
      const spy = mockFetchJson({ data: { ok: true, status: 'CANCELLED' }, success: true });
      await cancelBoardMeeting(CONFIG, 'b1');
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/board-meetings/b1/cancel');
    });

    it('throws on 500', async () => {
      mockFetchJson({}, 500);
      await expect(cancelBoardMeeting(CONFIG, 'b1')).rejects.toThrow(/cancelBoardMeeting failed: 500/);
    });
  });
});
