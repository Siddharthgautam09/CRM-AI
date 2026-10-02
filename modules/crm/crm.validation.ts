import { z } from 'zod';

export const createLeadSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    email: z.string().email().optional(),
    phone: z.string().max(50).optional(),
    income: z.coerce.number().nonnegative().optional(),
    monthlyDebts: z.coerce.number().nonnegative().optional(),
    downPayment: z.coerce.number().nonnegative().optional(),
    propertyAddress: z.string().max(500).optional(),
    propertyValue: z.coerce.number().nonnegative().optional(),
    notes: z.string().max(5000).optional(),
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

const mortgageBody = z.object({
  lender: z.string().min(1).max(255),
  interestRate: z.coerce.number().positive(),
  balance: z.coerce.number().positive(),
  monthlyPayment: z.coerce.number().positive(),
  maturityDate: z.string().datetime(),
});

export const fundLeadSchema = z.object({
  body: mortgageBody,
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const addMortgageSchema = fundLeadSchema;

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

const REPORT_TYPES = ['pipeline', 'renewals', 'team-performance', 'ai-usage'] as const;

export const reportQuerySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    type: z.enum(REPORT_TYPES),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    brokerId: z.string().uuid().optional(),
    teamId: z.string().uuid().optional(),
  }),
  params: z.object({}).optional(),
});
