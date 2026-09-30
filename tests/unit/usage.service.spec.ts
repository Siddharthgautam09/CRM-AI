import { getPrismaClient } from '../../config/database';
import { recordActivity } from '../../modules/platform/activity-log';
import { getGenUsg } from '../../modules/platform/gen-usg.client';
import {
  allowExtraToday,
  getUsageStatus,
  simulateUsage,
} from '../../modules/platform/usage.service';

jest.mock('../../modules/platform/gen-usg.client');
jest.mock('../../modules/platform/activity-log');
jest.mock('../../config/database');

const mockGenUsg = { check: jest.fn(), increment: jest.fn() };
const mockPrisma = {
  aiCostLimitOverride: { findUnique: jest.fn(), upsert: jest.fn() },
};

beforeEach(() => {
  (getGenUsg as jest.Mock).mockResolvedValue(mockGenUsg);
  (getPrismaClient as jest.Mock).mockReturnValue(mockPrisma);
});

describe('getUsageStatus — "Has a brokerage hit its daily cost limit?"', () => {
  it('reports paused=true when Gen_USG denies further usage', async () => {
    mockGenUsg.check.mockResolvedValue({
      allowed: false,
      outcome: 'BLOCK',
      current: 1200,
      limit: 1000,
      pct: 120,
    });
    mockPrisma.aiCostLimitOverride.findUnique.mockResolvedValue(null);

    const status = await getUsageStatus('tenant-1');

    expect(mockGenUsg.check).toHaveBeenCalledWith('tenant-1', 'ai_cost_daily', 0);
    expect(status.paused).toBe(true);
    expect(status.overrideExpiresAt).toBeNull();
  });

  it('reports the normal view when under the limit', async () => {
    mockGenUsg.check.mockResolvedValue({
      allowed: true,
      outcome: 'OK',
      current: 100,
      limit: 1000,
      pct: 10,
    });
    mockPrisma.aiCostLimitOverride.findUnique.mockResolvedValue(null);

    const status = await getUsageStatus('tenant-1');

    expect(status.paused).toBe(false);
  });

  it('surfaces an unexpired override as still active', async () => {
    mockGenUsg.check.mockResolvedValue({
      allowed: true,
      outcome: 'OK',
      current: 100,
      limit: 5000,
      pct: 2,
    });
    const future = new Date(Date.now() + 60_000);
    mockPrisma.aiCostLimitOverride.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
      expiresAt: future,
    });

    const status = await getUsageStatus('tenant-1');

    expect(status.overrideExpiresAt).toBe(future.toISOString());
  });

  it('ignores an already-expired override row', async () => {
    mockGenUsg.check.mockResolvedValue({
      allowed: false,
      outcome: 'BLOCK',
      current: 1200,
      limit: 1000,
      pct: 120,
    });
    const past = new Date(Date.now() - 60_000);
    mockPrisma.aiCostLimitOverride.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
      expiresAt: past,
    });

    const status = await getUsageStatus('tenant-1');

    expect(status.overrideExpiresAt).toBeNull();
  });
});

describe('allowExtraToday — resets by itself tomorrow', () => {
  it('upserts an override expiring at the end of today (UTC) and records the activity', async () => {
    mockPrisma.aiCostLimitOverride.upsert.mockResolvedValue({});
    mockGenUsg.check.mockResolvedValue({
      allowed: true,
      outcome: 'OK',
      current: 100,
      limit: 5000,
      pct: 2,
    });
    mockPrisma.aiCostLimitOverride.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
      expiresAt: new Date(Date.now() + 1000),
    });

    await allowExtraToday('tenant-1');

    expect(mockPrisma.aiCostLimitOverride.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 'tenant-1' } }),
    );
    const upsertArg = mockPrisma.aiCostLimitOverride.upsert.mock.calls[0][0];
    const createdExpiry: Date = upsertArg.create.expiresAt;
    expect(createdExpiry.getUTCHours()).toBe(23);
    expect(createdExpiry.getUTCMinutes()).toBe(59);
    expect(recordActivity).toHaveBeenCalledWith(
      'platform.usage.extra_allowed_for_today',
      expect.objectContaining({ targetId: 'tenant-1' }),
    );
  });

  it('returns the refreshed status (AI works again) after overriding', async () => {
    mockPrisma.aiCostLimitOverride.upsert.mockResolvedValue({});
    mockGenUsg.check.mockResolvedValue({
      allowed: true,
      outcome: 'OK',
      current: 100,
      limit: 5000,
      pct: 2,
    });
    mockPrisma.aiCostLimitOverride.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
      expiresAt: new Date(Date.now() + 1000),
    });

    const status = await allowExtraToday('tenant-1');

    expect(status.paused).toBe(false);
  });
});

describe('simulateUsage — demo/test-only usage driver', () => {
  it('increments Gen_USG then returns the resulting status', async () => {
    mockGenUsg.increment.mockResolvedValue(undefined);
    mockGenUsg.check.mockResolvedValue({
      allowed: false,
      outcome: 'BLOCK',
      current: 1500,
      limit: 1000,
      pct: 150,
    });
    mockPrisma.aiCostLimitOverride.findUnique.mockResolvedValue(null);

    const status = await simulateUsage('tenant-1', 1500);

    expect(mockGenUsg.increment).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      metric: 'ai_cost_daily',
      delta: 1500,
    });
    expect(status.outcome).toBe('BLOCK');
  });
});
