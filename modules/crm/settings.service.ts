import { getPrismaClient } from '../../config/database';

/** Flow 4.12 Settings — per-user CRM preferences. No row yet means the defaults. */
export async function getSettings(userId: string) {
  const row = await getPrismaClient().crmUserSettings.findUnique({ where: { userId } });
  return { aiEnabled: row?.aiEnabled ?? true };
}

/** "AI features on or off" — switched off, every AI endpoint refuses (ai-review.service.ts) and the frontend hides its buttons. */
export async function updateSettings(
  tenantId: string,
  userId: string,
  input: { aiEnabled: boolean },
) {
  const row = await getPrismaClient().crmUserSettings.upsert({
    where: { userId },
    create: { userId, tenantId, aiEnabled: input.aiEnabled },
    update: { aiEnabled: input.aiEnabled },
  });
  return { aiEnabled: row.aiEnabled };
}
