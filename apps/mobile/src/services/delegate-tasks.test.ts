import {
  listDelegateTasks,
  getDelegateTask,
  createDelegateTask,
  updateDelegateTask,
  deleteDelegateTask,
  listTaskComments,
  addTaskComment,
  listTaskSubtasks,
  startTaskWorkflow,
  enhanceTaskDraft,
} from './delegate-tasks';

const CONFIG = { apiUrl: 'https://delegate.test', apiToken: 'tok-xyz' };

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

describe('delegate-tasks', () => {
  describe('listDelegateTasks', () => {
    it('builds query from filters and returns tasks + total', async () => {
      const spy = mockFetchJson({
        data: [{ id: 't1', title: 'Fix bug', status: 'OPEN' }],
        meta: { total: 42 },
        success: true,
      });
      const result = await listDelegateTasks(CONFIG, { scope: 'mine', status: 'OPEN', limit: 10, offset: 20 });
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('scope=mine');
      expect(url).toContain('status=OPEN');
      expect(url).toContain('limit=10');
      expect(url).toContain('offset=20');
      expect(result.tasks).toHaveLength(1);
      expect(result.total).toBe(42);
    });

    it('throws on 500', async () => {
      mockFetchJson({}, 500);
      await expect(listDelegateTasks(CONFIG)).rejects.toThrow(/listDelegateTasks failed: 500/);
    });
  });

  describe('getDelegateTask', () => {
    it('GETs /api/tasks/[id]', async () => {
      const spy = mockFetchJson({ data: { id: 't1', title: 'Fix', status: 'OPEN' }, success: true });
      await getDelegateTask(CONFIG, 't1');
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/tasks/t1');
    });

    it('throws on 404', async () => {
      mockFetchJson({}, 404);
      await expect(getDelegateTask(CONFIG, 'missing')).rejects.toThrow(/getDelegateTask failed: 404/);
    });
  });

  describe('createDelegateTask', () => {
    it('POSTs task body', async () => {
      const spy = mockFetchJson({ data: { id: 't9', title: 'New', status: 'OPEN' }, success: true });
      await createDelegateTask(CONFIG, { title: 'New', priority: 'HIGH' });
      const init = spy.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify({ title: 'New', priority: 'HIGH' }));
    });

    it('throws on 400', async () => {
      mockFetchJson({}, 400);
      await expect(createDelegateTask(CONFIG, { title: '' })).rejects.toThrow(/createDelegateTask failed: 400/);
    });
  });

  describe('updateDelegateTask', () => {
    it('PATCHes with partial body', async () => {
      const spy = mockFetchJson({ data: { id: 't1', title: 'Fix', status: 'DONE' }, success: true });
      await updateDelegateTask(CONFIG, 't1', { status: 'DONE' });
      const init = spy.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('PATCH');
      expect(init.body).toBe(JSON.stringify({ status: 'DONE' }));
    });

    it('throws on 403', async () => {
      mockFetchJson({}, 403);
      await expect(updateDelegateTask(CONFIG, 't1', { status: 'DONE' })).rejects.toThrow(
        /updateDelegateTask failed: 403/,
      );
    });
  });

  describe('deleteDelegateTask', () => {
    it('DELETEs with auth header', async () => {
      const spy = mockFetchJson({ success: true });
      const result = await deleteDelegateTask(CONFIG, 't1');
      const init = spy.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('DELETE');
      expect(result).toEqual({ ok: true });
    });

    it('throws on 500', async () => {
      mockFetchJson({}, 500);
      await expect(deleteDelegateTask(CONFIG, 't1')).rejects.toThrow(/deleteDelegateTask failed: 500/);
    });
  });

  describe('listTaskComments', () => {
    it('fetches comments array', async () => {
      const spy = mockFetchJson({
        data: [{ id: 'c1', body: 'hi', createdAt: 't' }],
        success: true,
      });
      const result = await listTaskComments(CONFIG, 't1');
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/tasks/t1/comments');
      expect(result.comments).toHaveLength(1);
    });

    it('throws on 404', async () => {
      mockFetchJson({}, 404);
      await expect(listTaskComments(CONFIG, 't1')).rejects.toThrow(/listTaskComments failed: 404/);
    });
  });

  describe('addTaskComment', () => {
    it('POSTs body and returns comment', async () => {
      const spy = mockFetchJson({ data: { id: 'c9', body: 'new', createdAt: 't' }, success: true });
      await addTaskComment(CONFIG, 't1', 'new');
      const init = spy.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify({ body: 'new' }));
    });

    it('throws on 400', async () => {
      mockFetchJson({}, 400);
      await expect(addTaskComment(CONFIG, 't1', '')).rejects.toThrow(/addTaskComment failed: 400/);
    });
  });

  describe('listTaskSubtasks', () => {
    it('GETs subtasks endpoint', async () => {
      const spy = mockFetchJson({ data: [{ id: 's1', title: 'step', done: false }], success: true });
      const result = await listTaskSubtasks(CONFIG, 't1');
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/tasks/t1/subtasks');
      expect(result.subtasks).toHaveLength(1);
    });

    it('throws on 500', async () => {
      mockFetchJson({}, 500);
      await expect(listTaskSubtasks(CONFIG, 't1')).rejects.toThrow(/listTaskSubtasks failed: 500/);
    });
  });

  describe('startTaskWorkflow', () => {
    it('POSTs empty body to workflow/start', async () => {
      const spy = mockFetchJson({ data: { ok: true, workflowId: 'wf-1' }, success: true });
      const result = await startTaskWorkflow(CONFIG, 't1');
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/tasks/t1/workflow/start');
      expect(result.workflowId).toBe('wf-1');
    });

    it('throws on 409', async () => {
      mockFetchJson({}, 409);
      await expect(startTaskWorkflow(CONFIG, 't1')).rejects.toThrow(/startTaskWorkflow failed: 409/);
    });
  });

  describe('enhanceTaskDraft', () => {
    it('POSTs draft to /api/tasks/enhance/draft and returns parsed payload', async () => {
      const spy = mockFetchJson({
        data: {
          enhancedDescription: 'expanded body',
          newSubtasks: ['a', 'b'],
          relevantKnowledge: [{ id: 'k1', title: 'Docs' }],
        },
        success: true,
      });
      const result = await enhanceTaskDraft(CONFIG, { title: 'Fix bug', description: 'short' });
      expect(spy.mock.calls[0][0]).toBe('https://delegate.test/api/tasks/enhance/draft');
      const init = spy.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify({ title: 'Fix bug', description: 'short' }));
      expect(result.newSubtasks).toEqual(['a', 'b']);
      expect(result.relevantKnowledge).toHaveLength(1);
    });

    it('throws on 400', async () => {
      mockFetchJson({}, 400);
      await expect(enhanceTaskDraft(CONFIG, { title: '' })).rejects.toThrow(
        /enhanceTaskDraft failed: 400/,
      );
    });
  });
});
