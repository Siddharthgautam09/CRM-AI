import { Router } from 'express';

import { requireModAuthRole } from './crm-auth.middleware';
import {
  addMortgageHandler,
  completeTaskHandler,
  createLeadHandler,
  createTaskHandler,
  fundLeadHandler,
  getAffordabilityHandler,
  getMyLeadHandler,
  getPersonPanelHandler,
  internalLeadCountHandler,
  listMyClientsHandler,
  listMyLeadsHandler,
  listMyTasksHandler,
  reassignLeadHandler,
  recalculateAffordabilityHandler,
  revealFieldHandler,
  teamBookAffordabilityHandler,
  teamBookDetailHandler,
  teamBookHandler,
  teamBookPanelHandler,
  teamCalendarHandler,
  teamDashboardHandler,
  teamTasksHandler,
  updateMyLeadStageHandler,
  updateNotesHandler,
  updateTagsHandler,
} from './crm.controller';
import {
  addMortgageSchema,
  createLeadSchema,
  createTaskSchema,
  exportJobIdParamSchema,
  fundLeadSchema,
  internalLeadCountSchema,
  leadIdParamSchema,
  reassignSchema,
  recalculateAffordabilitySchema,
  reportQuerySchema,
  revealFieldSchema,
  taskIdParamSchema,
  updateBookingSettingsSchema,
  updateNotesSchema,
  updateProfileSchema,
  updateStageSchema,
  updateTagsSchema,
} from './crm.validation';
import {
  createAppointmentHandler,
  disconnectHandler,
  getConnectUrlHandler,
  getConnectionStatusHandler,
  listMyAppointmentsHandler,
  oauthCallbackHandler,
  sendEmailHandler,
} from './google/google.controller';
import {
  createAppointmentSchema,
  oauthCallbackSchema,
  sendEmailSchema,
} from './google/google.validation';
import { exportReportHandler, getReportHandler } from './reports.controller';
import {
  downloadSelfServiceExportHandler,
  getBookingSettingsHandler,
  getProfileHandler,
  getSelfServiceExportStatusHandler,
  startSelfServiceExportHandler,
  tenantBookHandler,
  updateBookingSettingsHandler,
  updateProfileHandler,
} from './tenant.controller';
import { validate } from '../../middlewares/validate.middleware';
import { requireInternalSecret } from '../platform/internal-secret.middleware';

// Full OpenAPI docs live in docs/swagger/crm.yaml — see config/swagger.ts's apis list.
const crmRouter = Router();

// "Their own book" — a Broker's own leads/clients/tasks, and a Team Lead's own
// (per Flow 3: "Their own book — full Broker flow"). Tenant Admin has no book.
crmRouter.post(
  '/leads',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(createLeadSchema),
  createLeadHandler,
);
crmRouter.get('/leads', requireModAuthRole('BROKER', 'TEAM_LEAD'), listMyLeadsHandler);
crmRouter.get('/clients', requireModAuthRole('BROKER', 'TEAM_LEAD'), listMyClientsHandler);
crmRouter.get(
  '/leads/:id',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(leadIdParamSchema),
  getMyLeadHandler,
);
crmRouter.patch(
  '/leads/:id/stage',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(updateStageSchema),
  updateMyLeadStageHandler,
);
crmRouter.post(
  '/leads/:id/fund',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(fundLeadSchema),
  fundLeadHandler,
);
crmRouter.post(
  '/leads/:id/mortgages',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(addMortgageSchema),
  addMortgageHandler,
);

// Person panel (Flow 4.3) and its tabs — own book.
crmRouter.get(
  '/leads/:id/panel',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(leadIdParamSchema),
  getPersonPanelHandler,
);
crmRouter.get(
  '/leads/:id/affordability',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(leadIdParamSchema),
  getAffordabilityHandler,
);
crmRouter.post(
  '/leads/affordability/recalculate',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(recalculateAffordabilitySchema),
  recalculateAffordabilityHandler,
);
crmRouter.patch(
  '/leads/:id/notes',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(updateNotesSchema),
  updateNotesHandler,
);
crmRouter.patch(
  '/leads/:id/tags',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(updateTagsSchema),
  updateTagsHandler,
);
crmRouter.post(
  '/leads/:id/reveal',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(revealFieldSchema),
  revealFieldHandler,
);
crmRouter.post(
  '/tasks',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(createTaskSchema),
  createTaskHandler,
);
crmRouter.get('/tasks', requireModAuthRole('BROKER', 'TEAM_LEAD'), listMyTasksHandler);
crmRouter.patch(
  '/tasks/:id/complete',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(taskIdParamSchema),
  completeTaskHandler,
);

