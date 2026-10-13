import express, { Router } from 'express';

import {
  applyExtractedFieldsHandler,
  askAssistantHandler,
  draftEmailHandler,
  listEmailIntentsHandler,
  reviewDraftNotesHandler,
  retryTranscriptionHandler,
  reviewLeadHandler,
  saveVoiceNoteHandler,
  suggestTasksHandler,
} from './ai-review.controller';
import {
  aiApplyFieldsSchema,
  aiAssistantSchema,
  aiDraftEmailSchema,
  aiLeadSchema,
  aiReviewDraftNotesSchema,
  applyDocumentValuesSchema,
  createEmailDraftSchema,
  documentIdParamSchema,
  publicBookingSchema,
  publicTokenSchema,
  publicUploadSchema,
  requestDocumentsSchema,
  setRequiredDocumentsSchema,
  updateEmailDraftSchema,
  updateSettingsSchema,
  uploadDocumentSchema,
} from './ai-review.validation';
import {
  contactCategoryCountsHandler,
  createContactHandler,
  deleteContactHandler,
  listMyContactsHandler,
  teamContactsHandler,
  updateContactHandler,
} from './contacts.controller';
import {
  contactIdParamSchema,
  createContactSchema,
  listContactsSchema,
  updateContactSchema,
} from './contacts.validation';
import { requireCompleteBrokerageProfile, requireModAuthRole } from './crm-auth.middleware';
import {
  addMortgageHandler,
  approveSuggestedTaskHandler,
  brokerDashboardHandler,
  completeTaskHandler,
  createLeadHandler,
  createTaskHandler,
  deleteLeadHandler,
  deleteTaskHandler,
  fundLeadHandler,
  getAffordabilityHandler,
  getMyLeadHandler,
  getPersonPanelHandler,
  internalLeadCountHandler,
  linkTaskHandler,
  listNotificationsHandler,
  listMyClientsHandler,
  listMyLeadsHandler,
  listMyTasksHandler,
  markNotificationReadHandler,
  reassignLeadHandler,
  recalculateAffordabilityHandler,
  revealFieldHandler,
  searchHandler,
  teamBookAffordabilityHandler,
  teamBookDetailHandler,
  teamBookHandler,
  teamBookPanelHandler,
  teamCalendarHandler,
  teamDashboardHandler,
  teamTasksHandler,
  updateLeadProfileHandler,
  updateMyLeadStageHandler,
  updateNotesHandler,
  updateTagsHandler,
} from './crm.controller';
import {
  addMortgageSchema,
  createLeadSchema,
  createTaskSchema,
  deleteLeadSchema,
  exportJobIdParamSchema,
  fundLeadSchema,
  internalLeadCountSchema,
  internalProfileStatusSchema,
  leadIdParamSchema,
  linkTaskSchema,
  reassignAllSchema,
  reassignSchema,
  recalculateAffordabilitySchema,
  reportQuerySchema,
  revealFieldSchema,
  searchSchema,
  taskIdParamSchema,
  updateBookingSettingsSchema,
  updateLeadProfileSchema,
  updateNotesSchema,
  updateProfileSchema,
  updateStageSchema,
  updateTagsSchema,
} from './crm.validation';
import {
  applyDocumentValuesHandler,
  downloadDocumentHandler,
  listDocumentsHandler,
  publicBookingHandler,
  publicDocumentRequestHandler,
  publicDocumentUploadHandler,
  requestDocumentsHandler,
  setRequiredDocumentsHandler,
  uploadDocumentHandler,
} from './document.controller';
import {
  createDraftHandler,
  listDraftsHandler,
  updateDraftHandler,
} from './email-draft.controller';
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
import {
  addApplicantHandler,
  addDebtHandler,
  addEmploymentHandler,
  addFollowUpHandler,
  addFundsSourceHandler,
  addNoaIncomeHandler,
  addPropertyRecordHandler,
  getIntakeBundleHandler,
  removeApplicantHandler,
  removeDebtHandler,
  removeFollowUpHandler,
  removeFundsSourceHandler,
  removePropertyRecordHandler,
  updateApplicantHandler,
  updateDebtHandler,
  updatePropertyRecordHandler,
} from './intake.controller';
import {
  addApplicantSchema,
  addDebtSchema,
  addEmploymentSchema,
  addFollowUpSchema,
  addFundsSourceSchema,
  addNoaIncomeSchema,
  addPropertyRecordSchema,
  applicantIdParamSchema,
  debtIdParamSchema,
  followUpIdParamSchema,
  fundsSourceIdParamSchema,
  intakeBundleParamSchema,
  propertyIdParamSchema,
  updateApplicantSchema,
  updateDebtSchema,
  updatePropertyRecordSchema,
} from './intake.validation';
import { exportReportHandler, getReportHandler } from './reports.controller';
import { getSettingsHandler, updateSettingsHandler } from './settings.controller';
import {
  brokerageDashboardHandler,
  downloadSelfServiceExportHandler,
  getBookingSettingsHandler,
  getProfileHandler,
  getSelfServiceExportStatusHandler,
  internalProfileStatusHandler,
  reassignAllClientsHandler,
  startSelfServiceExportHandler,
  tenantBookHandler,
  updateBookingSettingsHandler,
  updateProfileHandler,
} from './tenant.controller';
import { env } from '../../config/env';
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
crmRouter.get('/leads', requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'), listMyLeadsHandler);
crmRouter.get(
  '/clients',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  listMyClientsHandler,
);
crmRouter.get(
  '/leads/:id',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  validate(leadIdParamSchema),
  getMyLeadHandler,
);
crmRouter.patch(
  '/leads/:id/stage',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  validate(updateStageSchema),
  updateMyLeadStageHandler,
);
crmRouter.post(
  '/leads/:id/fund',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  validate(fundLeadSchema),
  fundLeadHandler,
);
crmRouter.post(
  '/leads/:id/mortgages',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  validate(addMortgageSchema),
  addMortgageHandler,
);

// Structured intake (SOW Module 5) — own book.
crmRouter.get(
  '/leads/:id/intake',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  validate(intakeBundleParamSchema),
  getIntakeBundleHandler,
);
crmRouter.post(
  '/leads/:id/applicants',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  validate(addApplicantSchema),
  addApplicantHandler,
);
crmRouter.patch(
  '/leads/:id/applicants/:applicantId',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  validate(updateApplicantSchema),
  updateApplicantHandler,
);
crmRouter.delete(
  '/leads/:id/applicants/:applicantId',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(applicantIdParamSchema),
  removeApplicantHandler,
);
crmRouter.post(
  '/leads/:id/applicants/:applicantId/employment',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  validate(addEmploymentSchema),
  addEmploymentHandler,
);
crmRouter.post(
  '/leads/:id/applicants/:applicantId/noa-income',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  validate(addNoaIncomeSchema),
  addNoaIncomeHandler,
);
crmRouter.post(
  '/leads/:id/debts',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  validate(addDebtSchema),
  addDebtHandler,
);
crmRouter.patch(
  '/leads/:id/debts/:debtId',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  validate(updateDebtSchema),
  updateDebtHandler,
);
crmRouter.delete(
  '/leads/:id/debts/:debtId',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(debtIdParamSchema),
  removeDebtHandler,
);
crmRouter.post(
  '/leads/:id/properties',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  validate(addPropertyRecordSchema),
  addPropertyRecordHandler,
);
crmRouter.patch(
  '/leads/:id/properties/:propertyId',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  validate(updatePropertyRecordSchema),
  updatePropertyRecordHandler,
);
crmRouter.delete(
  '/leads/:id/properties/:propertyId',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(propertyIdParamSchema),
  removePropertyRecordHandler,
);
crmRouter.post(
  '/leads/:id/funds-sources',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  validate(addFundsSourceSchema),
  addFundsSourceHandler,
);
crmRouter.delete(
  '/leads/:id/funds-sources/:fundsSourceId',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(fundsSourceIdParamSchema),
  removeFundsSourceHandler,
);
crmRouter.post(
  '/leads/:id/follow-ups',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  validate(addFollowUpSchema),
  addFollowUpHandler,
);
crmRouter.delete(
  '/leads/:id/follow-ups/:followUpId',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(followUpIdParamSchema),
  removeFollowUpHandler,
);

// Person panel (Flow 4.3) and its tabs — own book.
crmRouter.get(
  '/leads/:id/panel',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  validate(leadIdParamSchema),
  getPersonPanelHandler,
);
crmRouter.get(
  '/leads/:id/affordability',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  validate(leadIdParamSchema),
  getAffordabilityHandler,
);
crmRouter.post(
  '/leads/affordability/recalculate',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  validate(recalculateAffordabilitySchema),
  recalculateAffordabilityHandler,
);
crmRouter.patch(
  '/leads/:id/notes',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  validate(updateNotesSchema),
  updateNotesHandler,
);
crmRouter.patch(
  '/leads/:id/tags',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  validate(updateTagsSchema),
  updateTagsHandler,
);
crmRouter.patch(
  '/leads/:id/profile',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  validate(updateLeadProfileSchema),
  updateLeadProfileHandler,
);
crmRouter.post(
  '/leads/:id/reveal',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(revealFieldSchema),
  revealFieldHandler,
);
// AI touchpoints from the user flows (Untitled 2.md) — stubs, see
// ai-review.service.ts. Book scope as the person panel; every AI call also
// honours the user's AI switch and the brokerage's daily cost limit.
const AI_USERS = ['BROKER', 'TEAM_LEAD', 'ASSISTANT'] as const;
// Flow 4.1 voice note: the audio is kept; transcription (stub) can be retried.
crmRouter.post(
  '/voice-notes',
  requireModAuthRole(...AI_USERS),
  express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '10mb' }),
  saveVoiceNoteHandler,
);
crmRouter.post(
  '/voice-notes/:id/transcribe',
  requireModAuthRole(...AI_USERS),
  validate(taskIdParamSchema),
  retryTranscriptionHandler,
);
crmRouter.post(
  '/ai/review-notes',
  requireModAuthRole(...AI_USERS),
  validate(aiReviewDraftNotesSchema),
  reviewDraftNotesHandler,
);
crmRouter.post(
  '/ai/assistant',
  requireModAuthRole(...AI_USERS),
  validate(aiAssistantSchema),
  askAssistantHandler,
);
crmRouter.get('/ai/email-intents', requireModAuthRole(...AI_USERS), listEmailIntentsHandler);
crmRouter.post(
  '/leads/:id/ai/review',
  requireModAuthRole(...AI_USERS),
  validate(aiLeadSchema),
  reviewLeadHandler,
);
crmRouter.post(
  '/leads/:id/ai/draft-email',
  requireModAuthRole(...AI_USERS),
  validate(aiDraftEmailSchema),
  draftEmailHandler,
);
crmRouter.post(
  '/leads/:id/ai/apply',
  requireModAuthRole(...AI_USERS),
  validate(aiApplyFieldsSchema),
  applyExtractedFieldsHandler,
);
crmRouter.post(
  '/leads/:id/ai/suggest-tasks',
  requireModAuthRole(...AI_USERS),
  validate(aiLeadSchema),
  suggestTasksHandler,
);

