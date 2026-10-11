jest.mock('../../config/database');
jest.mock('../../modules/crm/lead.service', () => ({
  ...jest.requireActual('../../modules/crm/lead.service'),
  getLeadWithAccess: jest.fn(),
}));

import { getPrismaClient } from '../../config/database';
import {
  computeAffordability,
  getAffordability,
  recalculateForBook,
} from '../../modules/crm/affordability.service';
import { getLeadWithAccess } from '../../modules/crm/lead.service';

const mockPrisma = {
  lead: { findMany: jest.fn(), update: jest.fn() },
};

beforeEach(() => {
  jest.clearAllMocks();
  (getPrismaClient as jest.Mock).mockReturnValue(mockPrisma);
});

const TENANT = 'tenant-1';

describe('computeAffordability — "Enough information to calculate?"', () => {
  it('flags missing income and monthlyDebts, computing nothing', () => {
    const result = computeAffordability({
      income: null,
      monthlyDebts: null,
      downPayment: null,
      propertyValue: null,
    });
    expect(result.sufficientData).toBe(false);
    expect(result.missingFields).toEqual(['income', 'monthlyDebts']);
    expect(result.tds).toBeNull();
    expect(result.maxPurchasePrice).toBeNull();
  });

  it('treats 0 monthlyDebts as provided, not missing', () => {
    const result = computeAffordability({
      income: 120000,
      monthlyDebts: 0,
      downPayment: 50000,
      propertyValue: null,
    });
    expect(result.sufficientData).toBe(true);
    expect(result.maxPurchasePrice).toBeGreaterThan(0);
  });

  it('computes a maximum purchase price without a chosen property', () => {
    const result = computeAffordability({
      income: 120000,
      monthlyDebts: 500,
      downPayment: 50000,
      propertyValue: null,
    });
    expect(result.sufficientData).toBe(true);
    expect(result.tds).toBeNull(); // no property chosen yet
    expect(result.passing).toBeNull();
    expect(result.maxPurchasePrice).toBeGreaterThan(50000);
  });

  it('passes a well-affordable property and shows no overBy reason', () => {
    const result = computeAffordability({
      income: 200000,
      monthlyDebts: 200,
      downPayment: 100000,
      propertyValue: 300000,
    });
    expect(result.passing).toBe(true);
    expect(result.overBy).toBeNull();
    expect(result.tds).not.toBeNull();
    expect(result.tds!).toBeLessThanOrEqual(44);
  });

  it('fails an unaffordable property and names tds as the figure that caused it', () => {
    const result = computeAffordability({
      income: 40000,
      monthlyDebts: 1000,
      downPayment: 10000,
      propertyValue: 900000,
    });
    expect(result.passing).toBe(false);
    expect(result.overBy).toEqual({ field: 'tds', excessPercent: expect.any(Number) });
    expect(result.overBy!.excessPercent).toBeGreaterThan(0);
  });

  it('uses at least the benchmark qualifying rate even for a low assumed rate', () => {
    const result = computeAffordability(
      { income: 120000, monthlyDebts: 0, downPayment: 50000, propertyValue: null },
      1,
    );
    expect(result.stressTestRate).toBeGreaterThanOrEqual(5.25);
  });
});

describe('getAffordability', () => {
  it('checks access before computing', async () => {
    (getLeadWithAccess as jest.Mock).mockResolvedValue({
      income: 120000,
      monthlyDebts: 500,
      downPayment: 50000,
      propertyValue: 400000,
    });
    const result = await getAffordability(TENANT, 'lead-1', ['me']);
    expect(getLeadWithAccess).toHaveBeenCalledWith(TENANT, 'lead-1', ['me']);
    expect(result.sufficientData).toBe(true);
  });
});

describe('recalculateForBook — "Recalculate everyone"', () => {
  it('reports partial failure and only persists leads with enough data', async () => {
    mockPrisma.lead.findMany.mockResolvedValue([
      {
        id: 'lead-1',
        name: 'Has data',
        income: 120000,
        monthlyDebts: 500,
        downPayment: 50000,
        propertyValue: 400000,
      },
      {
        id: 'lead-2',
        name: 'Missing income',
        income: null,
        monthlyDebts: 500,
        downPayment: 0,
        propertyValue: null,
      },
    ]);
    mockPrisma.lead.update.mockResolvedValue({});

    const summary = await recalculateForBook(TENANT, ['me']);

    expect(summary.total).toBe(2);
    expect(summary.succeeded).toBe(1);
    expect(summary.failures).toEqual([
      { leadId: 'lead-2', name: 'Missing income', reason: 'Missing income' },
    ]);
    expect(mockPrisma.lead.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'lead-1' } }),
    );
  });

  it('returns immediately without querying when the book has no brokers', async () => {
    const summary = await recalculateForBook(TENANT, []);
    expect(summary).toEqual({ total: 0, succeeded: 0, failures: [] });
    expect(mockPrisma.lead.findMany).not.toHaveBeenCalled();
  });

  it('scopes to only the given leadIds when retrying just the failures', async () => {
    mockPrisma.lead.findMany.mockResolvedValue([]);
    await recalculateForBook(TENANT, ['me'], ['lead-2']);
    expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ['lead-2'] } }),
      }),
    );
  });
});
