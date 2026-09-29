import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getModAuthPerson, type ModAuthRole } from './modauth.client';
import { ApiError } from '../../utils/api-error';
import { asyncHandler } from '../../utils/async-handler';
import { extractBearerToken, verifyAuthToken } from '../platform/auth-jwt.middleware';

export interface CrmUser {
  userId: string;
  tenantId: string;
  role: ModAuthRole;
  teamId: string | null;
  name: string | null;
  bearerToken: string;
}

/**
 * The Broker/Team-Lead/Tenant-Admin counterpart of requireSuperAdmin: verify
 * the JWT signature locally (same as requireSuperAdmin), then resolve the
 * caller's modauth Role via modules/auth's internal lookup — necessary
 * because, unlike SUPER_ADMIN, this role is not a JWT claim (see
 * modauth.client.ts's getModAuthPerson doc comment).
 */
export function requireModAuthRole(...allowedRoles: ModAuthRole[]) {
  // asyncHandler, not a bare async function: Express 4 doesn't forward a
  // rejected promise from middleware to the error handler on its own — an
  // unmocked getModAuthPerson() failure would otherwise hang the request
  // instead of returning a 502/403.
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const bearerToken = extractBearerToken(req);
    const payload = verifyAuthToken(req);
    const userId = String(payload.sub);

    const person = await getModAuthPerson(userId);
    if (!person) {
      throw new ApiError('No role assigned — cannot use the CRM', StatusCodes.FORBIDDEN);
    }
    if (!person.active) {
      throw new ApiError('Account deactivated. Contact your admin.', StatusCodes.FORBIDDEN);
    }
    if (!allowedRoles.includes(person.role)) {
      throw new ApiError(`${person.role} cannot access this`, StatusCodes.FORBIDDEN);
    }

    req.crmUser = { ...person, bearerToken };
    next();
  });
}
