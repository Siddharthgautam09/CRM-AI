import { Router } from 'express';

import { requireSuperAdmin } from './auth-jwt.middleware';
import { requireInternalSecret } from './internal-secret.middleware';
import {
  allowExtraTodayHandler,
  createBrokerageHandler,
  downloadExportHandler,
  exportActivityHandler,
  getBrokerageHandler,
  getExportStatusHandler,
  getMeHandler,
  getUsageStatusHandler,
  listActivityHandler,
  listBrokeragesHandler,
  ownerAcceptedWebhookHandler,
  reactivateBrokerageHandler,
  simulateUsageHandler,
  startCancellationHandler,
  suspendBrokerageHandler,
} from './platform.controller';
import {
  activityLogQuerySchema,
  brokerageIdParamSchema,
  createBrokerageSchema,
  listBrokeragesSchema,
  ownerAcceptedWebhookSchema,
  reactivateBrokerageSchema,
  simulateUsageSchema,
  suspendBrokerageSchema,
} from './platform.validation';
import { validate } from '../../middlewares/validate.middleware';

// Full OpenAPI docs for these routes live in docs/swagger/platform.yaml, not
// inline here — see config/swagger.ts's apis list.
const platformRouter = Router();

// modules/auth calls this after a TENANT_ADMIN invite is accepted — internal,
// not JWT-authenticated, so it's registered before requireSuperAdmin below.
platformRouter.post(
  '/webhooks/owner-accepted',
  requireInternalSecret,
  validate(ownerAcceptedWebhookSchema),
  ownerAcceptedWebhookHandler,
);

// Everything else is the Super Admin console — JWT-authenticated.
platformRouter.use(requireSuperAdmin);

platformRouter.post('/brokerages', validate(createBrokerageSchema), createBrokerageHandler);
platformRouter.get('/brokerages', validate(listBrokeragesSchema), listBrokeragesHandler);
platformRouter.get('/brokerages/:id', validate(brokerageIdParamSchema), getBrokerageHandler);
platformRouter.patch(
  '/brokerages/:id/suspend',
  validate(suspendBrokerageSchema),
  suspendBrokerageHandler,
);
platformRouter.patch(
  '/brokerages/:id/reactivate',
  validate(reactivateBrokerageSchema),
  reactivateBrokerageHandler,
);
platformRouter.patch(
  '/brokerages/:id/cancel',
  validate(brokerageIdParamSchema),
  startCancellationHandler,
);
platformRouter.get(
  '/brokerages/:id/export',
  validate(brokerageIdParamSchema),
  getExportStatusHandler,
);
platformRouter.get('/exports/:jobId/download', downloadExportHandler);

// "Watching AI cost" — Gen_USG.
platformRouter.get(
  '/brokerages/:id/usage',
  validate(brokerageIdParamSchema),
  getUsageStatusHandler,
);
platformRouter.post(
  '/brokerages/:id/usage/allow-extra-today',
  validate(brokerageIdParamSchema),
  allowExtraTodayHandler,
);
// Demo/test-only — see usage.service.ts's simulateUsage doc comment.
platformRouter.post(
  '/brokerages/:id/usage/simulate',
  validate(simulateUsageSchema),
  simulateUsageHandler,
);

// "My settings" and the Activity log's read side (every recordActivity call
// writes into it; nothing read it back before this).
platformRouter.get('/me', getMeHandler);
platformRouter.get('/activity-log', validate(activityLogQuerySchema), listActivityHandler);
platformRouter.get('/activity-log/export', validate(activityLogQuerySchema), exportActivityHandler);

export { platformRouter };
