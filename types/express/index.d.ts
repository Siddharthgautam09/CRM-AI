import type { PlatformUser } from '../../modules/platform/platform.types';
import type { AuthUser } from '../common';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      requestId?: string;
      /** Set by modules/platform/auth-jwt.middleware.ts after verifying a SUPER_ADMIN JWT. */
      platformUser?: PlatformUser;
    }
  }
}

export {};
