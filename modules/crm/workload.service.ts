import { openLeadCountByBroker } from './lead.service';
import { overdueCountByBroker } from './task.service';

export interface BrokerWorkload {
  brokerUserId: string;
  brokerName: string | null;
  openLeads: number;
  overdueTasks: number;
  /** ponytail: no Mortgage/renewal model exists yet — always 0 until one does. */
  renewalsWithin90Days: number;
  /** ponytail: no per-lead Document model exists yet — always 0 until one does. */
  missingDocuments: number;
}

/**
 * "The workload view shows, per broker: open leads, overdue tasks, renewals
 * within 90 days, and files missing documents. A broker with nothing
 * assigned is shown as empty rather than hidden" — hence iterating over
 * every team member, not just brokers with matching rows.
 */
export async function teamWorkload(
  tenantId: string,
  members: { userId: string; name: string | null }[],
): Promise<BrokerWorkload[]> {
  const brokerIds = members.map((m) => m.userId);
  const [openLeads, overdueTasks] = await Promise.all([
    openLeadCountByBroker(tenantId, brokerIds),
    overdueCountByBroker(tenantId, brokerIds),
  ]);
  return members.map((m) => ({
    brokerUserId: m.userId,
    brokerName: m.name,
    openLeads: openLeads[m.userId] ?? 0,
    overdueTasks: overdueTasks[m.userId] ?? 0,
    renewalsWithin90Days: 0,
    missingDocuments: 0,
  }));
}
