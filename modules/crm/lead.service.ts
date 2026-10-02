import { getPrismaClient } from '../../config/database';
import { ApiError } from '../../utils/api-error';
import { recordActivity } from '../platform/activity-log';

export type LeadStage =
  | 'NEW'
  | 'QUALIFIED'
  | 'APPLICATION'
  | 'UNDERWRITING'
  | 'APPROVED'
  | 'FUNDED'
  | 'LOST';

export interface CreateLeadInput {
  name: string;
  email?: string;
  phone?: string;
  income?: number;
  monthlyDebts?: number;
  downPayment?: number;
  propertyAddress?: string;
  propertyValue?: number;
  notes?: string;
}

/**
 * "New client" (Flow 4.1) — applicants/income/debts/properties/down-payment/
 * notes, single-applicant scope (no co-applicant modeling). Voice notes and
 * AI review are a separate pipeline this repo doesn't have yet — notes are
 * taken as plain text, not transcribed or AI-analyzed.
 */
export async function createLead(tenantId: string, brokerUserId: string, input: CreateLeadInput) {
  return getPrismaClient().lead.create({
    data: { tenantId, brokerUserId, ...input },
  });
}

/** "Leads" — everything not yet funded and not lost (the active pipeline). */
export async function listMyLeads(tenantId: string, brokerUserId: string) {
  return getPrismaClient().lead.findMany({
    where: { tenantId, brokerUserId, stage: { notIn: ['FUNDED', 'LOST'] } },
    orderBy: { createdAt: 'desc' },
  });
}

/** "Clients" — funded leads, each with their mortgage(s). */
export async function listMyClients(tenantId: string, brokerUserId: string) {
  return getPrismaClient().lead.findMany({
    where: { tenantId, brokerUserId, stage: 'FUNDED' },
    orderBy: { createdAt: 'desc' },
    include: { mortgages: true },
  });
}

/** Throws 404 outside the tenant, 403 outside the given access set — used for both "own book" and "team book" access. */
export async function getLeadWithAccess(
  tenantId: string,
  leadId: string,
  allowedBrokerIds: string[],
) {
  const lead = await getPrismaClient().lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.tenantId !== tenantId) {
    throw new ApiError('Lead not found', 404);
  }
  if (!allowedBrokerIds.includes(lead.brokerUserId)) {
    throw new ApiError("You don't have access to this record", 403);
  }
  return lead;
}

export async function updateStage(
  tenantId: string,
  leadId: string,
  allowedBrokerIds: string[],
  stage: LeadStage,
  lostReason?: string,
) {
  if (stage === 'FUNDED') {
    // "This step cannot be skipped" — Funded only happens through fundLead,
    // which requires a mortgage in the same transaction.
    throw new ApiError('Funding a lead requires mortgage details — use the fund endpoint', 400);
  }
  const lead = await getLeadWithAccess(tenantId, leadId, allowedBrokerIds);
  if (stage === 'LOST' && !lostReason) {
    throw new ApiError('A reason is required to mark a lead Lost', 400);
  }
  return getPrismaClient().lead.update({
    where: { id: lead.id },
    data: { stage, lostReason: stage === 'LOST' ? lostReason : null },
  });
}

export interface MortgageInput {
  lender: string;
  interestRate: number;
  balance: number;
  monthlyPayment: number;
  maturityDate: string;
}

/**
 * "Change the stage to Funded" (Flow 4.6) — creates the mortgage and moves
 * the stage to FUNDED in one transaction; if either fails, "the stage
 * change is cancelled, the person stays where they were." Renewal reminders
 * aren't a separate scheduled job — see workload.service.ts's
 * renewalsWithin90Days, which reads maturityDate directly.
 */
export async function fundLead(
  tenantId: string,
  leadId: string,
  allowedBrokerIds: string[],
  mortgage: MortgageInput,
) {
  const lead = await getLeadWithAccess(tenantId, leadId, allowedBrokerIds);
  const [, updated] = await getPrismaClient().$transaction([
    getPrismaClient().mortgage.create({
      data: { leadId: lead.id, ...mortgage, maturityDate: new Date(mortgage.maturityDate) },
    }),
    getPrismaClient().lead.update({
      where: { id: lead.id },
      data: { stage: 'FUNDED', lostReason: null },
    }),
  ]);
  return updated;
}

