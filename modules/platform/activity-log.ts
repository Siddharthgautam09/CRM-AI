import { getPrismaClient } from '../../config/database';

/** Structurally matches @gen-ms/gen-sup-starter's EventPublisher port — see brokerage.service.ts. */
export interface EventEnvelope {
  event_type: string;
  occurred_at: string;
  tenant_id: string;
  data: Record<string, unknown>;
}

export interface EventPublisher {
  publish(exchange: string, routingKey: string, envelope: EventEnvelope): Promise<void>;
}

/**
 * Deliberately simple: a row in this app's own Postgres, not the full
 * Gen_Audit hash-chained ledger service (its own Postgres + Mongo + RabbitMQ
 * + S3 — a lot of extra infra for what the "Activity log" screen needs right
 * now). Implements gen-sup-starter's own EventPublisher port so
 * TenantsService's audit events land here with zero changes to that library
 * code — swappable for a real Gen_Audit/RabbitMQ publisher later without
 * touching TenantsService or this shape.
 */
export const activityLogEventPublisher: EventPublisher = {
  async publish(_exchange, routingKey, envelope) {
    await getPrismaClient().activityLog.create({
      data: {
        action: routingKey,
        targetType: 'tenant',
        targetId: envelope.tenant_id,
        metadata: envelope.data as never,
      },
    });
  },
};

/** For events outside gen-sup-starter's own routingKey vocabulary (AI-cost overrides, exports, ...). */
export async function recordActivity(
  action: string,
  opts: { actorId?: string; targetType?: string; targetId?: string; metadata?: Record<string, unknown> } = {},
): Promise<void> {
  await getPrismaClient().activityLog.create({
    data: {
      action,
      actorId: opts.actorId ?? null,
      targetType: opts.targetType ?? null,
      targetId: opts.targetId ?? null,
      metadata: (opts.metadata ?? undefined) as never,
    },
  });
}
