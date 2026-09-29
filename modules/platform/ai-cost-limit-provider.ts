import { getPrismaClient } from '../../config/database';
import { env } from '../../config/env';

export const AI_COST_METRIC = 'ai_cost_daily';

/**
 * Gen_USG's ILimitProvider (structurally typed — see gen-usg.client.ts for
 * why this isn't imported as a static type from the package). A single
 * global default limit for every brokerage (AI_COST_DAILY_LIMIT) unless
 * AiCostLimitOverride has an unexpired row for that tenant, in which case
 * the higher AI_COST_OVERRIDE_LIMIT applies instead — that's the entire
 * "Allow extra for today" mechanism: see usage.service.ts's allowExtraToday
 * for where the override row gets written, and it needs no explicit
 * clear/reset step, because an expired row is simply ignored here.
 */
export const aiCostLimitProvider = {
  async getLimits(tenantId: string): Promise<Record<string, number>> {
    const override = await getPrismaClient().aiCostLimitOverride.findUnique({ where: { tenantId } });
    const hasActiveOverride = override !== null && override.expiresAt > new Date();
    return {
      [AI_COST_METRIC]: hasActiveOverride ? env.platform.aiCostOverrideLimit : env.platform.aiCostDailyLimit,
    };
  },
};
