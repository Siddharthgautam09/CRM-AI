import type { UserRole } from '../../types/common';

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}
