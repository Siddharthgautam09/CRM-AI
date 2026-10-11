import { decryptToken, encryptToken } from './encryption';
import { getPrismaClient } from '../../config/database';
import { ApiError } from '../../utils/api-error';
import { listActivity, recordActivity } from '../platform/activity-log';

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
  tags?: string[];
  dateOfBirth?: string;
  sin?: string;
  bankDetails?: string;
}

type SensitiveField = 'sin' | 'bankDetails' | 'dateOfBirth';

/**
 * "New client" (Flow 4.1) — applicants/income/debts/properties/down-payment/
 * notes, single-applicant scope (no co-applicant modeling). Voice notes and
 * AI review are a separate pipeline this repo doesn't have yet — notes are
 * taken as plain text, not transcribed or AI-analyzed. SIN and bank details
 * (Flow 4.3's "hidden values") are encrypted at rest and never returned by
 * the normal read paths — see revealSensitiveField.
 */
export async function createLead(tenantId: string, brokerUserId: string, input: CreateLeadInput) {
  const { dateOfBirth, sin, bankDetails, ...rest } = input;
  return getPrismaClient().lead.create({
    data: {
      tenantId,
      brokerUserId,
      ...rest,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      sin: sin ? encryptToken(sin) : undefined,
      bankDetails: bankDetails ? encryptToken(bankDetails) : undefined,
    },
  });
}

/** SIN/bank details never leave the server as ciphertext either — just whether one is on file. See revealSensitiveField for the only path that decrypts them. */
export function maskLead<T extends { sin: string | null; bankDetails: string | null }>(lead: T) {
  const { sin, bankDetails, ...rest } = lead;
  return { ...rest, hasSin: sin !== null, hasBankDetails: bankDetails !== null };
}

/** "Leads" — everything not yet funded and not lost (the active pipeline). */
export async function listMyLeads(tenantId: string, brokerUserId: string) {
  const leads = await getPrismaClient().lead.findMany({
    where: { tenantId, brokerUserId, stage: { notIn: ['FUNDED', 'LOST'] } },
    orderBy: { createdAt: 'desc' },
  });
  return leads.map(maskLead);
}

/** "Clients" — funded leads, each with their mortgage(s). */
export async function listMyClients(tenantId: string, brokerUserId: string) {
  const clients = await getPrismaClient().lead.findMany({
    where: { tenantId, brokerUserId, stage: 'FUNDED' },
    orderBy: { createdAt: 'desc' },
    include: { mortgages: true },
  });
  return clients.map(maskLead);
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
  const updated = await getPrismaClient().lead.update({
    where: { id: lead.id },
    data: { stage, lostReason: stage === 'LOST' ? lostReason : null },
  });
  return maskLead(updated);
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
  return maskLead(updated);
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
  const leads = await getPrismaClient().lead.findMany({
    where: { tenantId, brokerUserId: { in: brokerIds } },
    orderBy: { createdAt: 'desc' },
  });
  return leads.map(maskLead);
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
  return maskLead(updated);
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

/**
 * "Do they still have clients assigned?" (Flow 2 / SOW 2.11) — every lead/
 * client still on this broker's book, Lost excluded since a dead deal needs
 * no reassignment. Called by modauth's internal deactivation check (see
 * docs/swagger/crm.yaml's internal path), not by any JWT-authenticated route.
 */
export async function activeAssignedLeadCount(
  tenantId: string,
  brokerUserId: string,
): Promise<number> {
  return getPrismaClient().lead.count({
    where: { tenantId, brokerUserId, stage: { not: 'LOST' } },
  });
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

// ── Person panel (Flow 4.3) ──────────────────────────────────────────────────

/** "Your notes - editable" — "Original notes" (the `notes` field) is locked forever and never touched here. Each edit is appended to the activity log as its own history entry. */
export async function updateNotes(
  tenantId: string,
  leadId: string,
  allowedBrokerIds: string[],
  brokerNotes: string,
  actorId: string,
) {
  const lead = await getLeadWithAccess(tenantId, leadId, allowedBrokerIds);
  const updated = await getPrismaClient().lead.update({
    where: { id: lead.id },
    data: { brokerNotes },
  });
  await recordActivity('crm.notes.updated', {
    actorId,
    targetType: 'lead',
    targetId: lead.id,
    metadata: { previous: lead.brokerNotes, next: brokerNotes },
  });
  return maskLead(updated);
}

export async function updateTags(
  tenantId: string,
  leadId: string,
  allowedBrokerIds: string[],
  tags: string[],
) {
  const lead = await getLeadWithAccess(tenantId, leadId, allowedBrokerIds);
  const updated = await getPrismaClient().lead.update({ where: { id: lead.id }, data: { tags } });
  return maskLead(updated);
}

/** "Click a hidden value... Reveal — the reveal is recorded" — re-hiding on navigate-away is a frontend concern; this just decrypts and logs. */
export async function revealSensitiveField(
  tenantId: string,
  leadId: string,
  allowedBrokerIds: string[],
  field: SensitiveField,
  actorId: string,
): Promise<{ field: SensitiveField; value: string | null }> {
  const lead = await getLeadWithAccess(tenantId, leadId, allowedBrokerIds);
  await recordActivity('crm.lead.sensitive_field_revealed', {
    actorId,
    targetType: 'lead',
    targetId: lead.id,
    metadata: { field },
  });

  if (field === 'dateOfBirth') {
    return { field, value: lead.dateOfBirth ? lead.dateOfBirth.toISOString() : null };
  }
  const encrypted = lead[field];
  return { field, value: encrypted ? decryptToken(encrypted) : null };
}

/**
 * "The person panel... same panel everywhere" — one aggregated read for the
 * Profile/Affordability/Mortgages/Notes/Activity tabs. Documents isn't
 * included yet (no document storage exists in this repo — see Flow 4.5).
 */
export async function getPersonPanel(tenantId: string, leadId: string, allowedBrokerIds: string[]) {
  const lead = await getLeadWithAccess(tenantId, leadId, allowedBrokerIds);
  const [mortgages, history, recentActivity] = await Promise.all([
    getPrismaClient().mortgage.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: 'desc' },
    }),
    listActivity({ targetId: lead.id, action: 'crm.notes.updated', size: 100 }),
    listActivity({ targetId: lead.id, size: 50 }),
  ]);

  return {
    profile: maskLead(lead),
    mortgages,
    notes: {
      original: lead.notes,
      yours: lead.brokerNotes,
      history: history.items,
    },
    activity: recentActivity.items,
  };
}
