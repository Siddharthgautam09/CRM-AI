import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/api-error';

export const errorHandlerMiddleware = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  void next;
  const normalizedError =
    error instanceof ApiError
      ? error
      : new ApiError('Internal server error', StatusCodes.INTERNAL_SERVER_ERROR, false);

  logger.error(
    {
      requestId: req.requestId,
      error,
      normalizedError,
    },
    'Unhandled error captured',
  );

  res.status(normalizedError.statusCode).json({
    success: false,
    message: normalizedError.message,
    requestId: req.requestId,
    ...(env.nodeEnv !== 'production' && { stack: (error as Error)?.stack }),
  });
};
