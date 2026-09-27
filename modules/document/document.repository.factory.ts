import { MongooseDocumentRepository } from './document.mongoose.repository';
import { PrismaDocumentRepository } from './document.prisma.repository';
import type { DocumentRepository } from './document.types';
import { env } from '../../config/env';

export const createDocumentRepository = (): DocumentRepository => {
  // Keep implementation switch centralized for easier migration.
  if (env.dbClient === 'mongoose') return new MongooseDocumentRepository();

  // Default and fallback for "prisma" and "both".
  return new PrismaDocumentRepository();
};
