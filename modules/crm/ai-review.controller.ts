import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import * as aiReviewService from './ai-review.service';
import { leadAccessIds } from './crm-auth.middleware';
import { asyncHandler } from '../../utils/async-handler';

function crmUser(req: Request) {
  // Guaranteed set by requireModAuthRole before any handler here runs.
  return req.crmUser!;
}

export const saveVoiceNoteHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = crmUser(req);
  const audio = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const result = await aiReviewService.saveVoiceNote(
    user.tenantId,
    user.userId,
    audio,
    req.headers['content-type'] ?? 'application/octet-stream',
  );
  res.status(StatusCodes.CREATED).json({ success: true, data: result });
});

export const retryTranscriptionHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = crmUser(req);
  const result = await aiReviewService.retryTranscription(
    user.tenantId,
    user.userId,
    req.params.id as string,
  );
  res.status(StatusCodes.OK).json({ success: true, data: result });
});

export const reviewDraftNotesHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = crmUser(req);
  const review = await aiReviewService.reviewDraftNotes(user.tenantId, user.userId, req.body);
  res.status(StatusCodes.OK).json({ success: true, data: review });
});

export const reviewLeadHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = crmUser(req);
  const review = await aiReviewService.reviewLead(
    user.tenantId,
    user.userId,
    req.params.id as string,
    await leadAccessIds(user),
  );
  res.status(StatusCodes.OK).json({ success: true, data: review });
});

export const draftEmailHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = crmUser(req);
  const draft = await aiReviewService.draftEmail(
    user.tenantId,
    user.userId,
    req.params.id as string,
    await leadAccessIds(user),
    req.body.intent,
  );
  res.status(StatusCodes.OK).json({ success: true, data: draft });
});

export const suggestTasksHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = crmUser(req);
  const tasks = await aiReviewService.suggestTasks(
    user.tenantId,
    user.userId,
    req.params.id as string,
    await leadAccessIds(user),
  );
  res.status(StatusCodes.CREATED).json({ success: true, data: tasks });
});

export const askAssistantHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = crmUser(req);
  const answer = await aiReviewService.askAssistant(
    user.tenantId,
    user.userId,
    await leadAccessIds(user),
    req.body.question,
  );
  res.status(StatusCodes.OK).json({ success: true, data: answer });
});

export const applyExtractedFieldsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = crmUser(req);
  const result = await aiReviewService.applyExtractedFields(
    user.tenantId,
    req.params.id as string,
    await leadAccessIds(user),
    req.body.fields,
    user.userId,
  );
  res.status(StatusCodes.OK).json({ success: true, data: result });
});

export const listEmailIntentsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const intents = Object.entries(aiReviewService.EMAIL_INTENTS).map(([key, label]) => ({
    key,
    label,
  }));
  res.status(StatusCodes.OK).json({ success: true, data: intents });
});
