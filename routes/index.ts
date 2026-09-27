import { Router } from 'express';

import { documentRouter } from '../modules/document/document.routes';

const rootRouter = Router();

// Auth now lives in modules/auth as its own Java service (gen-auth-starter +
// this repo's role/terms/invitation additions) — see modules/auth/README or
// docker-compose.yml's `modauth` service. Nothing under /auth is proxied
// from this Node app anymore.
rootRouter.use('/documents', documentRouter);

export { rootRouter };
