import { Router } from 'express';

import { platformRouter } from '../modules/platform/platform.routes';

const rootRouter = Router();

// Auth lives in modules/auth as its own Java service (gen-auth-starter +
// this repo's role/terms/invitation additions) — see docker-compose.yml's
// `modauth` service. Nothing under /auth is proxied from this Node app.
//
// modules/document was removed in a prior commit (before this session) with
// no replacement wired in here — its router import was left dangling
// (routes/index.ts referenced a module that no longer exists, which would
// fail to compile). Removed rather than restored; ask if it needs to come back.
rootRouter.use('/platform', platformRouter);

export { rootRouter };
