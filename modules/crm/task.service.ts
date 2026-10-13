import { getLeadWithAccess } from './lead.service';
import { getPrismaClient } from '../../config/database';
import { ApiError } from '../../utils/api-error';
import { recordActivity } from '../platform/activity-log';

export interface CreateTaskInput {
  title: string;
  leadId?: string;
  dueDate?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export async function createTask(tenantId: string, brokerUserId: string, input: CreateTaskInput) {
  return getPrismaClient().task.create({
    data: {
      tenantId,
      brokerUserId,
      title: input.title,
      leadId: input.leadId,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      priority: input.priority,
    },
  });
}

export async function listMyTasks(tenantId: string, brokerUserId: string) {
  return getPrismaClient().task.findMany({
    where: { tenantId, brokerUserId },
    orderBy: { dueDate: 'asc' },
  });
}

/** Same 404-vs-403 split as lead.service.ts's getLeadWithAccess: not-in-tenant is 404, someone else's is 403. */
async function requireOwnTask(tenantId: string, brokerUserId: string, taskId: string) {
  const task = await getPrismaClient().task.findUnique({ where: { id: taskId } });
  if (!task || task.tenantId !== tenantId) {
    throw new ApiError('Task not found', 404);
  }
  if (task.brokerUserId !== brokerUserId) {
    throw new ApiError("You don't have access to this record", 403);
  }
  return task;
}

async function requireOwnSuggestedTask(tenantId: string, brokerUserId: string, taskId: string) {
  const task = await requireOwnTask(tenantId, brokerUserId, taskId);
  if (!task.suggested) {
    throw new ApiError('Only a suggested task can be approved', 409);
  }
  return task;
}

export async function completeTask(tenantId: string, brokerUserId: string, taskId: string) {
  const task = await requireOwnTask(tenantId, brokerUserId, taskId);
  if (task.suggested) {
    throw new ApiError('Approve this suggested task before completing it', 409);
  }
  const done = await getPrismaClient().task.update({
    where: { id: taskId },
    data: { completed: true },
  });
  // Flow 4.9 "Tick to complete — stays on the person's timeline" (the panel's Activity tab).
  if (task.leadId) {
    await recordActivity('crm.task.completed', {
      actorId: brokerUserId,
      targetType: 'lead',
      targetId: task.leadId,
      metadata: { taskId: task.id, title: task.title },
    });
  }
  return done;
}

/** Flow 4.9 "Approve — becomes a real task". */
export async function approveSuggestedTask(tenantId: string, brokerUserId: string, taskId: string) {
  await requireOwnSuggestedTask(tenantId, brokerUserId, taskId);
  return getPrismaClient().task.update({ where: { id: taskId }, data: { suggested: false } });
}

/**
 * Flow 4.9: "Dismiss — disappears" for a suggested task, and "reassign it or
 * delete it" for one left unlinked by a deleted person. A real, linked task
 * isn't deletable — it's completed, and "stays on the person's timeline".
 */
export async function deleteTask(tenantId: string, brokerUserId: string, taskId: string) {
  const task = await requireOwnTask(tenantId, brokerUserId, taskId);
  if (!task.suggested && !task.unlinked) {
    throw new ApiError('Only a suggested or unlinked task can be deleted', 409);
  }
  await getPrismaClient().task.delete({ where: { id: taskId } });
}

/** Flow 4.9 unlinked task → "reassign it" to another person in the caller's book. */
export async function linkTask(
  tenantId: string,
  brokerUserId: string,
  taskId: string,
  leadId: string,
  allowedBrokerIds: string[],
) {
  await requireOwnTask(tenantId, brokerUserId, taskId);
  const lead = await getLeadWithAccess(tenantId, leadId, allowedBrokerIds);
  return getPrismaClient().task.update({
    where: { id: taskId },
    data: { leadId: lead.id, unlinked: false },
  });
}

/** "Team tasks" — every task belonging to any broker on the team. */
export async function listForBrokers(tenantId: string, brokerIds: string[]) {
  if (brokerIds.length === 0) return [];
  return getPrismaClient().task.findMany({
    where: { tenantId, brokerUserId: { in: brokerIds } },
    orderBy: { dueDate: 'asc' },
  });
}

/** Overdue-task count per broker — for the "overdue tasks" dashboard widget and the workload view. */
export async function overdueCountByBroker(
  tenantId: string,
  brokerIds: string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = Object.fromEntries(brokerIds.map((id) => [id, 0]));
  if (brokerIds.length === 0) return counts;
  const overdue = await getPrismaClient().task.findMany({
    where: {
      tenantId,
      brokerUserId: { in: brokerIds },
      completed: false,
      suggested: false,
      dueDate: { lt: new Date() },
    },
    select: { brokerUserId: true },
  });
  for (const row of overdue) counts[row.brokerUserId] = (counts[row.brokerUserId] ?? 0) + 1;
  return counts;
}
