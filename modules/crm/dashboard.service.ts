import { missingDocuments } from './document-processing';
import { maskLead, pipelineCounts } from './lead.service';
import { getPrismaClient } from '../../config/database';

const DAY = 24 * 60 * 60 * 1000;

function utcToday() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return { now, start, end: new Date(start.getTime() + DAY) };
}

/** "Files missing documents" — leads whose ticked checklist isn't fully received. */
export async function leadsMissingDocuments(tenantId: string, brokerIds: string[]) {
  const leads = await getPrismaClient().lead.findMany({
    where: {
      tenantId,
      brokerUserId: { in: brokerIds },
      NOT: { requiredDocuments: { isEmpty: true } },
    },
    select: {
      id: true,
      name: true,
      brokerUserId: true,
      requiredDocuments: true,
      documents: { select: { type: true } },
    },
  });
  return leads
    .map((l) => ({
      leadId: l.id,
      name: l.name,
      brokerUserId: l.brokerUserId,
      missing: missingDocuments(l.requiredDocuments, l.documents),
    }))
    .filter((l) => l.missing.length > 0);
}

/** Days until this date-of-birth's next anniversary (0 = today), in UTC. */
function daysUntilBirthday(dob: Date, today: Date) {
  const next = new Date(Date.UTC(today.getUTCFullYear(), dob.getUTCMonth(), dob.getUTCDate()));
  if (next < today) next.setUTCFullYear(next.getUTCFullYear() + 1);
  return Math.round((next.getTime() - today.getTime()) / DAY);
}

/**
 * Flow 4 "Broker dashboard" — every card is clickable, so each list carries
 * lead ids for the person panel. AI suggestions and refinance opportunities
 * are AI STUBS (empty until the AI team plugs in).
 * shortcut: "hot" = Application/Underwriting/Approved; refine once there's an engagement signal.
 */
export async function brokerDashboard(tenantId: string, brokerIds: string[]) {
  const { now, start, end } = utcToday();
  const book = { tenantId, brokerUserId: { in: brokerIds } };
  const [
    pipeline,
    hotLeads,
    portfolio,
    renewals,
    meetingsToday,
    followUps,
    birthdayCandidates,
    tasksDueToday,
    tasksOverdue,
    missingDocs,
  ] = await Promise.all([
    pipelineCounts(tenantId, brokerIds),
    getPrismaClient().lead.findMany({
      where: { ...book, stage: { in: ['APPLICATION', 'UNDERWRITING', 'APPROVED'] } },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    getPrismaClient().mortgage.aggregate({
      where: { lead: { ...book, stage: 'FUNDED' } },
      _sum: { balance: true },
      _count: true,
    }),
    getPrismaClient().mortgage.findMany({
      where: { lead: book, maturityDate: { gte: now, lte: new Date(now.getTime() + 180 * DAY) } },
      include: { lead: { select: { id: true, name: true } } },
      orderBy: { maturityDate: 'asc' },
      take: 20,
    }),
    getPrismaClient().appointment.findMany({
      where: { tenantId, brokerUserId: { in: brokerIds }, startTime: { gte: start, lt: end } },
      orderBy: { startTime: 'asc' },
    }),
    getPrismaClient().followUp.findMany({
      where: { lead: book, scheduledAt: { lt: new Date(end.getTime() + 7 * DAY) } },
      include: { lead: { select: { id: true, name: true } } },
      orderBy: { scheduledAt: 'asc' },
      take: 20,
    }),
    getPrismaClient().lead.findMany({
      where: { ...book, dateOfBirth: { not: null } },
      select: { id: true, name: true, dateOfBirth: true },
    }),
    getPrismaClient().task.count({
      where: { ...book, completed: false, suggested: false, dueDate: { gte: start, lt: end } },
    }),
    getPrismaClient().task.count({
      where: { ...book, completed: false, suggested: false, dueDate: { lt: start } },
    }),
    leadsMissingDocuments(tenantId, brokerIds),
  ]);

  const birthdays = birthdayCandidates
    .map((l) => ({ leadId: l.id, name: l.name, inDays: daysUntilBirthday(l.dateOfBirth!, start) }))
    .filter((b) => b.inDays <= 7)
    .sort((a, b) => a.inDays - b.inDays);

  return {
    hotLeads: hotLeads.map(maskLead),
    pipeline,
    portfolio: { totalBalance: portfolio._sum.balance ?? 0, mortgages: portfolio._count },
    renewals: renewals.map((m) => ({
      mortgageId: m.id,
      leadId: m.lead.id,
      name: m.lead.name,
      lender: m.lender,
      maturityDate: m.maturityDate,
    })),
    meetingsToday,
    followUps: followUps.map((f) => ({
      id: f.id,
      leadId: f.lead.id,
      name: f.lead.name,
      type: f.type,
      scheduledAt: f.scheduledAt,
      overdue: f.scheduledAt < start,
    })),
    birthdays,
    tasks: { dueToday: tasksDueToday, overdue: tasksOverdue },
    missingDocuments: missingDocs,
    aiSuggestions: { stub: true as const, items: [] as { leadId: string; text: string }[] },
    refinanceOpportunities: {
      stub: true as const,
      items: [] as { leadId: string; reason: string }[],
    },
  };
}

/** Flow 4 "Search → person panel" — name, email, phone or city across the caller's book. */
export async function searchBook(tenantId: string, brokerIds: string[], q: string) {
  const contains = { contains: q, mode: 'insensitive' as const };
  const leads = await getPrismaClient().lead.findMany({
    where: {
      tenantId,
      brokerUserId: { in: brokerIds },
      OR: [{ name: contains }, { email: contains }, { phone: contains }, { city: contains }],
    },
    orderBy: { updatedAt: 'desc' },
    take: 25,
  });
  return leads.map(maskLead);
}
