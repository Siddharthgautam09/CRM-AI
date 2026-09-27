import bcrypt from 'bcryptjs';

import type { UserRecord } from './auth.types';
import { env } from '../../config/env';

/**
 * Template-only in-memory users.
 * Replace this with real user persistence and secure lifecycle management.
 */
const users: UserRecord[] = [
  {
    id: 'u_1',
    email: 'admin@example.com',
    passwordHash: bcrypt.hashSync('Admin@12345', env.bcryptSaltRounds),
    role: 'admin',
  },
  {
    id: 'u_2',
    email: 'editor@example.com',
    passwordHash: bcrypt.hashSync('Editor@12345', env.bcryptSaltRounds),
    role: 'editor',
  },
];

export const findUserByEmail = (email: string): UserRecord | undefined =>
  users.find((user) => user.email.toLowerCase() === email.toLowerCase());

export const findUserById = (id: string): UserRecord | undefined =>
  users.find((user) => user.id === id);
