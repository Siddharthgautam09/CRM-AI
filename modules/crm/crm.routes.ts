import { Router } from 'express';

import { requireModAuthRole } from './crm-auth.middleware';
import {
  addMortgageHandler,
  completeTaskHandler,
  createLeadHandler,
  createTaskHandler,
  fundLeadHandler,
  getMyLeadHandler,
  listMyClientsHandler,
  listMyLeadsHandler,
  listMyTasksHandler,
  reassignLeadHandler,
  teamBookDetailHandler,
  teamBookHandler,
  teamCalendarHandler,
  teamDashboardHandler,
  teamTasksHandler,
  updateMyLeadStageHandler,
} from './crm.controller';
import {
  addMortgageSchema,
  createLeadSchema,
  createTaskSchema,
  exportJobIdParamSchema,
  fundLeadSchema,
  leadIdParamSchema,
  reassignSchema,
  reportQuerySchema,
  taskIdParamSchema,
  updateBookingSettingsSchema,
  updateProfileSchema,
  updateStageSchema,
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

export { crmRouter };
