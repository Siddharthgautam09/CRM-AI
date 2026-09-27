import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { login, logout, refresh } from './auth.service';
import { asyncHandler } from '../../utils/async-handler';

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const tokens = await login(req.body);

  res.status(StatusCodes.OK).json({
    success: true,
    data: tokens,
  });
});

export const refreshTokenHandler = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken: string };
  const tokens = await refresh(refreshToken);

  res.status(StatusCodes.OK).json({
    success: true,
    data: tokens,
  });
});

export const logoutHandler = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = (req.body ?? {}) as { refreshToken?: string };
  await logout(refreshToken);

  res.status(StatusCodes.NO_CONTENT).send();
});
