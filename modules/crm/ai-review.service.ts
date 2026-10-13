import { StatusCodes } from 'http-status-codes';

import { storeFile } from './document-storage';
import { getLeadWithAccess, maskLead } from './lead.service';
import { getSettings } from './settings.service';
import { getPrismaClient } from '../../config/database';
import { ApiError } from '../../utils/api-error';
import { recordActivity } from '../platform/activity-log';
import { getUsageStatus } from '../platform/usage.service';

/**
 * Every AI touchpoint in the user flows (Untitled 2.md) — 4.1 voice note +
 * "Analyse notes", 4.2 AI review, 4.3 AI tools tab, 4.7 AI email draft, 4.9
 * suggested tasks, 4.10 AI Assistant — is a STUB: a separate AI team owns the
 * model integration and swaps real output into these functions, keeping the
 * shapes below as the contract. The real parts already here: access checks,
 * the user's AI on/off setting (4.12), the brokerage's Gen_USG daily cost
 * limit (Flow 1), and blank-fields-only apply. Nothing is recorded against
 * the cost limit because a stub costs nothing — the AI team adds Gen_USG
 * increment() next to the real model call.
 */

export const AI_DISCLOSURE =
  'AI-generated suggestions. Review before using — nothing is saved until you apply it.';

/** Flow 4.7 "Pick the purpose" — shared by the email screen and the AI tools tab. */
export const EMAIL_INTENTS = {
  FOLLOW_UP: 'Follow-up',
  RENEWAL: 'Renewal',
  BIRTHDAY: 'Birthday',
  DOCUMENTS: 'Documents',
  ANNUAL_REVIEW: 'Annual review',
  REFINANCE: 'Refinance',
} as const;
export type EmailIntent = keyof typeof EMAIL_INTENTS;

/** Lead fields a review may propose and apply may fill — the same set the profile edit allows. */
export const APPLIABLE_FIELDS = [
  'email',
  'phone',
  'city',
  'propertyAddress',
  'propertyValue',
  'income',
  'monthlyDebts',
  'downPayment',
] as const;
type AppliableField = (typeof APPLIABLE_FIELDS)[number];
export type ExtractedFields = Partial<Record<AppliableField, string | number>>;

export interface AiDraftEmail {
  stub: true;
  disclosure: string;
  intent: EmailIntent;
  subject: string;
  body: string;
}

export interface AiReview {
  stub: true;
  disclosure: string;
  summary: string;
  intent: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  extractedFields: ExtractedFields;
  missingFields: AppliableField[];
  painPoints: string[];
  opportunities: string[];
  draftEmail: AiDraftEmail;
  proposedTasks: { title: string; dueInDays: number }[];
}

/** 4.12 "AI features on or off" first (403), then Flow 1's daily cost limit (429). */
async function requireAiAvailable(tenantId: string, userId: string) {
  const settings = await getSettings(userId);
  if (!settings.aiEnabled) {
    throw new ApiError('AI features are switched off in your settings', StatusCodes.FORBIDDEN);
  }
  const usage = await getUsageStatus(tenantId);
  if (usage.paused) {
    throw new ApiError(
      "Your brokerage's daily AI allowance is used up — it resets at midnight UTC",
      StatusCodes.TOO_MANY_REQUESTS,
    );
  }
}

function isBlank(value: unknown) {
  return value === null || value === undefined || value === '';
}

function stubDraftEmail(leadName: string, intent: EmailIntent): AiDraftEmail {
  return {
    stub: true,
    disclosure: AI_DISCLOSURE,
    intent,
    subject: `${EMAIL_INTENTS[intent]} — ${leadName}`,
    body: `Hi ${leadName},\n\n[Placeholder ${EMAIL_INTENTS[intent].toLowerCase()} email — the AI draft will appear here.]\n\nBest regards`,
  };
}

// shortcut: fixed placeholder output, not derived from the notes — replaced by the AI team's model call.
function stubReview(leadName: string, current: Partial<Record<AppliableField, unknown>>): AiReview {
  return {
    stub: true,
    disclosure: AI_DISCLOSURE,
    summary: `Placeholder summary of the notes for ${leadName}.`,
    intent: 'Purchase pre-approval',
    urgency: 'MEDIUM',
    extractedFields: { city: 'Toronto', income: 95000, downPayment: 60000 },
    // Real, not stubbed: which appliable fields are actually blank.
    missingFields: APPLIABLE_FIELDS.filter((f) => isBlank(current[f])),
    painPoints: ['Placeholder pain point'],
    opportunities: ['Placeholder opportunity'],
    draftEmail: stubDraftEmail(leadName, 'FOLLOW_UP'),
    proposedTasks: [{ title: `Follow up with ${leadName}`, dueInDays: 2 }],
  };
}

/**
 * Flow 4.1 "Voice note added? → Did it transcribe? No → Audio is saved,
 * retry, or type the notes". The audio is always stored first; when AI is
 * off or the daily allowance is used up the result says so (transcribed:
 * false) and retryTranscription tries again later on the same recording.
 */
export async function saveVoiceNote(
  tenantId: string,
  userId: string,
  audio: Buffer,
  mimeType: string,
) {
  if (audio.length === 0) {
    throw new ApiError('No audio received', StatusCodes.BAD_REQUEST);
  }
  const storagePath = await storeFile(tenantId, audio);
  const note = await getPrismaClient().voiceNote.create({
    data: { tenantId, userId, storagePath, mimeType, size: audio.length },
  });
  return attemptTranscription(note);
}

