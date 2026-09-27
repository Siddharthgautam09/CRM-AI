import { Router } from 'express';

import {
  createDocumentHandler,
  deleteDocumentHandler,
  getDocumentByIdHandler,
  listDocumentsHandler,
  updateDocumentHandler,
} from './document.controller';
import {
  createDocumentSchema,
  documentIdParamSchema,
  updateDocumentSchema,
} from './document.validation';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';

const documentRouter = Router();

documentRouter.use(authenticate);

documentRouter.get('/', listDocumentsHandler);
documentRouter.get('/:id', validate(documentIdParamSchema), getDocumentByIdHandler);
documentRouter.post(
  '/',
  authorize('admin', 'editor'),
  validate(createDocumentSchema),
  createDocumentHandler,
);
documentRouter.patch(
  '/:id',
  authorize('admin', 'editor'),
  validate(updateDocumentSchema),
  updateDocumentHandler,
);
documentRouter.delete(
  '/:id',
  authorize('admin'),
  validate(documentIdParamSchema),
  deleteDocumentHandler,
);

export { documentRouter };