// Team Lead's team-scoped views — Flow 3.
crmRouter.get('/team/dashboard', requireModAuthRole('TEAM_LEAD'), teamDashboardHandler);
crmRouter.get('/team/book', requireModAuthRole('TEAM_LEAD'), teamBookHandler);
crmRouter.get(
  '/team/book/:id',
  requireModAuthRole('TEAM_LEAD'),
  validate(leadIdParamSchema),
  teamBookDetailHandler,
);
crmRouter.get(
  '/team/book/:id/panel',
  requireModAuthRole('TEAM_LEAD'),
  validate(leadIdParamSchema),
  teamBookPanelHandler,
);
crmRouter.get(
  '/team/book/:id/affordability',
  requireModAuthRole('TEAM_LEAD'),
  validate(leadIdParamSchema),
  teamBookAffordabilityHandler,
);
crmRouter.patch(
  '/team/leads/:id/reassign',
  requireModAuthRole('TEAM_LEAD'),
  validate(reassignSchema),
  reassignLeadHandler,
);
crmRouter.get('/team/tasks', requireModAuthRole('TEAM_LEAD'), teamTasksHandler);
crmRouter.get('/team/calendar', requireModAuthRole('TEAM_LEAD'), teamCalendarHandler);

// Reports — shared by Tenant Admin (tenant-wide, or narrowed by team/broker)
// and Team Lead (always team-scoped). See reports.controller.ts.
crmRouter.get(
  '/reports',
  requireModAuthRole('TENANT_ADMIN', 'TEAM_LEAD'),
  validate(reportQuerySchema),
  getReportHandler,
);
crmRouter.get(
  '/reports/export',
  requireModAuthRole('TENANT_ADMIN', 'TEAM_LEAD'),
  validate(reportQuerySchema),
  exportReportHandler,
);

// Tenant Admin's remaining Flow 2 screens.
crmRouter.get('/tenant/profile', requireModAuthRole('TENANT_ADMIN'), getProfileHandler);
crmRouter.patch(
  '/tenant/profile',
  requireModAuthRole('TENANT_ADMIN'),
  validate(updateProfileSchema),
  updateProfileHandler,
);
crmRouter.get(
  '/tenant/booking-settings',
  requireModAuthRole('TENANT_ADMIN'),
  getBookingSettingsHandler,
);
crmRouter.patch(
  '/tenant/booking-settings',
  requireModAuthRole('TENANT_ADMIN'),
  validate(updateBookingSettingsSchema),
  updateBookingSettingsHandler,
);
crmRouter.get('/tenant/book', requireModAuthRole('TENANT_ADMIN'), tenantBookHandler);
crmRouter.post('/tenant/export', requireModAuthRole('TENANT_ADMIN'), startSelfServiceExportHandler);
crmRouter.get(
  '/tenant/export',
  requireModAuthRole('TENANT_ADMIN'),
  getSelfServiceExportStatusHandler,
);
crmRouter.get(
  '/tenant/export/:jobId/download',
  requireModAuthRole('TENANT_ADMIN'),
  validate(exportJobIdParamSchema),
  downloadSelfServiceExportHandler,
);

// "Connect email/calendar" (Flow 4.12) — Broker and Team Lead both have their
// own book, so both can connect their own Google account.
crmRouter.get(
  '/integrations/google/connect',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  getConnectUrlHandler,
);
// Public: Google redirects the browser here directly, with no JWT — see
// google.controller.ts's oauthCallbackHandler doc comment.
crmRouter.get('/integrations/google/callback', validate(oauthCallbackSchema), oauthCallbackHandler);
crmRouter.get(
  '/integrations/google/status',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  getConnectionStatusHandler,
);
crmRouter.delete(
  '/integrations/google',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  disconnectHandler,
);

// "New appointment" (Flow 4.8).
crmRouter.post(
  '/appointments',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(createAppointmentSchema),
  createAppointmentHandler,
);
crmRouter.get(
  '/appointments',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  listMyAppointmentsHandler,
);

// "Sending an email" (Flow 4.7) — 400 if Gmail isn't connected.
crmRouter.post(
  '/emails/send',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(sendEmailSchema),
  sendEmailHandler,
);

// Internal, service-to-service (X-Internal-Secret, no JWT) — modauth calls
// this from PeopleServiceImpl.deactivate() (SOW 2.11).
crmRouter.get(
  '/internal/brokers/:userId/lead-count',
  requireInternalSecret,
  validate(internalLeadCountSchema),
  internalLeadCountHandler,
);

export { crmRouter };
