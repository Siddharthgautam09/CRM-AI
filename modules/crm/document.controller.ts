import type { DocumentType } from '@prisma/client';
import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import * as bookingService from './booking.service';
import { leadAccessIds } from './crm-auth.middleware';
import * as documentService from './document.service';
import { asyncHandler } from '../../utils/async-handler';

/** Raw-body upload: the file is the request body; type and name come in the query string. */
function incomingFile(req: Request): documentService.IncomingFile {
  return {
    type: req.query.type as DocumentType,
    fileName: req.query.fileName as string,
    mimeType: req.headers['content-type'] ?? 'application/octet-stream',
    data: Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0),
  };
}

export const listDocumentsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = req.crmUser!;
  const data = await documentService.listDocuments(
    user.tenantId,
    req.params.id as string,
    await leadAccessIds(user),
  );
  res.status(StatusCodes.OK).json({ success: true, data });
});

export const setRequiredDocumentsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = req.crmUser!;
  const data = await documentService.setRequiredDocuments(
    user.tenantId,
    req.params.id as string,
    await leadAccessIds(user),
    req.body.types,
  );
  res.status(StatusCodes.OK).json({ success: true, data });
});

export const uploadDocumentHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = req.crmUser!;
  const doc = await documentService.uploadDocument(
    user.tenantId,
    req.params.id as string,
    await leadAccessIds(user),
    incomingFile(req),
  );
  res.status(StatusCodes.CREATED).json({ success: true, data: doc });
});

export const requestDocumentsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = req.crmUser!;
  const data = await documentService.requestDocuments(
    user.tenantId,
    user.userId,
    req.params.id as string,
    await leadAccessIds(user),
    req.body,
  );
  res.status(StatusCodes.CREATED).json({ success: true, data });
});

export const applyDocumentValuesHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = req.crmUser!;
  const data = await documentService.applyDocumentValues(
    user.tenantId,
    req.params.documentId as string,
    await leadAccessIds(user),
    req.body.fields,
    user.userId,
  );
  res.status(StatusCodes.OK).json({ success: true, data });
});

export const downloadDocumentHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = req.crmUser!;
  const file = await documentService.downloadDocument(
    user.tenantId,
    req.params.documentId as string,
    await leadAccessIds(user),
    user.userId,
  );
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(file.fileName)}"`,
  );
  res.status(StatusCodes.OK).send(file.data);
});

// ── Public, no login: the borrower's link and the booking page ──────────────

export const publicDocumentRequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await documentService.getPublicRequest(req.params.token as string);
  res.status(StatusCodes.OK).json({ success: true, data });
});

export const publicDocumentUploadHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await documentService.publicUpload(req.params.token as string, incomingFile(req));
  res.status(StatusCodes.CREATED).json({ success: true, data });
});

export const publicBookingHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await bookingService.intakeBooking(req.params.slug as string, req.body);
  res.status(data.duplicate ? StatusCodes.OK : StatusCodes.CREATED).json({ success: true, data });
});
