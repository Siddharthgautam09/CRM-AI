jest.mock('../../config/database');

import { getPrismaClient } from '../../config/database';
import { completeTask, overdueCountByBroker } from '../../modules/crm/task.service';
import { teamWorkload } from '../../modules/crm/workload.service';

const mockPrisma = {
  task: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  lead: { groupBy: jest.fn() },
};

beforeEach(() => {
  jest.clearAllMocks();
  (getPrismaClient as jest.Mock).mockReturnValue(mockPrisma);
});

const TENANT = 'tenant-1';

describe('completeTask', () => {
  it('404s a task belonging to a different broker', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: 't1',
      tenantId: TENANT,
      brokerUserId: 'someone-else',
    });
    await expect(completeTask(TENANT, 'me', 't1')).rejects.toMatchObject({ statusCode: 404 });
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
