import { z } from 'zod';

export const createDocumentSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200),
    content: z.string().min(1).max(10000),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateDocumentSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200).optional(),
    content: z.string().min(1).max(10000).optional(),
  }),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const documentIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().min(1) }),
});
