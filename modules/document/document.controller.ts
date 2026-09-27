import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import {
  createDocument,
  deleteDocument,
  getDocumentById,
  listDocuments,
  updateDocument,
} from './document.service';
import { asyncHandler } from '../../utils/async-handler';

const getUserId = (req: Request): string => req.user?.id ?? 'u_1';

export const createDocumentHandler = asyncHandler(async (req: Request, res: Response) => {
  const created = await createDocument(req.body, getUserId(req));

  res.status(StatusCodes.CREATED).json({
    success: true,
    data: created,
  });
});

export const listDocumentsHandler = asyncHandler(async (req: Request, res: Response) => {
  const documents = await listDocuments(getUserId(req));

  res.status(StatusCodes.OK).json({
    success: true,
    data: documents,
  });
});

export const getDocumentByIdHandler = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const document = await getDocumentById(id, getUserId(req));

  res.status(StatusCodes.OK).json({
    success: true,
    data: document,
  });
});

export const updateDocumentHandler = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const updated = await updateDocument(id, req.body, getUserId(req));

  res.status(StatusCodes.OK).json({
    success: true,
    data: updated,
  });
});

export const deleteDocumentHandler = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  await deleteDocument(id, getUserId(req));

  res.status(StatusCodes.NO_CONTENT).send();
});
