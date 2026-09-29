import { getPrismaClient } from '../../config/database';
import { ApiError } from '../../utils/api-error';

export interface CreateTaskInput {
  title: string;
  leadId?: string;
  dueDate?: string;
}

export async function createTask(tenantId: string, brokerUserId: string, input: CreateTaskInput) {
  return getPrismaClient().task.create({
    data: {
      tenantId,
      brokerUserId,
      title: input.title,
      leadId: input.leadId,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
    },
  });
}

export async function listMyTasks(tenantId: string, brokerUserId: string) {
  return getPrismaClient().task.findMany({
    where: { tenantId, brokerUserId },
    orderBy: { dueDate: 'asc' },
  });
}

export async function completeTask(tenantId: string, brokerUserId: string, taskId: string) {
  const task = await getPrismaClient().task.findUnique({ where: { id: taskId } });
  if (!task || task.tenantId !== tenantId || task.brokerUserId !== brokerUserId) {
    throw new ApiError('Task not found', 404);
  }
  return getPrismaClient().task.update({ where: { id: taskId }, data: { completed: true } });
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
      dueDate: { lt: new Date() },
    },
    select: { brokerUserId: true },
  });
  for (const row of overdue) counts[row.brokerUserId] = (counts[row.brokerUserId] ?? 0) + 1;
  return counts;
}
