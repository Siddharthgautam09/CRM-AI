jest.mock('../../config/database');
jest.mock('../../modules/platform/activity-log');
jest.mock('../../modules/platform/usage.service');
jest.mock('../../modules/crm/document-storage');

import { getPrismaClient } from '../../config/database';
import * as ai from '../../modules/crm/ai-review.service';
import { recordActivity } from '../../modules/platform/activity-log';
import { getUsageStatus } from '../../modules/platform/usage.service';

const mockPrisma = {
  lead: { findUnique: jest.fn(), update: jest.fn() },
  task: { create: jest.fn() },
  crmUserSettings: { findUnique: jest.fn() },
  voiceNote: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
};
const TENANT = 'tenant-1';
const ME = 'me';

function leadRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lead-1',
    tenantId: TENANT,
    brokerUserId: ME,
    name: 'Pat Client',
    email: 'pat@example.com',
    phone: null,
    city: null,
    propertyAddress: null,
    propertyValue: null,
    income: 80000,
    monthlyDebts: null,
    downPayment: null,
    sin: null,
    bankDetails: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (getPrismaClient as jest.Mock).mockReturnValue(mockPrisma);
  (getUsageStatus as jest.Mock).mockResolvedValue({ paused: false });
  mockPrisma.crmUserSettings.findUnique.mockResolvedValue(null);
});

describe('AI availability gate — every AI call', () => {
  it('Flow 4.12: refuses with 403 when the user switched AI off', async () => {
    mockPrisma.crmUserSettings.findUnique.mockResolvedValue({ aiEnabled: false });
    await expect(ai.reviewDraftNotes(TENANT, ME, { notes: 'x' })).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(getUsageStatus).not.toHaveBeenCalled();
  });

  it("Flow 1: 429 once the brokerage's daily allowance is used up, saying when it resets", async () => {
    (getUsageStatus as jest.Mock).mockResolvedValue({ paused: true });
    await expect(ai.askAssistant(TENANT, ME, [ME], 'renewals?')).rejects.toMatchObject({
      statusCode: 429,
      message: expect.stringContaining('resets'),
    });
  });
});

