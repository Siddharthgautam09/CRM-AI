import { z } from 'zod';

export const createLeadSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    email: z.string().email().optional(),
    phone: z.string().max(50).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const leadIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

const LEAD_STAGES = [
  'NEW',
  'QUALIFIED',
  'APPLICATION',
  'UNDERWRITING',
  'APPROVED',
  'FUNDED',
  'LOST',
] as const;

export const updateStageSchema = z.object({
  body: z.object({
    stage: z.enum(LEAD_STAGES),
    lostReason: z.string().min(1).max(1000).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const reassignSchema = z.object({
  body: z.object({ toBrokerUserId: z.string().uuid() }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(255),
    leadId: z.string().uuid().optional(),
    dueDate: z.string().datetime().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const taskIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});
