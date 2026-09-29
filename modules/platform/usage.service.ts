import { recordActivity } from './activity-log';
import { AI_COST_METRIC } from './ai-cost-limit-provider';
import { getGenUsg } from './gen-usg.client';
import type { BrokerageUsageStatus, UsageOutcome } from './usage.types';
import { getPrismaClient } from '../../config/database';

function endOfUtcDay(): Date {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * "Has this brokerage hit its daily cost limit?" — delta=0 reads current
 * status without recording any usage (recording happens separately,
 * wherever the platform's real AI features call simulateUsage/increment).
 */
export async function getUsageStatus(tenantId: string): Promise<BrokerageUsageStatus> {
  const genUsg = await getGenUsg();
  const result = await genUsg.check(tenantId, AI_COST_METRIC, 0);
  const override = await getPrismaClient().aiCostLimitOverride.findUnique({ where: { tenantId } });
  const overrideActive = override !== null && override.expiresAt > new Date();

  return {
    metric: AI_COST_METRIC,
    outcome: result.outcome as UsageOutcome,
    paused: !result.allowed,
    current: result.current,
    limit: result.limit,
    pct: result.pct,
    overrideExpiresAt: overrideActive ? override.expiresAt.toISOString() : null,
  };
}

/**
 * "Allow extra for today" — resets by itself tomorrow, since expiresAt is
 * just today's end.
 *
 * ponytail: gen-usg-starter's own CheckService caches resolved limits for
 * limitCacheTtlSec (default 300s), so a still-blocked broker may need up to
 * 5 minutes after this call before check() actually sees the raised limit —
 * confirmed by an actual test (immediately re-checking right after this call
 * still showed BLOCK). Not fixed here: gen-usg-starter exposes no
 * cache-invalidation hook, and reaching into its Redis key format directly
 * would depend on an internal implementation detail (see AI_COST_METRIC's
 * own port comment for the same tradeoff elsewhere). Upgrade path if the
 * delay ever matters: a public invalidateLimitCache(tenantId, metric) on
 * gen-usg-starter's own CheckService.
 */
export async function allowExtraToday(tenantId: string): Promise<BrokerageUsageStatus> {
  await getPrismaClient().aiCostLimitOverride.upsert({
    where: { tenantId },
    create: { tenantId, expiresAt: endOfUtcDay() },
    update: { expiresAt: endOfUtcDay() },
  });
  await recordActivity('platform.usage.extra_allowed_for_today', { targetType: 'tenant', targetId: tenantId });
  return getUsageStatus(tenantId);
}

/**
 * Not part of the diagram — a way to actually drive a brokerage's usage up
 * in a demo/test without a real AI feature wired to Gen_USG's increment()
 * yet. Kept here rather than skipped, since otherwise the "AI paused" state
 * this module implements can never actually be exercised end to end.
 */
export async function simulateUsage(tenantId: string, deltaUsdCents: number): Promise<BrokerageUsageStatus> {
  const genUsg = await getGenUsg();
  await genUsg.increment({ tenantId, metric: AI_COST_METRIC, delta: deltaUsdCents });
  return getUsageStatus(tenantId);
}