describe('Flow 4.1 — voice note: "audio is saved, retry, or type the notes"', () => {
  const NOTE = { id: 'vn-1', tenantId: TENANT, userId: ME };

  beforeEach(() => {
    mockPrisma.voiceNote.create.mockResolvedValue(NOTE);
    mockPrisma.voiceNote.findUnique.mockResolvedValue(NOTE);
  });

  it('stores the audio, then returns a stub transcript', async () => {
    const result = await ai.saveVoiceNote(TENANT, ME, Buffer.from('audio'), 'audio/webm');
    expect(mockPrisma.voiceNote.create).toHaveBeenCalled();
    expect(result).toMatchObject({ voiceNoteId: 'vn-1', transcribed: true, stub: true });
  });

  it('keeps the audio and says why when AI is unavailable — no error', async () => {
    (getUsageStatus as jest.Mock).mockResolvedValue({ paused: true });
    const result = await ai.saveVoiceNote(TENANT, ME, Buffer.from('audio'), 'audio/webm');
    expect(result).toMatchObject({ voiceNoteId: 'vn-1', transcribed: false, transcript: null });
    expect(mockPrisma.voiceNote.create).toHaveBeenCalled();
  });

  it('retry works on the saved recording, and only for its owner', async () => {
    await expect(ai.retryTranscription(TENANT, ME, 'vn-1')).resolves.toMatchObject({
      transcribed: true,
    });
    await expect(ai.retryTranscription(TENANT, 'someone-else', 'vn-1')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('rejects an empty upload before storing anything', async () => {
    await expect(ai.saveVoiceNote(TENANT, ME, Buffer.alloc(0), 'audio/webm')).rejects.toMatchObject(
      {
        statusCode: 400,
      },
    );
    expect(mockPrisma.voiceNote.create).not.toHaveBeenCalled();
  });
});

describe('Flow 4.1/4.2 — "Analyse notes" before the record exists', () => {
  it('reviews the form without creating anything, reporting what the form is missing', async () => {
    const review = await ai.reviewDraftNotes(TENANT, ME, {
      name: 'Pat',
      notes: 'wants to buy',
      fields: { email: 'pat@example.com' },
    });
    expect(review.stub).toBe(true);
    expect(review.disclosure).toBe(ai.AI_DISCLOSURE);
    expect(review.missingFields).not.toContain('email');
    expect(review.missingFields).toContain('income');
    expect(mockPrisma.lead.findUnique).not.toHaveBeenCalled();
  });
});

describe('reviewLead — AI tools tab', () => {
  it("uses the real lead's blank fields as missing", async () => {
    mockPrisma.lead.findUnique.mockResolvedValue(leadRow());
    const review = await ai.reviewLead(TENANT, ME, 'lead-1', [ME]);
    expect(review.missingFields).not.toContain('income');
    expect(review.missingFields).toContain('phone');
  });

  it('checks access before anything else', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue(leadRow({ brokerUserId: 'someone-else' }));
    await expect(ai.reviewLead(TENANT, ME, 'lead-1', [ME])).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(getUsageStatus).not.toHaveBeenCalled();
  });
});

describe('draftEmail — Flow 4.7 purposes', () => {
  it('offers exactly the flow purposes', () => {
    expect(Object.keys(ai.EMAIL_INTENTS)).toEqual([
      'FOLLOW_UP',
      'RENEWAL',
      'BIRTHDAY',
      'DOCUMENTS',
      'ANNUAL_REVIEW',
      'REFINANCE',
    ]);
  });

  it('drafts a placeholder email for the chosen purpose', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue(leadRow());
    const draft = await ai.draftEmail(TENANT, ME, 'lead-1', [ME], 'REFINANCE');
    expect(draft).toMatchObject({ stub: true, intent: 'REFINANCE' });
    expect(draft.subject).toContain('Pat Client');
  });
});

describe('suggestTasks — Flow 4.9 "Suggested by AI"', () => {
  it("stores the suggestion as suggested, for the lead's own broker", async () => {
    mockPrisma.lead.findUnique.mockResolvedValue(leadRow({ brokerUserId: 'teammate' }));
    mockPrisma.task.create.mockResolvedValue({ id: 't1' });
    await ai.suggestTasks(TENANT, 'assistant-1', 'lead-1', ['teammate']);
    expect(mockPrisma.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        brokerUserId: 'teammate',
        leadId: 'lead-1',
        suggested: true,
      }),
    });
  });
});

describe('askAssistant — Flow 4.10', () => {
  it('is a read-only stub answer', async () => {
    const result = await ai.askAssistant(TENANT, ME, [ME], 'Who has renewals in 90 days?');
    expect(result).toMatchObject({ stub: true, readOnly: true, records: [] });
  });
});

describe('applyExtractedFields — Flow 4.2 "never overwrite what is filled in"', () => {
  it('fills blank fields, never overwrites filled ones, and audits what it applied', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue(leadRow());
    mockPrisma.lead.update.mockResolvedValue(leadRow({ city: 'Toronto' }));

    const result = await ai.applyExtractedFields(
      TENANT,
      'lead-1',
      [ME],
      { city: 'Toronto', income: 95000 },
      ME,
    );

    expect(result.applied).toEqual(['city']);
    expect(result.skipped).toEqual(['income']);
    expect(mockPrisma.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: { city: 'Toronto' },
    });
    expect(recordActivity).toHaveBeenCalledWith(
      'crm.lead.ai_fields_applied',
      expect.objectContaining({ metadata: { applied: ['city'] } }),
    );
  });

  it('writes nothing when every field is already filled', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue(leadRow());
    const result = await ai.applyExtractedFields(TENANT, 'lead-1', [ME], { income: 1 }, ME);
    expect(result.applied).toEqual([]);
    expect(mockPrisma.lead.update).not.toHaveBeenCalled();
    expect(recordActivity).not.toHaveBeenCalled();
  });
});
