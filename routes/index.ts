import { Router } from 'express';

import { authRouter } from '../modules/auth/auth.routes';
import { documentRouter } from '../modules/document/document.routes';

const rootRouter = Router();

rootRouter.use('/auth', authRouter);
rootRouter.use('/documents', documentRouter);

export { rootRouter };
