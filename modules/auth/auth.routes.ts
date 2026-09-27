import { Router } from 'express';

import { loginHandler, logoutHandler, refreshTokenHandler } from './auth.controller';
import { loginSchema, refreshTokenSchema } from './auth.validation';
import { validate } from '../../middlewares/validate.middleware';

const authRouter = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and get access/refresh tokens
 */
authRouter.post('/login', validate(loginSchema), loginHandler);
authRouter.post('/refresh-token', validate(refreshTokenSchema), refreshTokenHandler);
authRouter.post('/logout', logoutHandler);

export { authRouter };
