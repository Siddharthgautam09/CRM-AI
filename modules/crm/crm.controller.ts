import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import * as leadService from './lead.service';
import { resolveTeam } from './modauth.client';
import * as taskService from './task.service';
import { teamWorkload } from './workload.service';
import { ApiError } from '../../utils/api-error';
import { asyncHandler } from '../../utils/async-handler';

function crmUser(req: Request) {
  // Guaranteed set by requireModAuthRole before any handler here runs.
  return req.crmUser!;
}

async function requireOwnTeam(req: Request) {
  const user = crmUser(req);
  if (!user.teamId) {
    throw new ApiError('You are not assigned to a team', StatusCodes.FORBIDDEN);
  }
  return resolveTeam(user.teamId, user.bearerToken);
}

// ── "Their own book" (Broker, and a Team Lead's own book) ───────────────────

export const createLeadHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = crmUser(req);
  const lead = await leadService.createLead(user.tenantId, user.userId, req.body);
  res.status(StatusCodes.CREATED).json({ success: true, data: lead });
});

export const listMyLeadsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = crmUser(req);
  const leads = await leadService.listMyLeads(user.tenantId, user.userId);
  res.status(StatusCodes.OK).json({ success: true, data: leads });
});

export const listMyClientsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = crmUser(req);
  const clients = await leadService.listMyClients(user.tenantId, user.userId);
  res.status(StatusCodes.OK).json({ success: true, data: clients });
});

export const getMyLeadHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = crmUser(req);
  const lead = await leadService.getLeadWithAccess(user.tenantId, req.params.id as string, [
    user.userId,
  ]);
  res.status(StatusCodes.OK).json({ success: true, data: lead });
});

export const updateMyLeadStageHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = crmUser(req);
  const lead = await leadService.updateStage(
    user.tenantId,
    req.params.id as string,
    [user.userId],
    req.body.stage,
    req.body.lostReason,
  );
  res.status(StatusCodes.OK).json({ success: true, data: lead });
});

export const fundLeadHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = crmUser(req);
  const lead = await leadService.fundLead(
    user.tenantId,
    req.params.id as string,
    [user.userId],
    req.body,
  );
  res.status(StatusCodes.OK).json({ success: true, data: lead });
});

export const addMortgageHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = crmUser(req);
  const mortgage = await leadService.addMortgage(
    user.tenantId,
    req.params.id as string,
    [user.userId],
    req.body,
  );
  res.status(StatusCodes.CREATED).json({ success: true, data: mortgage });
});

export const createTaskHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = crmUser(req);
  const task = await taskService.createTask(user.tenantId, user.userId, req.body);
  res.status(StatusCodes.CREATED).json({ success: true, data: task });
});

export const listMyTasksHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = crmUser(req);
  const tasks = await taskService.listMyTasks(user.tenantId, user.userId);
  res.status(StatusCodes.OK).json({ success: true, data: tasks });
});

export const completeTaskHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = crmUser(req);
  const task = await taskService.completeTask(user.tenantId, user.userId, req.params.id as string);
  res.status(StatusCodes.OK).json({ success: true, data: task });
});

// ── Team Lead's team-scoped views (Flow 3) ───────────────────────────────────

export const teamDashboardHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = crmUser(req);
  const team = await requireOwnTeam(req);
  const [pipeline, overdueByBroker, workload] = await Promise.all([
    leadService.pipelineCounts(user.tenantId, team.brokerIds),
    taskService.overdueCountByBroker(user.tenantId, team.brokerIds),
    teamWorkload(user.tenantId, team.members),
  ]);
  const overdueTasks = Object.values(overdueByBroker).reduce((sum, n) => sum + n, 0);
  res.status(StatusCodes.OK).json({ success: true, data: { pipeline, overdueTasks, workload } });
});

export const teamBookHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = crmUser(req);
  const team = await requireOwnTeam(req);
  const leads = await leadService.listForBrokers(user.tenantId, team.brokerIds);
  res.status(StatusCodes.OK).json({ success: true, data: leads });
});

export const teamBookDetailHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = crmUser(req);
  const team = await requireOwnTeam(req);
  const lead = await leadService.getLeadWithAccess(
    user.tenantId,
    req.params.id as string,
    team.brokerIds,
  );
  res.status(StatusCodes.OK).json({ success: true, data: lead });
});

export const reassignLeadHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = crmUser(req);
  const team = await requireOwnTeam(req);
  const lead = await leadService.reassign(
    user.tenantId,
    req.params.id as string,
    team.brokerIds,
    req.body.toBrokerUserId,
    user.userId,
  );
  res.status(StatusCodes.OK).json({ success: true, data: lead });
});

export const teamTasksHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = crmUser(req);
  const team = await requireOwnTeam(req);
  const tasks = await taskService.listForBrokers(user.tenantId, team.brokerIds);
  res.status(StatusCodes.OK).json({ success: true, data: tasks });
});
