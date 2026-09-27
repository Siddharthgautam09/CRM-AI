import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import type { AnyZodObject, ZodError } from 'zod';

import { ApiError } from '../utils/api-error';

export const validate =
  (schema: AnyZodObject) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      next();
    } catch (error) {
      const zodError = error as ZodError;
      const issueMessage = zodError.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      next(new ApiError(`Validation failed - ${issueMessage}`, StatusCodes.BAD_REQUEST));
    }
  };
