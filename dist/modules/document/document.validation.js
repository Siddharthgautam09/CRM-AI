"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentIdParamSchema = exports.updateDocumentSchema = exports.createDocumentSchema = void 0;
const zod_1 = require("zod");
exports.createDocumentSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(3).max(200),
        content: zod_1.z.string().min(1).max(10000),
    }),
    query: zod_1.z.object({}).optional(),
    params: zod_1.z.object({}).optional(),
});
exports.updateDocumentSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(3).max(200).optional(),
        content: zod_1.z.string().min(1).max(10000).optional(),
    }),
    params: zod_1.z.object({ id: zod_1.z.string().min(1) }),
    query: zod_1.z.object({}).optional(),
});
exports.documentIdParamSchema = zod_1.z.object({
    body: zod_1.z.object({}).optional(),
    query: zod_1.z.object({}).optional(),
    params: zod_1.z.object({ id: zod_1.z.string().min(1) }),
});
