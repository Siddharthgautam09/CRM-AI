import { z } from 'zod';

import { EMAIL_INTENTS, type EmailIntent } from './ai-review.service';
import { updateLeadProfileSchema } from './crm.validation';

const leadParams = z.object({ id: z.string().uuid() });
const emailIntent = z.enum(Object.keys(EMAIL_INTENTS) as [EmailIntent, ...EmailIntent[]]);
const appliableFields = updateLeadProfileSchema.shape.body
  .pick({
    email: true,
    phone: true,
    city: true,
    propertyAddress: true,
    propertyValue: true,
    income: true,
    monthlyDebts: true,
    downPayment: true,
  })
  .strict();

export const aiLeadSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: leadParams,
});

export const aiReviewDraftNotesSchema = z.object({
  body: z.object({
    name: z.string().max(255).optional(),
    notes: z.string().min(1).max(20000),
    // What's already typed into the form — only used to report what's missing.
    fields: appliableFields.partial().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const aiDraftEmailSchema = z.object({
  body: z.object({ intent: emailIntent }),
  query: z.object({}).optional(),
  params: leadParams,
});

export const aiApplyFieldsSchema = z.object({
  body: z.object({ fields: appliableFields }),
  query: z.object({}).optional(),
  params: leadParams,
});

export const aiAssistantSchema = z.object({
  body: z.object({ question: z.string().min(1).max(2000) }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const createEmailDraftSchema = z.object({
  body: z.object({
    intent: emailIntent.optional(),
    subject: z.string().min(1).max(255),
    body: z.string().min(1).max(20000),
    aiAssisted: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
  params: leadParams,
});

export const updateEmailDraftSchema = z.object({
  body: z.object({
    intent: emailIntent.optional(),
    subject: z.string().min(1).max(255).optional(),
    body: z.string().min(1).max(20000).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ draftId: z.string().uuid() }),
});

export const updateSettingsSchema = z.object({
  body: z.object({ aiEnabled: z.boolean() }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const DOCUMENT_TYPES = [
  'ID',
  'T4',
  'NOA',
  'PAY_STUB',
  'EMPLOYMENT_LETTER',
  'BANK_STATEMENT',
  'PURCHASE_AGREEMENT',
  'MORTGAGE_STATEMENT',
  'PROPERTY_TAX',
  'OTHER',
] as const;

export const setRequiredDocumentsSchema = z.object({
  body: z.object({ types: z.array(z.enum(DOCUMENT_TYPES)).max(DOCUMENT_TYPES.length) }),
  query: z.object({}).optional(),
  params: leadParams,
});

const uploadQuery = z.object({
  type: z.enum(DOCUMENT_TYPES),
  fileName: z.string().min(1).max(255),
});

export const uploadDocumentSchema = z.object({
  query: uploadQuery,
  params: leadParams,
});

export const requestDocumentsSchema = z.object({
  body: z.object({ useSystemAddress: z.boolean().optional() }),
  query: z.object({}).optional(),
  params: leadParams,
});

export const documentIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ documentId: z.string().uuid() }),
});

export const applyDocumentValuesSchema = z.object({
  body: z.object({ fields: appliableFields }),
  query: z.object({}).optional(),
  params: z.object({ documentId: z.string().uuid() }),
});

export const publicTokenSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }),
});

export const publicUploadSchema = z.object({
  query: uploadQuery,
  params: z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }),
});

export const publicBookingSchema = z.object({
  body: z
    .object({
      bookingRef: z.string().min(1).max(200),
      name: z.string().min(1).max(255),
      email: z.string().email(),
      phone: z.string().max(50).optional(),
      title: z.string().max(255).optional(),
      startTime: z.string().datetime(),
      endTime: z.string().datetime(),
    })
    .refine((b) => new Date(b.endTime) > new Date(b.startTime), {
      message: 'endTime must be after startTime',
    }),
  query: z.object({}).optional(),
  params: z.object({ slug: z.string().min(3).max(100) }),
});