export async function retryTranscription(tenantId: string, userId: string, voiceNoteId: string) {
  const note = await getPrismaClient().voiceNote.findUnique({ where: { id: voiceNoteId } });
  if (!note || note.tenantId !== tenantId || note.userId !== userId) {
    throw new ApiError('Voice note not found', StatusCodes.NOT_FOUND);
  }
  return attemptTranscription(note);
}

async function attemptTranscription(note: { id: string; tenantId: string; userId: string }) {
  try {
    await requireAiAvailable(note.tenantId, note.userId);
  } catch (error) {
    if (error instanceof ApiError && [403, 429].includes(error.statusCode)) {
      return { voiceNoteId: note.id, transcribed: false, transcript: null, reason: error.message };
    }
    throw error;
  }
  // shortcut: placeholder transcript — replaced by the AI team's speech-to-text call.
  const transcript = '[Placeholder transcript of the voice note.]';
  await getPrismaClient().voiceNote.update({ where: { id: note.id }, data: { transcript } });
  return { voiceNoteId: note.id, transcribed: true, transcript, stub: true as const };
}

/**
 * Flow 4.1 "Analyse notes" → 4.2 AI review screen, on the new-client form
 * before anything is saved: stateless, so "Discard" creates nothing. "Save"
 * is POST /crm/leads with the accepted tasks and draft (see createLead).
 */
export async function reviewDraftNotes(
  tenantId: string,
  userId: string,
  input: { name?: string; notes: string; fields?: Partial<Record<AppliableField, unknown>> },
): Promise<AiReview> {
  await requireAiAvailable(tenantId, userId);
  return stubReview(input.name ?? 'this client', input.fields ?? {});
}

/** AI tools tab (4.3) — the same review over an existing lead. */
export async function reviewLead(
  tenantId: string,
  userId: string,
  leadId: string,
  allowedBrokerIds: string[],
): Promise<AiReview> {
  const lead = await getLeadWithAccess(tenantId, leadId, allowedBrokerIds);
  await requireAiAvailable(tenantId, userId);
  return stubReview(lead.name, lead);
}

/** Flow 4.7 "Is AI available? → Draft appears, marked as AI-assisted" — never sent or saved here. */
export async function draftEmail(
  tenantId: string,
  userId: string,
  leadId: string,
  allowedBrokerIds: string[],
  intent: EmailIntent,
): Promise<AiDraftEmail> {
  const lead = await getLeadWithAccess(tenantId, leadId, allowedBrokerIds);
  await requireAiAvailable(tenantId, userId);
  return stubDraftEmail(lead.name, intent);
}

/**
 * Flow 4.9 "Suggested by AI → Shown as Suggested" — stored as suggested
 * tasks for the lead's broker, who approves or dismisses them.
 */
export async function suggestTasks(
  tenantId: string,
  userId: string,
  leadId: string,
  allowedBrokerIds: string[],
) {
  const lead = await getLeadWithAccess(tenantId, leadId, allowedBrokerIds);
  await requireAiAvailable(tenantId, userId);
  const twoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  // shortcut: one fixed placeholder suggestion — replaced by the AI team's model call.
  const task = await getPrismaClient().task.create({
    data: {
      tenantId,
      brokerUserId: lead.brokerUserId,
      leadId: lead.id,
      title: `Follow up with ${lead.name}`,
      dueDate: twoDays,
      suggested: true,
    },
  });
  return [task];
}

/**
 * Flow 4.10 AI Assistant — "It only reads; it cannot create, change, send or
 * delete." Whatever the AI team plugs in must answer only from leads owned by
 * allowedBrokerIds ("within what you're allowed to see").
 */
export async function askAssistant(
  tenantId: string,
  userId: string,
  _allowedBrokerIds: string[],
  question: string,
) {
  await requireAiAvailable(tenantId, userId);
  return {
    stub: true as const,
    readOnly: true as const,
    question,
    answer: "[Placeholder answer — the AI Assistant isn't connected yet.]",
    // "Answer, with links to the records it used" — empty means "Couldn't find anything matching that".
    records: [] as { leadId: string; name: string }[],
  };
}

/**
 * Flow 4.2 "Would it overwrite something already filled in? → Left alone,
 * marked as already filled". Not AI itself (the caller sends the fields
 * they accepted), so not gated by the AI switch or the cost limit.
 */
export async function applyExtractedFields(
  tenantId: string,
  leadId: string,
  allowedBrokerIds: string[],
  fields: ExtractedFields,
  actorId: string,
) {
  const lead = await getLeadWithAccess(tenantId, leadId, allowedBrokerIds);
  const keys = Object.keys(fields) as AppliableField[];
  const applied = keys.filter((k) => isBlank(lead[k]));
  const skipped = keys.filter((k) => !applied.includes(k));

  const updated = applied.length
    ? await getPrismaClient().lead.update({
        where: { id: lead.id },
        data: Object.fromEntries(applied.map((k) => [k, fields[k]])),
      })
    : lead;
  if (applied.length) {
    await recordActivity('crm.lead.ai_fields_applied', {
      actorId,
      targetType: 'lead',
      targetId: lead.id,
      metadata: { applied },
    });
  }
  return { lead: maskLead(updated), applied, skipped };
}
