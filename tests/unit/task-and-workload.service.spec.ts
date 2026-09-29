jest.mock('../../config/database');

import { getPrismaClient } from '../../config/database';
import {
  completeTask,
  createTask,
  listForBrokers,
  listMyTasks,
  overdueCountByBroker,
} from '../../modules/crm/task.service';
import { teamWorkload } from '../../modules/crm/workload.service';

const mockPrisma = {
  task: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  lead: { groupBy: jest.fn() },
};

beforeEach(() => {
  jest.clearAllMocks();
  (getPrismaClient as jest.Mock).mockReturnValue(mockPrisma);
});

const TENANT = 'tenant-1';

describe('completeTask', () => {
  it('404s a task outside the tenant entirely', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: 't1',
      tenantId: 'other-tenant',
      brokerUserId: 'me',
    });
    await expect(completeTask(TENANT, 'me', 't1')).rejects.toMatchObject({ statusCode: 404 });
    expect(mockPrisma.task.update).not.toHaveBeenCalled();
  });

  it('403s a task in-tenant but belonging to a different broker — "You don\'t have access to this record"', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: 't1',
      tenantId: TENANT,
      brokerUserId: 'someone-else',
    });
    await expect(completeTask(TENANT, 'me', 't1')).rejects.toMatchObject({
      statusCode: 403,
      message: "You don't have access to this record",
    });
    expect(mockPrisma.task.update).not.toHaveBeenCalled();
  });

  it("marks the caller's own task complete", async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: 't1',
      tenantId: TENANT,
      brokerUserId: 'me',
    });
    mockPrisma.task.update.mockResolvedValue({ id: 't1', completed: true });
    const result = await completeTask(TENANT, 'me', 't1');
    expect(result.completed).toBe(true);
  });
});

describe('overdueCountByBroker', () => {
  it('shows a broker with no overdue tasks as 0, not omitted', async () => {
    mockPrisma.task.findMany.mockResolvedValue([{ brokerUserId: 'b1' }, { brokerUserId: 'b1' }]);
    const counts = await overdueCountByBroker(TENANT, ['b1', 'b2']);
    expect(counts).toEqual({ b1: 2, b2: 0 });
  });
});

describe('teamWorkload — "a broker with nothing assigned is shown as empty rather than hidden"', () => {
  it('returns one row per team member even when a broker has zero of everything', async () => {
    mockPrisma.lead.groupBy.mockResolvedValue([{ brokerUserId: 'b1', _count: 4 }]);
    mockPrisma.task.findMany.mockResolvedValue([{ brokerUserId: 'b1' }]);

    const workload = await teamWorkload(TENANT, [
      { userId: 'b1', name: 'Bob' },
      { userId: 'b2', name: 'Nobody Assigned' },
    ]);

    expect(workload).toHaveLength(2);
    const b2 = workload.find((w) => w.brokerUserId === 'b2')!;
    expect(b2).toMatchObject({
      openLeads: 0,
      overdueTasks: 0,
      renewalsWithin90Days: 0,
      missingDocuments: 0,
    });
    const b1 = workload.find((w) => w.brokerUserId === 'b1')!;
    expect(b1).toMatchObject({ openLeads: 4, overdueTasks: 1 });
  });
});

describe('createTask', () => {
  it('always creates the task against the caller, converting dueDate to a real Date', async () => {
    mockPrisma.task.create.mockResolvedValue({ id: 't1' });
    await createTask(TENANT, 'me', { title: 'Follow up', dueDate: '2026-10-01T00:00:00.000Z' });
    const arg = mockPrisma.task.create.mock.calls[0][0];
    expect(arg.data).toMatchObject({ tenantId: TENANT, brokerUserId: 'me', title: 'Follow up' });
    expect(arg.data.dueDate).toBeInstanceOf(Date);
  });

  it('leaves dueDate null when none is given', async () => {
    mockPrisma.task.create.mockResolvedValue({ id: 't1' });
    await createTask(TENANT, 'me', { title: 'No date task' });
    expect(mockPrisma.task.create.mock.calls[0][0].data.dueDate).toBeNull();
  });
});

describe('listMyTasks', () => {
  it("scopes to the caller's own tenant and broker id", async () => {
    mockPrisma.task.findMany.mockResolvedValue([]);
    await listMyTasks(TENANT, 'me');
    expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: TENANT, brokerUserId: 'me' } }),
    );
  });
});

describe('listForBrokers — "Team tasks"', () => {
  it('returns nothing without hitting the DB when the team has no brokers', async () => {
    const tasks = await listForBrokers(TENANT, []);
    expect(tasks).toEqual([]);
    expect(mockPrisma.task.findMany).not.toHaveBeenCalled();
  });

  it('lists tasks for every broker on the team', async () => {
    mockPrisma.task.findMany.mockResolvedValue([{ id: 't1' }]);
    const tasks = await listForBrokers(TENANT, ['b1', 'b2']);
    expect(tasks).toHaveLength(1);
    expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: TENANT, brokerUserId: { in: ['b1', 'b2'] } } }),
    );
  });
});
