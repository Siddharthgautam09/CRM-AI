import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import type { UserRole } from '../types/common';
import { ApiError } from '../utils/api-error';
import { verifyToken } from '../utils/jwt';

const extractToken = (headerValue?: string): string => {
  if (!headerValue?.startsWith('Bearer ')) {
    throw new ApiError('Missing or invalid authorization header', StatusCodes.UNAUTHORIZED);
  }
  return headerValue.split(' ')[1] as string;
};

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const token = extractToken(req.headers.authorization);
  const payload = verifyToken(token, 'access');

  req.user = {
    id: payload.sub,
    role: payload.role,
  };

  next();
};

export const authorize =
  (...allowedRoles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ApiError('Authentication required', StatusCodes.UNAUTHORIZED);
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError('Insufficient permissions', StatusCodes.FORBIDDEN);
    }

    next();
  };