/** A client can hold more than one mortgage, each with its own lender and dates. */
export async function addMortgage(
  tenantId: string,
  leadId: string,
  allowedBrokerIds: string[],
  mortgage: MortgageInput,
) {
  const lead = await getLeadWithAccess(tenantId, leadId, allowedBrokerIds);
  if (lead.stage !== 'FUNDED') {
    throw new ApiError('Only a funded client can hold a mortgage', 400);
  }
  return getPrismaClient().mortgage.create({
    data: { leadId: lead.id, ...mortgage, maturityDate: new Date(mortgage.maturityDate) },
  });
}

/** "Team book" — every lead/client belonging to any broker on the team. */
export async function listForBrokers(tenantId: string, brokerIds: string[]) {
  if (brokerIds.length === 0) return [];
  return getPrismaClient().lead.findMany({
    where: { tenantId, brokerUserId: { in: brokerIds } },
    orderBy: { createdAt: 'desc' },
  });
}

/** "Reassign to another broker" — caller must already have verified toBrokerUserId is inside the team. */
export async function reassign(
  tenantId: string,
  leadId: string,
  teamBrokerIds: string[],
  toBrokerUserId: string,
  actingUserId: string,
) {
  const lead = await getLeadWithAccess(tenantId, leadId, teamBrokerIds);
  if (!teamBrokerIds.includes(toBrokerUserId)) {
    throw new ApiError('That broker is not on this team', 400);
  }
  const updated = await getPrismaClient().lead.update({
    where: { id: lead.id },
    data: { brokerUserId: toBrokerUserId },
  });
  // ponytail: "both brokers notified" is a notification-system concern this
  // repo doesn't have yet — the diagram's other half ("it's recorded") is
  // covered here; wire a real notification once one exists.
  await recordActivity('crm.lead.reassigned', {
    actorId: actingUserId,
    targetType: 'lead',
    targetId: lead.id,
    metadata: { fromBrokerUserId: lead.brokerUserId, toBrokerUserId },
  });
  return updated;
}

/** "Team pipeline" — stage counts across every broker on the team. */
export async function pipelineCounts(
  tenantId: string,
  brokerIds: string[],
): Promise<Record<LeadStage, number>> {
  const base: Record<LeadStage, number> = {
    NEW: 0,
    QUALIFIED: 0,
    APPLICATION: 0,
    UNDERWRITING: 0,
    APPROVED: 0,
    FUNDED: 0,
    LOST: 0,
  };
  if (brokerIds.length === 0) return base;
  const grouped = await getPrismaClient().lead.groupBy({
    by: ['stage'],
    where: { tenantId, brokerUserId: { in: brokerIds } },
    _count: true,
  });
  for (const row of grouped) base[row.stage as LeadStage] = row._count;
  return base;
}

/** Open leads per broker — for the workload view; brokers with none stay at 0 (see workload.service.ts). */
export async function openLeadCountByBroker(
  tenantId: string,
  brokerIds: string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = Object.fromEntries(brokerIds.map((id) => [id, 0]));
  if (brokerIds.length === 0) return counts;
  const grouped = await getPrismaClient().lead.groupBy({
    by: ['brokerUserId'],
    where: { tenantId, brokerUserId: { in: brokerIds }, stage: { notIn: ['FUNDED', 'LOST'] } },
    _count: true,
  });
  for (const row of grouped) counts[row.brokerUserId] = row._count;
  return counts;
}

/** Renewals due within 90 days, per broker — the workload view's real figure (see Mortgage.maturityDate). */
export async function renewalCountByBroker(
  tenantId: string,
  brokerIds: string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = Object.fromEntries(brokerIds.map((id) => [id, 0]));
  if (brokerIds.length === 0) return counts;
  const in90Days = new Date();
  in90Days.setDate(in90Days.getDate() + 90);
  const mortgages = await getPrismaClient().mortgage.findMany({
    where: {
      maturityDate: { gte: new Date(), lte: in90Days },
      lead: { tenantId, brokerUserId: { in: brokerIds } },
    },
    select: { lead: { select: { brokerUserId: true } } },
  });
  for (const m of mortgages) counts[m.lead.brokerUserId] = (counts[m.lead.brokerUserId] ?? 0) + 1;
  return counts;
}
