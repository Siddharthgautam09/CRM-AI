jest.mock('../../modules/platform/activity-log');
jest.mock('../../config/database');

import { getPrismaClient } from '../../config/database';
import {
  createLead,
  getLeadWithAccess,
  listForBrokers,
  listMyLeads,
  openLeadCountByBroker,
  pipelineCounts,
  reassign,
  updateStage,
} from '../../modules/crm/lead.service';
import { recordActivity } from '../../modules/platform/activity-log';

const mockPrisma = {
  lead: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn(),
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  (getPrismaClient as jest.Mock).mockReturnValue(mockPrisma);
});

const TENANT = 'tenant-1';

describe('getLeadWithAccess', () => {
  it('404s a lead from another tenant', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      tenantId: 'other-tenant',
      brokerUserId: 'b1',
    });
    await expect(getLeadWithAccess(TENANT, 'lead-1', ['b1'])).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('403s a lead outside the allowed broker set — "You don\'t have access to this record"', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      tenantId: TENANT,
      brokerUserId: 'someone-else',
    });
    await expect(getLeadWithAccess(TENANT, 'lead-1', ['b1'])).rejects.toMatchObject({
      statusCode: 403,
      message: "You don't have access to this record",
    });
  });

  it('allows a lead whose broker is in the allowed set', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      tenantId: TENANT,
      brokerUserId: 'b1',
    });
    const lead = await getLeadWithAccess(TENANT, 'lead-1', ['b1', 'b2']);
    expect(lead.id).toBe('lead-1');
  });
});

describe('updateStage — "Change the stage to Lost"', () => {
  it('requires a reason when moving to LOST', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      tenantId: TENANT,
      brokerUserId: 'b1',
    });
    await expect(updateStage(TENANT, 'lead-1', ['b1'], 'LOST')).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(mockPrisma.lead.update).not.toHaveBeenCalled();
  });

  it('clears any stale lostReason when moving off LOST', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      tenantId: TENANT,
      brokerUserId: 'b1',
    });
    mockPrisma.lead.update.mockResolvedValue({});
    await updateStage(TENANT, 'lead-1', ['b1'], 'QUALIFIED');
    expect(mockPrisma.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: { stage: 'QUALIFIED', lostReason: null },
    });
  });
});

describe('reassign — "Reassign to another broker"', () => {
  it('reassigns when the target broker is inside the team, and records it', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      tenantId: TENANT,
      brokerUserId: 'b1',
    });
    mockPrisma.lead.update.mockResolvedValue({ id: 'lead-1', brokerUserId: 'b2' });

    const result = await reassign(TENANT, 'lead-1', ['b1', 'b2'], 'b2', 'team-lead-1');

    expect(result.brokerUserId).toBe('b2');
    expect(recordActivity).toHaveBeenCalledWith(
      'crm.lead.reassigned',
      expect.objectContaining({ actorId: 'team-lead-1', targetId: 'lead-1' }),
    );
  });

  it('refuses a target broker outside the team — "Not selectable"', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      tenantId: TENANT,
      brokerUserId: 'b1',
    });

    await expect(
      reassign(TENANT, 'lead-1', ['b1', 'b2'], 'outsider', 'team-lead-1'),
    ).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(mockPrisma.lead.update).not.toHaveBeenCalled();
    expect(recordActivity).not.toHaveBeenCalled();
  });

  it('refuses to reassign a lead the caller cannot access in the first place', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      tenantId: TENANT,
      brokerUserId: 'outside-the-team',
    });

    await expect(
      reassign(TENANT, 'lead-1', ['b1', 'b2'], 'b2', 'team-lead-1'),
    ).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});

describe('pipelineCounts — "Team pipeline"', () => {
  it('returns every stage at 0 when the team has no leads', async () => {
    const counts = await pipelineCounts(TENANT, []);
    expect(counts).toEqual({
      NEW: 0,
      QUALIFIED: 0,
      APPLICATION: 0,
      UNDERWRITING: 0,
      APPROVED: 0,
      FUNDED: 0,
      LOST: 0,
    });
    expect(mockPrisma.lead.groupBy).not.toHaveBeenCalled();
  });

  it('fills in real counts per stage, leaving untouched stages at 0', async () => {
    mockPrisma.lead.groupBy.mockResolvedValue([
      { stage: 'NEW', _count: 3 },
      { stage: 'FUNDED', _count: 1 },
    ]);
    const counts = await pipelineCounts(TENANT, ['b1', 'b2']);
    expect(counts.NEW).toBe(3);
    expect(counts.FUNDED).toBe(1);
    expect(counts.LOST).toBe(0);
  });
});

describe('openLeadCountByBroker — workload view input', () => {
  it('shows a broker with nothing assigned as 0, not omitted', async () => {
    mockPrisma.lead.groupBy.mockResolvedValue([{ brokerUserId: 'b1', _count: 2 }]);
    const counts = await openLeadCountByBroker(TENANT, ['b1', 'b2']);
    expect(counts).toEqual({ b1: 2, b2: 0 });
  });
});

describe('listForBrokers — "Team book"', () => {
  it('returns nothing without hitting the DB when the team has no brokers', async () => {
    const leads = await listForBrokers(TENANT, []);
    expect(leads).toEqual([]);
    expect(mockPrisma.lead.findMany).not.toHaveBeenCalled();
  });
});

describe('createLead — "New client"', () => {
  it('always creates the lead against the caller, never an arbitrary broker', async () => {
    mockPrisma.lead.create.mockResolvedValue({ id: 'lead-1' });
    await createLead(TENANT, 'me', { name: 'Jamie Rivera', email: 'jamie@example.com' });
    expect(mockPrisma.lead.create).toHaveBeenCalledWith({
      data: {
        tenantId: TENANT,
        brokerUserId: 'me',
        name: 'Jamie Rivera',
        email: 'jamie@example.com',
        phone: undefined,
      },
    });
  });
});

describe('listMyLeads', () => {
  it("scopes to the caller's own tenant and broker id", async () => {
    mockPrisma.lead.findMany.mockResolvedValue([]);
    await listMyLeads(TENANT, 'me');
    expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: TENANT, brokerUserId: 'me' } }),
    );
  });
});
