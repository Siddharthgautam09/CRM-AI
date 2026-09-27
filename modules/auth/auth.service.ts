import bcrypt from 'bcryptjs';
import { StatusCodes } from 'http-status-codes';

import { findUserByEmail, findUserById } from './auth.mock-users';
import type { AuthTokens, LoginInput } from './auth.types';
import { ApiError } from '../../utils/api-error';
import { signToken, verifyToken } from '../../utils/jwt';

/**
 * In production, store refresh token family in Redis/DB with rotation strategy.
 */
const refreshTokenStore = new Set<string>();

const issueTokens = (userId: string, role: 'admin' | 'editor' | 'viewer'): AuthTokens => {
  const accessToken = signToken({ sub: userId, role }, 'access');
  const refreshToken = signToken({ sub: userId, role }, 'refresh');
  refreshTokenStore.add(refreshToken);

  return {
    accessToken,
    refreshToken,
  };
};

export const login = async (input: LoginInput): Promise<AuthTokens> => {
  const user = findUserByEmail(input.email);

  if (!user) {
    throw new ApiError('Invalid credentials', StatusCodes.UNAUTHORIZED);
  }

  const passwordMatched = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatched) {
    throw new ApiError('Invalid credentials', StatusCodes.UNAUTHORIZED);
  }

  return issueTokens(user.id, user.role);
};

export const refresh = async (refreshToken: string): Promise<AuthTokens> => {
  if (!refreshTokenStore.has(refreshToken)) {
    throw new ApiError('Invalid refresh token', StatusCodes.UNAUTHORIZED);
  }

  const payload = verifyToken(refreshToken, 'refresh');
  if (payload.tokenType !== 'refresh') {
    throw new ApiError('Invalid token type', StatusCodes.UNAUTHORIZED);
  }

  const user = findUserById(payload.sub);
  if (!user) {
    throw new ApiError('User no longer exists', StatusCodes.UNAUTHORIZED);
  }

  refreshTokenStore.delete(refreshToken);
  return issueTokens(user.id, user.role);
};

export const logout = async (refreshToken?: string): Promise<void> => {
  if (refreshToken) {
    refreshTokenStore.delete(refreshToken);
  }
};
