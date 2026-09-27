import { StatusCodes } from 'http-status-codes';

import { createDocumentRepository } from './document.repository.factory';
import type { CreateDocumentInput, DocumentEntity, UpdateDocumentInput } from './document.types';
import { ApiError } from '../../utils/api-error';
import { sanitizeText } from '../../utils/sanitize';

const repository = createDocumentRepository();

export const createDocument = async (
  input: CreateDocumentInput,
  ownerId: string,
): Promise<DocumentEntity> =>
  repository.create(
    {
      title: sanitizeText(input.title),
      content: sanitizeText(input.content),
    },
    ownerId,
  );

export const listDocuments = async (ownerId: string): Promise<DocumentEntity[]> =>
  repository.list(ownerId);

export const getDocumentById = async (id: string, ownerId: string): Promise<DocumentEntity> => {
  const document = await repository.getById(id, ownerId);
  if (!document) {
    throw new ApiError('Document not found', StatusCodes.NOT_FOUND);
  }
  return document;
};

export const updateDocument = async (
  id: string,
  input: UpdateDocumentInput,
  ownerId: string,
): Promise<DocumentEntity> => {
  const updated = await repository.update(
    id,
    {
      ...(input.title && { title: sanitizeText(input.title) }),
      ...(input.content && { content: sanitizeText(input.content) }),
    },
    ownerId,
  );

  if (!updated) {
    throw new ApiError('Document not found', StatusCodes.NOT_FOUND);
  }

  return updated;
};

export const deleteDocument = async (id: string, ownerId: string): Promise<void> => {
  const deleted = await repository.delete(id, ownerId);
  if (!deleted) {
    throw new ApiError('Document not found', StatusCodes.NOT_FOUND);
  }
};