// Saved email drafts (Flow 4.7 "Save draft — nothing is sent").
crmRouter.post(
  '/leads/:id/email-drafts',
  requireModAuthRole(...AI_USERS),
  validate(createEmailDraftSchema),
  createDraftHandler,
);
crmRouter.get(
  '/leads/:id/email-drafts',
  requireModAuthRole(...AI_USERS),
  validate(aiLeadSchema),
  listDraftsHandler,
);
crmRouter.patch(
  '/email-drafts/:draftId',
  requireModAuthRole(...AI_USERS),
  validate(updateEmailDraftSchema),
  updateDraftHandler,
);

// My settings (Flow 4.12) — "AI features on or off".
crmRouter.get('/settings', requireModAuthRole(...AI_USERS), getSettingsHandler);
crmRouter.patch(
  '/settings',
  requireModAuthRole(...AI_USERS),
  validate(updateSettingsSchema),
  updateSettingsHandler,
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
// Flow 4.9 — approve an AI-suggested task; delete = dismiss a suggested one or drop an unlinked one.
crmRouter.patch(
  '/tasks/:id/approve',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(taskIdParamSchema),
  approveSuggestedTaskHandler,
);
crmRouter.delete(
  '/tasks/:id',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(taskIdParamSchema),
  deleteTaskHandler,
);
// Flow 4.9 unlinked task (its person was deleted) — "reassign it".
crmRouter.patch(
  '/tasks/:id/link',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(linkTaskSchema),
  linkTaskHandler,
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
crmRouter.get('/team/contacts', requireModAuthRole('TEAM_LEAD'), teamContactsHandler);

// Reports — shared by Tenant Admin (tenant-wide, or narrowed by team/broker)
// and Team Lead (always team-scoped). See reports.controller.ts.
crmRouter.get(
  '/reports',
  requireModAuthRole('TENANT_ADMIN', 'TEAM_LEAD'),
  requireCompleteBrokerageProfile,
  validate(reportQuerySchema),
  getReportHandler,
);
crmRouter.get(
  '/reports/export',
  requireModAuthRole('TENANT_ADMIN', 'TEAM_LEAD'),
  requireCompleteBrokerageProfile,
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
  requireCompleteBrokerageProfile,
  getBookingSettingsHandler,
);
crmRouter.patch(
  '/tenant/booking-settings',
  requireModAuthRole('TENANT_ADMIN'),
  requireCompleteBrokerageProfile,
  validate(updateBookingSettingsSchema),
  updateBookingSettingsHandler,
);
crmRouter.get(
  '/tenant/book',
  requireModAuthRole('TENANT_ADMIN'),
  requireCompleteBrokerageProfile,
  tenantBookHandler,
);
crmRouter.post(
  '/tenant/export',
  requireModAuthRole('TENANT_ADMIN'),
  requireCompleteBrokerageProfile,
  startSelfServiceExportHandler,
);
crmRouter.get(
  '/tenant/export',
  requireModAuthRole('TENANT_ADMIN'),
  requireCompleteBrokerageProfile,
  getSelfServiceExportStatusHandler,
);
crmRouter.get(
  '/tenant/export/:jobId/download',
  requireModAuthRole('TENANT_ADMIN'),
  requireCompleteBrokerageProfile,
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

// Contacts / Centres of Influence (SOW Module 14) — own book.
crmRouter.post(
  '/contacts',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(createContactSchema),
  createContactHandler,
);
crmRouter.get(
  '/contacts',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(listContactsSchema),
  listMyContactsHandler,
);
crmRouter.get(
  '/contacts/category-counts',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  contactCategoryCountsHandler,
);
crmRouter.patch(
  '/contacts/:id',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(updateContactSchema),
  updateContactHandler,
);
crmRouter.delete(
  '/contacts/:id',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(contactIdParamSchema),
  deleteContactHandler,
);

// Flow 4 broker dashboard + search + 4.11 delete person — own book.
crmRouter.get(
  '/dashboard',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  brokerDashboardHandler,
);
crmRouter.get(
  '/search',
  requireModAuthRole('BROKER', 'TEAM_LEAD', 'ASSISTANT'),
  validate(searchSchema),
  searchHandler,
);
crmRouter.delete(
  '/leads/:id',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(deleteLeadSchema),
  deleteLeadHandler,
);

// Notifications ("broker notified", reminders, the 9am digest).
crmRouter.get(
  '/notifications',
  requireModAuthRole('TENANT_ADMIN', 'TEAM_LEAD', 'BROKER', 'ASSISTANT'),
  listNotificationsHandler,
);
crmRouter.patch(
  '/notifications/:id/read',
  requireModAuthRole('TENANT_ADMIN', 'TEAM_LEAD', 'BROKER', 'ASSISTANT'),
  validate(taskIdParamSchema),
  markNotificationReadHandler,
);

// Documents (Flow 4.5) — Assistants can tick, upload and review; only the
// broker sends the request email (it goes from their own inbox).
const DOC_USERS = ['BROKER', 'TEAM_LEAD', 'ASSISTANT'] as const;
crmRouter.get(
  '/leads/:id/documents',
  requireModAuthRole(...DOC_USERS),
  validate(leadIdParamSchema),
  listDocumentsHandler,
);
crmRouter.put(
  '/leads/:id/documents/required',
  requireModAuthRole(...DOC_USERS),
  validate(setRequiredDocumentsSchema),
  setRequiredDocumentsHandler,
);
crmRouter.post(
  '/leads/:id/documents',
  requireModAuthRole(...DOC_USERS),
  express.raw({ type: () => true, limit: env.crm.documentMaxBytes }),
  validate(uploadDocumentSchema),
  uploadDocumentHandler,
);
crmRouter.post(
  '/leads/:id/documents/request',
  requireModAuthRole('BROKER', 'TEAM_LEAD'),
  validate(requestDocumentsSchema),
  requestDocumentsHandler,
);
crmRouter.post(
  '/documents/:documentId/apply',
  requireModAuthRole(...DOC_USERS),
  validate(applyDocumentValuesSchema),
  applyDocumentValuesHandler,
);
crmRouter.get(
  '/documents/:documentId/download',
  requireModAuthRole(...DOC_USERS),
  validate(documentIdParamSchema),
  downloadDocumentHandler,
);

// Tenant Admin: Flow 2 dashboard and "reassign their clients first".
crmRouter.get(
  '/tenant/dashboard',
  requireModAuthRole('TENANT_ADMIN'),
  requireCompleteBrokerageProfile,
  brokerageDashboardHandler,
);
crmRouter.post(
  '/tenant/people/:userId/reassign-clients',
  requireModAuthRole('TENANT_ADMIN'),
  requireCompleteBrokerageProfile,
  validate(reassignAllSchema),
  reassignAllClientsHandler,
);

// Public, no login — the borrower's 7-day upload link (Flow 4.5) and the
// brokerage's booking page (Flow 4.8). The token / slug is the only key.
crmRouter.get(
  '/public/document-requests/:token',
  validate(publicTokenSchema),
  publicDocumentRequestHandler,
);
crmRouter.post(
  '/public/document-requests/:token/files',
  express.raw({ type: () => true, limit: env.crm.documentMaxBytes }),
  validate(publicUploadSchema),
  publicDocumentUploadHandler,
);
crmRouter.post('/public/bookings/:slug', validate(publicBookingSchema), publicBookingHandler);

// Internal, service-to-service (X-Internal-Secret, no JWT) — modauth calls
// this from PeopleServiceImpl.deactivate() (SOW 2.11).
crmRouter.get(
  '/internal/tenants/:tenantId/profile-status',
  requireInternalSecret,
  validate(internalProfileStatusSchema),
  internalProfileStatusHandler,
);
crmRouter.get(
  '/internal/brokers/:userId/lead-count',
  requireInternalSecret,
  validate(internalLeadCountSchema),
  internalLeadCountHandler,
);

export { crmRouter };
